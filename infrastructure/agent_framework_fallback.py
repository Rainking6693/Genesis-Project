"""
Agent Framework Fallback Implementation
Version: 1.0
Created: November 2025

This module provides fallback implementations for the missing agent_framework module.
It allows agents to work without the real Microsoft Agent Framework by providing
compatible stub classes that use local LLMs or OpenAI/Anthropic APIs.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Callable, Union
from datetime import datetime
import os

# Try to import real agent_framework components first
try:
    from agent_framework import ChatAgent as RealChatAgent
    from agent_framework.azure import AzureAIAgentClient as RealAzureAIAgentClient
    from agent_framework.observability import setup_observability as real_setup_observability
    REAL_FRAMEWORK_AVAILABLE = True
except ImportError:
    REAL_FRAMEWORK_AVAILABLE = False
    RealChatAgent = None
    RealAzureAIAgentClient = None
    real_setup_observability = None

# Try to import Azure identity
try:
    from azure.identity.aio import AzureCliCredential as RealAzureCliCredential
    AZURE_AVAILABLE = True
except ImportError:
    AZURE_AVAILABLE = False
    RealAzureCliCredential = None

logger = logging.getLogger(__name__)


class AzureCliCredential:
    """Fallback Azure CLI credential."""

    def __init__(self):
        self.token = os.getenv("AZURE_TOKEN", "fallback-token")
        logger.info("Using fallback AzureCliCredential")

    async def get_token(self, *scopes):
        """Return a mock token."""
        return type('Token', (), {'token': self.token, 'expires_on': datetime.now().timestamp() + 3600})()

    async def close(self):
        """Close credential."""
        pass


class AzureAIAgentClient:
    """Fallback Azure AI Agent Client."""

    def __init__(self, async_credential=None, endpoint=None):
        self.credential = async_credential
        self.endpoint = endpoint or os.getenv("AZURE_AI_ENDPOINT", "https://fallback.azure.com")
        logger.info(f"Using fallback AzureAIAgentClient with endpoint: {self.endpoint}")

        # Try to use local LLM or OpenAI as fallback
        self.llm_client = self._initialize_llm_client()

    def _initialize_llm_client(self):
        """Initialize the best available LLM client."""
        try:
            from infrastructure.local_llm_client import get_local_llm_client
            return get_local_llm_client()
        except ImportError:
            pass

        # Try OpenAI
        if os.getenv("OPENAI_API_KEY"):
            try:
                from openai import AsyncOpenAI
                return AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            except ImportError:
                pass

        # Try Anthropic
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                from anthropic import AsyncAnthropic
                return AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
            except ImportError:
                pass

        logger.warning("No LLM client available for fallback AzureAIAgentClient")
        return None

    async def complete(self, prompt: str, **kwargs) -> str:
        """Complete a prompt using the fallback LLM."""
        if not self.llm_client:
            return f"[Fallback response for: {prompt[:50]}...]"

        try:
            # Try local LLM client interface
            if hasattr(self.llm_client, 'complete'):
                return await self.llm_client.complete(prompt, **kwargs)

            # Try OpenAI interface
            if hasattr(self.llm_client, 'chat'):
                response = await self.llm_client.chat.completions.create(
                    model=kwargs.get('model', 'gpt-4'),
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=kwargs.get('max_tokens', 1000)
                )
                return response.choices[0].message.content

            # Try Anthropic interface
            if hasattr(self.llm_client, 'messages'):
                response = await self.llm_client.messages.create(
                    model=kwargs.get('model', 'claude-3-sonnet-20240229'),
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=kwargs.get('max_tokens', 1000)
                )
                return response.content[0].text
        except Exception as e:
            logger.error(f"Fallback LLM completion failed: {e}")
            return f"[Error in fallback completion: {str(e)[:100]}]"

        return f"[No LLM available for: {prompt[:50]}...]"


class ChatAgent:
    """
    Fallback ChatAgent implementation that mimics the Microsoft Agent Framework.
    Provides both .run() and .generate() methods for compatibility.
    """

    def __init__(self,
                 chat_client: Optional[AzureAIAgentClient] = None,
                 instructions: str = "",
                 name: str = "fallback-agent",
                 tools: Optional[List[Callable]] = None):
        """
        Initialize the fallback ChatAgent.

        Args:
            chat_client: The Azure AI client (or fallback)
            instructions: System instructions for the agent
            name: Name of the agent
            tools: List of tool functions the agent can call
        """
        self.chat_client = chat_client or AzureAIAgentClient()
        self.instructions = instructions
        self.name = name
        self.tools = tools or []
        self.conversation_history = []

        logger.info(f"Initialized fallback ChatAgent: {name}")

    async def run(self, prompt: str, **kwargs) -> str:
        """
        Run method for compatibility with agent_framework.

        Args:
            prompt: The user prompt
            **kwargs: Additional arguments

        Returns:
            The agent's response as a string
        """
        return await self.generate(prompt, **kwargs)

    async def generate(self, prompt: str, **kwargs) -> str:
        """
        Generate a response to the prompt.

        Args:
            prompt: The user prompt
            **kwargs: Additional arguments

        Returns:
            The agent's response as a string
        """
        # Combine instructions with prompt
        full_prompt = f"{self.instructions}\n\nUser: {prompt}\n\nAssistant:"

        # Add conversation history if needed
        if self.conversation_history and kwargs.get('use_history', False):
            history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in self.conversation_history[-5:]])
            full_prompt = f"Previous conversation:\n{history_text}\n\n{full_prompt}"

        # Generate response
        response = await self.chat_client.complete(full_prompt, **kwargs)

        # Store in history
        self.conversation_history.append({"role": "user", "content": prompt})
        self.conversation_history.append({"role": "assistant", "content": response})

        # Limit history size
        if len(self.conversation_history) > 20:
            self.conversation_history = self.conversation_history[-20:]

        return response

    async def call_tool(self, tool_name: str, **tool_args) -> Any:
        """
        Call a tool function.

        Args:
            tool_name: Name of the tool to call
            **tool_args: Arguments for the tool

        Returns:
            The tool's return value
        """
        for tool in self.tools:
            if tool.__name__ == tool_name:
                if asyncio.iscoroutinefunction(tool):
                    return await tool(**tool_args)
                else:
                    return tool(**tool_args)

        raise ValueError(f"Tool {tool_name} not found in agent tools")

    async def reset(self):
        """Reset the agent's conversation history."""
        self.conversation_history = []

    def __repr__(self):
        return f"ChatAgent(name='{self.name}', tools={len(self.tools)})"


