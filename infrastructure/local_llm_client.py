"""
Local LLM Client for Genesis Agents

Now uses cloud APIs with fallback chain:
- Primary: DeepSeek (deepseek.com)
- Fallback: OpenRouter (openrouter.ai)
- Backup: Gemini -> Groq -> OpenAI (if available)

Loads API keys from .env file automatically.
"""

import asyncio
import logging
import os
from typing import Dict, Any, Optional
from dataclasses import dataclass

# Load environment variables from .env
from infrastructure.load_env import load_genesis_env
load_genesis_env()

logger = logging.getLogger("local_llm_client")

# Try to import cloud API clients
DEEPSEEK_AVAILABLE = False
OPENROUTER_AVAILABLE = False
GEMINI_AVAILABLE = False
GROQ_AVAILABLE = False
OPENAI_AVAILABLE = False

try:
    from openai import AsyncOpenAI
    DEEPSEEK_AVAILABLE = True
    OPENROUTER_AVAILABLE = True
except ImportError:
    logger.debug("openai not installed")

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    logger.debug("google-generativeai not installed")

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    logger.debug("groq not installed")

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    logger.debug("openai not installed")


@dataclass
class LocalLLMConfig:
    """Configuration for the LLM client."""
    deepseek_model: str = "deepseek-chat"
    openrouter_model: str = "deepseek/deepseek-chat"
    gemini_model: str = "gemini-2.0-flash-exp"
    groq_model: str = "llama-3.1-70b-versatile"
    openai_model: str = "gpt-4o-mini"
    max_tokens: int = 4096
    temperature: float = 0.7


