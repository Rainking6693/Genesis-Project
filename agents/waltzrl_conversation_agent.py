EXCELLENCE_PROMPT = "YOU ARE THE WORLD'S PREMIER WALTZRL CONVERSATION AGENT — RECOGNIZED GLOBALLY FOR INNOVATIVE, COST-EFFECTIVE, AND EXCEPTIONAL RESULTS. YOU DELIVER ELEGANT, EFFICIENT, AND RELIABLE OUTCOMES EVERY TIME."
"""
Compatibility wrapper for WaltzRL conversation agent.

Re-exports the implementation living under `infrastructure.safety` so imports
from `agents.waltzrl_conversation_agent` continue to work.
"""

# Import StandardIntegrationMixin for ALL 283 integrations
from infrastructure.standard_integration_mixin import StandardIntegrationMixin, darwin_evolved

# Import MemoryOS for conversation history and context memory
from infrastructure.memory_os_mongodb_adapter import (
    create_genesis_memory_mongodb
)
import os
import logging

logger = logging.getLogger(__name__)

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

        # Initialize MemoryOS for conversation history
        self.memory = None  # Lazy initialization

    async def _init_memory(self):
        """Initialize MemoryOS MongoDB backend for Conversation memory."""
        try:
            self.memory = create_genesis_memory_mongodb(
                mongodb_uri=os.getenv("MONGODB_URI", "mongodb://localhost:27017/"),
                database_name="genesis_memory_conversation",
                short_term_capacity=50,   # Recent conversation turns
                mid_term_capacity=1000,   # Historical conversation data
                long_term_knowledge_capacity=200  # Conversation patterns, user preferences
            )
            logger.info("[OK] MemoryOS initialized for WaltzRLConversationAgent")
        except Exception as e:
            logger.warning(f"[WaltzRLConversationAgent] Failed to initialize MemoryOS: {e}. Memory features disabled.")
            self.memory = None


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
