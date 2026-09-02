"""
benchmark_inference.py
----------------------
CLI script to measure the ONNX Runtime inference latency of the 
ArcFace 512-D embedding extraction step.

This isolates the neural network execution time by running inference 
on a dummy aligned face tensor (112x112x3).
"""

import argparse
import sys
import time
import numpy as np
from pathlib import Path

# Add project root to sys.path to allow importing from src
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(PROJECT_ROOT))

from src.recognizer import FaceRecognizer


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Benchmark ONNX inference latency for feature extraction."
    )
    parser.add_argument(
        "-n",
        "--num_runs",
        type=int,
        default=100,
        help="Number of inference iterations to run (default: 100).",
    )
    parser.add_argument(
        "-w",
        "--warmup",
        type=int,
        default=10,
        help="Number of warmup iterations before measuring (default: 10).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    print("Initializing FaceRecognizer (loading ONNX model)...")
    recognizer = FaceRecognizer()
    
    # Generate a dummy aligned BGR face image (112x112x3)
    # Using random noise to simulate an image tensor
    print("Generating 112x112 dummy input tensor...")
    dummy_input = np.random.randint(0, 255, (112, 112, 3), dtype=np.uint8)

    print(f"Running {args.warmup} warmup iterations...")
    for _ in range(args.warmup):
        _ = recognizer.extract_embedding(dummy_input)

    print(f"Running {args.num_runs} benchmark iterations...")
    latencies = []

    for _ in range(args.num_runs):
        start_time = time.perf_counter()
        _ = recognizer.extract_embedding(dummy_input)
        end_time = time.perf_counter()
        
        # Convert to milliseconds
        latencies.append((end_time - start_time) * 1000)

    avg_latency = sum(latencies) / len(latencies)
    p95_latency = np.percentile(latencies, 95)
    p99_latency = np.percentile(latencies, 99)
    min_latency = min(latencies)
    max_latency = max(latencies)
    fps = 1000.0 / avg_latency

    print("\n" + "=" * 40)
    print(f"🔥 Benchmark Results (ONNX Runtime CPU)")
    print("=" * 40)
    print(f"Model Path    : {recognizer.onnx_model_path.name}")
    print(f"Total Runs    : {args.num_runs}")
    print(f"Average Latency: {avg_latency:.2f} ms")
    print(f"Throughput    : {fps:.2f} FPS")
    print("-" * 40)
    print(f"Min Latency   : {min_latency:.2f} ms")
    print(f"Max Latency   : {max_latency:.2f} ms")
    print(f"95th Percentile: {p95_latency:.2f} ms")
    print(f"99th Percentile: {p99_latency:.2f} ms")
    print("=" * 40)


if __name__ == "__main__":
    main()