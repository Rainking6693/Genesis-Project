#!/usr/bin/env python3
"""Quick test to verify real execution works"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from genesis_100_test_suite_real import RealQwenMistralLLMClient, RealBusinessIdeaGenerator

async def test():
    print("Testing LLM client...")
    llm_client = RealQwenMistralLLMClient()
    
    print("Testing business idea generation...")
    generator = RealBusinessIdeaGenerator(llm_client)
    
    print("Generating business idea (this will take 30-60 seconds)...")
    idea = await generator.generate_business_idea("TEST001")
    
    print(f"[OK] Generated: {idea.name}")
    print(f"   Description: {idea.description[:100]}...")
    print(f"   Type: {idea.business_type.value}")
    print(f"   LLM Calls - Qwen: {llm_client.qwen_calls}, Mistral: {llm_client.mistral_calls}")
    
    return idea

if __name__ == "__main__":
    asyncio.run(test())

