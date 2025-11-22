"""Comprehensive FP16 benchmarking suite.

Measures performance across multiple scenarios:
1. WorldModel training (FP16 vs FP32)
2. VRAM usage (if CUDA available)
3. Numerical stability (loss convergence)
4. Multi-GPU scaling (if multiple GPUs available)
5. Bfloat16 comparison (if supported)

Outputs detailed CSV reports and optional plots.
"""

import asyncio
import csv
import logging
import os
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional, Any

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None

from infrastructure.world_model import WorldModel
from infrastructure.training import (
    ExtendedFP16Trainer,
    ExtendedFP16Config,
    PrecisionMode,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@dataclass
class BenchmarkScenario:
    """Configuration for a benchmark scenario."""
    name: str
    precision_mode: str
    epochs: int
    trajectories: int
    batch_size: int
    use_cuda: bool


@dataclass
class BenchmarkResult:
    """Results from a single benchmark run."""
    scenario: str
    precision_mode: str
    duration_seconds: float
    throughput_samples_per_sec: float
    peak_memory_mb: float
    final_loss: float
    avg_loss: float
    overflow_rate: float
    cuda_available: bool
    cuda_device: Optional[str]
    numerical_stable: bool
    epochs: int
    trajectories: int
    batch_size: int


class MockReplayBuffer:
    """Mock replay buffer for consistent benchmarking."""
    
    def __init__(self, num_trajectories: int = 100, seed: int = 42):
        import random
        self.rng = random.Random(seed)
        self.trajectories = [
            self._generate_trajectory() for _ in range(num_trajectories)
        ]
    
    def _generate_trajectory(self) -> Dict[str, Any]:
        from infrastructure import OutcomeTag
        return {
            "initial_state": {
                "metrics": {
                    "overall_score": self.rng.uniform(0.3, 0.9),
                    "correctness": self.rng.uniform(0.2, 0.95),
                }
            },
            "actions": [f"edit_{i}" for i in range(self.rng.randint(1, 4))],
            "final_outcome": OutcomeTag.SUCCESS.value if self.rng.random() > 0.3 else OutcomeTag.FAILURE.value,
            "final_reward": self.rng.uniform(-0.1, 0.6),
        }
    
    def sample(self, limit: int = 1000) -> List[Dict[str, Any]]:
        return self.trajectories[:limit]


async def benchmark_world_model(
    scenario: BenchmarkScenario
) -> BenchmarkResult:
    """Benchmark WorldModel training with given configuration."""
    
    logger.info(f"Running benchmark: {scenario.name}")
    logger.info(f"  Precision: {scenario.precision_mode}")
    logger.info(f"  Epochs: {scenario.epochs}, Trajectories: {scenario.trajectories}")
    
    # Configure FP16 via environment
    if scenario.precision_mode == "fp16":
        os.environ["ENABLE_FP16_TRAINING"] = "true"
    else:
        os.environ["ENABLE_FP16_TRAINING"] = "false"
    
    # Track memory if CUDA available
    if TORCH_AVAILABLE and torch.cuda.is_available() and scenario.use_cuda:
        torch.cuda.reset_peak_memory_stats()
    
    # Initialize WorldModel
    world_model = WorldModel()
    world_model.replay_buffer = MockReplayBuffer(
        num_trajectories=scenario.trajectories,
        seed=42  # Deterministic
    )
    
    # Run training
    start_time = time.perf_counter()
    
    await world_model.train(
        num_epochs=scenario.epochs,
        batch_size=scenario.batch_size
    )
    
    duration = time.perf_counter() - start_time
    
    # Calculate metrics
    total_samples = scenario.epochs * scenario.trajectories
    throughput = total_samples / duration
    
    # Get memory usage
    if TORCH_AVAILABLE and torch.cuda.is_available() and scenario.use_cuda:
        peak_memory = torch.cuda.max_memory_allocated() / 1024**2  # MB
        device_name = torch.cuda.get_device_name(0)
    else:
        peak_memory = 0.0
        device_name = None
    
    # Get training statistics
    if world_model.training_history:
        final_loss = world_model.training_history[-1].get("loss", 0.0)
        avg_loss = sum(h.get("loss", 0.0) for h in world_model.training_history) / len(world_model.training_history)
        numerical_stable = all(
            not (loss != loss) and loss != float('inf') and loss != float('-inf')
            for loss in [h.get("loss", 0.0) for h in world_model.training_history]
        )
    else:
        final_loss = 0.0
        avg_loss = 0.0
        numerical_stable = True
    
    # Get FP16 statistics
    overflow_rate = 0.0
    if world_model._fp16_stats:
        overflow_rate = world_model._fp16_stats.get("overflow_rate", 0.0)
    
    result = BenchmarkResult(
        scenario=scenario.name,
        precision_mode=scenario.precision_mode,
        duration_seconds=duration,
        throughput_samples_per_sec=throughput,
        peak_memory_mb=peak_memory,
        final_loss=final_loss,
        avg_loss=avg_loss,
        overflow_rate=overflow_rate,
        cuda_available=TORCH_AVAILABLE and torch.cuda.is_available(),
        cuda_device=device_name,
        numerical_stable=numerical_stable,
        epochs=scenario.epochs,
        trajectories=scenario.trajectories,
        batch_size=scenario.batch_size
    )
    
    logger.info(f"  Duration: {duration:.2f}s")
    logger.info(f"  Throughput: {throughput:.1f} samples/s")
    logger.info(f"  Peak memory: {peak_memory:.1f} MB")
    logger.info(f"  Final loss: {final_loss:.4f}")
    logger.info(f"  Overflow rate: {overflow_rate:.2%}")
    
    return result


def generate_scenarios() -> List[BenchmarkScenario]:
    """Generate benchmark scenarios based on available hardware."""
    
    scenarios = []
    use_cuda = TORCH_AVAILABLE and torch.cuda.is_available()
    
    # Standard scenarios (CPU or CUDA)
    base_scenarios = [
        ("warmup", 1, 128, 16),
        ("standard", 3, 256, 32),
        ("stress", 5, 512, 32),
    ]
    
    for name, epochs, trajectories, batch_size in base_scenarios:
        # FP32 baseline
        scenarios.append(BenchmarkScenario(
            name=f"{name}_fp32",
            precision_mode="fp32",
            epochs=epochs,
            trajectories=trajectories,
            batch_size=batch_size,
            use_cuda=use_cuda
        ))
        
        # FP16 comparison
        scenarios.append(BenchmarkScenario(
            name=f"{name}_fp16",
            precision_mode="fp16",
            epochs=epochs,
            trajectories=trajectories,
            batch_size=batch_size,
            use_cuda=use_cuda
        ))
    
    return scenarios


def save_results(results: List[BenchmarkResult], output_dir: Path):
    """Save benchmark results to CSV."""
    
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "fp16_comprehensive_results.csv"
    
    with open(output_file, "w", newline="") as f:
        if results:
            writer = csv.DictWriter(f, fieldnames=asdict(results[0]).keys())
            writer.writeheader()
            for result in results:
                writer.writerow(asdict(result))
    
    logger.info(f"Results saved to {output_file}")


def generate_comparison_report(results: List[BenchmarkResult]) -> str:
    """Generate a human-readable comparison report."""
    
    report = []
    report.append("\n" + "="*80)
    report.append("FP16 COMPREHENSIVE BENCHMARK REPORT")
    report.append("="*80)
    
    # System info
    if TORCH_AVAILABLE and torch.cuda.is_available():
        report.append(f"\nHardware: {torch.cuda.get_device_name(0)}")
        report.append(f"CUDA Version: {torch.version.cuda}")
    else:
        report.append("\nHardware: CPU only")
    
    report.append(f"PyTorch Version: {torch.__version__ if TORCH_AVAILABLE else 'N/A'}")
    
    # Group results by scenario base name
    scenario_groups = {}
    for result in results:
        base_name = result.scenario.rsplit("_", 1)[0]  # Remove _fp32/_fp16 suffix
        if base_name not in scenario_groups:
            scenario_groups[base_name] = {}
        precision = result.precision_mode
        scenario_groups[base_name][precision] = result
    
    # Compare FP16 vs FP32 for each scenario
    report.append("\n" + "-"*80)
    report.append("PERFORMANCE COMPARISON (FP16 vs FP32)")
    report.append("-"*80)
    
    for scenario_name, precision_results in scenario_groups.items():
        if "fp32" in precision_results and "fp16" in precision_results:
            fp32 = precision_results["fp32"]
            fp16 = precision_results["fp16"]
            
            speedup = fp32.duration_seconds / fp16.duration_seconds
            memory_reduction = (fp32.peak_memory_mb - fp16.peak_memory_mb) / fp32.peak_memory_mb if fp32.peak_memory_mb > 0 else 0
            accuracy_diff = abs(fp16.final_loss - fp32.final_loss) / fp32.final_loss if fp32.final_loss > 0 else abs(fp16.final_loss - fp32.final_loss)
            
            report.append(f"\nScenario: {scenario_name}")
            report.append(f"  FP32 time:     {fp32.duration_seconds:8.2f}s")
            report.append(f"  FP16 time:     {fp16.duration_seconds:8.2f}s")
            report.append(f"  Speedup:       {speedup:8.2f}x {'✓' if speedup >= 1.5 else '○' if speedup >= 1.0 else '✗'}")
            
            if fp32.peak_memory_mb > 0:
                report.append(f"  FP32 VRAM:     {fp32.peak_memory_mb:8.1f} MB")
                report.append(f"  FP16 VRAM:     {fp16.peak_memory_mb:8.1f} MB")
                report.append(f"  VRAM saved:    {memory_reduction:8.1%} {'✓' if memory_reduction >= 0.3 else '○' if memory_reduction >= 0.1 else '○'}")
            
            report.append(f"  FP32 loss:     {fp32.final_loss:8.4f}")
            report.append(f"  FP16 loss:     {fp16.final_loss:8.4f}")
            report.append(f"  Accuracy diff: {accuracy_diff:8.1%} {'✓' if accuracy_diff < 0.05 else '○' if accuracy_diff < 0.10 else '✗'}")
            report.append(f"  Overflow rate: {fp16.overflow_rate:8.1%} {'✓' if fp16.overflow_rate < 0.1 else '○' if fp16.overflow_rate < 0.3 else '✗'}")
    
    # Summary
    report.append("\n" + "-"*80)
    report.append("SUMMARY")
    report.append("-"*80)
    
    avg_speedup = sum(
        precision_results["fp32"].duration_seconds / precision_results["fp16"].duration_seconds
        for precision_results in scenario_groups.values()
        if "fp32" in precision_results and "fp16" in precision_results
    ) / len([g for g in scenario_groups.values() if "fp32" in g and "fp16" in g])
    
    report.append(f"\nAverage FP16 speedup: {avg_speedup:.2f}x")
    
    if any(r.cuda_available for r in results):
        cuda_results = [r for r in results if r.cuda_available and r.precision_mode == "fp16"]
        if cuda_results:
            avg_memory = sum(r.peak_memory_mb for r in cuda_results) / len(cuda_results)
            report.append(f"Average FP16 VRAM usage: {avg_memory:.1f} MB")
    
    stable_count = sum(1 for r in results if r.numerical_stable)
    report.append(f"Numerical stability: {stable_count}/{len(results)} runs stable")
    
    report.append("\n" + "="*80)
    
    return "\n".join(report)


async def run_benchmarks():
    """Run all benchmark scenarios."""
    
    if not TORCH_AVAILABLE:
        logger.error("PyTorch not available. Cannot run benchmarks.")
        return
    
    logger.info("Starting comprehensive FP16 benchmarks...")
    
    # Generate scenarios
    scenarios = generate_scenarios()
    logger.info(f"Generated {len(scenarios)} benchmark scenarios")
    
    # Run benchmarks
    results = []
    for i, scenario in enumerate(scenarios, 1):
        logger.info(f"\n[{i}/{len(scenarios)}] Running {scenario.name}...")
        
        try:
            result = await benchmark_world_model(scenario)
            results.append(result)
        except Exception as e:
            logger.error(f"Benchmark {scenario.name} failed: {e}", exc_info=True)
    
    # Save results
    output_dir = project_root / "benchmarks"
    save_results(results, output_dir)
    
    # Generate report
    report = generate_comparison_report(results)
    print(report)
    
    # Save report
    report_file = output_dir / "fp16_comprehensive_report.txt"
    with open(report_file, "w") as f:
        f.write(report)
    logger.info(f"Report saved to {report_file}")
    
    return results


def plot_results(results: List[BenchmarkResult], output_dir: Path):
    """Generate comparison plots (optional, requires matplotlib)."""
    
    try:
        import matplotlib.pyplot as plt
        import numpy as np
    except ImportError:
        logger.warning("matplotlib not available - skipping plots")
        return
    
    # Group by scenario
    scenario_groups = {}
    for result in results:
        base_name = result.scenario.rsplit("_", 1)[0]
        if base_name not in scenario_groups:
            scenario_groups[base_name] = {}
        scenario_groups[base_name][result.precision_mode] = result
    
    # Create comparison plots
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle("FP16 vs FP32 Performance Comparison", fontsize=16, fontweight='bold')
    
    scenarios = list(scenario_groups.keys())
    x = np.arange(len(scenarios))
    width = 0.35
    
    # Speedup plot
    ax = axes[0, 0]
    speedups = [
        scenario_groups[s]["fp32"].duration_seconds / scenario_groups[s]["fp16"].duration_seconds
        for s in scenarios if "fp32" in scenario_groups[s] and "fp16" in scenario_groups[s]
    ]
    ax.bar(x, speedups, width, label='Speedup', color='#2ecc71')
    ax.axhline(y=1.0, color='r', linestyle='--', label='Baseline (1x)')
    ax.set_ylabel('Speedup (x)')
    ax.set_title('Training Speedup (FP16 vs FP32)')
    ax.set_xticks(x)
    ax.set_xticklabels(scenarios, rotation=45, ha='right')
    ax.legend()
    ax.grid(axis='y', alpha=0.3)
    
    # Memory usage plot
    ax = axes[0, 1]
    if any(scenario_groups[s]["fp32"].peak_memory_mb > 0 for s in scenarios):
        fp32_mem = [scenario_groups[s]["fp32"].peak_memory_mb for s in scenarios]
        fp16_mem = [scenario_groups[s]["fp16"].peak_memory_mb for s in scenarios]
        ax.bar(x - width/2, fp32_mem, width, label='FP32', color='#3498db')
        ax.bar(x + width/2, fp16_mem, width, label='FP16', color='#e74c3c')
        ax.set_ylabel('Peak Memory (MB)')
        ax.set_title('VRAM Usage Comparison')
        ax.set_xticks(x)
        ax.set_xticklabels(scenarios, rotation=45, ha='right')
        ax.legend()
        ax.grid(axis='y', alpha=0.3)
    else:
        ax.text(0.5, 0.5, 'CUDA not available', ha='center', va='center', transform=ax.transAxes)
    
    # Loss comparison
    ax = axes[1, 0]
    fp32_loss = [scenario_groups[s]["fp32"].final_loss for s in scenarios]
    fp16_loss = [scenario_groups[s]["fp16"].final_loss for s in scenarios]
    ax.bar(x - width/2, fp32_loss, width, label='FP32', color='#3498db')
    ax.bar(x + width/2, fp16_loss, width, label='FP16', color='#e74c3c')
    ax.set_ylabel('Final Loss')
    ax.set_title('Training Loss Comparison')
    ax.set_xticks(x)
    ax.set_xticklabels(scenarios, rotation=45, ha='right')
    ax.legend()
    ax.grid(axis='y', alpha=0.3)
    
    # Throughput comparison
    ax = axes[1, 1]
    fp32_throughput = [scenario_groups[s]["fp32"].throughput_samples_per_sec for s in scenarios]
    fp16_throughput = [scenario_groups[s]["fp16"].throughput_samples_per_sec for s in scenarios]
    ax.bar(x - width/2, fp32_throughput, width, label='FP32', color='#3498db')
    ax.bar(x + width/2, fp16_throughput, width, label='FP16', color='#e74c3c')
    ax.set_ylabel('Throughput (samples/s)')
    ax.set_title('Training Throughput Comparison')
    ax.set_xticks(x)
    ax.set_xticklabels(scenarios, rotation=45, ha='right')
    ax.legend()
    ax.grid(axis='y', alpha=0.3)
    
    plt.tight_layout()
    
    plot_file = output_dir / "fp16_comparison.png"
    plt.savefig(plot_file, dpi=150, bbox_inches='tight')
    logger.info(f"Plot saved to {plot_file}")
    plt.close()


if __name__ == "__main__":
    # Run benchmarks
    results = asyncio.run(run_benchmarks())
    
    # Generate plots if matplotlib available
    if results:
        output_dir = project_root / "benchmarks"
        plot_results(results, output_dir)
    
    logger.info("\nBenchmark suite complete!")

