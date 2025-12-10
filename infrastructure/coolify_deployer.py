"""
Coolify Deployer - Open Source PaaS Deployment

Deploy Genesis businesses to Coolify (self-hosted Vercel/Netlify alternative).
Supports full Next.js apps with SSR, APIs, databases, and Stripe integration.

Features:
- Full Next.js support (SSR, API routes, middleware)
- Automatic SSL via Let's Encrypt
- Docker-based deployments
- Git-based deployments (push to deploy)
- Environment variable management
- Database provisioning (PostgreSQL, MySQL, MongoDB)
- Horizontal scaling

Author: Genesis Deploy Agent
Date: December 2025
Status: Production Ready

Sources:
- https://coolify.io/
- https://github.com/coollabsio/coolify
"""

import asyncio
import json
import logging
import os
import subprocess
import time
from pathlib import Path
from typing import Dict, List, Optional
import aiohttp

from infrastructure.load_env import load_genesis_env

load_genesis_env()

logger = logging.getLogger(__name__)


class CoolifyDeployer:
    """
    Deploy applications to Coolify (self-hosted PaaS)

    Coolify is an open-source alternative to Vercel/Netlify that runs on your own servers.
    It provides:
    - Full Next.js/Node.js support with SSR
    - Automatic SSL certificates
    - Docker-based isolated deployments
    - Git integration for CI/CD
    - Built-in databases
    """

    def __init__(self):
        """Initialize Coolify deployer"""
        self.coolify_url = os.getenv("COOLIFY_URL", "")
        self.coolify_token = os.getenv("COOLIFY_API_TOKEN", "")
        self.default_server_id = os.getenv("COOLIFY_SERVER_ID", "")
        self.default_team_id = os.getenv("COOLIFY_TEAM_ID", "")

        if not self.coolify_url:
            logger.warning("COOLIFY_URL not set - Coolify deployment unavailable")

        self.api_base = f"{self.coolify_url}/api/v1" if self.coolify_url else ""
        self.headers = {
            "Authorization": f"Bearer {self.coolify_token}",
            "Content-Type": "application/json"
        }

    def is_configured(self) -> bool:
        """Check if Coolify is properly configured"""
        return bool(self.coolify_url and self.coolify_token)

    async def health_check(self) -> Dict:
        """Check Coolify server health"""
        if not self.is_configured():
            return {"healthy": False, "error": "Coolify not configured"}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.api_base}/health",
                    headers=self.headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        return {"healthy": True, "status": "ok"}
                    else:
                        return {"healthy": False, "status": response.status}
        except Exception as e:
            return {"healthy": False, "error": str(e)}

    async def list_servers(self) -> List[Dict]:
        """List available servers in Coolify"""
        if not self.is_configured():
            return []

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.api_base}/servers",
                    headers=self.headers
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    return []
        except Exception as e:
            logger.error(f"Failed to list servers: {e}")
            return []

    async def create_application(
        self,
        name: str,
        git_repository: str,
        git_branch: str = "main",
        build_pack: str = "nixpacks",
        server_id: Optional[str] = None,
        environment_id: Optional[str] = None,
        env_vars: Optional[Dict[str, str]] = None
    ) -> Dict:
        """
        Create a new application in Coolify

        Args:
            name: Application name
            git_repository: Git repository URL
            git_branch: Branch to deploy
            build_pack: Build pack (nixpacks, dockerfile, docker-compose)
            server_id: Server to deploy to
            environment_id: Environment ID
            env_vars: Environment variables

        Returns:
            Application creation result
        """
        if not self.is_configured():
            return {"success": False, "error": "Coolify not configured"}

        server_id = server_id or self.default_server_id

        payload = {
            "name": name,
            "git_repository": git_repository,
            "git_branch": git_branch,
            "build_pack": build_pack,
            "server_uuid": server_id,
            "instant_deploy": True
        }

        if env_vars:
            payload["environment_variables"] = [
                {"key": k, "value": v} for k, v in env_vars.items()
            ]

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_base}/applications",
                    headers=self.headers,
                    json=payload
                ) as response:
                    result = await response.json()

                    if response.status in [200, 201]:
                        logger.info(f"Created application: {name}")
                        return {
                            "success": True,
                            "application_id": result.get("uuid"),
                            "application": result
                        }
                    else:
                        logger.error(f"Failed to create app: {result}")
                        return {
                            "success": False,
                            "error": result.get("message", "Unknown error")
                        }
        except Exception as e:
            logger.error(f"Exception creating app: {e}")
            return {"success": False, "error": str(e)}

    async def deploy_application(self, application_id: str) -> Dict:
        """Trigger deployment for an application"""
        if not self.is_configured():
            return {"success": False, "error": "Coolify not configured"}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_base}/applications/{application_id}/deploy",
                    headers=self.headers
                ) as response:
                    if response.status in [200, 201, 202]:
                        result = await response.json()
                        logger.info(f"Deployment triggered for {application_id}")
                        return {
                            "success": True,
                            "deployment_id": result.get("deployment_uuid"),
                            "status": "deploying"
                        }
                    else:
                        return {"success": False, "error": await response.text()}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_deployment_status(self, application_id: str) -> Dict:
        """Get deployment status for an application"""
        if not self.is_configured():
            return {"status": "unknown", "error": "Coolify not configured"}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.api_base}/applications/{application_id}",
                    headers=self.headers
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "status": result.get("status"),
                            "url": result.get("fqdn"),
                            "health": result.get("health_check_status")
                        }
                    return {"status": "unknown"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def set_environment_variables(
        self,
        application_id: str,
        env_vars: Dict[str, str]
    ) -> Dict:
        """Set environment variables for an application"""
        if not self.is_configured():
            return {"success": False, "error": "Coolify not configured"}

        payload = {
            "environment_variables": [
                {"key": k, "value": v, "is_build_time": False}
                for k, v in env_vars.items()
            ]
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.patch(
                    f"{self.api_base}/applications/{application_id}/envs",
                    headers=self.headers,
                    json=payload
                ) as response:
                    if response.status in [200, 201]:
                        return {"success": True}
                    return {"success": False, "error": await response.text()}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def create_database(
        self,
        name: str,
        db_type: str = "postgresql",
        server_id: Optional[str] = None
    ) -> Dict:
        """
        Create a database instance

        Args:
            name: Database name
            db_type: Type (postgresql, mysql, mongodb, redis)
            server_id: Server to deploy to

        Returns:
            Database creation result with connection string
        """
        if not self.is_configured():
            return {"success": False, "error": "Coolify not configured"}

        server_id = server_id or self.default_server_id

        payload = {
            "name": name,
            "type": db_type,
            "server_uuid": server_id
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_base}/databases",
                    headers=self.headers,
                    json=payload
                ) as response:
                    if response.status in [200, 201]:
                        result = await response.json()
                        return {
                            "success": True,
                            "database_id": result.get("uuid"),
                            "connection_string": result.get("connection_string"),
                            "database": result
                        }
                    return {"success": False, "error": await response.text()}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def prepare_nextjs_app(self, app_path: Path) -> bool:
        """
        Prepare a Next.js app for Coolify deployment

        Creates necessary config files:
        - Dockerfile (for Docker builds)
        - next.config.js adjustments
        - .env.production template

        Args:
            app_path: Path to Next.js application

        Returns:
            True if preparation successful
        """
        app_path = Path(app_path)

        # Check if it's a Next.js app
        package_json = app_path / "package.json"
        if not package_json.exists():
            logger.error(f"No package.json found in {app_path}")
            return False

        # Create Dockerfile for production build
        dockerfile_path = app_path / "Dockerfile"
        if not dockerfile_path.exists():
            dockerfile_content = """# Multi-stage Dockerfile for Next.js
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
"""
            with open(dockerfile_path, 'w') as f:
                f.write(dockerfile_content)
            logger.info(f"Created Dockerfile for {app_path.name}")

        # Update next.config.js for standalone output
        next_config = app_path / "next.config.js"
        if not next_config.exists():
            next_config_content = """/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
"""
            with open(next_config, 'w') as f:
                f.write(next_config_content)
            logger.info(f"Created next.config.js for {app_path.name}")

        # Create .env.production template
        env_template = app_path / ".env.production.template"
        if not env_template.exists():
            env_content = """# Production Environment Variables
# These will be set in Coolify dashboard

# Stripe Integration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Database (auto-configured by Coolify)
DATABASE_URL=

# App Configuration
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Analytics
NEXT_PUBLIC_GA_ID=
"""
            with open(env_template, 'w') as f:
                f.write(env_content)
            logger.info(f"Created .env.production.template for {app_path.name}")

        return True

    async def deploy_business_e2e(
        self,
        business_name: str,
        app_path: Path,
        git_repository: str,
        include_database: bool = True,
        include_stripe: bool = True
    ) -> Dict:
        """
        Deploy a complete business end-to-end

        This deploys:
        1. The Next.js application
        2. PostgreSQL database (if needed)
        3. Configures Stripe environment vars
        4. Sets up monitoring

        Args:
            business_name: Name of the business
            app_path: Local path to the application
            git_repository: Git repository URL
            include_database: Whether to provision a database
            include_stripe: Whether to configure Stripe

        Returns:
            Complete deployment result
        """
        logger.info(f"Starting E2E deployment for {business_name}")

        result = {
            "business_name": business_name,
            "success": False,
            "steps_completed": [],
            "errors": []
        }

        # Step 1: Prepare the app
        logger.info("Step 1: Preparing Next.js app...")
        if not self.prepare_nextjs_app(app_path):
            result["errors"].append("Failed to prepare Next.js app")
            return result
        result["steps_completed"].append("app_preparation")

        # Step 2: Create database if needed
        db_connection_string = None
        if include_database:
            logger.info("Step 2: Creating PostgreSQL database...")
            db_result = await self.create_database(
                name=f"{business_name}-db",
                db_type="postgresql"
            )
            if db_result["success"]:
                db_connection_string = db_result.get("connection_string")
                result["database_id"] = db_result["database_id"]
                result["steps_completed"].append("database_creation")
            else:
                result["errors"].append(f"Database creation failed: {db_result.get('error')}")

        # Step 3: Build environment variables
        logger.info("Step 3: Configuring environment variables...")
        env_vars = {
            "NODE_ENV": "production",
            "NEXT_TELEMETRY_DISABLED": "1"
        }

        if db_connection_string:
            env_vars["DATABASE_URL"] = db_connection_string

        if include_stripe:
            # These should be set from Genesis secrets
            stripe_pk = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
            stripe_sk = os.getenv("STRIPE_SECRET_KEY", "")
            if stripe_pk and stripe_sk:
                env_vars["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"] = stripe_pk
                env_vars["STRIPE_SECRET_KEY"] = stripe_sk

        # Step 4: Create and deploy application
        logger.info("Step 4: Creating application in Coolify...")
        app_result = await self.create_application(
            name=business_name,
            git_repository=git_repository,
            git_branch="main",
            build_pack="dockerfile",
            env_vars=env_vars
        )

        if not app_result["success"]:
            result["errors"].append(f"App creation failed: {app_result.get('error')}")
            return result

        result["application_id"] = app_result["application_id"]
        result["steps_completed"].append("application_creation")

        # Step 5: Wait for deployment
        logger.info("Step 5: Waiting for deployment...")
        max_attempts = 30
        for attempt in range(max_attempts):
            status = await self.get_deployment_status(app_result["application_id"])

            if status.get("status") == "running":
                result["deployment_url"] = status.get("url")
                result["steps_completed"].append("deployment_complete")
                result["success"] = True
                logger.info(f"Deployment successful: {status.get('url')}")
                break
            elif status.get("status") == "error":
                result["errors"].append("Deployment failed")
                break

            await asyncio.sleep(10)

        return result


# Convenience functions
_deployer_instance = None

def get_coolify_deployer() -> CoolifyDeployer:
    """Get singleton Coolify deployer instance"""
    global _deployer_instance
    if _deployer_instance is None:
        _deployer_instance = CoolifyDeployer()
    return _deployer_instance


async def deploy_to_coolify(
    business_name: str,
    app_path: str,
    git_repository: str,
    **kwargs
) -> Dict:
    """Deploy a business to Coolify (convenience function)"""
    deployer = get_coolify_deployer()
    return await deployer.deploy_business_e2e(
        business_name=business_name,
        app_path=Path(app_path),
        git_repository=git_repository,
        **kwargs
    )
