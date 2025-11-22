"""
Test Script for DreamGym Integration
Demonstrates synthetic rollout generation and hybrid training

This script tests:
1. M_exp synthetic rollout generation
2. Curriculum generation with skill gap analysis
3. Hybrid replay buffer (real + synthetic)
4. Complete DreamGym training phase

Integration #69: DreamGym - Synthetic RL for Self-Evolution
"""
import sys
import os
import logging
import asyncio
import json
from pathlib import Path
from datetime import datetime
import time

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.load_env import load_genesis_env
from infrastructure.casebank import CaseBank
from infrastructure.trajectory_pool import TrajectoryPool, Trajectory, TrajectoryStatus
from infrastructure.oracle_hgm import OracleHGM
from infrastructure.evolution_strategies.m_exp_model import (
    ExperienceModel,
    State,
    Action
)
from infrastructure.evolution_strategies.curriculum_generator import (
    AdaptiveCurriculumGenerator,
    DifficultyEstimator
)
from infrastructure.evolution_strategies.hybrid_replay_buffer import (
    HybridExperienceReplayBuffer
)

# Load environment
load_genesis_env()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DreamGymIntegrationTest:
    """
    Comprehensive test suite for DreamGym integration
    """

    def __init__(self):
        self.results = {
            "test_suite": "DreamGym Integration",
            "start_time": datetime.now().isoformat(),
            "tests": []
        }

    async def run_all_tests(self):
        """Run all integration tests"""
        logger.info("=" * 70)
        logger.info("DREAMGYM INTEGRATION TEST SUITE")
        logger.info("=" * 70)

        suite_start = time.time()

        # Test 1: M_exp Model
        await self.test_m_exp_model()

        # Test 2: Curriculum Generator
        await self.test_curriculum_generator()

        # Test 3: Hybrid Replay Buffer
        await self.test_hybrid_replay_buffer()

        # Test 4: Complete Integration
        await self.test_complete_integration()

        suite_duration = time.time() - suite_start
        self.results["duration"] = suite_duration
        self.results["end_time"] = datetime.now().isoformat()

        # Print summary
        self._print_summary()

        # Save results
        self._save_results()

        return self.results

    async def test_m_exp_model(self):
        """Test M_exp Experience Model"""
        logger.info("\n" + "=" * 70)
        logger.info("TEST 1: M_EXP EXPERIENCE MODEL")
        logger.info("=" * 70)

        test_start = time.time()
        test_result = {
            "test": "m_exp_model",
            "subtests": []
        }

        try:
            # Initialize model
            logger.info("\n[1/3] Initializing M_exp model...")
            model = ExperienceModel(
                model="claude-haiku-4.5",
                temperature=0.7,
                max_rollout_steps=5
            )
            logger.info("  Model initialized successfully")

            # Test rollout generation
            logger.info("\n[2/3] Generating synthetic rollout...")
            initial_state = State(
                status="initial",
                completion=0.0,
                context={"task": "code_generation"}
            )

            rollout = await model.generate_rollout(
                task="Generate user authentication module",
                initial_state=initial_state,
                context={"language": "python"}
            )

            logger.info(f"  Generated rollout with {len(rollout.transitions)} steps")
            logger.info(f"  Total reward: {rollout.total_reward:.2f}")
            logger.info(f"  Success: {rollout.success}")

            # Validate rollout
            logger.info("\n[3/3] Validating rollout quality...")
            assert len(rollout.transitions) > 0, "Rollout should have transitions"
            assert rollout.total_reward != 0, "Rollout should have non-zero reward"

            logger.info("  Validation passed!")

            test_result["subtests"].append({
                "name": "rollout_generation",
                "success": True,
                "steps": len(rollout.transitions),
                "reward": rollout.total_reward,
                "metadata": rollout.metadata
            })

            # Test multiple rollouts
            logger.info("\n[BONUS] Generating multiple rollouts...")
            rollouts = []
            for i in range(3):
                r = await model.generate_rollout(
                    task=f"Task {i+1}: Implement feature",
                    initial_state=initial_state
                )
                rollouts.append(r)
                logger.info(
                    f"  Rollout {i+1}: {len(r.transitions)} steps, "
                    f"reward={r.total_reward:.2f}"
                )

            avg_reward = sum(r.total_reward for r in rollouts) / len(rollouts)
            logger.info(f"\nAverage reward across rollouts: {avg_reward:.2f}")

            test_result["success"] = True
            test_result["avg_reward"] = avg_reward

        except Exception as e:
            logger.error(f"Test failed: {e}", exc_info=True)
            test_result["success"] = False
            test_result["error"] = str(e)

        test_result["duration"] = time.time() - test_start
        self.results["tests"].append(test_result)

        logger.info("\n" + "-" * 70)
        logger.info(f"TEST 1 {'PASSED' if test_result['success'] else 'FAILED'}")
        logger.info("-" * 70)

    async def test_curriculum_generator(self):
        """Test Curriculum Generator"""
        logger.info("\n" + "=" * 70)
        logger.info("TEST 2: CURRICULUM GENERATOR")
        logger.info("=" * 70)

        test_start = time.time()
        test_result = {
            "test": "curriculum_generator",
            "subtests": []
        }

        try:
            # Setup trajectory pool with sample data
            logger.info("\n[1/4] Setting up trajectory pool...")
            trajectory_pool = TrajectoryPool(agent_name="curriculum_tester")

            # Add sample trajectories with varying quality
            tasks = [
                ("code_generation", 85.0),
                ("code_generation", 90.0),
                ("debugging", 65.0),  # Weak skill
                ("debugging", 70.0),  # Weak skill
                ("testing", 80.0),
                ("testing", 82.0)
            ]

            for idx, (task_type, quality) in enumerate(tasks):
                trajectory = Trajectory(
                    trajectory_id=f"curriculum_{task_type}_{idx}",
                    generation=idx + 1,
                    agent_name="curriculum_tester",
                    task_type=task_type,
                    task_description=f"{task_type}:sample",
                    focus_area=task_type,
                    code_changes=f"{task_type} changes",
                    problem_diagnosis=f"{task_type} issue",
                    proposed_strategy="sample strategy",
                    status=TrajectoryStatus.SUCCESS.value if quality >= 70 else TrajectoryStatus.FAILURE.value,
                    success_score=quality / 100.0,
                    metrics={"quality_score": quality},
                    metadata={"test": True}
                )
                trajectory_pool.add_trajectory(trajectory)

            logger.info(f"  Added {len(tasks)} sample trajectories")

            # Analyze skill gaps
            logger.info("\n[2/4] Analyzing skill gaps...")
            skill_analysis = trajectory_pool.analyze_skill_gaps()
            logger.info(f"  Weak skills: {skill_analysis['weak_skills']}")
            logger.info(f"  Strong skills: {skill_analysis['strong_skills']}")
            logger.info(f"  Recommended focus: {skill_analysis['recommended_focus']}")

            test_result["subtests"].append({
                "name": "skill_gap_analysis",
                "success": True,
                "weak_skills": skill_analysis['weak_skills'],
                "strong_skills": skill_analysis['strong_skills']
            })

            # Generate curriculum
            logger.info("\n[3/4] Generating adaptive curriculum...")
            generator = AdaptiveCurriculumGenerator(trajectory_pool)

            curriculum = generator.generate_curriculum(
                num_tasks=8,
                focus_weak_skills=True
            )

            logger.info(f"  Generated {len(curriculum.tasks)} tasks")
            logger.info(f"  Focus areas: {curriculum.focus_areas}")
            logger.info(f"  Total duration: {curriculum.total_duration} steps")

            # Show curriculum progression
            logger.info("\n[4/4] Curriculum task progression:")
            for i, task in enumerate(curriculum.tasks[:5], 1):  # Show first 5
                logger.info(
                    f"  Task {i}: {task.difficulty.value} - "
                    f"{task.task_type} (complexity: {task.estimated_complexity:.2f})"
                )

            test_result["subtests"].append({
                "name": "curriculum_generation",
                "success": True,
                "tasks": len(curriculum.tasks),
                "focus_areas": curriculum.focus_areas
            })

            test_result["success"] = True

        except Exception as e:
            logger.error(f"Test failed: {e}", exc_info=True)
            test_result["success"] = False
            test_result["error"] = str(e)

        test_result["duration"] = time.time() - test_start
        self.results["tests"].append(test_result)

        logger.info("\n" + "-" * 70)
        logger.info(f"TEST 2 {'PASSED' if test_result['success'] else 'FAILED'}")
        logger.info("-" * 70)

    async def test_hybrid_replay_buffer(self):
        """Test Hybrid Replay Buffer"""
        logger.info("\n" + "=" * 70)
        logger.info("TEST 3: HYBRID REPLAY BUFFER")
        logger.info("=" * 70)

        test_start = time.time()
        test_result = {
            "test": "hybrid_replay_buffer",
            "subtests": []
        }

        try:
            # Setup components
            logger.info("\n[1/5] Setting up components...")
            casebank = CaseBank()
            experience_model = ExperienceModel()

            # Add sample cases
            for i in range(10):
                await casebank.add_case(
                    state=f"Problem {i}",
                    action=f"Solution {i}",
                    reward=0.8 + i * 0.01,
                    metadata={"sample": True, "task": f"task_{i}"}
                )

            cases_loaded = await casebank.get_all_cases()
            logger.info(f"  Added {len(cases_loaded)} cases to CaseBank")

            # Initialize buffer
            logger.info("\n[2/5] Initializing hybrid buffer...")
            buffer = HybridExperienceReplayBuffer(
                casebank=casebank,
                experience_model=experience_model,
                real_ratio=0.2,
                min_quality_threshold=0.7
            )

            # Load real experiences
            logger.info("\n[3/5] Loading real experiences...")
            real_count = await buffer.initialize_from_casebank(min_quality=0.8)
            logger.info(f"  Loaded {real_count} real experiences")

            test_result["subtests"].append({
                "name": "load_real_experiences",
                "success": True,
                "count": real_count
            })

            # Generate synthetic experiences
            logger.info("\n[4/5] Generating synthetic experiences...")
            synthetic_count = await buffer.generate_synthetic_experiences(
                num_experiences=20
            )
            logger.info(f"  Generated {synthetic_count} synthetic experiences")

            test_result["subtests"].append({
                "name": "generate_synthetic",
                "success": True,
                "count": synthetic_count
            })

            # Sample hybrid batch
            logger.info("\n[5/5] Sampling hybrid batch...")
            batch = await buffer.sample_batch(batch_size=10)

            logger.info(f"  Batch contains {len(batch.experiences)} experiences")
            logger.info(f"  Real: {batch.real_count}, Synthetic: {batch.synthetic_count}")
            logger.info(f"  Real ratio: {batch.metadata['real_ratio']:.2f}")
            logger.info(f"  Avg reward: {batch.metadata['avg_reward']:.2f}")
            logger.info(f"  Avg quality: {batch.metadata['avg_quality']:.2f}")

            # Get statistics
            stats = buffer.get_statistics()
            logger.info("\n  Buffer statistics:")
            logger.info(f"    Real experiences: {stats['real_experiences']}")
            logger.info(f"    Synthetic generated: {stats['synthetic_generated']}")
            logger.info(f"    Batches sampled: {stats['batches_sampled']}")
            logger.info(f"    Synthetic buffer size: {stats['synthetic_buffer_size']}")

            test_result["subtests"].append({
                "name": "sample_batch",
                "success": True,
                "batch_size": len(batch.experiences),
                "real_count": batch.real_count,
                "synthetic_count": batch.synthetic_count
            })

            test_result["success"] = True
            test_result["statistics"] = stats

        except Exception as e:
            logger.error(f"Test failed: {e}", exc_info=True)
            test_result["success"] = False
            test_result["error"] = str(e)

        test_result["duration"] = time.time() - test_start
        self.results["tests"].append(test_result)

        logger.info("\n" + "-" * 70)
        logger.info(f"TEST 3 {'PASSED' if test_result['success'] else 'FAILED'}")
        logger.info("-" * 70)

    async def test_complete_integration(self):
        """Test complete DreamGym integration"""
        logger.info("\n" + "=" * 70)
        logger.info("TEST 4: COMPLETE INTEGRATION")
        logger.info("=" * 70)

        test_start = time.time()
        test_result = {
            "test": "complete_integration",
            "subtests": []
        }

        try:
            logger.info("\n[1/3] Running complete DreamGym pipeline...")

            # Initialize all components
            casebank = CaseBank()
            trajectory_pool = TrajectoryPool(agent_name="integration_tester")
            oracle = OracleHGM()

            # Seed with data
            logger.info("  Seeding data...")
            for i in range(5):
                await casebank.add_case(
                    state=f"Integration problem {i}",
                    action=f"Integration solution {i}",
                    reward=0.85 + i * 0.02,
                    metadata={
                        "test": "complete_integration",
                        "task": f"task_{i}"
                    }
                )

                trajectory = Trajectory(
                    trajectory_id=f"integration_traj_{i}",
                    generation=i + 1,
                    agent_name="integration_tester",
                    task_type="integration",
                    task_description=f"task_{i}",
                    focus_area="integration",
                    code_changes=f"solution {i}",
                    problem_diagnosis=f"problem {i}",
                    proposed_strategy="integration test",
                    status=TrajectoryStatus.SUCCESS.value,
                    success_score=0.8,
                    metrics={"quality_score": 80.0},
                    metadata={"test": "complete_integration"}
                )
                trajectory_pool.add_trajectory(trajectory)

            # Run DreamGym training phase
            logger.info("\n[2/3] Executing DreamGym training phase...")

            # Initialize components
            experience_model = ExperienceModel(model="claude-haiku-4.5")
            curriculum_gen = AdaptiveCurriculumGenerator(trajectory_pool)
            replay_buffer = HybridExperienceReplayBuffer(
                casebank, experience_model, real_ratio=0.2
            )

            # Execute pipeline
            await replay_buffer.initialize_from_casebank(min_quality=0.8)
            curriculum = curriculum_gen.generate_curriculum(num_tasks=5)
            await replay_buffer.generate_synthetic_experiences(num_experiences=10)
            batch = await replay_buffer.sample_batch(batch_size=8)

            logger.info(f"  Pipeline executed successfully")
            logger.info(f"  Curriculum tasks: {len(curriculum.tasks)}")
            logger.info(f"  Batch size: {len(batch.experiences)}")

            # Evaluate batch quality
            logger.info("\n[3/3] Evaluating batch quality...")
            quality_scores = []
            for exp in batch.experiences[:3]:  # Sample first 3
                score = await oracle.grade_output(
                    output=str(exp.trajectory),
                    expected=None
                )
                quality_scores.append(score)

            avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0
            logger.info(f"  Average batch quality: {avg_quality:.2f}")

            test_result["success"] = True
            test_result["curriculum_tasks"] = len(curriculum.tasks)
            test_result["batch_size"] = len(batch.experiences)
            test_result["avg_quality"] = avg_quality

        except Exception as e:
            logger.error(f"Test failed: {e}", exc_info=True)
            test_result["success"] = False
            test_result["error"] = str(e)

        test_result["duration"] = time.time() - test_start
        self.results["tests"].append(test_result)

        logger.info("\n" + "-" * 70)
        logger.info(f"TEST 4 {'PASSED' if test_result['success'] else 'FAILED'}")
        logger.info("-" * 70)

    def _print_summary(self):
        """Print test summary"""
        logger.info("\n" + "=" * 70)
        logger.info("TEST SUITE SUMMARY")
        logger.info("=" * 70)

        total_tests = len(self.results["tests"])
        passed_tests = sum(1 for t in self.results["tests"] if t.get("success", False))

        logger.info(f"\nTotal Tests: {total_tests}")
        logger.info(f"Passed: {passed_tests}")
        logger.info(f"Failed: {total_tests - passed_tests}")
        logger.info(f"Success Rate: {passed_tests / total_tests * 100:.1f}%")
        logger.info(f"Total Duration: {self.results['duration']:.2f}s")

        logger.info("\nTest Details:")
        for test in self.results["tests"]:
            status = "PASS" if test.get("success", False) else "FAIL"
            logger.info(f"  [{status}] {test['test']} ({test['duration']:.2f}s)")

        logger.info("\n" + "=" * 70)

    def _save_results(self):
        """Save test results to file"""
        results_dir = Path("logs")
        results_dir.mkdir(exist_ok=True)

        results_file = results_dir / "dreamgym_test_results.json"

        with open(results_file, 'w') as f:
            json.dump(self.results, f, indent=2)

        logger.info(f"\nResults saved to: {results_file}")


async def main():
    """Main entry point"""
    logger.info("\nStarting DreamGym Integration Tests...\n")

    # Create logs directory
    Path("logs").mkdir(exist_ok=True)

    # Run tests
    test_suite = DreamGymIntegrationTest()
    results = await test_suite.run_all_tests()

    # Return exit code
    all_passed = all(t.get("success", False) for t in results["tests"])
    return 0 if all_passed else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
