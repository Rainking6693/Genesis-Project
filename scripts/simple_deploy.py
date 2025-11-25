#!/usr/bin/env python3
"""
Simple Deployment Script - Railway/Render Focus

Simplified deployment for Genesis businesses without Vercel.
Uses Railway (preferred) or Render for straightforward deployments.

Author: Genesis Deploy Agent
Date: November 12, 2025
Status: Production Ready

Usage:
    python simple_deploy.py --path businesses/fully_integrated/saas/my-app
    python simple_deploy.py --path businesses/fully_integrated/saas/my-app --platform render

Supported Platforms:
    - Railway (default, recommended)
    - Render
    - PythonAnywhere (for Python apps)
    - GitHub Pages (for static sites)
"""

import argparse
import json
import logging
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, Optional, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SimpleDeployer:
    """Simple deployment without complex integrations"""

    def __init__(self, app_path: Path, platform: str = "railway"):
        """
        Initialize deployer

        Args:
            app_path: Path to application directory
            platform: Deployment platform (railway, render, pythonanywhere, github-pages)
        """
        self.app_path = app_path.resolve()
        self.platform = platform.lower()
        self.app_name = self.app_path.name

        if not self.app_path.exists():
            raise ValueError(f"Application path does not exist: {app_path}")

    def detect_app_type(self) -> str:
        """
        Detect application type from files

        Returns:
            App type: nodejs, python, static, or unknown
        """
        if (self.app_path / "package.json").exists():
            return "nodejs"
        elif (self.app_path / "requirements.txt").exists():
            return "python"
        elif (self.app_path / "index.html").exists():
            return "static"
        else:
            return "unknown"

    def ensure_railway_toml(self) -> bool:
        """Create railway.toml if it doesn't exist"""
        railway_toml = self.app_path / "railway.toml"

        if railway_toml.exists():
            logger.info("✅ railway.toml already exists")
            return True

        app_type = self.detect_app_type()

        if app_type == "nodejs":
            content = """[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[env]
NODE_ENV = "production"
"""
        elif app_type == "python":
            content = """[build]
builder = "nixpacks"

[deploy]
startCommand = "python app.py"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[env]
PYTHONUNBUFFERED = "1"
"""
        else:
            content = """[build]
builder = "nixpacks"

[deploy]
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
"""

        with open(railway_toml, 'w') as f:
            f.write(content)

        logger.info(f"✅ Created railway.toml for {app_type} app")
        return True

    def ensure_render_yaml(self) -> bool:
        """Create render.yaml if it doesn't exist"""
        render_yaml = self.app_path / "render.yaml"

        if render_yaml.exists():
            logger.info("✅ render.yaml already exists")
            return True

        app_type = self.detect_app_type()

        if app_type == "nodejs":
            content = f"""services:
  - type: web
    name: {self.app_name}
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
"""
        elif app_type == "python":
            content = f"""services:
  - type: web
    name: {self.app_name}
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: python app.py
    envVars:
      - key: PYTHONUNBUFFERED
        value: 1
"""
        else:
            content = f"""services:
  - type: web
    name: {self.app_name}
    env: static
    buildCommand: echo "No build required"
    staticPublishPath: .
"""

        with open(render_yaml, 'w') as f:
            f.write(content)

        logger.info(f"✅ Created render.yaml for {app_type} app")
        return True

    def init_git_if_needed(self) -> bool:
        """Initialize git repository if needed"""
        git_dir = self.app_path / ".git"

        if git_dir.exists():
            logger.info("✅ Git repository already initialized")
            return True

        try:
            # Initialize git
            subprocess.run(
                ["git", "init"],
                cwd=self.app_path,
                check=True,
                capture_output=True
            )
            logger.info("✅ Git repository initialized")

            # Create .gitignore
            gitignore = self.app_path / ".gitignore"
            if not gitignore.exists():
                with open(gitignore, 'w') as f:
                    f.write("""node_modules/
__pycache__/
*.pyc
.env
.env.local
dist/
build/
.DS_Store
""")
                logger.info("✅ Created .gitignore")

            # Initial commit
            subprocess.run(
                ["git", "add", "."],
                cwd=self.app_path,
                check=True,
                capture_output=True
            )

            subprocess.run(
                ["git", "commit", "-m", "Initial commit"],
                cwd=self.app_path,
                check=True,
                capture_output=True
            )
            logger.info("✅ Created initial commit")

            return True

        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Git initialization failed: {e}")
            return False

    def deploy_railway(self) -> bool:
        """Deploy to Railway"""
        logger.info("Deploying to Railway...")

        # Ensure railway.toml exists
        if not self.ensure_railway_toml():
            return False

        # Ensure git is initialized
        if not self.init_git_if_needed():
            return False

        # Create environment with Node.js and Railway paths
        import os
        import copy
        env = copy.deepcopy(os.environ)

        # Add Node.js and Railway CLI to PATH
        nodejs_path = r"C:\Program Files\nodejs"
        railway_path = r"C:\Users\Administrator\AppData\Roaming\npm"

        current_path = env.get("PATH", "")
        if nodejs_path not in current_path:
            env["PATH"] = f"{nodejs_path};{current_path}"
        if railway_path not in env["PATH"]:
            env["PATH"] = f"{railway_path};{env['PATH']}"

        # Add Railway token for authentication
        railway_token = os.getenv("RAILWAY_TOKEN")
        if railway_token:
            env["RAILWAY_TOKEN"] = railway_token
            logger.info(f"✅ Railway token configured for autonomous deployment")
        else:
            logger.warning("⚠️  RAILWAY_TOKEN not found in environment - deployment may require manual login")

        logger.info(f"✅ Added Node.js and Railway to subprocess PATH")

        # Check if Railway CLI is installed
        try:
            result = subprocess.run(
                "railway version",
                capture_output=True,
                text=True,
                shell=True,
                env=env
            )
            logger.info(f"✅ Railway CLI version: {result.stdout.strip()}")
        except FileNotFoundError:
            logger.error("❌ Railway CLI not installed")
            logger.info("Install with: npm i -g @railway/cli")
            logger.info("Or visit: https://docs.railway.app/develop/cli")
            return False

        # Login check
        logger.info("Checking Railway authentication...")
        result = subprocess.run(
            "railway whoami",
            cwd=self.app_path,
            capture_output=True,
            text=True,
            shell=True,
            env=env
        )

        if result.returncode != 0:
            logger.info("Not logged in to Railway. Starting login...")
            subprocess.run("railway login", cwd=self.app_path, shell=True, env=env)

        # Create new project (autonomous deployment)
        logger.info("Creating new Railway project...")
        result = subprocess.run(
            "railway init",
            cwd=self.app_path,
            capture_output=True,
            text=True,
            shell=True,
            env=env
        )
        if result.returncode != 0:
            logger.warning(f"⚠️  Railway init warning: {result.stderr}")
        else:
            logger.info("✅ Railway project created")

        # Deploy
        logger.info("Deploying to Railway...")
        result = subprocess.run(
            "railway up",
            cwd=self.app_path,
            capture_output=True,
            text=True,
            shell=True,
            env=env
        )

        if result.returncode == 0:
            logger.info("✅ Deployment successful!")
            logger.info("")
            logger.info("To view your deployment:")
            logger.info("  railway open")
            logger.info("")
            logger.info("To check logs:")
            logger.info("  railway logs")
            return True
        else:
            logger.error(f"❌ Deployment failed: {result.stderr}")
            return False

    def deploy_render(self) -> bool:
        """Deploy to Render"""
        logger.info("Deploying to Render...")

        # Ensure render.yaml exists
        if not self.ensure_render_yaml():
            return False

        # Ensure git is initialized
        if not self.init_git_if_needed():
            return False

        logger.info("")
        logger.info("Render deployment instructions:")
        logger.info("1. Push this app to GitHub:")
        logger.info(f"   cd {self.app_path}")
        logger.info("   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO")
        logger.info("   git push -u origin main")
        logger.info("")
        logger.info("2. Go to https://dashboard.render.com")
        logger.info("3. Click 'New' -> 'Blueprint'")
        logger.info("4. Connect your GitHub repository")
        logger.info("5. Render will auto-detect render.yaml and deploy")
        logger.info("")

        return True

    def deploy_pythonanywhere(self) -> bool:
        """Deploy to PythonAnywhere"""
        logger.info("Deploying to PythonAnywhere...")

        app_type = self.detect_app_type()
        if app_type != "python":
            logger.error("❌ PythonAnywhere only supports Python apps")
            logger.info("Detected app type: {app_type}")
            return False

        logger.info("")
        logger.info("PythonAnywhere deployment instructions:")
        logger.info("1. Get your API token from https://www.pythonanywhere.com/account/#api_token")
        logger.info("2. Run the deployment script:")
        logger.info(f"   python scripts/deploy_pythonanywhere.py --username YOUR_USERNAME --api-token YOUR_TOKEN")
        logger.info("")
        logger.info("Or use the web interface:")
        logger.info("1. Log in to https://www.pythonanywhere.com")
        logger.info("2. Go to 'Web' tab -> 'Add a new web app'")
        logger.info("3. Choose 'Manual configuration' -> Python 3.10")
        logger.info(f"4. Upload files from: {self.app_path}")
        logger.info("")

        return True

    def deploy_github_pages(self) -> bool:
        """Deploy to GitHub Pages with full automation"""
        logger.info("Deploying to GitHub Pages...")

        app_type = self.detect_app_type()
        if app_type not in ["static", "nodejs"]:
            logger.warning(f"⚠️  App type '{app_type}' may not work on GitHub Pages")
            logger.info("GitHub Pages works best with static HTML/CSS/JS")

        # Ensure git is initialized
        if not self.init_git_if_needed():
            return False

        # Use automated GitHub Pages deployer
        try:
            import asyncio
            from infrastructure.github_pages_deployer import deploy_to_github_pages

            # Run async deployment
            loop = asyncio.get_event_loop()
            result = loop.run_until_complete(
                deploy_to_github_pages(
                    str(self.app_path),
                    self.app_name,
                    verify=True  # Verify site is live
                )
            )

            if result["success"]:
                logger.info("=" * 60)
                logger.info("✅ GITHUB PAGES DEPLOYMENT SUCCESSFUL!")
                logger.info("=" * 60)
                logger.info(f"Deployment URL: {result['deployment_url']}")
                logger.info(f"Repository: {result['repo_url']}")
                logger.info(f"Duration: {result['duration_seconds']:.1f}s")
                logger.info(f"Verified: {result.get('verified', False)}")
                logger.info("=" * 60)
                return True
            else:
                logger.error("=" * 60)
                logger.error("❌ GITHUB PAGES DEPLOYMENT FAILED")
                logger.error("=" * 60)
                logger.error(f"Error: {result.get('error', 'Unknown error')}")
                if result.get("deployment_url"):
                    logger.error(f"URL: {result['deployment_url']}")
                if result.get("repo_url"):
                    logger.error(f"Repository: {result['repo_url']}")
                logger.error("=" * 60)
                return False

        except Exception as e:
            logger.error(f"❌ GitHub Pages deployment exception: {e}")
            logger.error("")
            logger.error("Falling back to manual instructions:")
            logger.error("1. Push this app to GitHub:")
            logger.error(f"   cd {self.app_path}")
            logger.error("   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO")
            logger.error("   git push -u origin main")
            logger.error("")
            logger.error("2. Go to your GitHub repository settings")
            logger.error("3. Navigate to 'Pages' section")
            logger.error("4. Select 'Deploy from branch' -> 'main' -> '/' (root)")
            logger.error("")
            return False

    def deploy(self) -> bool:
        """Run deployment for selected platform"""
        logger.info("=" * 60)
        logger.info(f"Deploying {self.app_name} to {self.platform}")
        logger.info("=" * 60)
        logger.info(f"App path: {self.app_path}")
        logger.info(f"App type: {self.detect_app_type()}")
        logger.info("=" * 60)
        logger.info("")

        if self.platform == "railway":
            return self.deploy_railway()
        elif self.platform == "render":
            return self.deploy_render()
        elif self.platform == "pythonanywhere":
            return self.deploy_pythonanywhere()
        elif self.platform == "github-pages":
            return self.deploy_github_pages()
        else:
            logger.error(f"❌ Unsupported platform: {self.platform}")
            logger.info("Supported platforms: railway, render, pythonanywhere, github-pages")
            return False


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Simple deployment for Genesis businesses (no Vercel)"
    )
    parser.add_argument(
        "--path",
        required=True,
        help="Path to application directory"
    )
    parser.add_argument(
        "--platform",
        default="railway",
        choices=["railway", "render", "pythonanywhere", "github-pages"],
        help="Deployment platform (default: railway)"
    )

    args = parser.parse_args()

    # Create deployer
    try:
        deployer = SimpleDeployer(
            app_path=Path(args.path),
            platform=args.platform
        )
    except ValueError as e:
        logger.error(f"❌ {e}")
        sys.exit(1)

    # Run deployment
    success = deployer.deploy()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
