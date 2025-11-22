"""
Comprehensive DeepEyesV2 Tool Reliability Test Suite

End-to-end tests for:
- All phases of tool reliability enhancement
- Integration with 21 Genesis agents
- Full business generation workflow
"""

import pytest
import asyncio
import json
import tempfile
from pathlib import Path

from infrastructure.tool_reliability.baseline_metrics import (
    BaselineMetricsCollector,
    ToolFailureType,
)
from infrastructure.tool_reliability.cold_start_sft import (
    ColdStartSFT,
    ColdStartSFTDataset,
    ToolInvocationExample,
)
from infrastructure.tool_reliability.rl_refinement import (
    RLRefinement,
    RLTrajectory,
    RewardFunction,
)
from infrastructure.tool_reliability.realx_bench_integration import (
    RealXBenchDataset,
    RealXBenchEvaluator,
    TaskType,
)
from infrastructure.tool_reliability.multimodal_extensions import (
    MultimodalToolChainer,
    ImageToolType,
)


@pytest.fixture
def temp_dir():
    """Create temporary directory for test files"""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def baseline_collector(temp_dir):
    """Create baseline metrics collector"""
    return BaselineMetricsCollector(metrics_dir=temp_dir)


@pytest.fixture
def sft_trainer(temp_dir):
    """Create SFT trainer"""
    return ColdStartSFT(output_dir=f"{temp_dir}/models", data_dir=temp_dir)


@pytest.fixture
def rl_refinement(temp_dir):
    """Create RL refinement trainer"""
    return RLRefinement(output_dir=f"{temp_dir}/models", data_dir=temp_dir)


@pytest.fixture
def realx_evaluator(temp_dir):
    """Create RealX-Bench evaluator"""
    dataset = RealXBenchDataset(data_dir=temp_dir)
    dataset.generate_synthetic_dataset(num_tasks=100)
    return RealXBenchEvaluator(output_dir=temp_dir, dataset=dataset)


class TestBaseline:
    """Test baseline metrics collection"""

    @pytest.mark.asyncio
    async def test_collect_100_invocations(self, baseline_collector):
        """Collect 100 tool invocations"""
        for i in range(100):
            success = i % 10 != 0  # 90% success rate
            await baseline_collector.record_invocation(
                agent_name="builder_agent",
                tool_name="code_executor",
                task=f"Execute task {i}",
                parameters={"code": f"test_{i}"},
                success=success,
                latency_ms=50.0 + (i % 100),
                failure_type=ToolFailureType.TIMEOUT if not success else None,
            )

        assert len(baseline_collector.invocations) == 100
        metrics = baseline_collector.get_agent_metrics("builder_agent")
        assert metrics.success_rate == 0.9

    @pytest.mark.asyncio
    async def test_baseline_success_rate_target(self, baseline_collector):
        """Test baseline success rates are 60-80%"""
        for i in range(100):
            # Simulate 70% success rate
            success = i < 70
            await baseline_collector.record_invocation(
                agent_name="test_agent",
                tool_name="test_tool",
                task=f"Task {i}",
                parameters={},
                success=success,
                failure_type=ToolFailureType.API_ERROR if not success else None,
            )

        report = baseline_collector.generate_report()
        success_rate = report["summary"]["overall_success_rate"]
        assert 0.6 <= success_rate <= 0.8

    @pytest.mark.asyncio
    async def test_all_agents_tracked(self, baseline_collector):
        """Test that all 21 agents can be tracked"""
        agents = list(baseline_collector.agent_metrics.keys())
        assert len(agents) == 21

        # Record invocation for each agent
        for agent in agents[:5]:  # Sample 5
            await baseline_collector.record_invocation(
                agent_name=agent,
                tool_name="sample_tool",
                task="Sample task",
                parameters={},
                success=True,
                latency_ms=10.0,
            )

        # Verify all recorded
        for agent in agents[:5]:
            metrics = baseline_collector.get_agent_metrics(agent)
            assert metrics.total_invocations == 1


