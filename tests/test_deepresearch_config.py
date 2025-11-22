"""
Unit Tests for DeepResearch Pipeline Configuration

Tests the DeepResearchConfig dataclass and API key validation functionality.

Version: 1.1
Last Updated: November 12, 2025
"""

import os
import pytest
import pickle
import copy
from dataclasses import asdict
from pathlib import Path

from pipelines.deepresearch import DeepResearchConfig


class TestDeepResearchConfig:
    """Test suite for DeepResearchConfig"""

    def test_default_initialization(self):
        """Test config initialization with default values"""
        config = DeepResearchConfig()

        assert config.model_id == "alibaba/tongyi-deepresearch-30b-a3b"
        assert config.openrouter_endpoint == "https://openrouter.ai/api/v1/chat/completions"
        assert config.max_iterations == 10
        assert config.max_sources == 20
        assert config.quality_threshold == 0.7

    def test_from_env_without_keys(self, monkeypatch):
        """Test loading config from environment without API keys"""
        # Clear all relevant env vars
        for key in ['OPENROUTER_API_KEY', 'SERPER_API_KEY', 'JINA_API_KEY', 'DASHSCOPE_API_KEY']:
            monkeypatch.delenv(key, raising=False)

        config = DeepResearchConfig.from_env()

        assert config.openrouter_api_key is None
        assert config.serper_api_key is None
        assert config.jina_api_key is None
        assert config.dashscope_api_key is None

    def test_from_env_with_keys(self, monkeypatch):
        """Test loading config from environment with API keys"""
        # Set test API keys
        monkeypatch.setenv('OPENROUTER_API_KEY', 'test_openrouter_key')
        monkeypatch.setenv('SERPER_API_KEY', 'test_serper_key')
        monkeypatch.setenv('JINA_API_KEY', 'test_jina_key')
        monkeypatch.setenv('DASHSCOPE_API_KEY', 'test_dashscope_key')

        config = DeepResearchConfig.from_env()

        assert config.openrouter_api_key == 'test_openrouter_key'
        assert config.serper_api_key == 'test_serper_key'
        assert config.jina_api_key == 'test_jina_key'
        assert config.dashscope_api_key == 'test_dashscope_key'

    def test_from_env_with_custom_parameters(self, monkeypatch):
        """Test loading config with custom parameters from environment"""
        monkeypatch.setenv('DEEPRESEARCH_MODEL', 'custom/model-id')
        monkeypatch.setenv('DEEPRESEARCH_MAX_ITERATIONS', '20')
        monkeypatch.setenv('DEEPRESEARCH_MAX_SOURCES', '50')
        monkeypatch.setenv('DEEPRESEARCH_QUALITY_THRESHOLD', '0.85')

        config = DeepResearchConfig.from_env()

        assert config.model_id == 'custom/model-id'
        assert config.max_iterations == 20
        assert config.max_sources == 50
        assert config.quality_threshold == 0.85

    def test_validate_all_keys_present(self, monkeypatch):
        """Test validation with all API keys present"""
        monkeypatch.setenv('OPENROUTER_API_KEY', 'test_key')
        monkeypatch.setenv('SERPER_API_KEY', 'test_key')
        monkeypatch.setenv('JINA_API_KEY', 'test_key')
        monkeypatch.setenv('DASHSCOPE_API_KEY', 'test_key')

        config = DeepResearchConfig.from_env()
        missing = config.validate()

        assert missing == []
        assert config.is_valid()

    def test_validate_missing_keys(self, monkeypatch):
        """Test validation with missing API keys"""
        # Clear all env vars
        for key in ['OPENROUTER_API_KEY', 'SERPER_API_KEY', 'JINA_API_KEY', 'DASHSCOPE_API_KEY']:
            monkeypatch.delenv(key, raising=False)

        config = DeepResearchConfig.from_env()
        missing = config.validate()

        assert 'OPENROUTER_API_KEY' in missing
        assert 'SERPER_API_KEY' in missing
        assert 'JINA_API_KEY' in missing
        assert 'DASHSCOPE_API_KEY' in missing
        assert not config.is_valid()

    def test_validate_partial_keys(self, monkeypatch):
        """Test validation with some keys present"""
        # Clear all env vars first
        for key in ['OPENROUTER_API_KEY', 'SERPER_API_KEY', 'JINA_API_KEY', 'DASHSCOPE_API_KEY']:
            monkeypatch.delenv(key, raising=False)

        # Set only some keys
        monkeypatch.setenv('OPENROUTER_API_KEY', 'test_key')
        monkeypatch.setenv('SERPER_API_KEY', 'test_key')

        config = DeepResearchConfig.from_env()
        missing = config.validate()

        assert 'OPENROUTER_API_KEY' not in missing
        assert 'SERPER_API_KEY' not in missing
        assert 'JINA_API_KEY' in missing
        assert 'DASHSCOPE_API_KEY' in missing
        assert not config.is_valid()

    def test_get_missing_keys_info(self):
        """Test getting information about missing keys"""
        config = DeepResearchConfig()
        info = config.get_missing_keys_info()

        assert 'OPENROUTER_API_KEY' in info
        assert 'SERPER_API_KEY' in info
        assert 'JINA_API_KEY' in info
        assert 'DASHSCOPE_API_KEY' in info
        assert 'openrouter.ai' in info['OPENROUTER_API_KEY']
        assert 'serper.dev' in info['SERPER_API_KEY']

    def test_get_api_headers_with_key(self, monkeypatch):
        """Test getting API headers with valid key"""
        monkeypatch.setenv('OPENROUTER_API_KEY', 'test_key')

        config = DeepResearchConfig.from_env()
        headers = config.get_api_headers()

        assert 'Authorization' in headers
        assert headers['Authorization'] == 'Bearer test_key'
        assert headers['Content-Type'] == 'application/json'
        assert 'HTTP-Referer' in headers
        assert 'X-Title' in headers

    def test_get_api_headers_without_key(self):
        """Test getting API headers without key raises error"""
        config = DeepResearchConfig()

        with pytest.raises(ValueError, match="OpenRouter API key not configured"):
            config.get_api_headers()

    def test_to_dict_masks_keys(self, monkeypatch):
        """Test that to_dict masks sensitive API keys"""
        monkeypatch.setenv('OPENROUTER_API_KEY', 'secret_key_123')
        monkeypatch.setenv('SERPER_API_KEY', 'secret_key_456')

        config = DeepResearchConfig.from_env()
        config_dict = config.to_dict()

        assert config_dict['openrouter_api_key'] == '***'
        assert config_dict['serper_api_key'] == '***'
        assert 'secret_key' not in str(config_dict)

    def test_repr_shows_validity(self, monkeypatch):
        """Test string representation shows validity status"""
        # Test with no keys
        config = DeepResearchConfig()
        repr_str = repr(config)
        assert 'valid=False' in repr_str

        # Test with all keys
        monkeypatch.setenv('OPENROUTER_API_KEY', 'test_key')
        monkeypatch.setenv('SERPER_API_KEY', 'test_key')
        monkeypatch.setenv('JINA_API_KEY', 'test_key')
        monkeypatch.setenv('DASHSCOPE_API_KEY', 'test_key')

        config = DeepResearchConfig.from_env()
        repr_str = repr(config)
        assert 'valid=True' in repr_str

    def test_pickle_blocked_for_security(self, monkeypatch):
        """Test that pickle is blocked to prevent API key exposure"""
        monkeypatch.setenv('OPENROUTER_API_KEY', 'secret_key_123')
        config = DeepResearchConfig.from_env()

        # Attempting to pickle should raise TypeError
        with pytest.raises(TypeError, match="cannot be pickled"):
            pickle.dumps(config)

    def test_deepcopy_blocked_for_security(self, monkeypatch):
        """Test that copy.deepcopy is blocked to prevent API key exposure"""
        monkeypatch.setenv('OPENROUTER_API_KEY', 'secret_key_123')
        config = DeepResearchConfig.from_env()

        # Attempting to deepcopy should raise TypeError
        with pytest.raises(TypeError, match="cannot be pickled"):
            copy.deepcopy(config)

    def test_dataclasses_asdict_warning(self, monkeypatch):
        """Test that dataclasses.asdict() is documented as unsafe"""
        monkeypatch.setenv('OPENROUTER_API_KEY', 'secret_key_123')
        config = DeepResearchConfig.from_env()

        # This is a documentation test - the docstring should warn about this
        # In real code, developers should use to_dict() instead
        # Note: asdict() WILL expose keys - that's why we have the warning
        assert '⚠️ SECURITY WARNING' in config.__class__.__doc__
        assert 'NEVER use dataclasses.asdict()' in config.__class__.__doc__


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
