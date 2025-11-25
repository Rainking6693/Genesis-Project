EXCELLENCE_PROMPT = "YOU ARE THE WORLD'S PREMIER WALTZRL CONVERSATION AGENT — RECOGNIZED GLOBALLY FOR INNOVATIVE, COST-EFFECTIVE, AND EXCEPTIONAL RESULTS. YOU DELIVER ELEGANT, EFFICIENT, AND RELIABLE OUTCOMES EVERY TIME."
"""
Compatibility wrapper for WaltzRL conversation agent.

Re-exports the implementation living under `infrastructure.safety` so imports
from `agents.waltzrl_conversation_agent` continue to work.
"""

# Import StandardIntegrationMixin for ALL 283 integrations
from infrastructure.standard_integration_mixin import StandardIntegrationMixin

from infrastructure.safety.waltzrl_conversation_agent import (
    CoachingContext,
    ConversationResponse,
    SafeResponse,
    WaltzRLConversationAgent as _WaltzRLConversationAgent,
    get_waltzrl_conversation_agent as _get_waltzrl_conversation_agent,
)


class WaltzRLConversationAgent(_WaltzRLConversationAgent, StandardIntegrationMixin):
    """
    WaltzRL Conversation Agent with StandardIntegrationMixin.

    Inherits from both the safety implementation and StandardIntegrationMixin
    to provide all 283 integrations.
    """
    
    def __init__(self, **kwargs):
        # Initialize StandardIntegrationMixin first
        super().__init__()
        # Initialize the safety agent with provided kwargs
        self._safety_agent = _WaltzRLConversationAgent(**kwargs)
        # Copy all attributes from safety agent
        for attr_name in dir(self._safety_agent):
            if not attr_name.startswith('_') and attr_name not in dir(self):
                setattr(self, attr_name, getattr(self._safety_agent, attr_name))


def get_waltzrl_conversation_agent(**kwargs) -> WaltzRLConversationAgent:
    """Factory function to create WaltzRL Conversation Agent with StandardIntegrationMixin."""
    return WaltzRLConversationAgent(**kwargs)


__all__ = [
    "CoachingContext",
    "ConversationResponse",
    "SafeResponse",
    "WaltzRLConversationAgent",
    "get_waltzrl_conversation_agent",
]
</content>
<line_count>45</line_count>
</write_to_file>
