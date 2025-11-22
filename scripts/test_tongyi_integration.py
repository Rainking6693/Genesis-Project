# scripts/test_tongyi_integration.py
import asyncio
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set test mode (no real API calls needed)
os.environ["USE_TONGYI_RESEARCH"] = "false"  # Test fallback mode first

from infrastructure.llm_providers.tongyi_deepresearch_client import TongyiDeepResearchClient

async def test_client_initialization():
    """Test client initialization."""
    # Test without API key (should use fallback)
    client = TongyiDeepResearchClient(
        api_key=None,
        mode="react",
        use_local=True  # Use local mode to avoid API requirement
    )

    assert client.mode == "react"
    assert client.use_local == True
    print("[OK] Client initialized")

async def test_prompt_formatting():
    """Test prompt formatting for both modes."""
    client = TongyiDeepResearchClient(mode="react", use_local=True)

    # Test ReAct prompt
    react_prompt = client._format_react_prompt("What is quantum computing?")
    assert "ReAct reasoning" in react_prompt
    assert "Thought 1:" in react_prompt

    # Test IterResearch prompt
    heavy_prompt = client._format_iterresearch_prompt("Explain machine learning", max_steps=5)
    assert "deep research specialist" in heavy_prompt
    assert "iterative refinement" in heavy_prompt

    print("[OK] Prompt formatting works")

async def test_response_parsing():
    """Test response parsing."""
    client = TongyiDeepResearchClient(mode="react", use_local=True)

    mock_response = """Thought 1: I need to explain this concept clearly.
Action 1: Research the fundamentals.
Observation 1: Found key information.

Final Answer: This is a comprehensive answer to the question."""

    result = client._parse_research_response(mock_response, "react")

    assert len(result.reasoning_steps) == 3
    assert "comprehensive answer" in result.final_answer
    assert result.confidence > 0.5

    print("[OK] Response parsing works")
    print(f"  Parsed result: {result.reasoning_steps[0][:50]}...")

async def test_cost_estimation():
    """Test cost estimation."""
    client = TongyiDeepResearchClient(mode="react", use_local=True)

    # Estimate cost for 100 queries
    cost_react = client.get_cost_estimate(100, mode="react")
    cost_heavy = client.get_cost_estimate(100, mode="heavy")

    assert cost_react["num_queries"] == 100
    assert cost_heavy["estimated_cost_usd"] > cost_react["estimated_cost_usd"]

    print(f"[OK] Cost estimation works")
    print(f"  ReAct mode: ${cost_react['estimated_cost_usd']:.4f} for 100 queries")
    print(f"  Heavy mode: ${cost_heavy['estimated_cost_usd']:.4f} for 100 queries")

async def main():
    print("Testing Tongyi-DeepResearch Integration...")
    print("-" * 60)

    await test_client_initialization()
    await test_prompt_formatting()
    await test_response_parsing()
    await test_cost_estimation()

    print("-" * 60)
    print("[SUCCESS] All Tongyi-DeepResearch tests passed!")
    print()
    print("To enable Tongyi-DeepResearch in production:")
    print("1. Set HF_TOKEN environment variable with your HuggingFace API token")
    print("2. Set USE_TONGYI_RESEARCH=true in .env")
    print("3. Or use local vLLM with: use_local=True")

if __name__ == "__main__":
    asyncio.run(main())
