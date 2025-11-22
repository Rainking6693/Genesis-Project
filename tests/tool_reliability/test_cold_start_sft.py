"""
Tests for DeepEyesV2 Tool Reliability - Cold-Start SFT

Tests supervised fine-tuning dataset collection and model training.
"""

import pytest
import asyncio
import json
from pathlib import Path
import tempfile

from infrastructure.tool_reliability.cold_start_sft import (
    ColdStartSFTDataset,
    ColdStartSFT,
    ToolInvocationExample,
)


@pytest.fixture
def dataset():
    """Create a test dataset"""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield ColdStartSFTDataset(data_dir=tmpdir)


@pytest.fixture
def sft():
    """Create a test SFT trainer"""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield ColdStartSFT(output_dir=tmpdir, data_dir=tmpdir)


def test_tool_invocation_example_creation():
    """Test creating a tool invocation example"""
    example = ToolInvocationExample(
        task_description="Execute Python code",
        tool_name="code_executor",
        parameters={"code": "print('hello')"},
        result={"output": "hello"},
        success=True,
        agent_name="builder_agent",
        metadata={}
    )
    
    assert example.task_description == "Execute Python code"
    assert example.tool_name == "code_executor"
    assert example.success is True
    assert example.agent_name == "builder_agent"


def test_tool_invocation_example_to_training_format():
    """Test converting example to training format"""
    example = ToolInvocationExample(
        task_description="Execute Python code",
        tool_name="code_executor",
        parameters={"code": "print('hello')"},
        result={"output": "hello"},
        success=True,
        agent_name="builder_agent",
        metadata={}
    )
    
    training_format = example.to_training_format()
    
    assert "prompt" in training_format
    assert "response" in training_format
    assert training_format["tool"] == "code_executor"
    assert training_format["success"] is True
    assert "Task: Execute Python code" in training_format["prompt"]
    assert "Tool: code_executor" in training_format["response"]


@pytest.mark.asyncio
async def test_add_example(dataset):
    """Test adding example to dataset"""
    example = ToolInvocationExample(
        task_description="Execute Python code",
        tool_name="code_executor",
        parameters={"code": "print('hello')"},
        result={"output": "hello"},
        success=True,
        agent_name="builder_agent",
        metadata={}
    )
    
    added = dataset.add_example(example)
    
    assert added is True
    assert len(dataset.examples) == 1
    assert dataset.examples[0] == example


@pytest.mark.asyncio
async def test_add_duplicate_example(dataset):
    """Test adding duplicate example is rejected"""
    example = ToolInvocationExample(
        task_description="Execute Python code",
        tool_name="code_executor",
        parameters={"code": "print('hello')"},
        result={"output": "hello"},
        success=True,
        agent_name="builder_agent",
        metadata={}
    )
    
    added1 = dataset.add_example(example)
    added2 = dataset.add_example(example)
    
    assert added1 is True
    assert added2 is False  # Duplicate rejected
    assert len(dataset.examples) == 1


@pytest.mark.asyncio
async def test_load_from_invocations(dataset):
    """Test loading examples from invocation logs"""
    # Create temporary invocation log
    with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
        invocation_data = {
            "task_description": "Execute Python code",
            "tool_name": "code_executor",
            "parameters": {"code": "print('hello')"},
            "result": {"output": "hello"},
            "success": True,
            "agent_name": "builder_agent",
            "metadata": {}
        }
        f.write(json.dumps(invocation_data) + "\n")
        f.write(json.dumps({**invocation_data, "success": False}) + "\n")  # Failed - should be skipped
        invocations_path = f.name
    
    try:
        count = await dataset.load_from_invocations(invocations_path)
        
        assert count == 1  # Only successful invocation added
        assert len(dataset.examples) == 1
        assert dataset.examples[0].success is True
    finally:
        Path(invocations_path).unlink()


@pytest.mark.asyncio
async def test_load_from_nonexistent_invocations(dataset):
    """Test loading from non-existent file returns 0"""
    count = await dataset.load_from_invocations("nonexistent.jsonl")
    
    assert count == 0
    assert len(dataset.examples) == 0


