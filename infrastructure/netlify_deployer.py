"""
Netlify Deployer - Deploy static sites to Netlify

Deploy Genesis businesses to Netlify via the Deploy API.
Supports direct file uploads without git repository.

Features:
- Direct deploy API (no git required)
- Automatic SSL
- Global CDN
- Custom domains
- Deploy previews

Author: Genesis Deploy Agent
Date: December 2025
Status: Production Ready
"""

import asyncio
import hashlib
import json
import logging
import os
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import aiohttp

from infrastructure.load_env import load_genesis_env

load_genesis_env()

logger = logging.getLogger(__name__)


class NetlifyDeployer:
    """
    Deploy applications to Netlify via the Deploy API

    Netlify is a powerful platform for deploying static sites and serverless functions.
    This deployer uses the direct deploy API to upload sites without git.
    """

    API_BASE = "https://api.netlify.com/api/v1"

    def __init__(self):
        """Initialize Netlify deployer"""
        self.access_token = os.getenv("NETLIFY_ACCESS_TOKEN", "")

        if not self.access_token:
            logger.warning("NETLIFY_ACCESS_TOKEN not set - Netlify deployment unavailable")

    def is_configured(self) -> bool:
        """Check if Netlify is properly configured"""
        return bool(self.access_token)

    def _get_headers(self) -> Dict[str, str]:
        """Get API headers with auth"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    async def check_connection(self) -> Dict:
        """Check connection to Netlify API"""
        if not self.is_configured():
            return {"connected": False, "error": "Netlify not configured"}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.API_BASE}/sites",
                    headers=self._get_headers(),
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        sites = await response.json()
                        return {
                            "connected": True,
                            "site_count": len(sites),
                            "sites": [s.get("name") for s in sites[:5]]
                        }
                    else:
                        error = await response.text()
                        return {"connected": False, "error": f"API error: {response.status} - {error}"}

        except Exception as e:
            return {"connected": False, "error": str(e)}

    async def deploy(
        self,
        app_path: str,
        app_name: str,
        environment: Optional[Dict[str, str]] = None
    ) -> Dict:
        """
        Deploy application to Netlify via direct deploy

        Args:
            app_path: Path to the application directory
            app_name: Name for the Netlify site
            environment: Environment variables to set

        Returns:
            Dict with deployment result
        """
        if not self.is_configured():
            return {"success": False, "error": "Netlify not configured. Set NETLIFY_ACCESS_TOKEN"}

        app_path = Path(app_path)
        if not app_path.exists():
            return {"success": False, "error": f"App path not found: {app_path}"}

        try:
            # Sanitize app name (lowercase, alphanumeric, hyphens only)
            safe_name = ''.join(c if c.isalnum() or c == '-' else '-' for c in app_name.lower())
            safe_name = safe_name.strip('-')[:50]
            safe_name = f"genesis-{safe_name}"  # Prefix to avoid conflicts

            logger.info(f"Deploying {safe_name} to Netlify from {app_path}")

            async with aiohttp.ClientSession() as session:
                # Step 1: Create or get existing site
                site = await self._get_or_create_site(session, safe_name)
                if not site:
                    return {"success": False, "error": "Failed to create Netlify site"}

                site_id = site.get("id")
                logger.info(f"Using site: {site.get('name')} (ID: {site_id})")

                # Step 2: Set environment variables if provided
                if environment:
                    await self._set_env_vars(session, site_id, environment)

                # Step 3: Create deploy with file digest
                files_digest = await self._calculate_file_digests(app_path)

                deploy = await self._create_deploy(session, site_id, files_digest)
                if not deploy:
                    return {"success": False, "error": "Failed to create deploy"}

                deploy_id = deploy.get("id")
                required_files = deploy.get("required", [])

                # Step 4: Upload required files
                if required_files:
                    logger.info(f"Uploading {len(required_files)} files...")
                    await self._upload_files(session, deploy_id, app_path, files_digest, required_files)

                # Step 5: Wait for deploy to be ready
                final_deploy = await self._wait_for_deploy(session, deploy_id)

                if final_deploy.get("state") == "ready":
                    deployment_url = final_deploy.get("ssl_url") or final_deploy.get("url")
                    logger.info(f"Deployed to Netlify: {deployment_url}")

                    return {
                        "success": True,
                        "url": deployment_url,
                        "site_name": safe_name,
                        "site_id": site_id,
                        "deploy_id": deploy_id,
                        "platform": "netlify",
                        "verified": True,
                        "admin_url": f"https://app.netlify.com/sites/{safe_name}"
                    }
                else:
                    return {
                        "success": False,
                        "error": f"Deploy failed with state: {final_deploy.get('state')}",
                        "error_message": final_deploy.get("error_message", "Unknown error")
                    }

        except Exception as e:
            logger.error(f"Netlify deployment error: {e}")
            return {"success": False, "error": str(e)}

    async def _get_or_create_site(self, session: aiohttp.ClientSession, site_name: str) -> Optional[Dict]:
        """Get existing site or create new one"""
        # First try to find existing site
        try:
            async with session.get(
                f"{self.API_BASE}/sites",
                headers=self._get_headers(),
                params={"name": site_name}
            ) as response:
                if response.status == 200:
                    sites = await response.json()
                    for site in sites:
                        if site.get("name") == site_name:
                            logger.info(f"Found existing site: {site_name}")
                            return site
        except:
            pass

        # Create new site
        try:
            async with session.post(
                f"{self.API_BASE}/sites",
                headers=self._get_headers(),
                json={"name": site_name}
            ) as response:
                if response.status in (200, 201):
                    site = await response.json()
                    logger.info(f"Created new site: {site_name}")
                    return site
                else:
                    # Site name might be taken, try with random suffix
                    import random
                    random_suffix = ''.join(random.choices('0123456789', k=4))
                    new_name = f"{site_name}-{random_suffix}"

                    async with session.post(
                        f"{self.API_BASE}/sites",
                        headers=self._get_headers(),
                        json={"name": new_name}
                    ) as retry_response:
                        if retry_response.status in (200, 201):
                            site = await retry_response.json()
                            logger.info(f"Created site with suffix: {new_name}")
                            return site
                        else:
                            error = await retry_response.text()
                            logger.error(f"Failed to create site: {error}")
                            return None
        except Exception as e:
            logger.error(f"Error creating site: {e}")
            return None

    async def _calculate_file_digests(self, app_path: Path) -> Dict[str, str]:
        """Calculate SHA1 digests for all files"""
        digests = {}

        for file_path in app_path.rglob("*"):
            if file_path.is_file():
                # Skip hidden files and common ignores
                rel_path = file_path.relative_to(app_path)
                rel_str = str(rel_path).replace("\\", "/")

                if any(part.startswith('.') for part in rel_path.parts):
                    continue
                if any(ignore in rel_str for ignore in ['node_modules', '__pycache__', '.git']):
                    continue

                # Calculate SHA1
                sha1 = hashlib.sha1()
                with open(file_path, 'rb') as f:
                    while chunk := f.read(8192):
                        sha1.update(chunk)

                digests[f"/{rel_str}"] = sha1.hexdigest()

        return digests

    async def _create_deploy(self, session: aiohttp.ClientSession, site_id: str, files: Dict[str, str]) -> Optional[Dict]:
        """Create a new deploy with file manifest"""
        try:
            async with session.post(
                f"{self.API_BASE}/sites/{site_id}/deploys",
                headers=self._get_headers(),
                json={"files": files}
            ) as response:
                if response.status in (200, 201):
                    return await response.json()
                else:
                    error = await response.text()
                    logger.error(f"Failed to create deploy: {error}")
                    return None
        except Exception as e:
            logger.error(f"Error creating deploy: {e}")
            return None

    async def _upload_files(
        self,
        session: aiohttp.ClientSession,
        deploy_id: str,
        app_path: Path,
        file_digests: Dict[str, str],
        required_files: List[str]
    ):
        """Upload required files to deploy"""
        # Create reverse lookup: digest -> path
        digest_to_path = {v: k for k, v in file_digests.items()}

        for file_digest in required_files:
            file_rel_path = digest_to_path.get(file_digest)
            if not file_rel_path:
                continue

            file_path = app_path / file_rel_path.lstrip("/")
            if not file_path.exists():
                continue

            try:
                with open(file_path, 'rb') as f:
                    content = f.read()

                headers = {
                    "Authorization": f"Bearer {self.access_token}",
                    "Content-Type": "application/octet-stream"
                }

                async with session.put(
                    f"{self.API_BASE}/deploys/{deploy_id}/files{file_rel_path}",
                    headers=headers,
                    data=content
                ) as response:
                    if response.status not in (200, 201):
                        logger.warning(f"Failed to upload {file_rel_path}: {response.status}")

            except Exception as e:
                logger.warning(f"Error uploading {file_rel_path}: {e}")

    async def _wait_for_deploy(self, session: aiohttp.ClientSession, deploy_id: str, timeout: int = 120) -> Dict:
        """Wait for deploy to complete"""
        start_time = asyncio.get_event_loop().time()

        while True:
            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed > timeout:
                return {"state": "timeout", "error_message": "Deploy timed out"}

            try:
                async with session.get(
                    f"{self.API_BASE}/deploys/{deploy_id}",
                    headers=self._get_headers()
                ) as response:
                    if response.status == 200:
                        deploy = await response.json()
                        state = deploy.get("state")

                        if state in ("ready", "error"):
                            return deploy

                        logger.info(f"Deploy state: {state}...")

            except Exception as e:
                logger.warning(f"Error checking deploy status: {e}")

            await asyncio.sleep(2)

    async def _set_env_vars(self, session: aiohttp.ClientSession, site_id: str, env_vars: Dict[str, str]):
        """Set environment variables for the site"""
        try:
            # Netlify uses a different endpoint for env vars
            for key, value in env_vars.items():
                async with session.patch(
                    f"{self.API_BASE}/sites/{site_id}",
                    headers=self._get_headers(),
                    json={"build_settings": {"env": {key: value}}}
                ) as response:
                    if response.status not in (200, 201):
                        logger.warning(f"Failed to set env var {key}")
        except Exception as e:
            logger.warning(f"Error setting env vars: {e}")

    async def delete_site(self, site_id: str) -> bool:
        """Delete a Netlify site"""
        if not self.is_configured():
            return False

        try:
            async with aiohttp.ClientSession() as session:
                async with session.delete(
                    f"{self.API_BASE}/sites/{site_id}",
                    headers=self._get_headers()
                ) as response:
                    return response.status in (200, 204)
        except:
            return False

    async def list_sites(self) -> List[Dict]:
        """List all Netlify sites"""
        if not self.is_configured():
            return []

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.API_BASE}/sites",
                    headers=self._get_headers()
                ) as response:
                    if response.status == 200:
                        return await response.json()
        except:
            pass

        return []


# Singleton instance
_netlify_deployer = None


def get_netlify_deployer() -> NetlifyDeployer:
    """Get singleton Netlify deployer instance"""
    global _netlify_deployer
    if _netlify_deployer is None:
        _netlify_deployer = NetlifyDeployer()
    return _netlify_deployer


# Test
if __name__ == "__main__":
    async def test():
        deployer = NetlifyDeployer()
        print(f"Configured: {deployer.is_configured()}")
        if deployer.is_configured():
            result = await deployer.check_connection()
            print(f"Connection: {result}")

    asyncio.run(test())
