import os
from pathlib import Path

# Define expected files from Phase 5
EXPECTED_FILES = {
    "Core Infrastructure": [
        "infrastructure/middleware/base.py",
        "infrastructure/middleware/policy_middleware.py",
        "infrastructure/middleware/capability_middleware.py",
        "infrastructure/middleware/toolrm_middleware.py",
        "infrastructure/middleware/halo_capability_integration.py",
        "infrastructure/browser_automation/skyvern_client.py",
        "infrastructure/evolution_strategies/model_loader.py",
    ],
    "Test Suite": [
        "tests/conftest.py",
        "tests/middleware/test_capability_middleware.py",
        "tests/middleware/test_toolrm_middleware.py",
        "tests/middleware/test_policy_middleware.py",
        "tests/e2e/test_middleware_pipeline.py",
    ],
    "Scripts": [
        "scripts/nightly_es_training.py",
        "scripts/es_rollback.py",
        "scripts/es_training_monitor.py",
        "scripts/deploy_pythonanywhere.py",
        "scripts/verify_pythonanywhere.py",
    ],
    "Local Testing": [
        "setup_es_scheduler.ps1",
        "RUN_NIGHT1_TESTS.bat",
        "RUN_NIGHT2_TESTS.bat",
        "QUICK_START_TESTING.bat",
        "START_HERE.md",
    ],
    "Dashboard": [
        "dashboard/app.py",
        "dashboard/metrics_collector.py",
        "dashboard/templates/index.html",
        "dashboard/static/css/dashboard.css",
        "dashboard/static/js/dashboard.js",
    ],
    "Docker/Deployment": [
        "docker-compose.skyvern.yml",
        "docker-compose.production.yml",
        "secrets/README.md",
    ],
    "Audit Reports": [
        "PHASE5_AUDIT_REPORT.md",
        "CORA_PHASE5_COMPREHENSIVE_AUDIT_FINAL.md",
        "PHASE5_AUDIT_EXECUTIVE_SUMMARY.md",
    ],
}

def verify_files():
    results = {
        "found": [],
        "missing": [],
        "empty": [],
        "total_size": 0,
    }
    
    base_path = Path.cwd()
    
    for category, files in EXPECTED_FILES.items():
        print(f"\n{'='*60}")
        print(f"CHECKING: {category}")
        print('='*60)
        
        for file_path in files:
            full_path = base_path / file_path
            
            if full_path.exists():
                size = full_path.stat().st_size
                results["total_size"] += size
                
                if size == 0:
                    results["empty"].append(file_path)
                    print(f"[!] EMPTY: {file_path}")
                else:
                    results["found"].append(file_path)
                    print(f"[+] FOUND: {file_path} ({size:,} bytes)")
            else:
                results["missing"].append(file_path)
                print(f"[-] MISSING: {file_path}")
    
    return results

def print_summary(results):
    print(f"\n\n{'='*60}")
    print("MIGRATION VERIFICATION SUMMARY")
    print('='*60)
    
    total_expected = sum(len(files) for files in EXPECTED_FILES.values())
    found_count = len(results["found"])
    missing_count = len(results["missing"])
    empty_count = len(results["empty"])
    
    print(f"\nSTATISTICS:")
    print(f"  Total Expected: {total_expected}")
    print(f"  Found & Valid:  {found_count} ({found_count/total_expected*100:.1f}%)")
    print(f"  Missing:        {missing_count}")
    print(f"  Empty Files:    {empty_count}")
    print(f"  Total Size:     {results['total_size']:,} bytes ({results['total_size']/1024/1024:.2f} MB)")
    
    if missing_count > 0:
        print(f"\n[X] MISSING FILES ({missing_count}):")
        for f in results["missing"]:
            print(f"  - {f}")
    
    if empty_count > 0:
        print(f"\n[!] EMPTY FILES ({empty_count}):")
        for f in results["empty"]:
            print(f"  - {f}")
    
    if missing_count == 0 and empty_count == 0:
        print(f"\n[SUCCESS] All {total_expected} files migrated successfully!")
        print(f"[SUCCESS] VERIFICATION: 100% COMPLETE")
    else:
        print(f"\n[WARNING] ISSUES DETECTED: {missing_count + empty_count} problems found")
    
    return missing_count == 0 and empty_count == 0

if __name__ == "__main__":
    results = verify_files()
    success = print_summary(results)
    exit(0 if success else 1)