def setup_observability(enable_sensitive_data: bool = False):
    """
    Fallback observability setup.

    Args:
        enable_sensitive_data: Whether to log sensitive data
    """
    if REAL_FRAMEWORK_AVAILABLE and real_setup_observability:
        return real_setup_observability(enable_sensitive_data)

    # Fallback: just configure logging
    log_level = logging.DEBUG if enable_sensitive_data else logging.INFO
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    logger.info(f"Fallback observability configured (sensitive_data={enable_sensitive_data})")


# Export the appropriate classes
if REAL_FRAMEWORK_AVAILABLE:
    # Use real implementations if available
    ChatAgent = RealChatAgent or ChatAgent
    AzureAIAgentClient = RealAzureAIAgentClient or AzureAIAgentClient
    setup_observability = real_setup_observability or setup_observability
else:
    # Use fallback implementations
    pass  # Already defined above

if AZURE_AVAILABLE:
    AzureCliCredential = RealAzureCliCredential or AzureCliCredential
else:
    # Use fallback implementation
    pass  # Already defined above


# Compatibility exports
__all__ = [
    'ChatAgent',
    'AzureAIAgentClient',
    'AzureCliCredential',
    'setup_observability',
    'REAL_FRAMEWORK_AVAILABLE',
    'AZURE_AVAILABLE'
]