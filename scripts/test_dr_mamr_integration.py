# scripts/test_dr_mamr_integration.py
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.swarm.dr_mamr_attribution import DrMAMRAttributionLayer

async def test_shapley_computation():
    """Test Shapley value computation."""
    attribution = DrMAMRAttributionLayer()

    # Simulate collaboration
    agents = ["builder_agent", "qa_agent", "deploy_agent"]
    agent_outputs = {
        "builder_agent": {"quality": 0.9, "output": "code"},
        "qa_agent": {"quality": 0.8, "output": "tests"},
        "deploy_agent": {"quality": 0.85, "output": "deployment"}
    }

    shapley_values = await attribution.track_collaboration(
        task="Build and deploy feature",
        agents=agents,
        agent_outputs=agent_outputs,
        result_quality=0.88
    )

    # Validate
    assert len(shapley_values) == 3
    assert abs(sum(shapley_values.values()) - 1.0) < 0.01  # Sum to 1.0
    assert all(0 <= v <= 1 for v in shapley_values.values())

    print(f"[OK] Shapley values computed: {shapley_values}")

async def test_free_rider_detection():
    """Test free-rider detection."""
    attribution = DrMAMRAttributionLayer()

    # Simulate multiple collaborations with one lazy agent
    for i in range(15):
        agents = ["good_agent", "lazy_agent"]
        agent_outputs = {
            "good_agent": {"quality": 0.9},
            "lazy_agent": {"quality": 0.3}  # Consistently low
        }

        await attribution.track_collaboration(
            task=f"Task {i}",
            agents=agents,
            agent_outputs=agent_outputs,
            result_quality=0.7
        )

    # Detect free-riders
    free_riders = attribution.detect_free_riders(threshold=0.2, min_samples=10)

    assert "lazy_agent" in free_riders
    print(f"[OK] Free-rider detected: {free_riders}")

async def test_restart_token():
    """Test restart token issuance."""
    attribution = DrMAMRAttributionLayer()

    # Simulate declining quality
    for i in range(5):
        quality = 0.9 - (i * 0.15)  # Declining from 0.9 to 0.3
        await attribution.track_collaboration(
            task=f"Declining task {i}",
            agents=["agent_1"],
            agent_outputs={"agent_1": {"quality": quality}},
            result_quality=quality
        )

    # Check restart history
    assert len(attribution.restart_manager.restart_history) > 0
    print(f"[OK] Restart tokens issued: {len(attribution.restart_manager.restart_history)}")

async def main():
    print("Testing Dr. MAMR Attribution Layer...")
    print("-" * 60)

    await test_shapley_computation()
    await test_free_rider_detection()
    await test_restart_token()

    print("-" * 60)
    print("[SUCCESS] All Dr. MAMR tests passed!")

if __name__ == "__main__":
    asyncio.run(main())
