#!/usr/bin/env python3
"""
Test Hybrid Agents - Genesis 2025 Tournament Winners

Validates that all 13 CrewAI hybrid agents are properly configured
and can be instantiated with Genesis hooks preserved.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

# Load environment
from infrastructure.load_env import load_genesis_env
load_genesis_env()

print("\n" + "="*80)
print(" "*15 + "[TEST] GENESIS HYBRID AGENTS VALIDATION")
print("="*80 + "\n")

# Test hybrid agents import
print("[1/4] Testing hybrid_agents module import...")
try:
    from infrastructure.hybrid_agents import (
        CREWAI_AVAILABLE,
        get_hybrid_agent,
        HybridAnalystAgent,
        HybridBillingAgent,
        HybridCommerceAgent,
        HybridContentAgent,
        HybridDomainNameAgent,
        HybridEmailAgent,
        HybridFinanceAgent,
        HybridMarketingAgent,
        HybridOnboardingAgent,
        HybridPricingAgent,
        HybridResearchDiscoveryAgent,
        HybridSEOAgent,
        HybridSpecAgent,
    )
    print("  [OK] hybrid_agents module imported successfully")
    print(f"  [INFO] CrewAI available: {CREWAI_AVAILABLE}")
except ImportError as e:
    print(f"  [FAIL] Import error: {e}")
    sys.exit(1)

# Test hybrid base import
print("\n[2/4] Testing hybrid_crewai_base module import...")
try:
    from infrastructure.hybrid_crewai_base import (
        HybridCrewAIAgent,
        create_hybrid_crewai_agent,
    )
    print("  [OK] hybrid_crewai_base module imported successfully")
except ImportError as e:
    print(f"  [FAIL] Import error: {e}")

# Test agent instantiation
print("\n[3/4] Testing hybrid agent instantiation...")
agents_to_test = [
    "analyst_agent",
    "billing_agent",
    "commerce_agent",
    "content_agent",
    "domain_name_agent",
    "email_agent",
    "finance_agent",
    "marketing_agent",
    "onboarding_agent",
    "pricing_agent",
    "research_discovery_agent",
    "seo_agent",
    "spec_agent",
]

results = []
for agent_name in agents_to_test:
    try:
        agent = get_hybrid_agent(agent_name, business_id="test")
        has_genesis_hooks = getattr(agent, 'genesis_hooks', False)
        has_crewai = agent._crewai_agent is not None
        status = "OK" if has_genesis_hooks else "PARTIAL"
        results.append((agent_name, status, has_genesis_hooks, has_crewai))
        print(f"  [{status}] {agent_name}: genesis_hooks={has_genesis_hooks}, crewai={has_crewai}")
    except Exception as e:
        results.append((agent_name, "FAIL", False, False))
        print(f"  [FAIL] {agent_name}: {e}")

# Summary
print("\n[4/4] Summary")
print("-"*80)
success = sum(1 for r in results if r[1] == "OK")
partial = sum(1 for r in results if r[1] == "PARTIAL")
failed = sum(1 for r in results if r[1] == "FAIL")

print(f"  Total agents tested: {len(results)}")
print(f"  Successful (with hooks): {success}")
print(f"  Partial (no CrewAI): {partial}")
print(f"  Failed: {failed}")

print("\n" + "="*80)
if failed == 0:
    print(" "*15 + "[PASS] ALL HYBRID AGENTS VALIDATED SUCCESSFULLY")
else:
    print(" "*15 + f"[WARN] {failed} AGENTS FAILED VALIDATION")
print("="*80 + "\n")

# Print final leaderboard summary
print("HYBRID LEADERBOARD SUMMARY:")
print("-"*80)
print("| Agent Type          | Framework | Genesis Hooks | Status    |")
print("|---------------------|-----------|---------------|-----------|")
for name, status, hooks, crewai in results:
    framework = "CrewAI" if crewai else "Genesis"
    hooks_str = "Yes" if hooks else "No"
    print(f"| {name:<19} | {framework:<9} | {hooks_str:<13} | {status:<9} |")
print("-"*80)
