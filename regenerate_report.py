#!/usr/bin/env python3
"""Regenerate final report from saved test results"""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from genesis_100_test_suite import GenesisTestForge, TestExecution, TestStatus, TestPhase, BusinessIdea, BusinessType
from dataclasses import asdict

# Load saved results
results_file = Path("metrics/100_test_campaign_detailed_results.json")
metrics_file = Path("metrics/100_test_campaign.json")

if not results_file.exists():
    print("❌ Results file not found")
    sys.exit(1)

# Load metrics
with open(metrics_file) as f:
    metrics_data = json.load(f)

# Load test results
with open(results_file) as f:
    results_data = json.load(f)

# Reconstruct test execution objects
forge = GenesisTestForge()
forge.test_results = []

for r in results_data:
    business_idea = BusinessIdea(
        id=r['test_id'],
        name=r['business_name'],
        description="",  # Not in saved data
        business_type=BusinessType(r['business_type']),
        target_market="",  # Not in saved data
        key_features=[],  # Not in saved data
        monetization_model="",  # Not in saved data
        tech_stack=[]  # Not in saved data
    )
    
    test_exec = TestExecution(
        test_id=r['test_id'],
        business_idea=business_idea,
        phase=TestPhase(r['phase']),
        status=TestStatus(r['status']),
        start_time=None,  # Not critical for report
        hgm_score=r['hgm_score'],
        agents_used=r.get('agents_used', []),
        integrations_tested=r.get('integrations_tested', []),
        steps_completed=r.get('steps_completed', []),
        final_deployment_url=r.get('final_deployment_url'),
        billing_setup=r.get('billing_setup', False),
        domain_registered=r.get('domain_registered', False),
        seo_optimized=r.get('seo_optimized', False)
    )
    forge.test_results.append(test_exec)

# Update metrics
forge.metrics.total_tests = metrics_data['total_tests']
forge.metrics.passed_tests = metrics_data['passed_tests']
forge.metrics.failed_tests = metrics_data['failed_tests']
forge.metrics.error_tests = metrics_data['error_tests']
forge.metrics.core_11_success_rate = metrics_data['core_11_success_rate']
forge.metrics.full_swarm_success_rate = metrics_data['full_swarm_success_rate']
forge.metrics.average_hgm_score = metrics_data['average_hgm_score']
forge.metrics.qwen_usage_count = metrics_data.get('qwen_usage_count', 0)
forge.metrics.mistral_usage_count = metrics_data.get('mistral_usage_count', 0)
forge.metrics.unused_integrations = metrics_data.get('unused_integrations', [])
forge.metrics.total_duration_seconds = metrics_data['total_duration_seconds']
forge.metrics.tests_passed_hgm_80_plus = metrics_data['tests_passed_hgm_80_plus']

# Generate and save report
report = forge.generate_final_report()
with open("GENESIS_100_TEST_CAMPAIGN_FINAL_REPORT.md", "w", encoding="utf-8") as f:
    f.write(report)

print("✅ Final report regenerated successfully!")
print(f"   Report saved to: GENESIS_100_TEST_CAMPAIGN_FINAL_REPORT.md")
print(f"\n{report[:500]}...")

