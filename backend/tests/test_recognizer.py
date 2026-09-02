"""
test_recognizer.py
------------------
Basic unit tests for FaceRecognizer's enroll and recognize business logic.
Uses unittest.mock to bypass actual ONNX file loading and inference to ensure 
fast, isolated testing of the JSON gallery and cosine similarity math.
"""

import unittest
from unittest.mock import MagicMock, patch

import numpy as np

from src.recognizer import FaceRecognizer


class TestFaceRecognizerLogic(unittest.TestCase):
    @patch("src.recognizer.ort.InferenceSession")
    @patch("src.recognizer.FaceAnalysis")
    def setUp(self, mock_face_analysis, mock_ort_session) -> None:
        """Sets up the FaceRecognizer with mocked ONNX and InsightFace components."""
        # Bypass the physical file existence check for the unit test
        with patch("pathlib.Path.exists", return_value=True):
            self.recognizer = FaceRecognizer(
                onnx_model_path="dummy_model.onnx",
                gallery_path="dummy_gallery.json",
            )
        
        # Isolate the gallery in memory; disable actual disk I/O
        self.recognizer.gallery = {}
        self.recognizer._save_gallery = MagicMock()
        self.recognizer._load_gallery = MagicMock()

    def _generate_normalized_embedding(self) -> np.ndarray:
        """Helper to generate a valid 512-D L2-normalized vector."""
        emb = np.random.rand(512).astype(np.float32)
        return emb / np.linalg.norm(emb)

    def test_enroll_success(self) -> None:
        """Tests successful enrollment of a single detected face."""
        dummy_embedding = self._generate_normalized_embedding()
        
        # Mock process_image to simulate detecting exactly one face
        self.recognizer.process_image = MagicMock(return_value=[{
            "bbox": [10, 10, 100, 100],
            "landmarks": [[0, 0]] * 5,
            "embedding": dummy_embedding
        }])
        
        dummy_image = np.zeros((200, 200, 3), dtype=np.uint8)
        result = self.recognizer.enroll("Alice", dummy_image)
        
        self.assertEqual(result["status"], "success")
        self.assertIn("Alice", self.recognizer.gallery)
        self.assertEqual(len(self.recognizer.gallery["Alice"]), 1)
        # Verify the exact embedding was saved
        np.testing.assert_array_almost_equal(
            self.recognizer.gallery["Alice"][0], 
            dummy_embedding.tolist()
        )

    def test_recognize_match(self) -> None:
        """Tests recognition logic when query perfectly matches an enrolled embedding."""
        known_embedding = self._generate_normalized_embedding()
        self.recognizer.gallery = {"Alice": [known_embedding.tolist()]}
        
        # Mock process_image to return the exact same embedding
        self.recognizer.process_image = MagicMock(return_value=[{
            "bbox": [10, 10, 100, 100],
            "landmarks": [[0, 0]] * 5,
            "embedding": known_embedding
        }])
        
        dummy_image = np.zeros((200, 200, 3), dtype=np.uint8)
        predictions = self.recognizer.recognize(dummy_image, threshold=0.4)
        
        self.assertEqual(len(predictions), 1)
        self.assertEqual(predictions[0]["name"], "Alice")
        self.assertTrue(predictions[0]["matched"])
        # Dot product of identical normalized vectors is 1.0
        self.assertAlmostEqual(predictions[0]["similarity"], 1.0, places=5)

    def test_recognize_unknown(self) -> None:
        """Tests recognition logic when similarity falls below the threshold."""
        known_embedding = self._generate_normalized_embedding()
        self.recognizer.gallery = {"Alice": [known_embedding.tolist()]}
        
        # Generate a completely orthogonal/different embedding for the query
        query_embedding = -known_embedding  # Cosine similarity will be -1.0
        
        self.recognizer.process_image = MagicMock(return_value=[{
            "bbox": [10, 10, 100, 100],
            "landmarks": [[0, 0]] * 5,
            "embedding": query_embedding
        }])
        
        dummy_image = np.zeros((200, 200, 3), dtype=np.uint8)
        predictions = self.recognizer.recognize(dummy_image, threshold=0.4)
        
        self.assertEqual(len(predictions), 1)
        self.assertEqual(predictions[0]["name"], "Unknown")
        self.assertFalse(predictions[0]["matched"])
        self.assertLess(predictions[0]["similarity"], 0.4)


if __name__ == "__main__":
    unittest.main()