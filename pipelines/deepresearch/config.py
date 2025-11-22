"""
DeepResearch Pipeline Configuration

Tongyi DeepResearch 30B via OpenRouter integration with API key management.

Version: 1.0
Last Updated: November 12, 2025
"""

import os
from dataclasses import dataclass, field
from typing import Optional, List, Dict
from pathlib import Path


@dataclass
class DeepResearchConfig:
    """
    Configuration for DeepResearch pipeline with OpenRouter integration.

    ⚠️ SECURITY WARNING:
    This class contains sensitive API keys. To safely serialize this object:
    - ALWAYS use the to_dict() method for serialization
    - NEVER use dataclasses.asdict() or dataclasses.astuple()
    - NEVER use pickle, copy.deepcopy(), or similar operations
    These built-in methods bypass security safeguards and will expose API keys.

    Attributes:
        model_id: Model identifier for Alibaba Tongyi DeepResearch 30B
        openrouter_endpoint: OpenRouter API endpoint
        openrouter_api_key: OpenRouter API key for model access
        serper_api_key: Serper API key for web search
        jina_api_key: Jina AI API key for embeddings
        dashscope_api_key: DashScope API key for Alibaba services
        max_iterations: Maximum research iterations
        max_sources: Maximum number of sources to process
        quality_threshold: Quality threshold for research results (0.0-1.0)
        output_dir: Directory for output files
        prompts_dir: Directory for prompt templates
    """

    model_id: str = "alibaba/tongyi-deepresearch-30b-a3b"
    openrouter_endpoint: str = "https://openrouter.ai/api/v1/chat/completions"

    # API Keys (loaded from environment)
    openrouter_api_key: Optional[str] = None
    serper_api_key: Optional[str] = None
    jina_api_key: Optional[str] = None
    dashscope_api_key: Optional[str] = None

    # Research Parameters
    max_iterations: int = 10
    max_sources: int = 20
    quality_threshold: float = 0.7

    # Directory Configuration
    output_dir: Path = field(default_factory=lambda: Path("data/deepresearch/output"))
    prompts_dir: Path = field(default_factory=lambda: Path("data/deepresearch/prompts"))

    @classmethod
    def from_env(cls) -> 'DeepResearchConfig':
        """
        Load configuration from environment variables.

        Environment variables:
        - OPENROUTER_API_KEY: OpenRouter API key
        - SERPER_API_KEY: Serper search API key
        - JINA_API_KEY: Jina AI embeddings API key
        - DASHSCOPE_API_KEY: DashScope API key
        - DEEPRESEARCH_MODEL: Model identifier (optional)
        - DEEPRESEARCH_MAX_ITERATIONS: Max iterations (optional)
        - DEEPRESEARCH_MAX_SOURCES: Max sources (optional)
        - DEEPRESEARCH_QUALITY_THRESHOLD: Quality threshold (optional)

        Returns:
            DeepResearchConfig instance with values loaded from environment
        """
        config = cls()

        # Load API keys
        config.openrouter_api_key = os.getenv('OPENROUTER_API_KEY')
        config.serper_api_key = os.getenv('SERPER_API_KEY')
        config.jina_api_key = os.getenv('JINA_API_KEY')
        config.dashscope_api_key = os.getenv('DASHSCOPE_API_KEY')

        # Load optional parameters
        if model_id := os.getenv('DEEPRESEARCH_MODEL'):
            config.model_id = model_id

        if max_iter := os.getenv('DEEPRESEARCH_MAX_ITERATIONS'):
            try:
                config.max_iterations = int(max_iter)
            except ValueError:
                pass

        if max_src := os.getenv('DEEPRESEARCH_MAX_SOURCES'):
            try:
                config.max_sources = int(max_src)
            except ValueError:
                pass

        if threshold := os.getenv('DEEPRESEARCH_QUALITY_THRESHOLD'):
            try:
                config.quality_threshold = float(threshold)
            except ValueError:
                pass

        return config

    def validate(self) -> List[str]:
        """
        Validate configuration and return list of missing API keys.

        Returns:
            List of missing API key names (empty if all present)
        """
        missing_keys = []

        if not self.openrouter_api_key:
            missing_keys.append('OPENROUTER_API_KEY')

        if not self.serper_api_key:
            missing_keys.append('SERPER_API_KEY')

        if not self.jina_api_key:
            missing_keys.append('JINA_API_KEY')

        if not self.dashscope_api_key:
            missing_keys.append('DASHSCOPE_API_KEY')

        return missing_keys

    def get_missing_keys_info(self) -> Dict[str, str]:
        """
        Get information about where to obtain missing API keys.

        Returns:
            Dictionary mapping API key names to URLs where they can be obtained
        """
        return {
            'OPENROUTER_API_KEY': 'https://openrouter.ai/keys',
            'SERPER_API_KEY': 'https://serper.dev/api-key',
            'JINA_API_KEY': 'https://jina.ai/embeddings/',
            'DASHSCOPE_API_KEY': 'https://dashscope.console.aliyun.com/'
        }

    def is_valid(self) -> bool:
        """
        Check if configuration is valid (all API keys present).

        Returns:
            True if all API keys are present, False otherwise
        """
        return len(self.validate()) == 0

    def get_api_headers(self) -> Dict[str, str]:
        """
        Get HTTP headers for OpenRouter API requests.

        Returns:
            Dictionary of HTTP headers with API key authorization
        """
        if not self.openrouter_api_key:
            raise ValueError("OpenRouter API key not configured")

        return {
            'Authorization': f'Bearer {self.openrouter_api_key}',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/genesis-clean-code',
            'X-Title': 'Genesis DeepResearch Pipeline'
        }

    def to_dict(self) -> Dict:
        """
        Convert configuration to dictionary (excluding API keys for security).

        Returns:
            Dictionary representation of config (API keys masked)
        """
        return {
            'model_id': self.model_id,
            'openrouter_endpoint': self.openrouter_endpoint,
            'max_iterations': self.max_iterations,
            'max_sources': self.max_sources,
            'quality_threshold': self.quality_threshold,
            'output_dir': str(self.output_dir),
            'prompts_dir': str(self.prompts_dir),
            'openrouter_api_key': '***' if self.openrouter_api_key else None,
            'serper_api_key': '***' if self.serper_api_key else None,
            'jina_api_key': '***' if self.jina_api_key else None,
            'dashscope_api_key': '***' if self.dashscope_api_key else None,
        }

    def __repr__(self) -> str:
        """String representation with masked API keys."""
        return f"DeepResearchConfig(model={self.model_id}, valid={self.is_valid()})"

    def __getstate__(self):
        """
        Prevent pickle/copy operations that might leak API keys.

        Raises:
            TypeError: Always raised to prevent unsafe serialization
        """
        raise TypeError(
            "DeepResearchConfig cannot be pickled or copied due to sensitive data. "
            "Use to_dict() for safe serialization. "
            "This security measure prevents accidental API key exposure via "
            "pickle, copy.deepcopy(), dataclasses.asdict(), or similar operations."
        )
