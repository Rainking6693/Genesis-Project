"""
Quick test to see which fallback model will be used.
This doesn't run a full business generation - just tests the LLM routing.
"""

import sys
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.load_env import load_genesis_env
load_genesis_env()

import os

print("\n" + "="*80)
print("QUICK FALLBACK CHECK")
print("="*80 + "\n")

# Check which API keys are configured
keys = {
    "Vertex AI (Gemini 2.0 Flash)": os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
    "DeepSeek Chat": os.getenv("DEEPSEEK_API_KEY"),
    "Mistral 7B": os.getenv("MISTRAL_API_KEY"),
    "Claude Sonnet 4": os.getenv("ANTHROPIC_API_KEY"),
    "GPT-4o": os.getenv("OPENAI_API_KEY"),
}

print("Configured fallback models:\n")
for i, (model, key) in enumerate(keys.items(), 1):
    status = "[OK] READY" if key else "[X] NOT CONFIGURED"
    print(f"{i}. {model}: {status}")

print("\n" + "="*80)
print("EXPECTED FALLBACK ORDER")
print("="*80 + "\n")

fallback_order = []
if keys["Vertex AI (Gemini 2.0 Flash)"]:
    fallback_order.append("1. Vertex AI (Gemini 2.0 Flash) - Will try first")
    if not os.path.exists(os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")):
        print("⚠️  WARNING: GOOGLE_APPLICATION_CREDENTIALS file not found")
        print(f"   Path: {os.getenv('GOOGLE_APPLICATION_CREDENTIALS')}\n")

if keys["DeepSeek Chat"]:
    fallback_order.append(f"{len(fallback_order)+1}. DeepSeek Chat - Will use if Vertex AI fails")

if keys["Mistral 7B"]:
    fallback_order.append(f"{len(fallback_order)+1}. Mistral 7B - Will use if DeepSeek fails")

if keys["Claude Sonnet 4"]:
    fallback_order.append(f"{len(fallback_order)+1}. Claude Sonnet 4 - Will use if Mistral fails")

if keys["GPT-4o"]:
    fallback_order.append(f"{len(fallback_order)+1}. GPT-4o - Last resort")

for line in fallback_order:
    print(line)

print("\n" + "="*80)
print("COST COMPARISON")
print("="*80 + "\n")

costs = {
    "Vertex AI (Gemini 2.0 Flash)": "$0.0005/business",
    "DeepSeek Chat": "$0.001/business",
    "Mistral 7B": "$0.002/business",
    "Claude Sonnet 4": "$0.05/business",
    "GPT-4o": "$0.04/business",
}

print("Estimated cost per business generation:\n")
for model, cost in costs.items():
    if keys[model]:
        print(f"  {model}: {cost}")

print("\n" + "="*80)
print("RECOMMENDATION")
print("="*80 + "\n")

# Check Vertex AI status
vertex_file = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
vertex_exists = os.path.exists(vertex_file) if vertex_file else False

if vertex_exists:
    print("[OK] Vertex AI is configured and will be tried first (cheapest)")
    print("    If permission error occurs, will fall back to DeepSeek (still cheap)")
else:
    print("[!] Vertex AI credentials file not found")
    print("    Will use DeepSeek as primary (still very cheap)")

if keys["DeepSeek Chat"]:
    print("\n[OK] DeepSeek is configured (95% cheaper than Claude)")
    print("     You're good to go!")
else:
    print("\n[X] DeepSeek is NOT configured")
    print("    Add DEEPSEEK_API_KEY to .env to save 95% on costs")

print("\n" + "="*80)
print("\nTo test the actual fallback, run:")
print("  python scripts/autonomous_fully_integrated.py --count 1 --min-score 70.0")
print("\nOr for a simple test:")
print("  python scripts/simple_fallback_test.py")
print()
