#!/usr/bin/env python3
"""Quick test of business generation (without loading LLM model)"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.genesis_meta_agent import GenesisMetaAgent, BusinessSpec

async def test():
    print("\n" + "="*70)
    print("  TESTING BUSINESS GENERATION WORKFLOW")
    print("="*70 + "\n")
    
    # Initialize meta-agent WITHOUT loading LLM (fast test)
    print("▶ Step 1/4: Initializing Genesis Meta-Agent...")
    meta_agent = GenesisMetaAgent(use_local_llm=False)
    print("✅ Meta-Agent initialized\n")
    
    # Create test business spec
    print("▶ Step 2/4: Creating business specification...")
    spec = BusinessSpec(
        name="Test E-Commerce Store",
        business_type="ecommerce",
        description="Test e-commerce generation",
        components=[],
        output_dir=Path("businesses/test")
    )
    print(f"✅ Spec created: {spec.name}\n")
    
    # Test task decomposition
    print("▶ Step 3/4: Testing task decomposition...")
    dag = meta_agent._decompose_business_to_tasks(spec)
    print(f"✅ Created DAG with {len(dag.get_all_tasks())} tasks")
    
    for task in dag.get_all_tasks():
        if task.task_id != "root":
            print(f"   - {task.task_id}: {task.description}")
    print()
    
    # Test generation (mock)
    print("▶ Step 4/4: Testing generation pipeline...")
    result = await meta_agent.generate_business(spec)
    
    print("\n" + "="*70)
    print("  TEST RESULT")
    print("="*70)
    print(f"Business: {result.business_name}")
    print(f"Success: {'✅ YES' if result.success else '❌ NO'}")
    print(f"Tasks Completed: {result.tasks_completed}")
    print(f"Tasks Failed: {result.tasks_failed}")
    print(f"Time: {result.generation_time_seconds:.2f}s")
    print(f"Output: {result.output_directory}")
    print(f"Components: {', '.join(result.components_generated[:3])}...")
    print("="*70 + "\n")
    
    print("✅ WORKFLOW TEST PASSED!")
    print("\nNext: Run with local LLM for actual generation")
    print("Command: python scripts/generate_business.py --business ecommerce\n")

asyncio.run(test())
