"""Benchmark FP16 vs FP32 training for the Genesis world model.

The script uses deterministic synthetic trajectories so it can run offline and in
CPU-only environments. When CUDA is available it enables AMP and reports timing
and overflow statistics gathered from :class:`FP16Trainer`.

Outputs:
- benchmarks/fp16_vs_fp32_results.csv (aggregated metrics)
- benchmarks/fp16_vs_fp32_plot.png (optional, if matplotlib present)
"""

from __future__ import annotations

import asyncio
import os
import random
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

try:
    import pandas as pd  # type: ignore
except ImportError:  # pragma: no cover - plotting optional
    pd = None  # type: ignore

try:
    import matplotlib.pyplot as plt  # type: ignore
except ImportError:  # pragma: no cover - plotting optional
    plt = None  # type: ignore

try:
    import torch
except ImportError:  # pragma: no cover - torch optional for heuristics
    torch = None  # type: ignore

from infrastructure import OutcomeTag
from infrastructure.world_model import WorldModel

BENCHMARK_DIR = Path("benchmarks")
BENCHMARK_DIR.mkdir(exist_ok=True)


@dataclass
class Scenario:
    name: str
    epochs: int
    trajectories: int


class StaticReplayBuffer:
    """Replay buffer stub returning deterministic synthetic trajectories."""

    def __init__(self, trajectories: List[Dict]):
        self._trajectories = trajectories

    def sample(self, limit=1000):
        return self._trajectories[:limit]


def generate_trajectory(seed: int) -> Dict:
    rng = random.Random(seed)
    return {
        "initial_state": {
            "metrics": {
                "overall_score": rng.uniform(0.3, 0.9),
                "correctness": rng.uniform(0.2, 0.95),
            }
        },
        "actions": [f"edit_{i}" for i in range(rng.randint(1, 4))],
        "final_outcome": OutcomeTag.SUCCESS.value if rng.random() > 0.3 else OutcomeTag.FAILURE.value,
        "final_reward": rng.uniform(-0.1, 0.6),
    }


async def train_world_model(fp16_env: bool, scenario: Scenario) -> Dict[str, float]:
    os.environ["ENABLE_FP16_TRAINING"] = "true" if fp16_env else "false"

    world_model = WorldModel()
    trajectories = [generate_trajectory(i) for i in range(scenario.trajectories)]
    world_model.replay_buffer = StaticReplayBuffer(trajectories)

    start = time.perf_counter()
    await world_model.train(num_epochs=scenario.epochs, batch_size=16)
    duration = time.perf_counter() - start

    stats = world_model._fp16_stats or {}
    stats = {**stats}  # copy so we can mutate freely
    stats["fp16_enabled_runtime"] = getattr(world_model, "fp16_enabled", False)
    stats["duration_seconds"] = duration
    stats["epochs"] = scenario.epochs
    stats["trajectories"] = scenario.trajectories
    stats["cuda_available"] = torch.cuda.is_available() if torch is not None else False
    return stats


def run_benchmark() -> List[Dict[str, float]]:
    scenarios = [
        Scenario(name="warmup", epochs=1, trajectories=128),
        Scenario(name="standard", epochs=3, trajectories=256),
        Scenario(name="stress", epochs=5, trajectories=512),
    ]

    results: List[Dict[str, float]] = []

    for scenario in scenarios:
        fp32_stats = asyncio.run(train_world_model(False, scenario))
        fp16_stats = asyncio.run(train_world_model(True, scenario))

        combined = {
            "scenario": scenario.name,
            "fp32_duration_s": fp32_stats["duration_seconds"],
            "fp16_duration_s": fp16_stats["duration_seconds"],
            "speedup": fp32_stats["duration_seconds"] / max(fp16_stats["duration_seconds"], 1e-6),
            "cuda_available": fp16_stats["cuda_available"],
            "fp16_runtime_enabled": fp16_stats["fp16_enabled_runtime"],
            "epochs": scenario.epochs,
            "trajectories": scenario.trajectories,
            "fp16_overflow_rate": fp16_stats.get("overflow_rate", 0.0),
        }
        results.append(combined)

    return results


def persist_results(results: List[Dict[str, float]]) -> None:
    if not results:
        return

    csv_path = BENCHMARK_DIR / "fp16_vs_fp32_results.csv"
    if pd is None:
        # Fallback simple CSV writer
        headers = list(results[0].keys())
        lines = [",".join(headers)]
        for row in results:
            lines.append(",".join(str(row.get(col, "")) for col in headers))
        csv_path.write_text("\n".join(lines))
    else:
        frame = pd.DataFrame(results)
        frame.to_csv(csv_path, index=False)

    if pd is not None and plt is not None:
        frame = pd.DataFrame(results)
        fig, ax = plt.subplots(figsize=(8, 5))
        ax.bar(frame["scenario"], frame["speedup"], color="#4e79a7")
        ax.set_ylabel("Speedup (x)")
        ax.set_title("FP16 vs FP32 Training Speedup")
        ax.axhline(y=1.0, color="#f28e2b", linestyle="--", linewidth=1)
        plt.tight_layout()
        plt.savefig(BENCHMARK_DIR / "fp16_vs_fp32_plot.png", dpi=150)

    print("Benchmark results saved to", csv_path)


if __name__ == "__main__":
    results = run_benchmark()
    persist_results(results)
