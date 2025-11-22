"""
Tests for AgentEvolver Phase 2: Multi-Agent Experience Sharing

Tests experience transfer between agents, cross-business transfer learning,
and metrics tracking for agent collaboration.

Author: Nova (Full-Stack Specialist)
Date: 2025-11-18
"""

import pytest
import asyncio
from infrastructure.agentevolver.multi_agent_sharing import (
    MultiAgentSharing,
    AgentType,
    AgentProfile,
    TransferMetrics,
    get_multi_agent_sharing,
)
from infrastructure.agentevolver.experience_buffer import (
    Experience,
    get_experience_buffer,
)


class TestAgentProfile:
    """Tests for AgentProfile."""

    def test_creation(self):
        """Test agent profile creation."""
        profile = AgentProfile(
            agent_type=AgentType.DEPLOY,
            name="deploy_agent",
            total_tasks_completed=10,
            successful_transfers=5,
            received_transfers=3,
            avg_reuse_success_rate=0.85,
        )

        assert profile.agent_type == AgentType.DEPLOY
        assert profile.name == "deploy_agent"
        assert profile.total_tasks_completed == 10
        assert profile.successful_transfers == 5

    def test_to_dict(self):
        """Test converting profile to dictionary."""
        profile = AgentProfile(
            agent_type=AgentType.MARKETING,
            name="marketing_agent",
            total_tasks_completed=20,
            successful_transfers=15,
        )

        d = profile.to_dict()

        assert isinstance(d, dict)
        assert d["agent_type"] == "marketing"
        assert d["name"] == "marketing_agent"
        assert d["total_tasks_completed"] == 20


class TestTransferMetrics:
    """Tests for TransferMetrics."""

    def test_creation(self):
        """Test transfer metrics creation."""
        metrics = TransferMetrics(
            source_agent="deploy_agent",
            target_agent="builder_agent",
            successful_transfers=8,
            failed_transfers=2,
            avg_transfer_quality_improvement=15.0,
        )

        assert metrics.source_agent == "deploy_agent"
        assert metrics.target_agent == "builder_agent"
        assert metrics.successful_transfers == 8

    def test_get_success_rate(self):
        """Test calculating success rate."""
        metrics = TransferMetrics(
            source_agent="marketing_agent",
            target_agent="content_agent",
            successful_transfers=8,
            failed_transfers=2,
        )

        success_rate = metrics.get_success_rate()

        assert success_rate == 0.8  # 8 / (8 + 2)

    def test_get_success_rate_zero(self):
        """Test success rate with no transfers."""
        metrics = TransferMetrics(
            source_agent="agent_a",
            target_agent="agent_b",
        )

        success_rate = metrics.get_success_rate()

        assert success_rate == 0.0

    def test_to_dict(self):
        """Test converting metrics to dictionary."""
        metrics = TransferMetrics(
            source_agent="deploy_agent",
            target_agent="builder_agent",
            successful_transfers=7,
            failed_transfers=3,
            avg_transfer_quality_improvement=12.5,
        )

        d = metrics.to_dict()

        assert isinstance(d, dict)
        assert d["source_agent"] == "deploy_agent"
        assert d["success_rate"] == 0.7


