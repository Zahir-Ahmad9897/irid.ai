"""
align.py
--------
Facial alignment utility using 5-point facial landmarks and similarity 
transformation (estimateAffinePartial2D + warpAffine) to warp cropped face images 
into standard ArcFace 112x112 dimensions.
"""

from typing import Optional, Tuple
import cv2
import numpy as np

# Standard ArcFace 112x112 reference 5-point facial landmarks
ARCFACE_DST: np.ndarray = np.array(
    [
        [38.2946, 51.6963],  # left eye
        [73.5318, 51.5014],  # right eye
        [56.0252, 71.7366],  # nose tip
        [41.5493, 92.3655],  # left mouth corner
        [70.7299, 92.2041],  # right mouth corner
    ],
    dtype=np.float32,
)


def align_face(
    image: np.ndarray,
    landmarks: np.ndarray,
    output_size: Tuple[int, int] = (112, 112),
) -> Optional[np.ndarray]:
    """
    Aligns and crops a face from an image based on 5 facial landmarks using 
    a partial affine (similarity) transformation.

    Parameters
    ----------
    image : np.ndarray
        Input image in BGR format with shape (H, W, 3).
    landmarks : np.ndarray
        Detected 5-point facial landmarks with shape (5, 2).
    output_size : Tuple[int, int], optional
        Target aligned face dimensions (width, height), by default (112, 112).

    Returns
    -------
    Optional[np.ndarray]
        Warped and aligned face image of shape (output_size[1], output_size[0], 3),
        or None if landmark estimation or transformation matrix computation fails.
    """
    if image is None or landmarks is None or landmarks.shape != (5, 2):
        return None

    src_pts: np.ndarray = landmarks.astype(np.float32)

    # Estimate similarity transform matrix (scale, rotation, translation)
    # estimateAffinePartial2D finds optimal 2x3 affine matrix for similarity transform
    M, _ = cv2.estimateAffinePartial2D(src_pts, ARCFACE_DST, method=cv2.LMEDS)

    if M is None:
        return None

    # Warp image to standard 112x112 ArcFace aligned target crop
    aligned: np.ndarray = cv2.warpAffine(
        image,
        M,
        output_size,
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=0,
    )

    return aligned