"""
enroll_batch.py
---------------
CLI script to bulk-enroll face identities from a specified directory.
The script assumes that each image file is named after the person 
(e.g., 'john_doe.jpg' will be enrolled as 'john_doe').
"""

import argparse
import sys
from pathlib import Path
from typing import List, Tuple

import cv2

# Add project root to sys.path to allow importing from src
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(PROJECT_ROOT))

from src.recognizer import FaceRecognizer


def parse_args() -> argparse.Namespace:
    """Parses command line arguments."""
    parser = argparse.ArgumentParser(
        description="Bulk enroll faces from a directory into the gallery."
    )
    parser.add_argument(
        "-i",
        "--input_dir",
        type=str,
        required=True,
        help="Path to the directory containing face images.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_dir = Path(args.input_dir)

    if not input_dir.exists() or not input_dir.is_dir():
        print(f"Error: Directory '{input_dir}' does not exist.")
        sys.exit(1)

    # Supported image extensions
    valid_extensions: Tuple[str, ...] = (".jpg", ".jpeg", ".png", ".bmp")
    image_paths: List[Path] = [
        p for p in input_dir.iterdir() if p.suffix.lower() in valid_extensions
    ]

    if not image_paths:
        print(f"No valid images found in '{input_dir}'.")
        sys.exit(0)

    print(f"Found {len(image_paths)} images. Initializing FaceRecognizer...")
    recognizer = FaceRecognizer()
    
    success_count = 0
    fail_count = 0

    for img_path in image_paths:
        # Extract name from filename (e.g., "zahir_ahmad.jpg" -> "zahir_ahmad")
        name = img_path.stem
        image = cv2.imread(str(img_path))

        if image is None:
            print(f"[FAIL] {img_path.name}: Could not read image.")
            fail_count += 1
            continue

        print(f"Enrolling '{name}' from {img_path.name}...")
        result = recognizer.enroll(name=name, image=image)

        if result["status"] == "success":
            print(f"  -> [SUCCESS] {result['message']}")
            success_count += 1
        else:
            print(f"  -> [ERROR] {result['message']}")
            fail_count += 1

    print("-" * 40)
    print(f"Batch Enrollment Complete!")
    print(f"Successfully Enrolled: {success_count}")
    print(f"Failed to Enroll: {fail_count}")


if __name__ == "__main__":
    main()