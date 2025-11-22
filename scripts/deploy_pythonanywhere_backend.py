#!/usr/bin/env python3
"""
PythonAnywhere Backend (A2A FastAPI) Deployment Script
Deploys Genesis A2A FastAPI service to PythonAnywhere
"""

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: requests library not installed")
    print("Install with: pip install requests")
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class PythonAnywhereBackendDeployer:
    """Deploy Genesis A2A FastAPI backend to PythonAnywhere"""

    def __init__(self, username: str, api_token: str, domain: str = None):
        self.username = username
        self.api_token = api_token
        self.domain = domain or f"{username}.pythonanywhere.com"
        self.base_url = "https://www.pythonanywhere.com/api/v0"
        self.headers = {
            "Authorization": f"Token {api_token}",
            "Content-Type": "application/json"
        }
        self.remote_path = f"/home/{username}/Claude-Clean-Code-Genesis"

    def verify_credentials(self) -> bool:
        """Verify API credentials"""
        logger.info("Verifying API credentials...")
        url = f"{self.base_url}/user/{self.username}/cpu/"
        response = requests.get(url, headers=self.headers)
        if response.status_code == 200:
            logger.info("✅ Credentials verified")
            return True
        logger.error(f"❌ Invalid credentials: {response.status_code}")
        return False

    def list_webapps(self):
        """List all web apps"""
        url = f"{self.base_url}/user/{self.username}/webapps/"
        response = requests.get(url, headers=self.headers)
        if response.status_code == 200:
            return response.json()
        return []

    def create_webapp(self) -> bool:
        """Create or update web app"""
        logger.info(f"Configuring web app: {self.domain}")
        webapps = self.list_webapps()
        
        # Check if app exists
        app_exists = any(self.domain in app.get("domain_name", "") for app in webapps)
        
        if not app_exists:
            logger.info("Creating new web app...")
            url = f"{self.base_url}/user/{self.username}/webapps/"
            data = {
                "domain_name": self.domain,
                "python_version": "python310"
            }
            response = requests.post(url, headers=self.headers, json=data)
            if response.status_code == 201:
                logger.info("✅ Web app created")
                return True
            logger.error(f"❌ Failed to create web app: {response.status_code}")
            return False
        else:
            logger.info("✅ Web app already exists")
            return True

    def configure_wsgi(self) -> bool:
        """Configure WSGI file for FastAPI"""
        logger.info("Configuring WSGI file...")
        
        wsgi_content = f"""# WSGI configuration for Genesis A2A FastAPI Backend
import sys
import os

# Add project directory to path
project_home = '{self.remote_path}'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Set working directory
os.chdir(project_home)

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(project_home, '.env'))
except ImportError:
    pass

# Import FastAPI app
from a2a_fastapi import app

# WSGI application
application = app
"""
        
        wsgi_path = f"/var/www/{self.username}_pythonanywhere_com_wsgi.py"
        url = f"{self.base_url}/user/{self.username}/files/path{wsgi_path}"
        
        response = requests.post(
            url,
            headers={"Authorization": f"Token {self.api_token}"},
            files={'content': wsgi_content.encode('utf-8')}
        )
        
        if response.status_code in [200, 201]:
            logger.info("✅ WSGI file configured")
            return True
        logger.error(f"❌ Failed to configure WSGI: {response.status_code}")
        return False

    def reload_webapp(self) -> bool:
        """Reload web app"""
        logger.info("Reloading web app...")
        url = f"{self.base_url}/user/{self.username}/webapps/{self.domain}/reload/"
        response = requests.post(url, headers=self.headers)
        if response.status_code == 200:
            logger.info("✅ Web app reloaded")
            return True
        logger.error(f"❌ Failed to reload: {response.status_code}")
        return False

    def deploy(self) -> bool:
        """Run complete deployment"""
        logger.info("=" * 60)
        logger.info("Deploying Genesis Backend to PythonAnywhere")
        logger.info("=" * 60)
        
        steps = [
            ("Verify credentials", self.verify_credentials),
            ("Create/update web app", self.create_webapp),
            ("Configure WSGI", self.configure_wsgi),
            ("Reload web app", self.reload_webapp),
        ]
        
        for step_name, step_func in steps:
            logger.info("")
            logger.info(f"Step: {step_name}")
            logger.info("-" * 60)
            if not step_func():
                logger.error(f"❌ Deployment failed at: {step_name}")
                return False
            time.sleep(1)
        
        logger.info("")
        logger.info("=" * 60)
        logger.info("✅ Backend deployment successful!")
        logger.info("=" * 60)
        logger.info(f"Backend URL: https://{self.domain}/health")
        logger.info("")
        logger.info("Next steps:")
        logger.info("1. Upload code to PythonAnywhere Files tab")
        logger.info("2. Install dependencies: pip3.10 install --user -r requirements_production.txt")
        logger.info("3. Set environment variables in web app configuration")
        logger.info("4. Test: curl https://{self.domain}/health")
        logger.info("=" * 60)
        return True


def main():
    parser = argparse.ArgumentParser(description="Deploy Genesis Backend to PythonAnywhere")
    parser.add_argument("--username", required=True, help="PythonAnywhere username")
    parser.add_argument("--api-token", required=True, help="PythonAnywhere API token")
    parser.add_argument("--domain", help="Custom domain (default: username.pythonanywhere.com)")
    
    args = parser.parse_args()
    
    deployer = PythonAnywhereBackendDeployer(
        username=args.username,
        api_token=args.api_token,
        domain=args.domain
    )
    
    success = deployer.deploy()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

