#!/usr/bin/env python3
"""Quick test runner for Discord integration"""

import asyncio
import os
import sys
from pathlib import Path

# Load production env
from dotenv import load_dotenv
load_dotenv('config/production.env')

sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.genesis_discord import GenesisDiscord


async def test_discord():
    print("🧪 Testing Discord webhook integration...")
    discord = GenesisDiscord()
    
    try:
        # Test 1: System lifecycle
        print("\n1. Testing genesis_started()...")
        await discord.genesis_started()
        await asyncio.sleep(1)
        
        # Test 2: Business build
        print("2. Testing business_build_started()...")
        await discord.business_build_started("test_001", "Test Business", "Testing Discord integration")
        await asyncio.sleep(1)
        
        # Test 3: Agent activity
        print("3. Testing agent notifications...")
        await discord.agent_started("test_001", "Test Agent", "Running tests")
        await asyncio.sleep(0.5)
        await discord.agent_progress("test_001", "Test Agent", "50% complete")
        await asyncio.sleep(0.5)
        await discord.agent_completed("test_001", "Test Agent", "All tests passed")
        await asyncio.sleep(1)
        
        # Test 4: HopX environment
        print("4. Testing HopX notifications...")
        await discord.hopx_environment_created("test_001", "env_123", "nodejs_environment")
        await asyncio.sleep(0.5)
        await discord.hopx_environment_destroyed("test_001", "env_123", 45)
        await asyncio.sleep(1)
        
        # Test 5: Deployment
        print("5. Testing deployment notification...")
        await discord.deployment_success("Test Business", "https://test.example.com", {
            'build_time': '2 minutes',
            'quality_score': 95
        })
        await asyncio.sleep(1)
        
        # Test 6: Error
        print("6. Testing error notification...")
        await discord.agent_error("test_001", "Test Agent", "Simulated error")
        await asyncio.sleep(1)
        
        print("\n✅ All Discord tests completed!")
        print("📱 Check your Discord server - you should see notifications in all channels!")
        
    except Exception as e:
        print(f"\n❌ Discord test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await discord.close()


if __name__ == "__main__":
    asyncio.run(test_discord())

