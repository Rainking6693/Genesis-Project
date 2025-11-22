#!/usr/bin/env python3
"""
Phase 5A Deployment Validation Script
Validates Skyvern deployment and configuration
"""

import asyncio
import sys
import os
from pathlib import Path


def print_header(message):
    print("\n" + "="*60)
    print(message)
    print("="*60)


def check_secrets():
    """Validate secret files exist and are not placeholders"""
    print_header("CHECKING SECRET FILES")

    secrets_dir = Path("secrets")
    required_secrets = [
        "skyvern_api_key.txt",
        "openai_api_key.txt",
        "anthropic_api_key.txt",
        "skyvern_db_password.txt"
    ]

    all_ok = True

    for secret_file in required_secrets:
        filepath = secrets_dir / secret_file

        if not filepath.exists():
            print(f" {secret_file}: NOT FOUND")
            all_ok = False
            continue

        content = filepath.read_text().strip()

        if not content:
            print(f" {secret_file}: EMPTY")
            all_ok = False
        elif "placeholder" in content.lower():
            print(f"  {secret_file}: PLACEHOLDER (REPLACE WITH REAL KEY)")
            if "skyvern_api_key" in secret_file:
                all_ok = False
        else:
            print(f" {secret_file}: OK ({len(content)} chars)")

    return all_ok


def check_directories():
    """Validate required directories exist"""
    print_header("CHECKING DIRECTORY STRUCTURE")

    required_dirs = [
        "skyvern_tasks",
        "skyvern_workflows",
        "skyvern_data",
        "scripts",
        "infrastructure/browser_automation"
    ]

    all_ok = True

    for dir_path in required_dirs:
        path = Path(dir_path)

        if not path.exists():
            print(f" {dir_path}: NOT FOUND")
            all_ok = False
        elif not path.is_dir():
            print(f" {dir_path}: NOT A DIRECTORY")
            all_ok = False
        else:
            print(f" {dir_path}: OK")

    return all_ok


def check_task_definitions():
    """Validate YAML task definitions exist"""
    print_header("CHECKING YAML TASK DEFINITIONS")

    tasks_dir = Path("skyvern_tasks")
    expected_tasks = [
        "submit_product_hunt.yaml",
        "submit_betalist.yaml",
        "submit_hackernews.yaml",
        "submit_indiehackers.yaml",
        "submit_microlaunch.yaml",
        "submit_saashub.yaml"
    ]

    all_ok = True

    for task_file in expected_tasks:
        filepath = tasks_dir / task_file

        if not filepath.exists():
            print(f" {task_file}: NOT FOUND")
            all_ok = False
        else:
            size = filepath.stat().st_size
            print(f" {task_file}: OK ({size} bytes)")

    return all_ok


def check_python_client():
    """Validate SkyvernClient exists"""
    print_header("CHECKING PYTHON CLIENT")

    client_file = Path("infrastructure/browser_automation/skyvern_client.py")

    if not client_file.exists():
        print(" skyvern_client.py: NOT FOUND")
        return False

    print(f" skyvern_client.py: OK ({client_file.stat().st_size} bytes)")
    return True


def print_summary(results):
    """Print validation summary"""
    print_header("VALIDATION SUMMARY")

    total_checks = len(results)
    passed_checks = sum(results.values())

    print(f"\nTotal Checks: {total_checks}")
    print(f"Passed: {passed_checks}")
    print(f"Failed: {total_checks - passed_checks}")

    if all(results.values()):
        print("\n ALL CHECKS PASSED - READY FOR DEPLOYMENT")
        return 0
    else:
        print("\n SOME CHECKS FAILED - FIX ISSUES BEFORE DEPLOYMENT")

        if not results.get("secrets"):
            print("\n  ACTION REQUIRED: Replace placeholder in secrets/skyvern_api_key.txt")

        return 1


def main():
    """Run all validation checks"""
    print("\n" + "="*60)
    print("     PHASE 5A DEPLOYMENT VALIDATION SCRIPT")
    print("="*60)

    results = {
        "secrets": check_secrets(),
        "directories": check_directories(),
        "task_definitions": check_task_definitions(),
        "python_client": check_python_client()
    }

    return print_summary(results)


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n  Validation interrupted")
        sys.exit(1)
