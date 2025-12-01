EXCELLENCE_PROMPT = "YOU ARE THE WORLD'S PREMIER WALTZRL FEEDBACK AGENT — RECOGNIZED GLOBALLY FOR INNOVATIVE, COST-EFFECTIVE, AND EXCEPTIONAL RESULTS. YOU DELIVER ELEGANT, EFFICIENT, AND RELIABLE OUTCOMES EVERY TIME."
"""
Compatibility wrapper for WaltzRL feedback agent.

Re-exports the implementation living under ``infrastructure.safety`` so legacy
imports from ``agents.waltzrl_feedback_agent`` continue to work without code
changes.
"""

# Import StandardIntegrationMixin for ALL 283 integrations
from infrastructure.standard_integration_mixin import StandardIntegrationMixin, darwin_evolved

# Import MemoryOS for feedback history and safety pattern memory
from infrastructure.memory_os_mongodb_adapter import (
    create_genesis_memory_mongodb
)
import os
import logging

logger = logging.getLogger(__name__)

from infrastructure.safety.waltzrl_feedback_agent import (
    FeedbackEvaluation,
    FeedbackResult,
    SafetyAnalysis,
    SafetyCategory,
    SafetyIssue,
    WaltzRLFeedbackAgent as _WaltzRLFeedbackAgent,
    get_waltzrl_feedback_agent as _get_waltzrl_feedback_agent,
)


class WaltzRLFeedbackAgent(_WaltzRLFeedbackAgent, StandardIntegrationMixin):
    """
    WaltzRL Feedback Agent with StandardIntegrationMixin.

    Inherits from both the safety implementation and StandardIntegrationMixin
    to provide all 283 integrations.
    """
    
    def __init__(self, **kwargs):
        # Initialize StandardIntegrationMixin first
        super().__init__()
        # Initialize the safety agent with provided kwargs
        self._safety_agent = _WaltzRLFeedbackAgent(**kwargs)
        # Copy all attributes from safety agent
        for attr_name in dir(self._safety_agent):
            if not attr_name.startswith('_') and attr_name not in dir(self):
                setattr(self, attr_name, getattr(self._safety_agent, attr_name))

        # Initialize MemoryOS for feedback history
        self.memory = None  # Lazy initialization

    async def _init_memory(self):
        """Initialize MemoryOS MongoDB backend for Feedback memory."""
        try:
            self.memory = create_genesis_memory_mongodb(
                mongodb_uri=os.getenv("MONGODB_URI", "mongodb://localhost:27017/"),
                database_name="genesis_memory_feedback",
                short_term_capacity=20,   # Recent feedback sessions
                mid_term_capacity=500,    # Historical feedback data
                long_term_knowledge_capacity=200  # Safety patterns, feedback insights
            )
            logger.info("[OK] MemoryOS initialized for WaltzRLFeedbackAgent")
        except Exception as e:
            logger.warning(f"[WaltzRLFeedbackAgent] Failed to initialize MemoryOS: {e}. Memory features disabled.")
            self.memory = None


def get_waltzrl_feedback_agent(**kwargs) -> WaltzRLFeedbackAgent:
    """Factory function to create WaltzRL Feedback Agent with StandardIntegrationMixin."""
    return WaltzRLFeedbackAgent(**kwargs)


__all__ = [
    "FeedbackEvaluation",
    "FeedbackResult",
    "SafetyAnalysis",
    "SafetyCategory",
    "SafetyIssue",
    "WaltzRLFeedbackAgent",
    "get_waltzrl_feedback_agent",
]
