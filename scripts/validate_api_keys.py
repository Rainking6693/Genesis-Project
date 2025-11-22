#!/usr/bin/env python3
"""
Genesis Rebuild - API Key Validation Script
Tests all configured API keys to verify they work correctly.
"""

import os
import sys
from typing import Dict, Tuple
from dotenv import load_dotenv

# Colors for terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def print_header(text: str) -> None:
    """Print section header"""
    print(f"\n{BLUE}{'=' * 60}{RESET}")
    print(f"{BLUE}{text:^60}{RESET}")
    print(f"{BLUE}{'=' * 60}{RESET}\n")


def print_success(text: str) -> None:
    """Print success message"""
    print(f"{GREEN}✅ {text}{RESET}")


def print_error(text: str) -> None:
    """Print error message"""
    print(f"{RED}❌ {text}{RESET}")


def print_warning(text: str) -> None:
    """Print warning message"""
    print(f"{YELLOW}⚠️  {text}{RESET}")


def print_info(text: str) -> None:
    """Print info message"""
    print(f"{BLUE}ℹ️  {text}{RESET}")


def check_env_key(key_name: str, required: bool = False) -> Tuple[bool, str]:
    """
    Check if environment variable is set and valid.

    Returns:
        (is_set, value_preview)
    """
    value = os.getenv(key_name)

    if not value:
        return False, "Not set"

    if value.startswith("your_"):
        return False, "Default placeholder (not configured)"

    # Show preview of key (first 20 chars)
    preview = f"{value[:20]}..." if len(value) > 20 else value
    return True, preview


def test_anthropic_key() -> bool:
    """Test Anthropic API key"""
    try:
        import anthropic

        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key or api_key.startswith("your_"):
            print_error("ANTHROPIC_API_KEY not configured")
            return False

        client = anthropic.Anthropic(api_key=api_key)

        # Simple test request
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=10,
            messages=[{"role": "user", "content": "Say 'ok'"}]
        )

        if response.content[0].text:
            print_success(f"ANTHROPIC_API_KEY valid (model: claude-sonnet-4)")
            return True
        else:
            print_error("ANTHROPIC_API_KEY: Unexpected response")
            return False

    except ImportError:
        print_warning("anthropic package not installed (pip install anthropic)")
        return False
    except Exception as e:
        print_error(f"ANTHROPIC_API_KEY validation failed: {str(e)}")
        return False


def test_openai_key() -> bool:
    """Test OpenAI API key"""
    try:
        import openai

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key or api_key.startswith("your_"):
            print_error("OPENAI_API_KEY not configured")
            return False

        client = openai.OpenAI(api_key=api_key)

        # Simple test request
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Use mini for cheaper test
            max_tokens=10,
            messages=[{"role": "user", "content": "Say 'ok'"}]
        )

        if response.choices[0].message.content:
            print_success(f"OPENAI_API_KEY valid (model: gpt-4o-mini)")
            return True
        else:
            print_error("OPENAI_API_KEY: Unexpected response")
            return False

    except ImportError:
        print_warning("openai package not installed (pip install openai)")
        return False
    except Exception as e:
        print_error(f"OPENAI_API_KEY validation failed: {str(e)}")
        return False


def test_gemini_key() -> bool:
    """Test Google Gemini API key"""
    try:
        import google.generativeai as genai

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key.startswith("your_"):
            print_warning("GEMINI_API_KEY not configured (optional)")
            return False

        genai.configure(api_key=api_key)

        # Simple test request
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        response = model.generate_content("Say 'ok'")

        if response.text:
            print_success(f"GEMINI_API_KEY valid (model: gemini-2.0-flash)")
            return True
        else:
            print_error("GEMINI_API_KEY: Unexpected response")
            return False

    except ImportError:
        print_warning("google-generativeai package not installed (pip install google-generativeai)")
        return False
    except Exception as e:
        print_error(f"GEMINI_API_KEY validation failed: {str(e)}")
        return False