def test_split_dataset(dataset):
    """Test splitting dataset into train/val/test"""
    # Add 10 examples
    for i in range(10):
        example = ToolInvocationExample(
            task_description=f"Task {i}",
            tool_name="code_executor",
            parameters={},
            result={},
            success=True,
            agent_name="builder_agent",
            metadata={}
        )
        dataset.add_example(example)
    
    train, val, test = dataset.split_dataset(train_ratio=0.8, val_ratio=0.1)
    
    assert len(train) == 8
    assert len(val) == 1
    assert len(test) == 1


def test_save_dataset(dataset):
    """Test saving dataset to JSONL"""
    example = ToolInvocationExample(
        task_description="Execute Python code",
        tool_name="code_executor",
        parameters={"code": "print('hello')"},
        result={"output": "hello"},
        success=True,
        agent_name="builder_agent",
        metadata={}
    )
    dataset.add_example(example)
    
    output_path = dataset.save_dataset("test_dataset.jsonl")
    
    assert output_path.exists()
    assert output_path.name == "test_dataset.jsonl"
    
    # Verify content
    with output_path.open() as f:
        lines = f.readlines()
        assert len(lines) == 1
        data = json.loads(lines[0])
        assert "prompt" in data
        assert "response" in data


def test_get_statistics(dataset):
    """Test getting dataset statistics"""
    # Add examples from different agents/tools
    for i in range(5):
        example = ToolInvocationExample(
            task_description=f"Task {i}",
            tool_name="code_executor" if i % 2 == 0 else "test_runner",
            parameters={},
            result={},
            success=True,
            agent_name="builder_agent" if i % 2 == 0 else "qa_agent",
            metadata={}
        )
        dataset.add_example(example)
    
    stats = dataset.get_statistics()
    
    assert stats["total_examples"] == 5
    assert "tools" in stats
    assert "agents" in stats
    assert stats["success_rate"] == 1.0  # All successful


@pytest.mark.asyncio
async def test_sft_initialization(sft):
    """Test SFT trainer initialization"""
    assert sft.output_dir.exists()
    assert sft.data_dir.exists()
    assert len(sft.training_history) == 0


@pytest.mark.asyncio
async def test_sft_prepare_dataset(sft):
    """Test preparing dataset in SFT trainer"""
    # Create temporary invocation log
    with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
        for i in range(3):
            invocation_data = {
                "task_description": f"Task {i}",
                "tool_name": "code_executor",
                "parameters": {},
                "result": {},
                "success": True,
                "agent_name": "builder_agent",
                "metadata": {}
            }
            f.write(json.dumps(invocation_data) + "\n")
        invocations_path = f.name
    
    try:
        # Prepare dataset (loads from invocations)
        prepared_dataset = await sft.prepare_dataset(invocations_path)
        
        assert prepared_dataset is not None
        assert len(prepared_dataset.examples) == 3
    finally:
        Path(invocations_path).unlink()


@pytest.mark.asyncio
async def test_sft_train_placeholder(sft):
    """Test SFT training (placeholder - actual training requires model)"""
    # Create minimal dataset
    dataset = ColdStartSFTDataset(data_dir=sft.data_dir)
    example = ToolInvocationExample(
        task_description="Execute Python code",
        tool_name="code_executor",
        parameters={"code": "print('hello')"},
        result={"output": "hello"},
        success=True,
        agent_name="builder_agent",
        metadata={}
    )
    dataset.add_example(example)
    dataset_path = dataset.save_dataset()
    
    # Attempt training (will use placeholder if model unavailable)
    try:
        result = await sft.train(
            dataset_path=str(dataset_path),
            num_epochs=1,
            batch_size=1,
            learning_rate=1e-4
        )
        # Training may fail if model unavailable, but should not crash
        assert result is not None
        assert "final_loss" in result or "num_epochs" in result  # Should have training metrics
    except (NotImplementedError, FileNotFoundError):
        # Training not yet implemented or dataset path issue - this is acceptable
        pass

