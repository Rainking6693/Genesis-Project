"""
Quick test to verify OrchestratorEnhancements integration
"""
import asyncio
import logging

logging.basicConfig(level=logging.INFO)

async def test_enhancements():
    print("=" * 60)
    print("Testing OrchestratorEnhancements Integration")
    print("=" * 60)
    
    # Test 1: Import orchestrator integration
    print("\n[Test 1] Importing OrchestratorEnhancements...")
    try:
        from infrastructure.orchestrator_integration import OrchestratorEnhancements
        print("✅ Import successful")
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return
    
    # Test 2: Initialize enhancements
    print("\n[Test 2] Initializing OrchestratorEnhancements...")
    try:
        enhancements = OrchestratorEnhancements()
        print(f"✅ Initialization successful")
        print(f"   - Pipelex: {'enabled' if enhancements.pipelex else 'disabled'}")
        print(f"   - MicroAdapt: {'enabled' if enhancements.microadapt else 'disabled'}")
    except Exception as e:
        print(f"❌ Initialization failed: {e}")
        return
    
    # Test 3: Test MicroAdapt task recording
    print("\n[Test 3] Testing MicroAdapt task recording...")
    try:
        await enhancements.record_task_result(
            agent_name="test_agent",
            task_type="test_task",
            success=True,
            execution_time=1.5
        )
        print(f"✅ Task recording successful")
        print(f"   - Tasks recorded: {enhancements.tasks_recorded}")
    except Exception as e:
        print(f"❌ Task recording failed: {e}")
    
    # Test 4: Get stats
    print("\n[Test 4] Getting enhancement stats...")
    try:
        stats = enhancements.get_stats()
        print(f"✅ Stats retrieval successful")
        print(f"   - Pipelex enabled: {stats['pipelex']['enabled']}")
        print(f"   - MicroAdapt enabled: {stats['microadapt']['enabled']}")
        print(f"   - Tasks recorded: {stats['microadapt']['tasks_recorded']}")
    except Exception as e:
        print(f"❌ Stats retrieval failed: {e}")
    
    # Test 5: Test Genesis Meta Agent integration
    print("\n[Test 5] Testing GenesisMetaAgent initialization...")
    try:
        from infrastructure.genesis_meta_agent import GenesisMetaAgent
        agent = GenesisMetaAgent(use_local_llm=False)
        has_enhancements = hasattr(agent, 'enhancements') and agent.enhancements is not None
        print(f"✅ GenesisMetaAgent initialization successful")
        print(f"   - Enhancements integrated: {has_enhancements}")
        if has_enhancements:
            print(f"   - Enhancements type: {type(agent.enhancements).__name__}")
    except Exception as e:
        print(f"❌ GenesisMetaAgent initialization failed: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_enhancements())