class TestMultiAgentSharing:
    """Tests for MultiAgentSharing."""

    def test_initialization(self):
        """Test multi-agent sharing initialization."""
        sharing = MultiAgentSharing()

        assert sharing is not None
        assert len(sharing.agent_profiles) > 0
        assert len(sharing.transfer_metrics) == 0

    def test_agent_profiles_created(self):
        """Test that all agent profiles are initialized."""
        sharing = MultiAgentSharing()

        # Check that all AgentTypes have profiles
        agent_types = [agent_type.value for agent_type in AgentType]
        for agent_type in agent_types:
            assert agent_type in sharing.agent_profiles
            profile = sharing.agent_profiles[agent_type]
            assert profile.name == agent_type

    @pytest.mark.asyncio
    async def test_deploy_agent_learning_from_previous_deployments(self):
        """Test Deploy Agent learns from previous deployments."""
        buffer = get_experience_buffer()
        sharing = MultiAgentSharing(experience_buffer=buffer)

        # Add deployment experiences to buffer
        exp1 = Experience(
            experience_id="deploy_exp_001",
            task_type="deploy",
            description="Deploy to Railway",
            state={"platform": "railway"},
            actions=[{"action": "configure_railway"}],
            outcome={"status": "success"},
            quality_score=95.0,
        )

        exp2 = Experience(
            experience_id="deploy_exp_002",
            task_type="deploy",
            description="Deploy to Render",
            state={"platform": "render"},
            actions=[{"action": "configure_render"}],
            outcome={"status": "success"},
            quality_score=90.0,
        )

        buffer.add_experience(exp1)
        buffer.add_experience(exp2)

        # Get transferable experiences for deploy agent
        experiences = await sharing.get_transferable_experiences(
            source_agent="deploy",
            target_agent="builder",
            limit=5,
        )

        # Should get high-quality deployments
        assert len(experiences) > 0
        assert all(exp.quality_score >= 80.0 for exp in experiences)

    @pytest.mark.asyncio
    async def test_marketing_template_reuse(self):
        """Test Marketing Agent reuses campaign templates."""
        buffer = get_experience_buffer()
        sharing = MultiAgentSharing(experience_buffer=buffer)

        # Add marketing experiences
        exp1 = Experience(
            experience_id="marketing_exp_001",
            task_type="marketing",
            description="Email campaign template",
            state={"template": "email_nurture"},
            actions=[{"action": "send_email"}],
            outcome={"status": "success", "opens": 45, "clicks": 12},
            quality_score=85.0,
        )

        buffer.add_experience(exp1)

        # Marketing agent reuses this experience
        experiences = await sharing.get_transferable_experiences(
            source_agent="marketing",
            target_agent="marketing",  # Same agent type
            limit=5,
        )

        assert len(experiences) > 0
        assert experiences[0].task_type == "marketing"

    @pytest.mark.asyncio
    async def test_content_agent_structure_reuse(self):
        """Test Content Agent reuses content structures."""
        buffer = get_experience_buffer()
        sharing = MultiAgentSharing(experience_buffer=buffer)

        # Add content experiences with different structures
        exp1 = Experience(
            experience_id="content_exp_001",
            task_type="content",
            description="Blog post structure",
            state={"type": "blog", "sections": ["intro", "body", "conclusion"]},
            actions=[{"action": "create_blog"}],
            outcome={"status": "success"},
            quality_score=88.0,
        )

        buffer.add_experience(exp1)

        experiences = await sharing.get_transferable_experiences(
            source_agent="content",
            target_agent="content",
            limit=5,
        )

        assert len(experiences) > 0
        assert experiences[0].description == "Blog post structure"

    @pytest.mark.asyncio
    async def test_record_transfer_success(self):
        """Test recording successful experience transfer."""
        sharing = MultiAgentSharing()

        exp = Experience(
            experience_id="exp_transfer",
            task_type="deploy",
            description="Successful deployment",
            state={},
            actions=[],
            outcome={"status": "success"},
            quality_score=92.0,
        )

        await sharing.transfer_experience(
            source_agent="deploy",
            target_agent="builder",
            experience=exp,
            success=True,
            quality_improvement=10.0,
        )

        # Check transfer metrics were recorded
        key = ("deploy", "builder")
        assert key in sharing.transfer_metrics
        metrics = sharing.transfer_metrics[key]
        assert metrics.successful_transfers == 1
        assert metrics.failed_transfers == 0

    @pytest.mark.asyncio
    async def test_record_transfer_failure(self):
        """Test recording failed experience transfer."""
        sharing = MultiAgentSharing()

        exp = Experience(
            experience_id="exp_fail",
            task_type="deploy",
            description="Failed deployment attempt",
            state={},
            actions=[],
            outcome={"status": "failed"},
            quality_score=45.0,
        )

        await sharing.transfer_experience(
            source_agent="deploy",
            target_agent="builder",
            experience=exp,
            success=False,
            quality_improvement=0.0,
        )

        # Check failure was recorded
        key = ("deploy", "builder")
        assert key in sharing.transfer_metrics
        metrics = sharing.transfer_metrics[key]
        assert metrics.failed_transfers == 1
        assert metrics.successful_transfers == 0

    @pytest.mark.asyncio
    async def test_cross_business_transfer_success_tracking(self):
        """Test tracking cross-business transfer success."""
        sharing = MultiAgentSharing()

        # Simulate multiple transfers between agents
        for i in range(5):
            exp = Experience(
                experience_id=f"exp_{i}",
                task_type="deploy",
                description=f"Deployment {i}",
                state={},
                actions=[],
                outcome={"status": "success"},
                quality_score=85.0 + i,
            )

            success = i < 4  # 4 successes, 1 failure

            await sharing.transfer_experience(
                source_agent="deploy",
                target_agent="builder",
                experience=exp,
                success=success,
                quality_improvement=5.0 if success else 0.0,
            )

        key = ("deploy", "builder")
        metrics = sharing.transfer_metrics[key]

        assert metrics.successful_transfers == 4
        assert metrics.failed_transfers == 1
        assert metrics.get_success_rate() == 0.8

    def test_record_agent_task_completion(self):
        """Test recording agent task completion."""
        sharing = MultiAgentSharing()

        # Record successful task
        sharing.record_agent_task_completion(
            agent_type="deploy",
            success=True,
            quality_score=90.0,
        )

        profile = sharing.get_agent_profile("deploy")
        assert profile.total_tasks_completed == 1

        # Record another successful task
        sharing.record_agent_task_completion(
            agent_type="deploy",
            success=True,
            quality_score=95.0,
        )

        profile = sharing.get_agent_profile("deploy")
        assert profile.total_tasks_completed == 2

    def test_get_agent_profile(self):
        """Test retrieving agent profile."""
        sharing = MultiAgentSharing()

        profile = sharing.get_agent_profile("marketing")

        assert profile is not None
        assert profile.agent_type == AgentType.MARKETING
        assert profile.name == "marketing"

    def test_get_agent_profile_nonexistent(self):
        """Test retrieving non-existent agent profile."""
        sharing = MultiAgentSharing()

        profile = sharing.get_agent_profile("nonexistent_agent")

        assert profile is None

    @pytest.mark.asyncio
    async def test_get_best_knowledge_donor(self):
        """Test identifying best knowledge donors."""
        sharing = MultiAgentSharing()

        # Create transfer metrics
        exp = Experience(
            experience_id="exp_1",
            task_type="deploy",
            description="Test",
            state={},
            actions=[],
            outcome={},
            quality_score=90.0,
        )

        # Deploy → Builder transfers (80% success)
        for i in range(5):
            await sharing.transfer_experience(
                source_agent="deploy",
                target_agent="builder",
                experience=exp,
                success=i < 4,
                quality_improvement=10.0,
            )

        # Marketing → Builder transfers (60% success)
        for i in range(5):
            await sharing.transfer_experience(
                source_agent="marketing",
                target_agent="builder",
                experience=exp,
                success=i < 3,
                quality_improvement=8.0,
            )

        # Get best donors for builder
        donors = sharing.get_best_knowledge_donor("builder", limit=3)

        assert len(donors) > 0
        # Deploy should rank higher than marketing
        assert donors[0][0] == "deploy"

    def test_get_transfer_metrics(self):
        """Test getting overall transfer metrics."""
        sharing = MultiAgentSharing()

        metrics = sharing.get_transfer_metrics()

        assert isinstance(metrics, dict)
        assert "total_transfers" in metrics
        assert "successful_transfers" in metrics
        assert "failed_transfers" in metrics
        assert "success_rate" in metrics
        assert metrics["total_transfers"] == 0  # No transfers yet

    def test_get_metrics_by_agent_pair(self):
        """Test getting metrics by agent pair."""
        sharing = MultiAgentSharing()

        metrics_by_pair = sharing.get_metrics_by_agent_pair()

        assert isinstance(metrics_by_pair, dict)
        assert len(metrics_by_pair) == 0  # No transfers yet

    def test_print_metrics(self):
        """Test printing metrics (should not raise exception)."""
        sharing = MultiAgentSharing()

        # Should not raise
        sharing.print_metrics()

    def test_get_multi_agent_sharing(self):
        """Test getting global instance via factory."""
        sharing1 = get_multi_agent_sharing()
        sharing2 = get_multi_agent_sharing()

        assert sharing1 is not None
        assert sharing2 is not None


