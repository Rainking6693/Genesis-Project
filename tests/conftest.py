"""
Pytest configuration and shared fixtures.

This module provides reusable fixtures, mocks, and test utilities
for the Genesis test suite.

Author: Alex (Full-Stack Testing Specialist)
Date: November 8, 2025
"""

import asyncio
import os
import sys
from pathlib import Path
from typing import Dict, Any, Generator
from unittest.mock import Mock, AsyncMock, MagicMock

import pytest
import numpy as np

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


# =============================================================================
# ASYNC FIXTURES
# =============================================================================

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# =============================================================================
# MIDDLEWARE FIXTURES
# =============================================================================

@pytest.fixture
def mock_tool_call():
    """Create mock ToolCall dataclass."""
    from infrastructure.middleware.base import ToolCall
    from datetime import datetime

    return ToolCall(
        tool_name="test_tool",
        agent_name="test_agent",
        arguments={"arg1": "value1", "arg2": 42},
        context={"execution_id": "test-123"},
        timestamp=datetime.now()
    )


@pytest.fixture
def mock_tool_result():
    """Create mock ToolResult dataclass."""
    from infrastructure.middleware.base import ToolResult
    from datetime import datetime

    return ToolResult(
        tool_name="test_tool",
        agent_name="test_agent",
        result={"output": "test result"},
        execution_time_ms=100.5,
        success=True,
        error=None,
        timestamp=datetime.now(),
        metadata={"model": "gpt-4o"}
    )


@pytest.fixture
def mock_policy_card():
    """Create mock policy card."""
    return {
        "agent_id": "test_agent",
        "version": "1.0.0",
        "allowed_tools": ["tool1", "tool2", "tool3"],
        "denied_tools": ["dangerous_tool"],
        "safety_constraints": {
            "pii_detection": True,
            "sensitive_data_redaction": True,
            "max_output_tokens": 1000,
        },
        "compliance_requirements": {
            "log_all_tool_calls": True,
            "retention_days": 90,
        },
        "action_rules": [
            {
                "pattern": "^write_file",
                "condition": "size_bytes < 1000000",
                "action": "ALLOW",
            }
        ]
    }


@pytest.fixture
def mock_capability_map():
    """Create mock capability map."""
    return {
        "test_agent": {
            "capabilities": ["search", "compute", "storage"],
            "tools": ["tool1", "tool2"],
            "max_concurrent_calls": 10,
            "rate_limit_per_minute": 60,
        }
    }


# =============================================================================
# EVOLUTION STRATEGIES FIXTURES
# =============================================================================

@pytest.fixture
def mock_lora_params():
    """Create mock LoRA parameters."""
    return {
        "lora_A.layer.0.weight": np.random.randn(8, 4096).astype(np.float32),
        "lora_B.layer.0.weight": np.random.randn(4096, 8).astype(np.float32),
        "lora_A.layer.1.weight": np.random.randn(8, 4096).astype(np.float32),
        "lora_B.layer.1.weight": np.random.randn(4096, 8).astype(np.float32),
    }


@pytest.fixture
def mock_lora_config():
    """Create mock LoRA config."""
    return {
        "r": 8,
        "lora_alpha": 128,
        "target_modules": ["q_proj", "k_proj", "v_proj", "o_proj"],
        "lora_dropout": 0.05,
        "bias": "none",
        "task_type": "CAUSAL_LM",
    }


@pytest.fixture
def temp_adapter_dir(tmp_path):
    """Create temporary directory for LoRA adapters."""
    adapter_dir = tmp_path / "lora_adapters"
    adapter_dir.mkdir(parents=True, exist_ok=True)
    return adapter_dir


# =============================================================================
# MOCK LLM FIXTURES
# =============================================================================

@pytest.fixture
def mock_llm_client():
    """Create mock LLM client."""
    mock = AsyncMock()
    mock.generate.return_value = "Mock LLM response"
    mock.embed.return_value = np.random.randn(1536).tolist()
    return mock


@pytest.fixture
def mock_transformers():
    """Mock transformers library."""
    mock_model = MagicMock()
    mock_model.generate.return_value = np.array([[1, 2, 3, 4, 5]])

    mock_tokenizer = MagicMock()
    mock_tokenizer.encode.return_value = [1, 2, 3]
    mock_tokenizer.decode.return_value = "Mock output"

    return {
        "model": mock_model,
        "tokenizer": mock_tokenizer,
    }


# =============================================================================
# FILE SYSTEM FIXTURES
# =============================================================================

