#!/usr/bin/env python3
"""
Smoke test for Vertex AI tuned models integration.
Tests all 6 Genesis agents (QA, Support, Analyst, Legal, Content, Security).
"""

import sys
import os

# Add parent directory to path to import infrastructure module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infrastructure.vertex_client import ask_agent

def main():
    """Run smoke tests for all Genesis agents."""
    print("=" * 80)
    print("Genesis Vertex AI Tuned Models - Smoke Test")
    print("=" * 80)
    print()

    tests = [
        ("qa", "Give two bullet points on safe website backups."),
        ("support", "Login keeps failing—what should I try first?"),
        ("analyst", "Revenue is down 5% WoW. What should I check?"),
        ("legal", "Can we use a customer logo in ads?"),
        ("content", "Write a one-line blurb for DirectoryBolt."),
        ("security", "Is it safe to commit .env files?"),
    ]

    results = []
    for role, prompt in tests:
        print(f"Testing {role.upper()} agent...")
        print(f"Prompt: {prompt}")
        try:
            answer = ask_agent(role, prompt)
            if not answer or answer.strip() == "":
                print(f"❌ FAIL: Empty response from {role} agent")
                results.append((role, False))
            else:
                print(f"✅ PASS: Got response ({len(answer)} chars)")
                print(f"Answer: {answer[:200]}{'...' if len(answer) > 200 else ''}")
                results.append((role, True))
        except Exception as e:
            print(f"❌ ERROR: {role} agent failed with: {e}")
            results.append((role, False))
        print()

    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    passed = sum(1 for _, success in results if success)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    for role, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {status}: {role}")
    print()

    if passed == total:
        print("🎉 All smoke tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed. Check output above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
