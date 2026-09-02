"""
schemas.py
----------
Pydantic schemas for request validation and API response formatting.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class EnrollmentResponse(BaseModel):
    """Response schema for face enrollment endpoint."""

    status: str = Field(..., description="Status of enrollment ('success' or 'error')")
    message: str = Field(..., description="Detailed result message")
    enrolled_name: Optional[str] = Field(None, description="Name of enrolled person if successful")
    samples_count: Optional[int] = Field(None, description="Total enrolled samples for this person")


class DetectionPrediction(BaseModel):
    """Schema for individual face recognition prediction."""

    bbox: List[int] = Field(..., description="Bounding box coordinates [x1, y1, x2, y2]")
    name: str = Field(..., description="Identified person name or 'Unknown'")
    similarity: float = Field(..., description="Cosine similarity score")
    matched: bool = Field(..., description="True if similarity score >= threshold")


class RecognitionResponse(BaseModel):
    """Response schema for face recognition endpoint."""

    status: str = Field(..., description="Status of the recognition process")
    detected_faces: int = Field(..., description="Total number of faces detected in the image")
    predictions: List[DetectionPrediction] = Field(
        ..., description="List of recognition results for each detected face"
    )