class TestSFT:
    """Test cold-start SFT training"""

    @pytest.mark.asyncio
    async def test_dataset_preparation(self, sft_trainer, baseline_collector, temp_dir):
        """Prepare SFT dataset from invocations"""
        # Create invocations
        for i in range(100):
            await baseline_collector.record_invocation(
                agent_name="builder_agent",
                tool_name="code_executor",
                task=f"Execute task {i}",
                parameters={"code": f"print({i})"},
                success=True,
                latency_ms=10.0,
                result={"output": f"result_{i}"},
            )

        # Save invocations
        invocations_path = await baseline_collector.save_invocations(
            f"{temp_dir}/invocations.jsonl"
        )

        # Prepare dataset
        dataset = await sft_trainer.prepare_dataset(str(invocations_path))

        assert len(dataset.examples) > 0
        stats = dataset.get_statistics()
        assert stats["total_examples"] == 100

    @pytest.mark.asyncio
    async def test_dataset_split(self, sft_trainer):
        """Test dataset train/val/test split"""
        dataset = sft_trainer.dataset

        # Add examples
        for i in range(100):
            example = ToolInvocationExample(
                task_description=f"Task {i}",
                tool_name="code_executor",
                parameters={"code": f"test_{i}"},
                result={"output": f"result_{i}"},
                success=True,
                agent_name="builder_agent",
                metadata={},
            )
            dataset.add_example(example)

        train, val, test = dataset.split_dataset()
        assert len(train) == 80
        assert len(val) == 10
        assert len(test) == 10

    @pytest.mark.asyncio
    async def test_sft_training_loop(self, sft_trainer, temp_dir):
        """Test SFT training execution"""
        # Create training dataset
        dataset_path = Path(temp_dir) / "sft_dataset.jsonl"
        with open(dataset_path, "w") as f:
            for i in range(100):
                example = {
                    "prompt": f"Execute task {i}",
                    "response": "code_executor",
                    "tool": "code_executor",
                    "parameters": {},
                    "success": True,
                }
                f.write(json.dumps(example) + "\n")

        # Train
        result = await sft_trainer.train(
            dataset_path=str(dataset_path),
            output_dir=f"{temp_dir}/sft_model",
            num_epochs=2,
        )

        assert result["num_examples"] == 100
        assert result["num_epochs"] == 2


class TestRL:
    """Test RL refinement"""

    @pytest.mark.asyncio
    async def test_reward_function(self):
        """Test reward computation"""
        reward_fn = RewardFunction()

        # Success reward
        reward = reward_fn.compute_reward(success=True, status_code=200)
        assert reward > 0

        # Failure penalty
        reward = reward_fn.compute_reward(success=False, status_code=500)
        assert reward < 0

        # Optimal tool bonus
        reward = reward_fn.compute_reward(
            success=True, status_code=200, is_optimal=True
        )
        assert reward > reward_fn.success_reward

    @pytest.mark.asyncio
    async def test_trajectory_collection(self, rl_refinement, temp_dir):
        """Test collecting RL trajectories"""
        # Create invocations file
        invocations_path = Path(temp_dir) / "invocations.jsonl"
        with open(invocations_path, "w") as f:
            for i in range(50):
                invocation = {
                    "task_description": f"Task {i}",
                    "tool_name": "code_executor",
                    "parameters": {},
                    "success": i % 10 != 0,
                    "status_code": 200 if i % 10 != 0 else 500,
                    "latency_ms": 10.0,
                    "agent_name": "builder_agent",
                }
                f.write(json.dumps(invocation) + "\n")

        count = await rl_refinement.collect_trajectories(str(invocations_path))
        assert count == 50

    @pytest.mark.asyncio
    async def test_rl_training(self, rl_refinement, temp_dir):
        """Test RL training loop"""
        # Add trajectories
        for i in range(100):
            trajectory = RLTrajectory(
                task_description=f"Task {i}",
                tool_name="code_executor",
                parameters={},
                success=i % 10 != 0,
                status_code=200 if i % 10 != 0 else 500,
                latency_ms=10.0,
                agent_name="builder_agent",
            )
            rl_refinement.add_trajectory(trajectory)

        result = await rl_refinement.train(
            num_steps=100,
            batch_size=32,
            learning_rate=1e-4,
        )

        assert result["num_trajectories"] == 100
        assert result["num_steps"] > 0


class TestRealXBench:
    """Test RealX-Bench evaluation"""

    @pytest.mark.asyncio
    async def test_dataset_generation(self):
        """Test RealX-Bench dataset generation"""
        dataset = RealXBenchDataset()
        dataset.generate_synthetic_dataset(num_tasks=500)

        assert len(dataset.tasks) == 500
        assert len(dataset.train_tasks) == 400
        assert len(dataset.val_tasks) == 50
        assert len(dataset.test_tasks) == 50

    @pytest.mark.asyncio
    async def test_baseline_vs_enhanced_evaluation(self, realx_evaluator):
        """Evaluate baseline vs enhanced on RealX-Bench"""
        tasks = realx_evaluator.dataset.test_tasks  # All test tasks

        # Baseline evaluation
        baseline_results = await realx_evaluator.evaluate_baseline(tasks)
        assert len(baseline_results) == len(tasks)

        # Enhanced evaluation
        enhanced_results = await realx_evaluator.evaluate_enhanced(tasks)
        assert len(enhanced_results) == len(tasks)

        # Compare
        comparison = realx_evaluator.compare_results(baseline_results, enhanced_results)

        assert "improvements" in comparison
        # Enhanced should perform better
        assert comparison["enhanced"]["success_rate"] >= comparison["baseline"]["success_rate"]