@pytest.fixture
def temp_logs_dir(tmp_path):
    """Create temporary logs directory."""
    logs_dir = tmp_path / "logs" / "policy_compliance"
    logs_dir.mkdir(parents=True, exist_ok=True)
    return logs_dir


@pytest.fixture
def temp_policy_cards_dir(tmp_path):
    """Create temporary policy cards directory."""
    cards_dir = tmp_path / ".policy_cards"
    cards_dir.mkdir(parents=True, exist_ok=True)
    return cards_dir


# =============================================================================
# PYTEST CONFIGURATION
# =============================================================================

def pytest_configure(config):
    """Configure pytest."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "e2e: marks tests as end-to-end tests"
    )
    config.addinivalue_line(
        "markers", "gpu: marks tests requiring GPU"
    )


def pytest_collection_modifyitems(config, items):
    """Auto-mark tests based on file location."""
    for item in items:
        # Mark integration tests
        if "integration" in item.nodeid:
            item.add_marker(pytest.mark.integration)

        # Mark E2E tests
        if "e2e" in item.nodeid:
            item.add_marker(pytest.mark.e2e)

        # Mark GPU tests
        if "gpu" in item.nodeid or "cuda" in item.nodeid:
            item.add_marker(pytest.mark.gpu)


# =============================================================================
# TEST UTILITIES
# =============================================================================

class MockPolicyCardLoader:
    """Mock PolicyCardLoader for testing."""

    def __init__(self, cards_dir: str = ".policy_cards"):
        self.cards_dir = cards_dir
        self.cards = {}

    def load_card(self, agent_id: str) -> Dict[str, Any]:
        """Load policy card."""
        return self.cards.get(agent_id, {})

    def get_card(self, agent_id: str) -> Dict[str, Any]:
        """Get policy card."""
        return self.cards.get(agent_id)

    def is_tool_allowed(self, agent_id: str, tool_name: str, args: Dict) -> bool:
        """Check if tool is allowed."""
        card = self.get_card(agent_id)
        if not card:
            return True

        allowed = card.get("allowed_tools", [])
        denied = card.get("denied_tools", [])

        if tool_name in denied:
            return False

        if allowed and tool_name not in allowed:
            return False

        return True

    def check_action_rules(self, agent_id: str, tool_name: str, args: Dict) -> tuple:
        """Check action rules."""
        return True, "No rules violated"

    def get_safety_constraints(self, agent_id: str) -> Dict[str, Any]:
        """Get safety constraints."""
        card = self.get_card(agent_id)
        if not card:
            return {}
        return card.get("safety_constraints", {})

    def get_compliance_requirements(self, agent_id: str) -> Dict[str, Any]:
        """Get compliance requirements."""
        card = self.get_card(agent_id)
        if not card:
            return {}
        return card.get("compliance_requirements", {})

    def list_agents(self) -> list:
        """List all agents."""
        return list(self.cards.keys())

    def export_policy_summary(self) -> Dict[str, Any]:
        """Export policy summary."""
        return {
            "total_agents": len(self.cards),
            "agents": list(self.cards.keys()),
        }


@pytest.fixture
def mock_policy_loader():
    """Create mock PolicyCardLoader."""
    return MockPolicyCardLoader()


# =============================================================================
# AGENTEVOLVER TEST FIXTURES
# =============================================================================

@pytest.fixture(autouse=True)
def clear_agentevolver_storage():
    """
    Clear AgentEvolver storage before each test.
    
    This prevents test isolation failures where ExperienceBuffer loads
    persistent data from previous test runs.
    
    Scope: function (runs before each test)
    """
    import shutil
    from pathlib import Path
    
    # Define storage paths used by AgentEvolver
    storage_paths = [
        Path("data/agentevolver"),
        Path("data/agentevolver_test"),
    ]
    
    # Clear storage before test
    for storage_path in storage_paths:
        if storage_path.exists():
            try:
                shutil.rmtree(storage_path)
            except Exception as e:
                # Log but don't fail test setup if cleanup fails
                print(f"Warning: Failed to clear {storage_path}: {e}")
    
    # Create fresh directories
    for storage_path in storage_paths:
        storage_path.parent.mkdir(parents=True, exist_ok=True)
    
    yield  # Run test
    
    # Cleanup after test (optional - keeps artifacts for debugging)
    # for storage_path in storage_paths:
    #     if storage_path.exists():
    #         shutil.rmtree(storage_path)
