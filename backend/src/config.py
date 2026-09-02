"""
config.py
---------
Central configuration file containing file paths, default parameters, 
and model constants for the Face Recognition system.
"""

from pathlib import Path
from typing import Tuple

# Base Project Root Directory
BASE_DIR: Path = Path(__file__).resolve().parent.parent

# Model Directories & Filenames
MODELS_DIR: Path = BASE_DIR / "models"
ONNX_FP32_FILENAME: str = "iresnet50_arcface.onnx"
ONNX_INT8_FILENAME: str = "iresnet50_arcface_int8.onnx"

ONNX_FP32_PATH: Path = MODELS_DIR / ONNX_FP32_FILENAME
ONNX_INT8_PATH: Path = MODELS_DIR / ONNX_INT8_FILENAME

# Default ONNX model path (prioritizes INT8 quantized version if available)
DEFAULT_ONNX_MODEL_PATH: Path = ONNX_INT8_PATH

# Gallery Database Persistence
DATA_DIR: Path = BASE_DIR / "data"
GALLERY_JSON_PATH: Path = DATA_DIR / "gallery.json"
FAISS_INDEX_PATH: Path = DATA_DIR / "gallery.faiss"
FAISS_NAMES_PATH: Path = DATA_DIR / "gallery_names.json"

# Recognition & Embedding Parameters
EMBEDDING_DIM: int = 512
DEFAULT_SIMILARITY_THRESHOLD: float = 0.4
TARGET_IMAGE_SIZE: Tuple[int, int] = (112, 112)

# SCRFD Detector Configuration
SCRFD_MODEL_NAME: str = "buffalo_l"
SCRFD_DET_SIZE: Tuple[int, int] = (640, 640)