class TestMultimodal:
    """Test multimodal extensions"""

    @pytest.mark.asyncio
    async def test_tool_chainer_initialization(self):
        """Test multimodal tool chainer"""
        chainer = MultimodalToolChainer()
        assert chainer.ocr_client is not None
        assert chainer.image_search is not None
        assert chainer.video_search is not None

    @pytest.mark.asyncio
    async def test_tool_chaining(self, tmp_path):
        """Test tool chaining execution"""
        chainer = MultimodalToolChainer()

        # Create a dummy image file
        image_path = tmp_path / "test.png"
        image_path.write_bytes(b"fake image data")

        # Run chain
        chain = await chainer.screenshot_to_code_chain(
            image_path=str(image_path),
            task="Generate React component",
        )

        assert chain.success
        assert len(chain.steps) > 0

    @pytest.mark.asyncio
    async def test_chaining_metrics(self):
        """Test tool chaining metrics"""
        chainer = MultimodalToolChainer()

        # Add some chains
        for i in range(5):
            chain = await chainer.task_to_example_chain(f"Task {i}")

        metrics = chainer.get_chaining_metrics()
        assert metrics["num_chains"] == 5
        assert metrics["success_rate"] > 0


class TestIntegration:
    """Integration tests for full workflow"""

    @pytest.mark.asyncio
    async def test_full_pipeline(self, temp_dir):
        """Test full DeepEyesV2 pipeline"""
        # Phase 1: Baseline
        collector = BaselineMetricsCollector(metrics_dir=temp_dir)
        for i in range(100):
            await collector.record_invocation(
                agent_name="builder_agent",
                tool_name="code_executor",
                task=f"Task {i}",
                parameters={},
                success=i % 10 != 0,
                failure_type=ToolFailureType.TIMEOUT if i % 10 == 0 else None,
            )

        report = collector.generate_report()
        baseline_success = report["summary"]["overall_success_rate"]

        # Phase 2: SFT
        sft = ColdStartSFT(output_dir=f"{temp_dir}/models", data_dir=temp_dir)
        dataset = sft.dataset
        for i in range(100):
            example = ToolInvocationExample(
                task_description=f"Task {i}",
                tool_name="code_executor",
                parameters={},
                result={},
                success=True,
                agent_name="builder_agent",
                metadata={},
            )
            dataset.add_example(example)

        # Phase 3: RL
        rl = RLRefinement(output_dir=f"{temp_dir}/models", data_dir=temp_dir)
        for i in range(100):
            trajectory = RLTrajectory(
                task_description=f"Task {i}",
                tool_name="code_executor",
                parameters={},
                success=True,
                status_code=200,
            )
            rl.add_trajectory(trajectory)

        # Phase 4: RealX-Bench
        realx_dataset = RealXBenchDataset(data_dir=temp_dir)
        realx_dataset.generate_synthetic_dataset(num_tasks=100)
        evaluator = RealXBenchEvaluator(output_dir=temp_dir, dataset=realx_dataset)

        baseline_results = await evaluator.evaluate_baseline(realx_dataset.test_tasks)
        enhanced_results = await evaluator.evaluate_enhanced(realx_dataset.test_tasks)

        assert len(baseline_results) == len(realx_dataset.test_tasks)
        assert len(enhanced_results) == len(realx_dataset.test_tasks)

        # Phase 6: Multimodal
        chainer = MultimodalToolChainer()
        for i in range(5):
            chain = await chainer.task_to_example_chain(f"Task {i}")

        metrics = chainer.get_chaining_metrics()
        assert metrics["num_chains"] == 5

    @pytest.mark.asyncio
    async def test_success_rate_improvement(self, temp_dir):
        """Test that enhanced success rate > baseline"""
        # Create baseline and enhanced results
        baseline_collector = BaselineMetricsCollector(metrics_dir=temp_dir)

        # Baseline: 70% success
        for i in range(100):
            await baseline_collector.record_invocation(
                agent_name="test_agent",
                tool_name="test_tool",
                task=f"Task {i}",
                parameters={},
                success=i < 70,
            )

        baseline_report = baseline_collector.generate_report()
        baseline_rate = baseline_report["summary"]["overall_success_rate"]

        # Create RealX-Bench results showing improvement
        realx_dataset = RealXBenchDataset(data_dir=temp_dir)
        realx_dataset.generate_synthetic_dataset(num_tasks=100)
        evaluator = RealXBenchEvaluator(output_dir=temp_dir, dataset=realx_dataset)

        baseline_results = await evaluator.evaluate_baseline(realx_dataset.test_tasks)
        enhanced_results = await evaluator.evaluate_enhanced(realx_dataset.test_tasks)

        # Enhanced success rate should be higher
        baseline_success = sum(1 for r in baseline_results if r.success) / len(baseline_results)
        enhanced_success = sum(1 for r in enhanced_results if r.success) / len(enhanced_results)

        assert enhanced_success > baseline_success


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
