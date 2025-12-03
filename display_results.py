#!/usr/bin/env python3
"""Display test results"""
import json
from pathlib import Path

# Load metrics
metrics_file = Path("metrics/100_test_campaign.json")
if metrics_file.exists():
    with open(metrics_file) as f:
        data = json.load(f)
    
    print("="*80)
    print("GENESIS 100-TEST CAMPAIGN RESULTS")
    print("="*80)
    print(f"Total Tests: {data['total_tests']}")
    print(f"Passed: {data['passed_tests']}")
    print(f"Failed: {data['failed_tests']}")
    print(f"Errors: {data['error_tests']}")
    print(f"Average HGM Score: {data['average_hgm_score']:.1f}/100.0")
    print(f"Core 11 Success Rate: {data['core_11_success_rate']:.1f}%")
    print(f"Full Swarm Success Rate: {data['full_swarm_success_rate']:.1f}%")
    print(f"Tests with HGM ≥ 80.0: {data['tests_passed_hgm_80_plus']}/100")
    print(f"Unused Integrations: {len(data['unused_integrations'])}")
    if data['unused_integrations']:
        print(f"  {', '.join(data['unused_integrations'])}")
    print(f"Total Duration: {data['total_duration_seconds']/60:.1f} minutes")
    print("="*80)
    
    # Determine verdict
    pass_rate = (data['tests_passed_hgm_80_plus'] / data['total_tests']) * 100
    if pass_rate >= 80 and data['average_hgm_score'] >= 80:
        print("✅ GENESIS CERTIFIED AT SCALE")
    elif pass_rate >= 60:
        print("⚠️ GENESIS READY FOR PRODUCTION")
    else:
        print("❌ BLOCKERS REMAINING")
else:
    print("❌ Metrics file not found")

