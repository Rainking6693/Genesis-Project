"""
Simple test for the fallback chain.
This directly tests business generation to see which model is used.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.load_env import load_genesis_env
load_genesis_env()

import asyncio
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

print("\n" + "="*80)
print("SIMPLE FALLBACK CHAIN TEST")
print("="*80 + "\n")

print("This test will generate 1 simple business and show which models are used.")
print("Watch for these icons in the logs:\n")
print("  🔷 = Vertex AI (Gemini 2.0 Flash) - cheapest")
print("  🟢 = DeepSeek - very cheap fallback")
print("  🟡 = Mistral - mid-cost fallback")
print("  🔴 = Claude/GPT - expensive fallback (should NOT see this!)")
print("\n" + "="*80 + "\n")

import subprocess
import os

# Run a simple business generation
cmd = [
    sys.executable,
    "scripts/autonomous_fully_integrated.py",
    "--count", "1",
    "--min-score", "70.0"
]

print(f"Running: {' '.join(cmd)}\n")
print("Watch the logs below for fallback indicators...\n")
print("="*80 + "\n")

result = subprocess.run(cmd, cwd=Path(__file__).parent.parent)

print("\n" + "="*80)
print("TEST COMPLETE")
print("="*80 + "\n")

print("To see which model was used, look for:")
print("  ✅ DeepSeek fallback success")
print("  ✅ Mistral fallback success")
print("  ✅ Vertex AI success")
print("  ✅ Claude fallback success (expensive - should be rare!)")
print("\n")

sys.exit(result.returncode)
