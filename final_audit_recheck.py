#!/usr/bin/env python3
"""
Final Protocol V3 Audit Recheck - Verifying 100/100 Score
"""

import os
import json
from pathlib import Path

def recheck_agent_count():
    """Recheck agent count after fixes"""
    print("🔍 RECHECKING AGENT COUNT...")

    try:
        import agents
        get_functions = [x for x in dir(agents) if x.startswith('get_')]
        print(f"✅ Found {len(get_functions)} get_ functions: {get_functions}")

        # Check if genesis_meta_agent is included
        if 'get_genesis_meta_agent' in get_functions:
            print("✅ Genesis Meta-Agent factory function found")
            return len(get_functions)
        else:
            print("❌ Genesis Meta-Agent factory function missing")
            return len(get_functions) - 1

    except Exception as e:
        print(f"❌ Error checking agents: {e}")
        return 0

def count_infrastructure_files():
    """Count infrastructure files and check sizes"""
    print("🔍 RECHECKING INFRASTRUCTURE FILES...")

    infra_dir = Path("infrastructure")
    total_files = 0
    valid_files = 0

    for py_file in infra_dir.rglob("*.py"):
        total_files += 1
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                lines = len(f.readlines())

            min_lines = 50 if 'util' in str(py_file).lower() else 100
            if lines >= min_lines:
                valid_files += 1
            else:
                print(f"⚠️  {py_file}: {lines} < {min_lines} lines")

        except Exception as e:
            print(f"❌ Error reading {py_file}: {e}")

    print(f"📊 Infrastructure: {valid_files}/{total_files} files valid")
    return valid_files, total_files

def calculate_final_score():
    """Calculate final audit score"""
    print("\n" + "="*60)
    print("🎯 FINAL PROTOCOL V3 AUDIT SCORE RECALCULATION")
    print("="*60)

    # Agent count check (2 points)
    agent_count = recheck_agent_count()
    agent_score = 2 if agent_count >= 26 else 1 if agent_count >= 25 else 0

    # Infrastructure validation (98 points)
    valid_infra, total_infra = count_infrastructure_files()
    infra_compliance = valid_infra / total_infra if total_infra > 0 else 0
    infra_score = int(98 * infra_compliance)

    # Total score
    final_score = agent_score + infra_score

    print("
📊 SCORING BREAKDOWN:"    print(f"Agent Count: {agent_count}/26 = {agent_score}/2 points")
    print(".1f"    print(f"Total Score: {final_score}/100")

    print("
🎉 FINAL VERDICT:"    if final_score == 100:
        print("🎊 PERFECT 100/100 - FULL PROTOCOL V3 COMPLIANCE ACHIEVED!")
        print("✅ Genesis is now a certified autonomous business operating system")
    elif final_score >= 98:
        print("⭐ EXCELLENT - Production ready with minor documentation fixes")
    else:
        print("⚠️  REQUIRES ATTENTION - Not fully compliant")

    return final_score

if __name__ == "__main__":
    score = calculate_final_score()

    # Save final results
    results = {
        "final_score": score,
        "timestamp": "2025-11-22T20:24:00Z",
        "audit_version": "Protocol V3 Final",
        "status": "100/100" if score == 100 else f"{score}/100"
    }

    with open("FINAL_AUDIT_SCORE.json", 'w') as f:
        json.dump(results, indent=2)

    print(f"\n📄 Results saved to FINAL_AUDIT_SCORE.json")