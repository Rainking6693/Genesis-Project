#!/usr/bin/env python3
"""
Fix GitHub Pages 404s by removing .nojekyll files.

The issue: .nojekyll disables Jekyll processing, but these Next.js apps
don't have pre-built index.html. Jekyll needs to auto-generate HTML from
README.md for GitHub Pages to work.

This script:
1. Finds all unhealthy sites (404s) from the latest deployment results
2. Removes .nojekyll from local directories
3. Re-pushes to GitHub
4. Triggers GitHub Pages rebuild

Usage:
    python scripts/fix_nojekyll_sites.py
    python scripts/fix_nojekyll_sites.py --limit 10  # Fix first 10 sites
    python scripts/fix_nojekyll_sites.py --dry-run   # Show what would be fixed
"""
import asyncio
import argparse
import json
import logging
import os
import subprocess
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from infrastructure.load_env import load_genesis_env

load_genesis_env()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def find_latest_results():
    """Find the most recent deployment results file."""
    results_dir = project_root / "logs"
    results_files = list(results_dir.glob("deployment_results_*.json"))
    if not results_files:
        return None
    return sorted(results_files)[-1]


def get_unhealthy_sites(results_file: Path) -> list:
    """Get list of sites that failed verification (404s)."""
    with open(results_file, 'r') as f:
        data = json.load(f)

    unhealthy = []
    for deployment in data.get('deployments', []):
        # Sites that deployed but weren't verified (404)
        if deployment.get('status') == 'deployed' and not deployment.get('verified'):
            unhealthy.append({
                'business_name': deployment['business_name'],
                'path': deployment['path'],
                'deployment_url': deployment.get('deployment_url', ''),
                'repo_url': deployment.get('repo_url', '')
            })

    return unhealthy


def fix_site(site: dict, dry_run: bool = False) -> bool:
    """
    Fix a single site by removing .nojekyll and re-pushing.

    Returns True if fix was successful.
    """
    business_name = site['business_name']
    site_path = project_root / site['path']
    nojekyll_path = site_path / ".nojekyll"

    logger.info(f"Processing: {business_name}")

    if not site_path.exists():
        logger.warning(f"  Path not found: {site_path}")
        return False

    # Check for .nojekyll
    has_nojekyll = nojekyll_path.exists()
    logger.info(f"  .nojekyll present: {has_nojekyll}")

    if dry_run:
        if has_nojekyll:
            logger.info(f"  [DRY RUN] Would remove .nojekyll and re-push")
        else:
            logger.info(f"  [DRY RUN] No .nojekyll to remove")
        return True

    try:
        # Step 1: Remove .nojekyll if it exists
        if has_nojekyll:
            nojekyll_path.unlink()
            logger.info(f"  Removed .nojekyll")

        # Step 2: Stage the deletion (if .nojekyll was tracked)
        subprocess.run(
            ["git", "add", "-A"],
            cwd=site_path,
            capture_output=True
        )

        # Step 3: Check if there are changes to commit
        status = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=site_path,
            capture_output=True,
            text=True
        )

        if status.stdout.strip():
            # There are changes - commit them
            subprocess.run(
                ["git", "commit", "-m", "Remove .nojekyll to enable Jekyll processing"],
                cwd=site_path,
                capture_output=True
            )
            logger.info(f"  Committed changes")

        # Step 4: Force push to GitHub
        result = subprocess.run(
            ["git", "push", "-f", "origin", "main"],
            cwd=site_path,
            capture_output=True,
            text=True
        )

        if result.returncode == 0:
            logger.info(f"  Pushed to GitHub successfully")
            return True
        else:
            logger.error(f"  Push failed: {result.stderr}")
            return False

    except Exception as e:
        logger.error(f"  Error: {e}")
        return False


async def verify_site(url: str, max_attempts: int = 5, delay: int = 10) -> bool:
    """Verify site is now returning 200."""
    import aiohttp

    async with aiohttp.ClientSession() as session:
        for attempt in range(1, max_attempts + 1):
            try:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as response:
                    if response.status == 200:
                        return True
                    logger.info(f"    Attempt {attempt}/{max_attempts}: Status {response.status}")
            except Exception as e:
                logger.info(f"    Attempt {attempt}/{max_attempts}: {type(e).__name__}")

            if attempt < max_attempts:
                await asyncio.sleep(delay)

    return False


async def main():
    parser = argparse.ArgumentParser(description='Fix GitHub Pages 404s by removing .nojekyll')
    parser.add_argument('--limit', type=int, default=0,
                       help='Max sites to fix (0 = all)')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be fixed without making changes')
    parser.add_argument('--verify', action='store_true',
                       help='Verify sites after fixing')
    args = parser.parse_args()

    print("=" * 80)
    print("FIX GITHUB PAGES 404s - REMOVE .nojekyll")
    print("=" * 80)
    if args.dry_run:
        print("MODE: DRY RUN (no changes will be made)")
    print()

    # Find results file
    results_file = find_latest_results()
    if not results_file:
        logger.error("No deployment results file found!")
        return

    logger.info(f"Using results: {results_file}")

    # Get unhealthy sites
    unhealthy = get_unhealthy_sites(results_file)
    logger.info(f"Found {len(unhealthy)} unhealthy sites (404s)")

    if not unhealthy:
        logger.info("All sites are healthy!")
        return

    # Apply limit
    if args.limit > 0:
        unhealthy = unhealthy[:args.limit]
        logger.info(f"Processing first {len(unhealthy)} sites")

    print()
    print("=" * 80)
    print("FIXING SITES")
    print("=" * 80)

    fixed = 0
    failed = 0

    for i, site in enumerate(unhealthy, 1):
        print(f"\n[{i}/{len(unhealthy)}] {site['business_name']}")
        if fix_site(site, dry_run=args.dry_run):
            fixed += 1
        else:
            failed += 1

    print()
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total processed: {len(unhealthy)}")
    print(f"Fixed: {fixed}")
    print(f"Failed: {failed}")

    if args.verify and not args.dry_run and fixed > 0:
        print()
        print("=" * 80)
        print("VERIFYING FIXED SITES (this may take a few minutes)")
        print("=" * 80)

        # Wait a bit for GitHub Pages to rebuild
        print("Waiting 60 seconds for GitHub Pages to rebuild...")
        await asyncio.sleep(60)

        verified = 0
        for site in unhealthy[:fixed]:
            url = site.get('deployment_url')
            if url:
                print(f"Checking {site['business_name']}...", end=' ')
                if await verify_site(url):
                    print("OK")
                    verified += 1
                else:
                    print("STILL 404")

        print(f"\nVerified: {verified}/{fixed}")


if __name__ == "__main__":
    asyncio.run(main())
