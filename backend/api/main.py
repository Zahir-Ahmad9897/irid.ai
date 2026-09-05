"""
main.py
-------
FastAPI application defining HTTP endpoints for face enrollment 
and recognition using the ONNX FaceRecognizer engine.
"""

import logging
import os
from contextlib import asynccontextmanager
from api.auth import router as auth_router, init_auth_db

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

from api.schemas import DetectionPrediction, EnrollmentResponse, RecognitionResponse
from src.config import DEFAULT_SIMILARITY_THRESHOLD
from src.recognizer import FaceRecognizer
from src.db import init_db, insert_log, insert_audit, get_db

logger = logging.getLogger(__name__)

# Read allowed origins from environment variable (comma-separated).
# Default to localhost for local development.
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

# 10 MB upload limit
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize heavy resources at startup, clean up on shutdown."""
    logger.info("Initializing SQLite database...")
    init_db()
    init_auth_db()
    logger.info("Loading FaceRecognizer model...")
    app.state.recognizer = FaceRecognizer()
    logger.info("FaceRecognizer ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="irid.ai API",
    description="irid.ai — Production-ready Face Recognition API using ArcFace ONNX and SCRFD.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)


def decode_image_file(file_bytes: bytes) -> np.ndarray:
    """Decodes uploaded raw byte array into an OpenCV BGR image matrix."""
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Upload exceeds maximum size of {MAX_UPLOAD_BYTES // (1024*1024)} MB.",
        )
    nparr = np.frombuffer(file_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file format or corrupted payload.",
        )
    return image


@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check() -> dict:
    """Health check endpoint to verify service status."""
    recognizer = app.state.recognizer
    return {"status": "healthy", "model_path": str(recognizer.onnx_model_path)}


@app.post(
    "/enroll",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Enroll a new face identity",
)
async def enroll_face(
    name: str = Form(..., description="Name or unique ID of the person to enroll"),
    file: UploadFile = File(..., description="Image file containing a single face"),
) -> EnrollmentResponse:
    """
    Enrolls a single person into the gallery database from an uploaded image.
    The uploaded image must contain exactly one detectable face.
    """
    if not name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name parameter cannot be empty.",
        )

    file_bytes = await file.read()
    image = decode_image_file(file_bytes)

    recognizer = app.state.recognizer
    result = recognizer.enroll(name=name.strip(), image=image)

    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )

    # Log the enrollment action
    enrolled_name = result.get("enrolled_name")
    insert_log(camera="System Enrollment", name=enrolled_name, status="known", confidence=1.0)
    insert_audit(action="ENROLL_IDENTITY", target=enrolled_name, actor="admin")

    return EnrollmentResponse(
        status=result["status"],
        message=result["message"],
        enrolled_name=enrolled_name,
        samples_count=result.get("samples_count"),
    )


@app.post(
    "/recognize",
    response_model=RecognitionResponse,
    status_code=status.HTTP_200_OK,
    summary="Recognize face(s) in an image",
)
async def recognize_face(
    file: UploadFile = File(..., description="Image file to scan and recognize"),
    threshold: float = Form(
        DEFAULT_SIMILARITY_THRESHOLD,
        description="Cosine similarity threshold for identification",
    ),
) -> RecognitionResponse:
    """
    Detects faces in an uploaded image and identifies them against the gallery database.
    """
    file_bytes = await file.read()
    image = decode_image_file(file_bytes)

    recognizer = app.state.recognizer
    predictions_data = recognizer.recognize(image=image, threshold=threshold)

    predictions = []
    for pred in predictions_data:
        predictions.append(DetectionPrediction(
            bbox=pred["bbox"],
            name=pred["name"],
            similarity=pred["similarity"],
            matched=pred["matched"],
        ))
        # Log to database
        status_str = "known" if pred["matched"] else "unknown"
        insert_log(camera="Camera 1", name=pred["name"], status=status_str, confidence=pred["similarity"])

    return RecognitionResponse(
        status="success",
        detected_faces=len(predictions),
        predictions=predictions,
    )


@app.get("/identities", status_code=status.HTTP_200_OK, summary="List all enrolled identities")
async def list_identities():
    """Returns a list of unique enrolled identities with their sample counts."""
    recognizer = app.state.recognizer
    return recognizer.get_identities()


@app.delete("/identities/{name}", status_code=status.HTTP_200_OK, summary="Delete an identity")
async def delete_identity(name: str):
    """Deletes all embeddings for a given identity from the gallery."""
    recognizer = app.state.recognizer
    res = recognizer.delete_identity(name)
    if res["status"] == "error":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=res["message"])
    
    insert_audit(action="DELETE_IDENTITY", target=name, actor="admin")
    return res


@app.get("/audit-log", status_code=status.HTTP_200_OK, summary="Get deletion audit log")
async def get_audit_log():
    """Returns the history of deleted identities."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


@app.get("/logs", status_code=status.HTTP_200_OK, summary="Get system recognition logs")
async def get_logs(status: str = None, search: str = None):
    """Returns system logs with optional filtering by status (known/unknown) and search string."""
    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM system_logs WHERE 1=1"
        params = []
        
        if status and status != "all":
            query += " AND status = ?"
            params.append(status)
            
        if search:
            query += " AND name LIKE ?"
            params.append(f"%{search}%")
            
        query += " ORDER BY timestamp DESC LIMIT 500"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]