def test_mongodb_connection() -> bool:
    """Test MongoDB connection"""
    try:
        from pymongo import MongoClient

        uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/genesis")

        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')

        print_success(f"MongoDB connected: {uri}")
        return True

    except ImportError:
        print_warning("pymongo package not installed (pip install pymongo)")
        return False
    except Exception as e:
        print_error(f"MongoDB connection failed: {str(e)}")
        print_info("Start MongoDB: sudo systemctl start mongodb")
        return False


def test_redis_connection() -> bool:
    """Test Redis connection"""
    try:
        import redis

        url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

        client = redis.from_url(url, socket_connect_timeout=5)
        client.ping()

        print_success(f"Redis connected: {url}")
        return True

    except ImportError:
        print_warning("redis package not installed (pip install redis)")
        return False
    except Exception as e:
        print_error(f"Redis connection failed: {str(e)}")
        print_info("Start Redis: sudo systemctl start redis-server")
        return False


def main():
    """Main validation function"""
    print_header("Genesis Rebuild - API Key Validation")

    # Load .env file
    env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_file):
        load_dotenv(env_file)
        print_success(f"Loaded .env file: {env_file}")
    else:
        print_warning(f".env file not found: {env_file}")
        print_info("Run: cp .env.example .env")
        print_info("Or: ./scripts/setup_env.sh")
        print("")

    # Check required keys
    print_header("REQUIRED API KEYS")

    results = {}

    # Anthropic
    is_set, preview = check_env_key("ANTHROPIC_API_KEY", required=True)
    if is_set:
        print_info(f"ANTHROPIC_API_KEY: {preview}")
        results["anthropic"] = test_anthropic_key()
    else:
        print_error(f"ANTHROPIC_API_KEY: {preview}")
        print_info("Get key: https://console.anthropic.com/settings/keys")
        results["anthropic"] = False

    print("")

    # OpenAI
    is_set, preview = check_env_key("OPENAI_API_KEY", required=True)
    if is_set:
        print_info(f"OPENAI_API_KEY: {preview}")
        results["openai"] = test_openai_key()
    else:
        print_error(f"OPENAI_API_KEY: {preview}")
        print_info("Get key: https://platform.openai.com/api-keys")
        results["openai"] = False

    # Optional keys
    print_header("OPTIONAL API KEYS")

    # Gemini
    is_set, preview = check_env_key("GEMINI_API_KEY", required=False)
    if is_set:
        print_info(f"GEMINI_API_KEY: {preview}")
        results["gemini"] = test_gemini_key()
    else:
        print_warning(f"GEMINI_API_KEY: {preview}")
        print_info("Get key: https://aistudio.google.com/apikey (recommended for cost savings)")
        results["gemini"] = False

    # Databases
    print_header("DATABASE CONNECTIONS")

    results["mongodb"] = test_mongodb_connection()
    print("")
    results["redis"] = test_redis_connection()

    # Summary
    print_header("VALIDATION SUMMARY")

    total = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total - passed

    print(f"Total checks: {total}")
    print_success(f"Passed: {passed}")
    if failed > 0:
        print_error(f"Failed: {failed}")

    print("")

    if results.get("anthropic") and results.get("openai"):
        print_success("✅ Minimum requirements met (Anthropic + OpenAI)")
        print_info("You can now run Genesis agents!")
        print("")
        print_info("Next steps:")
        print_info("  1. Run WaltzRL tests: ./scripts/run_waltzrl_real_llm_tests.sh")
        print_info("  2. Run test suite: pytest tests/ -v")
        return 0
    else:
        print_error("❌ Minimum requirements NOT met")
        print_info("You need at least ANTHROPIC_API_KEY and OPENAI_API_KEY")
        print("")
        print_info("Setup instructions:")
        print_info("  1. Run: ./scripts/setup_env.sh")
        print_info("  2. Or manually edit .env file")
        print_info("  3. Get keys from:")
        print_info("     - Anthropic: https://console.anthropic.com/settings/keys")
        print_info("     - OpenAI: https://platform.openai.com/api-keys")
        return 1


if __name__ == "__main__":
    sys.exit(main())
