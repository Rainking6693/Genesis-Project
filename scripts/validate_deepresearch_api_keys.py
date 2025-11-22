#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepResearch API Key Validation Script

Validates that all required API keys are configured for the DeepResearch pipeline.
Shows status of each key and provides URLs for obtaining missing keys.

Exit Codes:
    0 - All API keys are configured
    1 - One or more API keys are missing or validation error occurred

Usage:
    python scripts/validate_deepresearch_api_keys.py

Version: 1.0
Last Updated: November 12, 2025
"""

import sys
import io
from pathlib import Path

# Fix Windows console encoding for emoji support
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Add parent directory to path for imports
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from infrastructure.load_env import load_genesis_env
from pipelines.deepresearch import DeepResearchConfig


def check_api_keys() -> tuple[bool, list[str]]:
    """
    Check if all required API keys are configured.

    Returns:
        Tuple of (all_valid, missing_keys)
    """
    # Load environment first
    load_genesis_env()

    # Create config from environment
    config = DeepResearchConfig.from_env()

    # Validate configuration
    missing = config.validate()

    return len(missing) == 0, missing


def print_key_status(key_name: str, is_present: bool, url: str):
    """
    Print status of a single API key.

    Args:
        key_name: Name of the API key
        is_present: Whether the key is present
        url: URL where to obtain the key
    """
    status_symbol = "✅" if is_present else "❌"
    status_text = "CONFIGURED" if is_present else "MISSING"

    print(f"{status_symbol} {key_name:<25} {status_text}")

    if not is_present:
        print(f"   → Get key at: {url}")
        print()


def print_configuration(config: DeepResearchConfig):
    """
    Print current configuration (excluding sensitive data).

    Args:
        config: DeepResearchConfig instance
    """
    print("\nConfiguration:")
    print("-" * 70)
    print(f"  Model ID:          {config.model_id}")
    print(f"  Endpoint:          {config.openrouter_endpoint}")
    print(f"  Max Iterations:    {config.max_iterations}")
    print(f"  Max Sources:       {config.max_sources}")
    print(f"  Quality Threshold: {config.quality_threshold}")
    print("-" * 70 + "\n")


def print_summary(missing_keys: list):
    """
    Print validation summary.

    Args:
        missing_keys: List of missing API key names
    """
    print("\nValidation Summary:")
    print("=" * 70)

    if not missing_keys:
        print("✅ All API keys are configured!")
        print("✅ DeepResearch pipeline is ready to use.")
        print()
        return 0
    else:
        print(f"❌ {len(missing_keys)} API key(s) missing:")
        for key in missing_keys:
            print(f"   - {key}")
        print()
        print("⚠️  DeepResearch pipeline cannot run until all keys are configured.")
        print("⚠️  Add missing keys to your .env file and re-run this script.")
        print()
        return 1


def print_header():
    """Print validation header."""
    print("\n" + "=" * 70)
    print("  DeepResearch Pipeline - API Key Validation")
    print("  Tongyi DeepResearch 30B via OpenRouter")
    print("=" * 70 + "\n")


def main():
    """Main validation routine."""
    print_header()

    # Load environment variables
    print("Loading environment variables...")
    load_genesis_env()
    print("✅ Environment loaded\n")

    # Load configuration
    print("Loading DeepResearch configuration...")
    config = DeepResearchConfig.from_env()
    print("✅ Configuration loaded\n")

    # Print configuration details
    print_configuration(config)

    # Validate API keys
    print("API Key Status:")
    print("-" * 70)

    missing_keys = config.validate()
    key_info = config.get_missing_keys_info()

    # Check each key
    all_keys = [
        'OPENROUTER_API_KEY',
        'SERPER_API_KEY',
        'JINA_API_KEY',
        'DASHSCOPE_API_KEY'
    ]

    for key_name in all_keys:
        is_present = key_name not in missing_keys
        url = key_info.get(key_name, "Unknown")
        print_key_status(key_name, is_present, url)

    print("-" * 70)

    # Print summary and exit
    return print_summary(missing_keys)


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\n⚠️  Validation interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Validation failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

