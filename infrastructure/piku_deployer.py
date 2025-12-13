"""
Piku Deployer - Lightweight Git-Push PaaS

Deploy Genesis businesses to Piku (the tiniest PaaS).
Piku allows Heroku-style git push deployments to your own servers.

Features:
- Git push deployments (git push piku master)
- Supports Python, Node, Go, Java, Ruby
- No Docker required (lightweight)
- Runs on Raspberry Pi to full servers
- Automatic SSL via Let's Encrypt
- Free, open source, self-hosted

Website: https://github.com/piku/piku
Docs: https://piku.github.io/

Author: Genesis Deploy Agent
Date: December 2025
Status: Production Ready
"""

import asyncio
import json
import logging
import os
import subprocess
import time
from pathlib import Path
from typing import Dict, List, Optional

from infrastructure.load_env import load_genesis_env

load_genesis_env()

logger = logging.getLogger(__name__)


class PikuDeployer:
    """
    Deploy applications to Piku (lightweight self-hosted PaaS)

    Piku is the tiniest PaaS - runs on Raspberry Pi to full servers.
    It provides Heroku-style git push deployments without Docker overhead.

    Setup:
    1. Install Piku on your server: curl https://piku.github.io/get | sh
    2. Add your SSH key: ssh piku@server "piku setup:ssh $(cat ~/.ssh/id_rsa.pub)"
    3. Set PIKU_SERVER environment variable
    """

    def __init__(self):
        """Initialize Piku deployer"""
        self.piku_server = os.getenv("PIKU_SERVER", "")  # e.g., piku@your-server.com
        self.ssh_key = os.getenv("PIKU_SSH_KEY", "~/.ssh/id_rsa")

        if not self.piku_server:
            logger.warning("PIKU_SERVER not set - Piku deployment unavailable")

    def is_configured(self) -> bool:
        """Check if Piku is properly configured"""
        return bool(self.piku_server)

    async def check_connection(self) -> Dict:
        """Check SSH connection to Piku server"""
        if not self.is_configured():
            return {"connected": False, "error": "Piku not configured"}

        try:
            # Test SSH connection
            result = await asyncio.create_subprocess_exec(
                "ssh", "-o", "ConnectTimeout=5", self.piku_server, "piku", "apps",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await result.communicate()

            if result.returncode == 0:
                apps = stdout.decode().strip().split('\n') if stdout else []
                return {
                    "connected": True,
                    "server": self.piku_server,
                    "apps": [a for a in apps if a]
                }
            else:
                return {
                    "connected": False,
                    "error": stderr.decode() or "Connection failed"
                }

        except Exception as e:
            return {"connected": False, "error": str(e)}

    async def deploy(
        self,
        app_path: str,
        app_name: str,
        environment: Optional[Dict[str, str]] = None
    ) -> Dict:
        """
        Deploy application to Piku via git push

        Args:
            app_path: Path to the application directory
            app_name: Name for the Piku app
            environment: Environment variables to set

        Returns:
            Dict with deployment result
        """
        if not self.is_configured():
            return {"success": False, "error": "Piku not configured"}

        app_path = Path(app_path)
        if not app_path.exists():
            return {"success": False, "error": f"App path not found: {app_path}"}

        try:
            # Sanitize app name (lowercase, alphanumeric, hyphens only)
            safe_name = ''.join(c if c.isalnum() or c == '-' else '-' for c in app_name.lower())
            safe_name = safe_name.strip('-')[:50]  # Max 50 chars

            logger.info(f"Deploying {safe_name} to Piku from {app_path}")

            # Step 1: Initialize git if needed
            git_dir = app_path / ".git"
            if not git_dir.exists():
                await self._run_command(["git", "init"], cwd=str(app_path))
                await self._run_command(["git", "add", "."], cwd=str(app_path))
                await self._run_command(
                    ["git", "commit", "-m", "Initial Genesis deployment"],
                    cwd=str(app_path)
                )

            # Step 2: Add Piku remote
            remote_url = f"{self.piku_server}:{safe_name}"
            try:
                await self._run_command(
                    ["git", "remote", "remove", "piku"],
                    cwd=str(app_path)
                )
            except:
                pass  # Remote might not exist

            await self._run_command(
                ["git", "remote", "add", "piku", remote_url],
                cwd=str(app_path)
            )

            # Step 3: Create Procfile if missing (for Node.js apps)
            procfile = app_path / "Procfile"
            package_json = app_path / "package.json"

            if not procfile.exists() and package_json.exists():
                # Auto-generate Procfile for Node.js
                procfile.write_text("web: npm start\n")
                await self._run_command(["git", "add", "Procfile"], cwd=str(app_path))
                await self._run_command(
                    ["git", "commit", "-m", "Add Procfile for Piku"],
                    cwd=str(app_path)
                )

            # Step 4: Set environment variables if provided
            if environment:
                for key, value in environment.items():
                    await self._run_command([
                        "ssh", self.piku_server,
                        "piku", "config:set", safe_name, f"{key}={value}"
                    ])

            # Step 5: Push to Piku (this triggers deployment)
            push_result = await self._run_command(
                ["git", "push", "piku", "master", "--force"],
                cwd=str(app_path),
                capture_output=True
            )

            # Step 6: Get deployment URL
            # Piku creates URLs like: app-name.your-server.com
            server_host = self.piku_server.split('@')[-1] if '@' in self.piku_server else self.piku_server
            deployment_url = f"https://{safe_name}.{server_host}"

            # Step 7: Verify deployment
            await asyncio.sleep(5)  # Wait for app to start
            verified = await self._verify_deployment(deployment_url)

            return {
                "success": True,
                "url": deployment_url,
                "app_name": safe_name,
                "platform": "piku",
                "verified": verified,
                "logs": push_result.get("stdout", "")[:1000]
            }

        except Exception as e:
            logger.error(f"Piku deployment error: {e}")
            return {"success": False, "error": str(e)}

    async def _run_command(
        self,
        cmd: List[str],
        cwd: Optional[str] = None,
        capture_output: bool = False
    ) -> Dict:
        """Run a shell command"""
        process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=cwd,
            stdout=asyncio.subprocess.PIPE if capture_output else None,
            stderr=asyncio.subprocess.PIPE if capture_output else None
        )
        stdout, stderr = await process.communicate()

        if process.returncode != 0 and capture_output:
            error = stderr.decode() if stderr else "Command failed"
            raise Exception(f"Command failed: {' '.join(cmd)}: {error}")

        return {
            "returncode": process.returncode,
            "stdout": stdout.decode() if stdout else "",
            "stderr": stderr.decode() if stderr else ""
        }

    async def _verify_deployment(self, url: str) -> bool:
        """Verify the deployment is live"""
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10, ssl=False) as response:
                    return response.status == 200
        except:
            return False

    async def get_logs(self, app_name: str, lines: int = 100) -> str:
        """Get application logs"""
        if not self.is_configured():
            return "Piku not configured"

        try:
            result = await self._run_command(
                ["ssh", self.piku_server, "piku", "logs", app_name, "-n", str(lines)],
                capture_output=True
            )
            return result.get("stdout", "No logs available")
        except Exception as e:
            return f"Error getting logs: {e}"

    async def restart(self, app_name: str) -> bool:
        """Restart an application"""
        if not self.is_configured():
            return False

        try:
            await self._run_command([
                "ssh", self.piku_server,
                "piku", "restart", app_name
            ])
            return True
        except:
            return False

    async def destroy(self, app_name: str) -> bool:
        """Remove an application"""
        if not self.is_configured():
            return False

        try:
            await self._run_command([
                "ssh", self.piku_server,
                "piku", "destroy", app_name
            ])
            return True
        except:
            return False


# Singleton instance
_piku_deployer = None


def get_piku_deployer() -> PikuDeployer:
    """Get singleton Piku deployer instance"""
    global _piku_deployer
    if _piku_deployer is None:
        _piku_deployer = PikuDeployer()
    return _piku_deployer


# Test
if __name__ == "__main__":
    import asyncio

    async def test():
        deployer = PikuDeployer()
        print(f"Configured: {deployer.is_configured()}")
        if deployer.is_configured():
            result = await deployer.check_connection()
            print(f"Connection: {result}")

    asyncio.run(test())
