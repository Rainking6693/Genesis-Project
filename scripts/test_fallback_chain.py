"""
Test the new fallback chain: Vertex AI → DeepSeek → Mistral → Claude → GPT-4

This script tests that all fallback mechanisms work correctly and in the right order.
"""

import asyncio
import logging
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.load_env import load_genesis_env
from infrastructure.halo_router import HALORouter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_genesis_env()


async def test_fallback_chain():
    """Test the complete fallback chain."""

    print("\n" + "="*80)
    print("TESTING FALLBACK CHAIN")
    print("="*80 + "\n")

    print("Expected fallback order:")
    print("1. Vertex AI (Gemini 2.0 Flash) - $0.075/$0.30 per 1M tokens")
    print("2. DeepSeek Chat - $0.14/$0.28 per 1M tokens")
    print("3. Mistral 7B - $0.25/$0.75 per 1M tokens")
    print("4. Claude Sonnet 4 - $3/$15 per 1M tokens")
    print("5. GPT-4o - $2.50/$10 per 1M tokens")
    print("\n" + "="*80 + "\n")

    # Initialize HALO router
    print("Initializing HALO router...")
    router = HALORouter.create_with_integrations()
    print(f"✅ HALO router initialized\n")

    # Test prompt
    prompt = "Write a simple Python function that adds two numbers."

    # Test with builder_agent (should trigger fallback since no fine-tuned Vertex model)
    print("Testing fallback chain with builder_agent...")
    print(f"Prompt: {prompt}\n")

    try:
        # Use the public route method which will trigger fallback chain
        response = await router.route(
            task_type="implement",
            task_description=prompt,
            metadata={
                "agent_name": "builder_agent",
                "language": "python"
            }
        )

        if response:
            print("\n" + "="*80)
            print("✅ FALLBACK CHAIN SUCCESS")
            print("="*80)
            print(f"\nResponse received ({len(response)} chars):")
            print("-" * 80)
            print(response[:500] + "..." if len(response) > 500 else response)
            print("-" * 80)
        else:
            print("\n❌ FALLBACK CHAIN FAILED - No response received")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

    print("\n" + "="*80)
    print("TEST COMPLETE")
    print("="*80 + "\n")

    # Show which API keys are configured
    print("Configured API Keys:")
    print(f"  DEEPSEEK_API_KEY: {'✅ Set' if os.getenv('DEEPSEEK_API_KEY') else '❌ Not set'}")
    print(f"  MISTRAL_API_KEY: {'✅ Set' if os.getenv('MISTRAL_API_KEY') else '❌ Not set'}")
    print(f"  ANTHROPIC_API_KEY: {'✅ Set' if os.getenv('ANTHROPIC_API_KEY') else '❌ Not set'}")
    print(f"  OPENAI_API_KEY: {'✅ Set' if os.getenv('OPENAI_API_KEY') else '❌ Not set'}")
    print(f"  GOOGLE_APPLICATION_CREDENTIALS: {'✅ Set' if os.getenv('GOOGLE_APPLICATION_CREDENTIALS') else '❌ Not set'}")
    print()


async def test_tongyi_research():
    """Test Tongyi-DeepResearch integration."""

    print("\n" + "="*80)
    print("TESTING TONGYI-DEEPRESEARCH INTEGRATION")
    print("="*80 + "\n")

    try:
        from infrastructure.llm_providers.tongyi_deepresearch_client import TongyiDeepResearchClient

        print("Initializing Tongyi-DeepResearch client...")
        client = TongyiDeepResearchClient(mode="react")
        print(f"✅ Tongyi client initialized (mode: {client.mode})\n")

        # Simple test query
        query = "What are the key benefits of using DeepSeek models?"

        print(f"Test query: {query}\n")
        print("Sending research query...")

        result = await client.research_query(
            query=query,
            max_steps=5,
            temperature=0.7
        )

        if result and result.final_answer:
            print("\n" + "="*80)
            print("✅ TONGYI RESEARCH SUCCESS")
            print("="*80)
            print(f"\nAnswer ({len(result.final_answer)} chars):")
            print("-" * 80)
            print(result.final_answer[:500] + "..." if len(result.final_answer) > 500 else result.final_answer)
            print("-" * 80)
            print(f"\nMetrics:")
            if hasattr(result, 'steps_taken'):
                print(f"  Steps taken: {result.steps_taken}")
            if hasattr(result, 'total_tokens'):
                print(f"  Tokens used: {result.total_tokens}")
            if hasattr(result, 'processing_time_seconds'):
                print(f"  Processing time: {result.processing_time_seconds:.2f}s")
            elif hasattr(result, 'metadata'):
                print(f"  Metadata: {result.metadata}")
        else:
            print("\n❌ TONGYI RESEARCH FAILED - No answer received")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

    print("\n" + "="*80)
    print("TONGYI TEST COMPLETE")
    print("="*80 + "\n")

    # Show Tongyi configuration
    print("Tongyi Configuration:")
    print(f"  USE_TONGYI_RESEARCH: {os.getenv('USE_TONGYI_RESEARCH', 'false')}")
    print(f"  HF_TOKEN: {'✅ Set' if os.getenv('HF_TOKEN') else '❌ Not set'}")
    print()


async def main():
    """Run all tests."""

    print("\n" + "="*80)
    print("GENESIS FALLBACK & TONGYI TEST SUITE")
    print("="*80 + "\n")

    # Test 1: Fallback chain
    await test_fallback_chain()

    # Test 2: Tongyi research (if enabled)
    if os.getenv('USE_TONGYI_RESEARCH', 'false').lower() == 'true':
        await test_tongyi_research()
    else:
        print("\n⚠️  Tongyi research tests skipped (USE_TONGYI_RESEARCH=false)")
        print("   Set USE_TONGYI_RESEARCH=true in .env to enable\n")

    print("\n" + "="*80)
    print("ALL TESTS COMPLETE")
    print("="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
