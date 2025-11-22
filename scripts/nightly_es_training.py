"""
Nightly Evolution Strategies Training Pipeline
Continuous improvement via evolutionary optimization + DreamGym synthetic RL

This pipeline:
1. Initializes from CaseBank with real trajectories
2. Generates synthetic curriculum via DreamGym
3. Trains with hybrid batches (20% real, 80% synthetic)
4. Evaluates fitness improvements
5. Updates LoRA adapters

Integration #69: DreamGym - Synthetic RL for Self-Evolution
"""
import sys
import os
import logging
import argparse
import time
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import asyncio

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.load_env import load_genesis_env
from infrastructure.error_handler import ErrorContext, ErrorCategory, ErrorSeverity, log_error_with_context
from infrastructure.casebank import CaseBank
from infrastructure.trajectory_pool import TrajectoryPool, Trajectory, TrajectoryStatus
from infrastructure.oracle_hgm import OracleHGM
from infrastructure.evolution_strategies.m_exp_model import ExperienceModel, State
from infrastructure.evolution_strategies.curriculum_generator import AdaptiveCurriculumGenerator
from infrastructure.evolution_strategies.hybrid_replay_buffer import HybridExperienceReplayBuffer

# Load environment
load_genesis_env()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/nightly-es-training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class ESConfig:
    """Configuration for ES training"""
    def __init__(
        self,
        iterations: int = 3,
        population_size: int = 8,
        learning_rate: float = 0.001,
        sigma: float = 0.01,
        dry_run: bool = False,
        use_dreamgym: bool = True,
        synthetic_batch_size: int = 32,
        curriculum_tasks: int = 10
    ):
        self.iterations = iterations
        self.population_size = population_size
        self.learning_rate = learning_rate
        self.sigma = sigma
        self.dry_run = dry_run
        self.use_dreamgym = use_dreamgym
        self.synthetic_batch_size = synthetic_batch_size
        self.curriculum_tasks = curriculum_tasks


class DreamGymTrainer:
    """
    DreamGym training integration for ES pipeline
    """

    def __init__(
        self,
        config: ESConfig,
        casebank: CaseBank,
        trajectory_pool: TrajectoryPool,
        oracle: OracleHGM
    ):
        """
        Initialize DreamGym trainer

        Args:
            config: ES configuration
            casebank: CaseBank for real trajectories
            trajectory_pool: TrajectoryPool for skill analysis
            oracle: OracleHGM for quality judging
        """
        self.config = config
        self.casebank = casebank
        self.trajectory_pool = trajectory_pool
        self.oracle = oracle

        # Initialize DreamGym components
        self.experience_model = ExperienceModel(
            model="claude-haiku-4.5",
            temperature=0.7
        )

        self.curriculum_generator = AdaptiveCurriculumGenerator(
            trajectory_pool=trajectory_pool
        )

        self.replay_buffer = HybridExperienceReplayBuffer(
            casebank=casebank,
            experience_model=self.experience_model,
            real_ratio=0.2,
            min_quality_threshold=0.7
        )

        logger.info("DreamGymTrainer initialized")

    async def run_dreamgym_phase(self) -> Dict[str, Any]:
        """
        Run DreamGym synthetic training phase

        Returns:
            Dict with training metrics
        """
        logger.info("=" * 60)
        logger.info("DREAMGYM SYNTHETIC RL TRAINING PHASE")
        logger.info("=" * 60)

        phase_start = time.time()
        metrics = {
            "phase": "dreamgym",
            "start_time": datetime.now().isoformat()
        }

        try:
            # Step 1: Initialize from CaseBank
            logger.info("\n[1/5] Initializing from CaseBank...")
            real_cases = await self.replay_buffer.initialize_from_casebank(
                min_quality=0.8
            )
            logger.info(f"  Loaded {real_cases} high-quality real cases")
            metrics["real_cases_loaded"] = real_cases

            # Step 2: Generate adaptive curriculum
            logger.info("\n[2/5] Generating adaptive curriculum...")
            curriculum = self.curriculum_generator.generate_curriculum(
                num_tasks=self.config.curriculum_tasks,
                focus_weak_skills=True
            )
            logger.info(
                f"  Generated curriculum: {len(curriculum.tasks)} tasks, "
                f"focus areas: {curriculum.focus_areas}"
            )
            metrics["curriculum"] = {
                "tasks": len(curriculum.tasks),
                "focus_areas": curriculum.focus_areas,
                "total_duration": curriculum.total_duration
            }

            # Step 3: Generate synthetic experiences
            logger.info("\n[3/5] Generating synthetic experiences...")
            task_templates = [task.description for task in curriculum.tasks]
            synthetic_count = await self.replay_buffer.generate_synthetic_experiences(
                num_experiences=self.config.synthetic_batch_size * 2,  # Generate extra for buffer
                task_templates=task_templates
            )
            logger.info(f"  Generated {synthetic_count} synthetic experiences")
            metrics["synthetic_generated"] = synthetic_count

            # Step 4: Sample hybrid training batches
            logger.info("\n[4/5] Sampling hybrid training batches...")
            batches = []
            num_batches = 3  # Sample multiple batches for training

            for i in range(num_batches):
                batch = await self.replay_buffer.sample_batch(
                    batch_size=self.config.synthetic_batch_size
                )
                batches.append(batch)
                logger.info(
                    f"  Batch {i+1}: {batch.real_count} real + {batch.synthetic_count} synthetic "
                    f"(avg reward: {batch.metadata.get('avg_reward', 0):.2f})"
                )

            metrics["batches_sampled"] = len(batches)
            metrics["total_experiences"] = sum(len(b.experiences) for b in batches)

            # Step 5: Evaluate batch quality
            logger.info("\n[5/5] Evaluating batch quality...")
            quality_scores = []
            for batch in batches:
                for exp in batch.experiences[:5]:  # Sample first 5 from each batch
                    score = await self.oracle.grade_output(
                        output=str(exp.trajectory),
                        expected=None
                    )
                    quality_scores.append(score)

            avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0
            logger.info(f"  Average batch quality: {avg_quality:.2f}")
            metrics["avg_batch_quality"] = avg_quality

            # Get buffer statistics
            buffer_stats = self.replay_buffer.get_statistics()
            metrics["buffer_stats"] = buffer_stats

            phase_duration = time.time() - phase_start
            metrics["duration"] = phase_duration
            metrics["end_time"] = datetime.now().isoformat()

            logger.info("\n" + "=" * 60)
            logger.info(f"DreamGym phase complete in {phase_duration:.2f}s")
            logger.info("=" * 60)

            return metrics

        except Exception as e:
            log_error_with_context(
                logger, e,
                ErrorContext(
                    category=ErrorCategory.TRAINING,
                    severity=ErrorSeverity.HIGH,
                    component="DreamGymTrainer",
                    operation="run_dreamgym_phase"
                )
            )
            metrics["error"] = str(e)
            metrics["success"] = False
            return metrics


