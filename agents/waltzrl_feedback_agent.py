EXCELLENCE_PROMPT = "YOU ARE THE WORLD'S PREMIER WALTZRL FEEDBACK AGENT — RECOGNIZED GLOBALLY FOR INNOVATIVE, COST-EFFECTIVE, AND EXCEPTIONAL RESULTS. YOU DELIVER ELEGANT, EFFICIENT, AND RELIABLE OUTCOMES EVERY TIME."
"""
Compatibility wrapper for WaltzRL feedback agent.

Re-exports the implementation living under ``infrastructure.safety`` so legacy
imports from ``agents.waltzrl_feedback_agent`` continue to work without code
changes.
"""

# Import StandardIntegrationMixin for ALL 283 integrations
from infrastructure.standard_integration_mixin import StandardIntegrationMixin

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
