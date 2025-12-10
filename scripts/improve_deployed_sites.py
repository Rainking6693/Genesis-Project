#!/usr/bin/env python3
"""
Deployed Sites Improvement Script

This script iterates through all 120+ deployed business sites and:
1. Fetches each site to analyze current state
2. Uses WebsiteDesignAgent to generate unique improvements
3. Regenerates each site with LLM-powered unique content
4. Redeploys to GitHub Pages

The goal is to make every site truly unique, not just reskinned templates.

Usage:
    python scripts/improve_deployed_sites.py
    python scripts/improve_deployed_sites.py --limit 10
    python scripts/improve_deployed_sites.py --business ai-briefcase
    python scripts/improve_deployed_sites.py --dry-run

Author: Genesis Deploy Agent
Date: December 2025
"""

import argparse
import asyncio
import json
import logging
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import aiohttp

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


class SiteImprovementOrchestrator:
    """
    Orchestrates the improvement of all deployed sites.

    This agent:
    1. Loads business data from manifests
    2. Uses WebsiteDesignAgent to generate unique sites
    3. Deploys improvements to GitHub Pages
    4. Tracks progress and results
    """

    def __init__(self):
        self.github_username = os.getenv("GITHUB_USERNAME", "bullrushinvestments")
        self.github_token = os.getenv("GITHUB_TOKEN", "")
        self.base_url = f"https://{self.github_username}.github.io"

        # Import WebsiteDesignAgent
        try:
            from agents.website_design_agent import WebsiteDesignAgent
            self.design_agent = WebsiteDesignAgent()
            logger.info("WebsiteDesignAgent loaded successfully")
        except ImportError as e:
            logger.error(f"Failed to import WebsiteDesignAgent: {e}")
            self.design_agent = None

        self.results = {
            "improved": [],
            "failed": [],
            "skipped": []
        }

    async def fetch_current_site(self, business_name: str) -> Optional[str]:
        """Fetch current HTML from deployed site"""
        url = f"{self.base_url}/{business_name}/"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        return await response.text()
                    else:
                        logger.warning(f"Site {business_name} returned {response.status}")
                        return None
        except Exception as e:
            logger.error(f"Failed to fetch {business_name}: {e}")
            return None

    def load_business_manifest(self, business_path: Path) -> Dict:
        """Load business manifest with all available data"""
        manifest_path = business_path / "business_manifest.json"
        manifest = {
            "name": business_path.name,
            "type": "saas",
            "description": "",
            "target_audience": "",
            "unique_value_prop": "",
            "features": [],
            "pricing_tiers": [],
            "industry_category": ""
        }

        if manifest_path.exists():
            try:
                with open(manifest_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    manifest.update(data)
            except Exception as e:
                logger.warning(f"Failed to load manifest for {business_path.name}: {e}")

        # Try to infer industry from name if not set
        if not manifest.get("industry_category"):
            manifest["industry_category"] = self._infer_industry(manifest["name"], manifest.get("description", ""))

        # Generate default features if empty
        if not manifest.get("features"):
            manifest["features"] = self._generate_default_features(manifest["type"])

        # Generate default pricing if empty
        if not manifest.get("pricing_tiers"):
            manifest["pricing_tiers"] = self._generate_default_pricing(manifest["type"])

        return manifest

    def _infer_industry(self, name: str, description: str) -> str:
        """Infer industry category from business name and description"""
        text = f"{name} {description}".lower()

        industry_keywords = {
            "health": ["health", "wellness", "mindful", "fitness", "medical", "care", "therapy"],
            "finance": ["finance", "budget", "money", "invest", "payment", "bank", "wealth"],
            "education": ["learn", "skill", "edu", "course", "train", "teach", "academy"],
            "sustainability": ["eco", "green", "climate", "sustainable", "environment", "carbon"],
            "ai": ["ai", "ml", "machine", "neural", "intelligent", "smart", "auto"],
            "productivity": ["task", "project", "workflow", "automate", "efficiency", "manage"],
            "content": ["content", "write", "blog", "media", "publish", "creator"],
            "ecommerce": ["shop", "store", "sell", "commerce", "market", "retail"],
        }

        for industry, keywords in industry_keywords.items():
            if any(kw in text for kw in keywords):
                return industry

        return "saas"

    def _generate_default_features(self, business_type: str) -> List[str]:
        """Generate default features based on business type"""
        type_features = {
            "saas": [
                "Cloud-based platform",
                "Real-time analytics",
                "Team collaboration",
                "API integrations",
                "Automated workflows",
                "24/7 support"
            ],
            "ecommerce": [
                "Secure checkout",
                "Inventory management",
                "Order tracking",
                "Customer reviews",
                "Multiple payment options",
                "Fast shipping"
            ],
            "content": [
                "AI-powered writing",
                "SEO optimization",
                "Content scheduling",
                "Analytics dashboard",
                "Multi-platform publishing",
                "Team collaboration"
            ]
        }
        return type_features.get(business_type, type_features["saas"])

    def _generate_default_pricing(self, business_type: str) -> List[Dict]:
        """Generate default pricing tiers"""
        return [
            {
                "name": "Starter",
                "price": "9",
                "features": ["Core features", "Email support", "1 user", "Basic analytics"]
            },
            {
                "name": "Professional",
                "price": "29",
                "featured": True,
                "features": ["Everything in Starter", "Priority support", "5 users", "Advanced analytics", "API access"]
            },
            {
                "name": "Enterprise",
                "price": "99",
                "features": ["Everything in Pro", "Dedicated support", "Unlimited users", "Custom integrations", "SLA guarantee"]
            }
        ]

    async def improve_single_site(
        self,
        business_path: Path,
        dry_run: bool = False
    ) -> Dict:
        """Improve a single business site"""
        business_name = business_path.name
        result = {
            "business_name": business_name,
            "success": False,
            "changes": []
        }

        logger.info(f"Processing: {business_name}")

        # Load manifest
        manifest = self.load_business_manifest(business_path)
        logger.info(f"  Industry: {manifest.get('industry_category', 'unknown')}")

        if not self.design_agent:
            result["error"] = "WebsiteDesignAgent not available"
            return result

        # Generate unique website using LLM
        try:
            website_files = await self.design_agent.design_unique_website(
                business_name=manifest["name"],
                business_type=manifest.get("type", "saas"),
                description=manifest.get("description", ""),
                target_audience=manifest.get("target_audience", ""),
                unique_value_prop=manifest.get("unique_value_prop", ""),
                features=manifest.get("features", []),
                pricing_tiers=manifest.get("pricing_tiers", []),
                industry_category=manifest.get("industry_category", ""),
            )

            if not website_files or "index.html" not in website_files:
                result["error"] = "Failed to generate website files"
                return result

            result["changes"].append("Generated unique website with LLM")

            if dry_run:
                result["success"] = True
                result["dry_run"] = True
                logger.info(f"  [DRY RUN] Would deploy unique site")
                return result

            # Write files to business directory
            for filename, content in website_files.items():
                file_path = business_path / filename
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                result["changes"].append(f"Wrote {filename}")

            # Ensure .nojekyll exists
            nojekyll_path = business_path / ".nojekyll"
            if not nojekyll_path.exists():
                nojekyll_path.touch()
                result["changes"].append("Added .nojekyll")

            # Deploy to GitHub Pages
            deploy_result = await self._deploy_to_github(business_path, business_name)

            if deploy_result["success"]:
                result["success"] = True
                result["url"] = deploy_result.get("url", "")
                result["changes"].append("Deployed to GitHub Pages")
                logger.info(f"  SUCCESS: {result['url']}")
            else:
                result["error"] = deploy_result.get("error", "Deployment failed")
                logger.error(f"  FAILED: {result['error']}")

        except Exception as e:
            result["error"] = str(e)
            logger.error(f"  ERROR: {e}")

        return result

    async def _deploy_to_github(self, app_path: Path, business_name: str) -> Dict:
        """Deploy to GitHub Pages"""
        if not self.github_token:
            return {"success": False, "error": "GITHUB_TOKEN not set"}

        try:
            # Initialize git if needed
            git_dir = app_path / ".git"
            if not git_dir.exists():
                subprocess.run(["git", "init"], cwd=app_path, capture_output=True)
                subprocess.run(
                    ["git", "config", "user.email", "genesis@bullrushinvestments.com"],
                    cwd=app_path, capture_output=True
                )
                subprocess.run(
                    ["git", "config", "user.name", "Genesis AI"],
                    cwd=app_path, capture_output=True
                )

            # Add and commit
            subprocess.run(["git", "add", "-A"], cwd=app_path, capture_output=True)
            subprocess.run(
                ["git", "commit", "-m", f"LLM-generated unique landing page - {datetime.now().isoformat()}"],
                cwd=app_path, capture_output=True
            )

            # Set remote and push
            subprocess.run(["git", "remote", "remove", "origin"], cwd=app_path, capture_output=True)
            remote_url = f"https://{self.github_token}@github.com/{self.github_username}/{business_name}.git"
            subprocess.run(["git", "remote", "add", "origin", remote_url], cwd=app_path, capture_output=True)

            result = subprocess.run(
                ["git", "push", "-u", "origin", "main", "--force"],
                cwd=app_path, capture_output=True, text=True
            )

            if result.returncode != 0:
                return {"success": False, "error": result.stderr}

            return {
                "success": True,
                "url": f"https://{self.github_username}.github.io/{business_name}/"
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def improve_all_sites(
        self,
        limit: int = 0,
        dry_run: bool = False,
        specific_business: str = None
    ) -> Dict:
        """Improve all deployed sites"""

        print("=" * 80)
        print("SITE IMPROVEMENT ORCHESTRATOR")
        print("Using LLM to generate truly unique websites")
        print("=" * 80)
        print()

        # Find all business directories
        base_dir = project_root / "businesses" / "production_test"
        folders = ["content", "ecommerce", "saas"]

        businesses = []
        if specific_business:
            for folder in folders:
                potential_path = base_dir / folder / specific_business
                if potential_path.exists():
                    businesses.append(potential_path)
                    break
            if not businesses:
                print(f"Business '{specific_business}' not found")
                return self.results
        else:
            for folder in folders:
                folder_path = base_dir / folder
                if folder_path.exists():
                    businesses.extend([d for d in folder_path.iterdir() if d.is_dir()])

        if limit > 0:
            businesses = businesses[:limit]

        print(f"Found {len(businesses)} businesses to improve")
        print()

        # Process each business
        for i, business_path in enumerate(businesses, 1):
            print(f"[{i}/{len(businesses)}] {business_path.name}")

            result = await self.improve_single_site(business_path, dry_run=dry_run)

            if result["success"]:
                self.results["improved"].append(result)
            elif result.get("dry_run"):
                self.results["skipped"].append(result)
            else:
                self.results["failed"].append(result)

            # Rate limit
            await asyncio.sleep(2)

        # Print summary
        print()
        print("=" * 80)
        print("IMPROVEMENT SUMMARY")
        print("=" * 80)
        print(f"Total Processed: {len(businesses)}")
        print(f"Improved: {len(self.results['improved'])}")
        print(f"Failed: {len(self.results['failed'])}")
        print(f"Skipped (dry-run): {len(self.results['skipped'])}")

        if self.results["failed"]:
            print()
            print("Failed sites:")
            for r in self.results["failed"][:10]:
                print(f"  - {r['business_name']}: {r.get('error', 'Unknown error')}")

        # Save results
        if not dry_run:
            results_path = project_root / "logs" / f"site_improvements_{int(datetime.now().timestamp())}.json"
            with open(results_path, 'w') as f:
                json.dump(self.results, f, indent=2)
            print(f"\nResults saved to: {results_path}")

        return self.results


async def main():
    parser = argparse.ArgumentParser(description='Improve deployed sites with LLM-generated unique content')
    parser.add_argument('--limit', type=int, default=0, help='Max businesses to process (0=all)')
    parser.add_argument('--business', type=str, help='Process specific business only')
    parser.add_argument('--dry-run', action='store_true', help='Generate but do not deploy')
    args = parser.parse_args()

    orchestrator = SiteImprovementOrchestrator()
    await orchestrator.improve_all_sites(
        limit=args.limit,
        dry_run=args.dry_run,
        specific_business=args.business
    )


if __name__ == "__main__":
    asyncio.run(main())