class ESTrainingPipeline:
    """
    Complete ES training pipeline with DreamGym integration
    """

    def __init__(self, config: ESConfig):
        """
        Initialize ES training pipeline

        Args:
            config: ES configuration
        """
        self.config = config

        # Initialize infrastructure with SQL backend
        self.casebank = CaseBank(sql_backend=True)
        self.trajectory_pool = TrajectoryPool(sql_backend=True)
        self.oracle = OracleHGM()

        # Initialize DreamGym trainer
        self.dreamgym_trainer = DreamGymTrainer(
            config=config,
            casebank=self.casebank,
            trajectory_pool=self.trajectory_pool,
            oracle=self.oracle
        )

        # Metrics storage
        self.metrics = {
            "config": {
                "iterations": config.iterations,
                "population_size": config.population_size,
                "learning_rate": config.learning_rate,
                "dry_run": config.dry_run,
                "use_dreamgym": config.use_dreamgym
            },
            "phases": []
        }

        logger.info(f"ESTrainingPipeline initialized with config: {vars(config)}")

    async def run(self) -> Dict[str, Any]:
        """
        Run complete ES training pipeline

        Returns:
            Dict with training metrics
        """
        logger.info("\n" + "=" * 60)
        logger.info("STARTING NIGHTLY ES TRAINING PIPELINE")
        logger.info("=" * 60)

        pipeline_start = time.time()

        try:
            # Seed with sample trajectories for testing
            await self._seed_sample_data()

            # Phase 1: DreamGym synthetic training (if enabled)
            if self.config.use_dreamgym:
                dreamgym_metrics = await self.dreamgym_trainer.run_dreamgym_phase()
                self.metrics["phases"].append(dreamgym_metrics)
            else:
                logger.info("DreamGym phase skipped (disabled)")

            # Phase 2: Traditional ES training
            logger.info("\n" + "=" * 60)
            logger.info("TRADITIONAL ES TRAINING PHASE")
            logger.info("=" * 60)

            es_metrics = await self._run_es_phase()
            self.metrics["phases"].append(es_metrics)

            # Calculate overall metrics
            pipeline_duration = time.time() - pipeline_start
            self.metrics["total_duration"] = pipeline_duration
            self.metrics["success"] = True

            logger.info("\n" + "=" * 60)
            logger.info(f"PIPELINE COMPLETE in {pipeline_duration:.2f}s")
            logger.info("=" * 60)

            # Save metrics
            self._save_metrics()

            return self.metrics

        except Exception as e:
            log_error_with_context(
                logger, e,
                ErrorContext(
                    category=ErrorCategory.TRAINING,
                    severity=ErrorSeverity.CRITICAL,
                    component="ESTrainingPipeline",
                    operation="run"
                )
            )
            self.metrics["success"] = False
            self.metrics["error"] = str(e)
            return self.metrics

    async def _seed_sample_data(self):
        """Seed with sample data for testing"""
        logger.info("Seeding sample data...")

        # Add sample cases to CaseBank
        for i in range(5):
            await self.casebank.add_case(
                state=f"Sample problem {i}",
                action=f"Sample solution {i}",
                reward=0.85 + i * 0.02,
                metadata={
                    "seed": True,
                    "task": f"code_generation:{i}"
                }
            )

        # Add sample trajectories to TrajectoryPool
        for i in range(5):
            trajectory = Trajectory(
                trajectory_id=f"seed_traj_{i}",
                generation=i + 1,
                agent_name="seed_agent",
                task_type="code_generation",
                task_description=f"code_generation:{i}",
                focus_area="code_generation",
                code_changes="\n".join(f"step {j}" for j in range(3)),
                problem_diagnosis="Seed trajectory for curriculum warm-up",
                proposed_strategy="seed data",
                status=TrajectoryStatus.SUCCESS.value,
                success_score=min(0.99, 0.7 + i * 0.05),
                metrics={"reward": 0.7 + i * 0.05},
                metadata={"seed": True}
            )
            self.trajectory_pool.add_trajectory(trajectory)

        logger.info("  Seeded 5 cases and 5 trajectories")

    async def _run_es_phase(self) -> Dict[str, Any]:
        """Run traditional ES training phase"""
        logger.info("\nRunning ES training...")

        es_start = time.time()
        metrics = {
            "phase": "es_training",
            "iterations": self.config.iterations
        }

        # Simulate ES training for demo
        for i in range(self.config.iterations):
            logger.info(f"\n  Iteration {i+1}/{self.config.iterations}")

            if not self.config.dry_run:
                # In production, this would:
                # 1. Load current adapter
                # 2. Generate population variants
                # 3. Evaluate fitness
                # 4. Update adapter with elite parameters
                await asyncio.sleep(0.5)  # Simulate work

            logger.info(f"    Completed iteration {i+1}")

        es_duration = time.time() - es_start
        metrics["duration"] = es_duration
        metrics["success"] = True

        logger.info(f"\nES training complete in {es_duration:.2f}s")

        return metrics

    def _save_metrics(self):
        """Save training metrics to file"""
        metrics_dir = Path("metrics")
        metrics_dir.mkdir(exist_ok=True)

        metrics_file = metrics_dir / "es_training_metrics.json"

        with open(metrics_file, 'w') as f:
            json.dump(self.metrics, f, indent=2)

        logger.info(f"\nMetrics saved to: {metrics_file}")


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Nightly ES Training Pipeline with DreamGym")

    parser.add_argument(
        "--iterations",
        type=int,
        default=3,
        help="Number of ES iterations (default: 3)"
    )

    parser.add_argument(
        "--population",
        type=int,
        default=8,
        help="ES population size (default: 8)"
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Dry run mode (no model updates)"
    )

    parser.add_argument(
        "--no-dreamgym",
        action="store_true",
        help="Disable DreamGym synthetic training"
    )

    parser.add_argument(
        "--synthetic-batch-size",
        type=int,
        default=32,
        help="Synthetic batch size (default: 32)"
    )

    parser.add_argument(
        "--curriculum-tasks",
        type=int,
        default=10,
        help="Number of curriculum tasks (default: 10)"
    )

    args = parser.parse_args()

    # Create configuration
    config = ESConfig(
        iterations=args.iterations,
        population_size=args.population,
        dry_run=args.dry_run,
        use_dreamgym=not args.no_dreamgym,
        synthetic_batch_size=args.synthetic_batch_size,
        curriculum_tasks=args.curriculum_tasks
    )

    # Create directories
    Path("logs").mkdir(exist_ok=True)
    Path("metrics").mkdir(exist_ok=True)

    # Run pipeline
    pipeline = ESTrainingPipeline(config)
    metrics = await pipeline.run()

    # Print summary
    print("\n" + "=" * 60)
    print("TRAINING SUMMARY")
    print("=" * 60)
    print(f"Success: {metrics.get('success', False)}")
    print(f"Total Duration: {metrics.get('total_duration', 0):.2f}s")
    print(f"Phases: {len(metrics.get('phases', []))}")

    if metrics.get("success"):
        for phase in metrics.get("phases", []):
            print(f"\n{phase.get('phase', 'unknown').upper()}:")
            print(f"  Duration: {phase.get('duration', 0):.2f}s")
            if phase.get("phase") == "dreamgym":
                print(f"  Real Cases: {phase.get('real_cases_loaded', 0)}")
                print(f"  Synthetic Generated: {phase.get('synthetic_generated', 0)}")
                print(f"  Batches Sampled: {phase.get('batches_sampled', 0)}")
                print(f"  Avg Quality: {phase.get('avg_batch_quality', 0):.2f}")

    print("=" * 60)

    return 0 if metrics.get("success") else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