class LocalLLMClient:
    """
    Cloud LLM Client with DeepSeek -> OpenRouter -> Gemini -> Groq -> OpenAI fallback chain.

    Reads API keys from environment variables:
    - DEEPSEEK_API_KEY (primary)
    - OPENROUTER_API_KEY (fallback)
    - GEMINI_API_KEY
    - GROQ_API_KEY
    - OPENAI_API_KEY
    """

    def __init__(self, config_path: str = "config/local_llm_config.yml"):
        """Initialize with cloud API clients"""
        self.config = LocalLLMConfig()
        self.loaded = False

        # Initialize DeepSeek (Primary)
        self.deepseek_client = None
        deepseek_key = os.environ.get("DEEPSEEK_API_KEY")
        if DEEPSEEK_AVAILABLE and deepseek_key:
            try:
                self.deepseek_client = AsyncOpenAI(
                    api_key=deepseek_key,
                    base_url="https://api.deepseek.com"
                )
                logger.info(f"DeepSeek client initialized (primary): {self.config.deepseek_model}")
            except Exception as e:
                logger.warning(f"DeepSeek initialization failed: {e}")

        # Initialize OpenRouter (Fallback)
        self.openrouter_client = None
        openrouter_key = os.environ.get("OPENROUTER_API_KEY")
        if OPENROUTER_AVAILABLE and openrouter_key:
            try:
                self.openrouter_client = AsyncOpenAI(
                    api_key=openrouter_key,
                    base_url="https://openrouter.ai/api/v1"
                )
                logger.info(f"OpenRouter client initialized (fallback): {self.config.openrouter_model}")
            except Exception as e:
                logger.warning(f"OpenRouter initialization failed: {e}")

        # Initialize Gemini if available
        self.gemini_client = None
        gemini_key = os.environ.get("GEMINI_API_KEY")
        if GEMINI_AVAILABLE and gemini_key:
            try:
                genai.configure(api_key=gemini_key)
                self.gemini_client = genai.GenerativeModel(self.config.gemini_model)
                logger.info(f"Gemini client initialized: {self.config.gemini_model}")
            except Exception as e:
                logger.warning(f"Gemini initialization failed: {e}")

        # Initialize Groq if available
        self.groq_client = None
        groq_key = os.environ.get("GROQ_API_KEY")
        if GROQ_AVAILABLE and groq_key:
            try:
                self.groq_client = Groq(api_key=groq_key)
                logger.info(f"Groq client initialized: {self.config.groq_model}")
            except Exception as e:
                logger.warning(f"Groq initialization failed: {e}")

        # Initialize OpenAI if available
        self.openai_client = None
        openai_key = os.environ.get("OPENAI_API_KEY")
        if OPENAI_AVAILABLE and openai_key:
            try:
                self.openai_client = openai.OpenAI(api_key=openai_key)
                logger.info(f"OpenAI client initialized: {self.config.openai_model}")
            except Exception as e:
                logger.warning(f"OpenAI initialization failed: {e}")

        self.loaded = any([self.deepseek_client, self.openrouter_client, self.gemini_client, self.groq_client, self.openai_client])
        if self.loaded:
            logger.info("LocalLLMClient initialized with DeepSeek -> OpenRouter fallback chain")
        else:
            logger.warning("No LLM clients available - check API keys in .env")

    def load_model(self) -> bool:
        """Check if any client is available"""
        return self.loaded

    def generate(self, prompt: str, max_new_tokens: int = 2048, **kwargs) -> str:
        """
        Generate text using cloud APIs with fallback chain.

        Tries: DeepSeek -> OpenRouter -> Gemini -> Groq -> OpenAI
        """
        if not self.loaded:
            logger.error("No LLM clients available")
            return "ERROR: No LLM clients configured. Check API keys in .env"

        # Try DeepSeek first (Primary)
        if self.deepseek_client:
            try:
                import asyncio
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                
                response = loop.run_until_complete(
                    self.deepseek_client.chat.completions.create(
                        model=self.config.deepseek_model,
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=max_new_tokens,
                        temperature=kwargs.get("temperature", self.config.temperature)
                    )
                )
                if response.choices and response.choices[0].message.content:
                    logger.debug("Generated via DeepSeek")
                    return response.choices[0].message.content
            except Exception as e:
                logger.warning(f"DeepSeek generation failed: {e}")

        # Fallback to OpenRouter
        if self.openrouter_client:
            try:
                import asyncio
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                
                response = loop.run_until_complete(
                    self.openrouter_client.chat.completions.create(
                        model=self.config.openrouter_model,
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=max_new_tokens,
                        temperature=kwargs.get("temperature", self.config.temperature)
                    )
                )
                if response.choices and response.choices[0].message.content:
                    logger.debug("Generated via OpenRouter")
                    return response.choices[0].message.content
            except Exception as e:
                logger.warning(f"OpenRouter generation failed: {e}")

        # Fallback to Gemini
        if self.gemini_client:
            try:
                response = self.gemini_client.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        max_output_tokens=max_new_tokens,
                        temperature=kwargs.get("temperature", self.config.temperature)
                    )
                )
                if response.text:
                    logger.debug("Generated via Gemini")
                    return response.text
            except Exception as e:
                logger.warning(f"Gemini generation failed: {e}")

        # Fallback to Groq
        if self.groq_client:
            try:
                response = self.groq_client.chat.completions.create(
                    model=self.config.groq_model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=max_new_tokens,
                    temperature=kwargs.get("temperature", self.config.temperature)
                )
                if response.choices:
                    logger.debug("Generated via Groq")
                    return response.choices[0].message.content
            except Exception as e:
                logger.warning(f"Groq generation failed: {e}")

        # Fallback to OpenAI
        if self.openai_client:
            try:
                response = self.openai_client.chat.completions.create(
                    model=self.config.openai_model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=max_new_tokens,
                    temperature=kwargs.get("temperature", self.config.temperature)
                )
                if response.choices:
                    logger.debug("Generated via OpenAI")
                    return response.choices[0].message.content
            except Exception as e:
                logger.warning(f"OpenAI generation failed: {e}")

        return "ERROR: All LLM providers failed"

    async def complete(self, prompt: str, max_tokens: int = 2048, **kwargs) -> str:
        """Async wrapper for generate() - used by agents"""
        # Run sync generate in executor to avoid blocking
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, lambda: self.generate(prompt, max_tokens, **kwargs))


_client = None

def get_local_llm_client():
    global _client
    if _client is None:
        _client = LocalLLMClient()
    return _client
