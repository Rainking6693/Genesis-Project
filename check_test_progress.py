#!/usr/bin/env python3
"""Check test execution progress"""
import json
import os
from pathlib import Path

# Check metrics file
metrics_file = Path("metrics/100_test_campaign.json")
if metrics_file.exists():
    with open(metrics_file) as f:
        data = json.load(f)
        print(f"✅ Metrics file exists")
        print(f"   Total tests: {data.get('total_tests', 0)}")
        print(f"   Passed: {data.get('passed_tests', 0)}")
        print(f"   Failed: {data.get('failed_tests', 0)}")
else:
    print("❌ Metrics file not created yet")

# Check detailed results
results_file = Path("metrics/100_test_campaign_detailed_results.json")
if results_file.exists():
    with open(results_file) as f:
        results = json.load(f)
        print(f"✅ Results file exists with {len(results)} tests")
        if results:
            latest = results[-1]
            print(f"   Latest test: {latest.get('test_id')} - {latest.get('status')} - Score: {latest.get('hgm_score', 0):.1f}")
else:
    print("❌ Results file not created yet")

# Check log files
log_dir = Path("logs/genesis_100_tests")
if log_dir.exists():
    log_files = list(log_dir.glob("*.log"))
    if log_files:
        latest_log = max(log_files, key=lambda p: p.stat().st_mtime)
        print(f"✅ Latest log: {latest_log.name}")
        print(f"   Size: {latest_log.stat().st_size} bytes")
        print(f"   Modified: {latest_log.stat().st_mtime}")
    else:
        print("❌ No log files found")

