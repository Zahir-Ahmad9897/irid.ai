"""
recognizer.py
-------------
ONNX-based Face Recognition engine wrapping InsightFace SCRFD face detector
and ArcFace ONNX feature extractor (via ONNX Runtime CPUExecutionProvider).
Manages face enrollment, embedding extraction, and gallery persistence
using FAISS for fast vector similarity search.
Automatically downloads the ONNX model from Hugging Face if not found locally.
"""

import json
import logging
import os
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import cv2
import faiss
import numpy as np
import onnxruntime as ort
from huggingface_hub import hf_hub_download
from insightface.app import FaceAnalysis

logger = logging.getLogger(__name__)

from dotenv import load_dotenv
load_dotenv()

from src.align import align_face
from src.config import (
    DEFAULT_ONNX_MODEL_PATH,
    DEFAULT_SIMILARITY_THRESHOLD,
    EMBEDDING_DIM,
    FAISS_INDEX_PATH,
    FAISS_NAMES_PATH,
    GALLERY_JSON_PATH,
    SCRFD_DET_SIZE,
    SCRFD_MODEL_NAME,
)


class FaceRecognizer:
    """
    ONNX-based Face Recognition Pipeline.
    
    Provides facial detection, landmark alignment, 512-D feature extraction,
    FAISS-backed gallery management, and 1:N identity search using inner product
    (equivalent to cosine similarity on L2-normalized embeddings).
    """

    def __init__(
        self,
        onnx_model_path: Union[str, Path] = DEFAULT_ONNX_MODEL_PATH,
        faiss_index_path: Union[str, Path] = FAISS_INDEX_PATH,
        faiss_names_path: Union[str, Path] = FAISS_NAMES_PATH,
        gallery_json_path: Union[str, Path] = GALLERY_JSON_PATH,
        providers: Optional[List[str]] = None,
    ) -> None:
        """
        Initializes the FaceRecognizer with ONNX Runtime session and SCRFD detector.
        Downloads model from Hugging Face if it does not exist locally.
        """
        self.onnx_model_path = Path(onnx_model_path)
        self.faiss_index_path = Path(faiss_index_path)
        self.faiss_names_path = Path(faiss_names_path)
        self.gallery_json_path = Path(gallery_json_path)
        self._gallery_lock = threading.Lock()
        if providers is None:
            providers = ["CPUExecutionProvider"]

        # Fetch from Hugging Face if not available locally
        if not self.onnx_model_path.exists():
            logger.info("Model not found at %s. Downloading from Hugging Face Hub...", self.onnx_model_path)
            try:
                # Determine which filename to pull based on the requested path
                filename = self.onnx_model_path.name
                if filename not in ["iresnet50_arcface_int8.onnx", "iresnet50_arcface.onnx"]:
                    filename = "iresnet50_arcface_int8.onnx" # Fallback to quantized
                
                cached_path = hf_hub_download(
                    repo_id="zahir9897/face-recognition-checkpoints",
                    filename=filename,
                    token=os.environ.get("HF_TOKEN")
                )
                self.onnx_model_path = Path(cached_path)
                logger.info("Successfully loaded model from Hugging Face cache: %s", self.onnx_model_path)
            except Exception as e:
                raise FileNotFoundError(
                    f"Failed to find local model and could not download from Hugging Face: {e}"
                )

        # Initialize ONNX Runtime Session for ArcFace Backbone
        session_options = ort.SessionOptions()
        session_options.graph_optimization_level = (
            ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        )
        self.session = ort.InferenceSession(
            str(self.onnx_model_path),
            session_options,
            providers=providers,
        )
        self.input_name: str = self.session.get_inputs()[0].name

        # Initialize InsightFace SCRFD Detector
        self.detector = FaceAnalysis(
            name=SCRFD_MODEL_NAME,
            allowed_modules=["detection"],
            providers=providers,
        )
        self.detector.prepare(ctx_id=-1, det_size=SCRFD_DET_SIZE)

        # Initialize FAISS index and name mapping
        self.names: List[str] = []
        self._load_gallery()

    # ── Gallery Persistence (FAISS) ─────────────────────────────────

    def _load_gallery(self) -> None:
        """Loads FAISS index and name mapping from disk. Falls back to migrating legacy JSON."""
        with self._gallery_lock:
            self.faiss_index_path.parent.mkdir(parents=True, exist_ok=True)

            if self.faiss_index_path.exists() and self.faiss_names_path.exists():
                # Load existing FAISS index
                self.index = faiss.read_index(str(self.faiss_index_path))
                with open(self.faiss_names_path, "r", encoding="utf-8") as f:
                    self.names = json.load(f)
                logger.info(
                    "Loaded FAISS gallery: %d vectors, %d name entries.",
                    self.index.ntotal, len(self.names),
                )
            elif self.gallery_json_path.exists():
                # Migrate from legacy JSON gallery
                logger.info("Migrating legacy gallery.json to FAISS index...")
                self.index = faiss.IndexFlatIP(EMBEDDING_DIM)
                self.names = []
                try:
                    with open(self.gallery_json_path, "r", encoding="utf-8") as f:
                        legacy_gallery: Dict[str, List[List[float]]] = json.load(f)
                    for person_name, embeddings in legacy_gallery.items():
                        for emb in embeddings:
                            vec = np.array(emb, dtype=np.float32).reshape(1, -1)
                            faiss.normalize_L2(vec)
                            self.index.add(vec)
                            self.names.append(person_name)
                    self._save_gallery_unlocked()
                    logger.info(
                        "Migration complete: %d vectors from %d identities.",
                        self.index.ntotal, len(set(self.names)),
                    )
                except Exception as e:
                    logger.error("Failed to migrate legacy gallery: %s", e)
                    self.index = faiss.IndexFlatIP(EMBEDDING_DIM)
                    self.names = []
            else:
                # Fresh start
                self.index = faiss.IndexFlatIP(EMBEDDING_DIM)
                self.names = []

    def _save_gallery_unlocked(self) -> None:
        """Saves FAISS index and name mapping to disk. Caller must hold _gallery_lock."""
        self.faiss_index_path.parent.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self.index, str(self.faiss_index_path))
        with open(self.faiss_names_path, "w", encoding="utf-8") as f:
            json.dump(self.names, f)

    def _save_gallery(self) -> None:
        """Saves gallery to disk (thread-safe)."""
        with self._gallery_lock:
            self._save_gallery_unlocked()

    # ── Embedding Extraction ────────────────────────────────────────

    def extract_embedding(self, aligned_face_bgr: np.ndarray) -> np.ndarray:
        """
        Extracts and L2-normalizes a 512-D embedding vector from an aligned 112x112 face crop.
        """
        rgb = cv2.cvtColor(aligned_face_bgr, cv2.COLOR_BGR2RGB)
        tensor = np.transpose(rgb, (2, 0, 1)).astype(np.float32)
        tensor = (tensor - 127.5) / 128.0
        tensor = np.expand_dims(tensor, axis=0)  

        outputs = self.session.run(None, {self.input_name: tensor})
        embedding: np.ndarray = outputs[0].flatten()

        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        return embedding

    def process_image(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detects, aligns, and extracts embeddings for all faces in an input image.
        """
        detected_faces = self.detector.get(image)
        results: List[Dict[str, Any]] = []

        for face in detected_faces:
            bbox = face.bbox.astype(int).tolist()  
            landmarks = face.kps  

            aligned = align_face(image, landmarks)
            if aligned is None:
                continue

            embedding = self.extract_embedding(aligned)
            results.append(
                {
                    "bbox": bbox,
                    "landmarks": landmarks.tolist(),
                    "embedding": embedding,
                }
            )

        return results

    # ── Enroll ──────────────────────────────────────────────────────

    def enroll(self, name: str, image: np.ndarray) -> Dict[str, Any]:
        """Enrolls a new person into the FAISS gallery."""
        faces = self.process_image(image)

        if len(faces) == 0:
            return {"status": "error", "message": "No face detected in image."}
        if len(faces) > 1:
            return {
                "status": "error",
                "message": "Multiple faces detected. Please upload an image with a single face.",
            }

        embedding = faces[0]["embedding"].astype(np.float32).reshape(1, -1)
        faiss.normalize_L2(embedding)

        with self._gallery_lock:
            self.index.add(embedding)
            self.names.append(name)
            samples_count = self.names.count(name)
            self._save_gallery_unlocked()

        return {
            "status": "success",
            "message": f"Successfully enrolled '{name}'. Total face samples for '{name}': {samples_count}",
            "enrolled_name": name,
            "samples_count": samples_count,
        }

    # ── Recognize ───────────────────────────────────────────────────

    def recognize(
        self,
        image: np.ndarray,
        threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
    ) -> List[Dict[str, Any]]:
        """
        Performs 1:N face identification using FAISS inner-product search
        against all enrolled embeddings.
        """
        faces = self.process_image(image)
        predictions: List[Dict[str, Any]] = []

        if self.index.ntotal == 0:
            # No enrolled faces — mark all as unknown
            for face in faces:
                predictions.append(
                    {
                        "bbox": face["bbox"],
                        "name": "Unknown",
                        "similarity": 0.0,
                        "matched": False,
                    }
                )
            return predictions

        for face in faces:
            query = face["embedding"].astype(np.float32).reshape(1, -1)
            faiss.normalize_L2(query)

            # Search top-1 nearest neighbor
            similarities, indices = self.index.search(query, 1)
            best_sim = float(similarities[0][0])
            best_idx = int(indices[0][0])

            if best_sim >= threshold and best_idx >= 0:
                best_name = self.names[best_idx]
                matched = True
            else:
                best_name = "Unknown"
                matched = False

            predictions.append(
                {
                    "bbox": face["bbox"],
                    "name": best_name,
                    "similarity": round(best_sim, 4),
                    "matched": matched,
                }
            )

        return predictions