"""
Tests for AgentEvolver Phase 2: Experience Buffer

Tests experience storage, retrieval, and similarity search.

Author: Nova (Full-Stack Specialist)
Date: 2025-11-18
"""

import pytest
import asyncio
from infrastructure.agentevolver.experience_buffer import (
    Experience,
    ExperienceBuffer,
    create_experience_from_trajectory,
)


class TestExperience:
    """Tests for Experience dataclass."""

    def test_creation(self):
        """Test experience creation."""
        exp = Experience(
            experience_id="exp_001",
            task_type="deployment",
            description="Deploy to Railway",
            state={"platform": "railway"},
            actions=[{"type": "deploy", "target": "railway"}],
            outcome={"status": "success"},
            quality_score=95.0,
        )

        assert exp.experience_id == "exp_001"
        assert exp.task_type == "deployment"
        assert exp.quality_score == 95.0

    def test_to_dict(self):
        """Test conversion to dict."""
        exp = Experience(
            experience_id="exp_001",
            task_type="deployment",
            description="Deploy to Railway",
            state={},
            actions=[],
            outcome={},
            quality_score=95.0,
        )

        d = exp.to_dict()

        assert isinstance(d, dict)
        assert d["experience_id"] == "exp_001"
        assert d["quality_score"] == 95.0

    def test_from_dict(self):
        """Test creation from dict."""
        data = {
            "experience_id": "exp_002",
            "task_type": "content",
            "description": "Generate blog post",
            "state": {},
            "actions": [],
            "outcome": {},
            "quality_score": 85.0,
        }

        exp = Experience.from_dict(data)

        assert exp.experience_id == "exp_002"
        assert exp.task_type == "content"


class TestExperienceBuffer:
    """Tests for ExperienceBuffer."""

    def test_initialization(self):
        """Test buffer initialization."""
        buffer = ExperienceBuffer(max_size=100)

        assert buffer is not None
        assert len(buffer.experiences) == 0
        assert buffer.max_size == 100

    def test_add_experience(self):
        """Test adding experience to buffer."""
        buffer = ExperienceBuffer(max_size=100)

        exp = Experience(
            experience_id="exp_001",
            task_type="deployment",
            description="Deploy to Railway",
            state={},
            actions=[],
            outcome={},
            quality_score=90.0,
        )

        buffer.add_experience(exp)

        assert len(buffer.experiences) == 1
        assert buffer.get_experience("exp_001") is not None

    def test_get_experience(self):
        """Test retrieving specific experience."""
        buffer = ExperienceBuffer()

        exp = Experience(
            experience_id="exp_test",
            task_type="deployment",
            description="Test",
            state={},
            actions=[],
            outcome={},
            quality_score=80.0,
        )

        buffer.add_experience(exp)

        retrieved = buffer.get_experience("exp_test")
        assert retrieved is not None
        assert retrieved.experience_id == "exp_test"

    def test_get_nonexistent_experience(self):
        """Test retrieving non-existent experience."""
        buffer = ExperienceBuffer()

        exp = buffer.get_experience("nonexistent")
        assert exp is None

    def test_get_by_task_type(self):
        """Test retrieving by task type."""
        buffer = ExperienceBuffer()

        # Add multiple experiences
        for i in range(3):
            exp = Experience(
                experience_id=f"exp_deploy_{i}",
                task_type="deployment",
                description=f"Deploy {i}",
                state={},
                actions=[],
                outcome={},
                quality_score=80.0 + i,
            )
            buffer.add_experience(exp)

        # Retrieve by task type
        exps = buffer.get_by_task_type("deployment", limit=5)

        assert len(exps) == 3
        # Should be sorted by quality (highest first)
        assert exps[0].quality_score > exps[-1].quality_score

    def test_buffer_max_size(self):
        """Test buffer respects max size."""
        buffer = ExperienceBuffer(max_size=3)

        # Add 5 experiences
        for i in range(5):
            exp = Experience(
                experience_id=f"exp_{i}",
                task_type="test",
                description=f"Experience {i}",
                state={},
                actions=[],
                outcome={},
                quality_score=10.0 + (i * 10),  # Increasing quality
            )
            buffer.add_experience(exp)

        # Buffer should only contain top 3
        assert len(buffer.experiences) == 3

        # Lowest quality experience should be removed
        assert buffer.get_experience("exp_0") is None

    def test_get_statistics(self):
        """Test buffer statistics."""
        buffer = ExperienceBuffer(max_size=100)

        # Add experiences
        for i in range(3):
            exp = Experience(
                experience_id=f"exp_{i}",
                task_type="deployment",
                description=f"Deploy {i}",
                state={},
                actions=[],
                outcome={},
                quality_score=70.0 + (i * 10),
            )
            buffer.add_experience(exp)

        stats = buffer.get_statistics()

        assert stats["total_experiences"] == 3
        assert stats["buffer_utilization"] == 3 / 100
        assert stats["avg_quality"] > 0.0

    def test_create_experience_from_trajectory(self):
        """Test creating experience from trajectory."""
        exp = create_experience_from_trajectory(
            task_type="deployment",
            description="Deploy to Railway",
            state={"platform": "railway"},
            actions=[{"type": "deploy"}],
            outcome={"status": "success"},
            quality_score=95.0,
        )

        assert exp is not None
        assert exp.task_type == "deployment"
        assert exp.quality_score == 95.0


@pytest.mark.asyncio
async def test_find_similar():
    """Test similarity search (requires TEI)."""
    buffer = ExperienceBuffer(max_size=100)

    # Add some experiences
    for i in range(3):
        exp = Experience(
            experience_id=f"exp_{i}",
            task_type="deployment",
            description=f"Deploy application {i} to Railway",
            state={},
            actions=[],
            outcome={},
            quality_score=85.0 + i,
        )
        buffer.add_experience(exp)

    # Find similar (may use text similarity if TEI unavailable)
    similar = await buffer.find_similar(
        query_description="Deploy to Railway platform",
        limit=2,
    )

    assert isinstance(similar, list)
    # Should return results or empty if TEI unavailable
    assert len(similar) <= 2

    if similar:
        exp, sim_score = similar[0]
        assert 0.0 <= sim_score <= 1.0