class TestMultiAgentIntegration:
    """Integration tests for multi-agent sharing."""

    @pytest.mark.asyncio
    async def test_full_transfer_workflow(self):
        """Test complete experience transfer workflow."""
        buffer = get_experience_buffer()
        sharing = MultiAgentSharing(experience_buffer=buffer)

        # Step 1: Deploy Agent completes task
        exp = Experience(
            experience_id="exp_workflow",
            task_type="deploy",
            description="Production deployment",
            state={"target": "railway"},
            actions=[{"step": "build"}, {"step": "deploy"}],
            outcome={"status": "success", "latency": "200ms"},
            quality_score=95.0,
        )

        buffer.add_experience(exp)
        sharing.record_agent_task_completion("deploy", success=True, quality_score=95.0)

        # Step 2: Builder Agent retrieves and reuses
        experiences = await sharing.get_transferable_experiences(
            source_agent="deploy",
            target_agent="builder",
            limit=5,
        )

        assert len(experiences) > 0

        # Step 3: Builder Agent transfers experience and records result
        await sharing.transfer_experience(
            source_agent="deploy",
            target_agent="builder",
            experience=experiences[0],
            success=True,
            quality_improvement=5.0,
        )

        # Step 4: Verify metrics
        metrics = sharing.get_transfer_metrics()
        assert metrics["total_transfers"] >= 1
        assert metrics["successful_transfers"] >= 1

    @pytest.mark.asyncio
    async def test_multiple_agent_learning_network(self):
        """Test knowledge transfer across multiple agents."""
        sharing = MultiAgentSharing()

        exp = Experience(
            experience_id="exp_network",
            task_type="general",
            description="General experience",
            state={},
            actions=[],
            outcome={},
            quality_score=85.0,
        )

        # Create transfer network: Deploy → Builder → QA
        agent_chain = [("deploy", "builder"), ("builder", "qa")]

        for source, target in agent_chain:
            await sharing.transfer_experience(
                source_agent=source,
                target_agent=target,
                experience=exp,
                success=True,
                quality_improvement=3.0,
            )

        # Verify network was created
        metrics = sharing.get_transfer_metrics()
        assert metrics["total_transfers"] == 2
        assert metrics["successful_transfers"] == 2

    def test_agent_type_enum(self):
        """Test AgentType enum values."""
        assert AgentType.DEPLOY.value == "deploy"
        assert AgentType.MARKETING.value == "marketing"
        assert AgentType.CONTENT.value == "content"
        assert len(AgentType) >= 8  # At least 8 agent types
