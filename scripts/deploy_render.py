#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Render.com Deployment Script
Deploys Genesis backend and frontend to Render using their API
"""

import requests
import json
import sys
import os
import time
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Render API
RENDER_API_BASE = "https://api.render.com/v1"
API_KEY = os.getenv("RENDER_API_KEY", "")

if not API_KEY:
    print("ERROR: RENDER_API_KEY not set")
    print("Get your API key from: https://dashboard.render.com/account/api-keys")
    print("Then run: $env:RENDER_API_KEY='your-key-here'")
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

def get_owner_id():
    """Get owner ID (user or team)"""
    response = requests.get(f"{RENDER_API_BASE}/owners", headers=HEADERS)
    if response.status_code == 200:
        owners = response.json()
        if owners:
            return owners[0]["owner"]["id"]
    print(f"Error getting owner: {response.status_code} - {response.text}")
    return None

def get_repo_url():
    """Get GitHub repo URL from git remote"""
    try:
        import subprocess
        result = subprocess.run(
            ["git", "config", "--get", "remote.origin.url"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            url = result.stdout.strip()
            # Convert SSH to HTTPS if needed
            if url.startswith("git@"):
                url = url.replace(":", "/").replace("git@", "https://")
            if url.endswith(".git"):
                url = url[:-4]
            return url
    except:
        pass
    return None

def create_service(owner_id, repo_url, service_config):
    """Create a Render service"""
    url = f"{RENDER_API_BASE}/services"
    
    # Build serviceDetails - buildCommand must be at top level AND in envSpecificDetails
    service_details = {
        "runtime": "python",
        "planId": "free",
        "region": "oregon",
        "buildCommand": service_config.get("buildCommand", "pip install -r requirements.txt"),
        "startCommand": service_config.get("startCommand"),
        "healthCheckPath": service_config.get("healthCheckPath", "/"),
        "envSpecificDetails": {
            "python": {
                "version": "3",
                "buildCommand": service_config.get("buildCommand", "pip install -r requirements.txt")
            }
        }
    }
    
    if service_config.get("rootDir"):
        service_details["rootDir"] = service_config.get("rootDir")
    
    payload = {
        "type": "web_service",
        "name": service_config["name"],
        "ownerId": owner_id,
        "repo": repo_url,
        "branch": "main",
        "serviceDetails": service_details,
        "envVars": service_config.get("envVars", [])
    }
    
    response = requests.post(url, headers=HEADERS, json=payload)
    
    if response.status_code == 201:
        service = response.json()["service"]
        print(f"[OK] Created service: {service['name']} (ID: {service['id']})")
        print(f"   URL: {service.get('serviceDetails', {}).get('url', 'Pending...')}")
        return service
    else:
        print(f"[ERROR] Failed to create service: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def update_service_env(service_id, env_vars):
    """Update service environment variables"""
    for env_var in env_vars:
        url = f"{RENDER_API_BASE}/services/{service_id}/env-vars"
        payload = {
            "key": env_var["key"],
            "value": env_var["value"]
        }
        response = requests.post(url, headers=HEADERS, json=payload)
        if response.status_code in [200, 201]:
            print(f"  [OK] Set {env_var['key']}")
        else:
            print(f"  [WARN] Failed to set {env_var['key']}: {response.status_code}")

def main():
    print("=" * 60)
    print("Deploying Genesis to Render.com")
    print("=" * 60)
    
    # Get owner ID
    print("\n1. Getting owner ID...")
    owner_id = get_owner_id()
    if not owner_id:
        print("[ERROR] Failed to get owner ID")
        return False
    print(f"[OK] Owner ID: {owner_id}")
    
    # Get repo URL
    print("\n2. Getting GitHub repo URL...")
    repo_url = get_repo_url()
    if not repo_url:
        repo_url = input("Enter GitHub repo URL (e.g., https://github.com/user/repo): ")
    print(f"[OK] Repo: {repo_url}")
    
    # Backend service config
    backend_config = {
        "name": "genesis-backend",
        "buildCommand": "pip install --upgrade pip setuptools wheel && pip install -r requirements_production.txt",
        "startCommand": "python a2a_fastapi.py",
        "healthCheckPath": "/health",
        "envVars": [
            {"key": "GENESIS_ENV", "value": "production"},
            {"key": "A2A_HOST", "value": "0.0.0.0"},
            {"key": "PORT", "value": "8000"},
            {"key": "A2A_PORT", "value": "8000"},
            {"key": "PYTHONUNBUFFERED", "value": "1"}
        ]
    }
    
    # Frontend service config
    frontend_config = {
        "name": "genesis-frontend",
        "rootDir": "dashboard",
        "buildCommand": "pip install --upgrade pip && pip install -r requirements.txt",
        "startCommand": "python app.py",
        "healthCheckPath": "/",
        "envVars": [
            {"key": "FLASK_ENV", "value": "production"},
            {"key": "FLASK_DEBUG", "value": "0"},
            {"key": "NEXT_PUBLIC_API_URL", "value": "https://genesis-backend.onrender.com"}
        ]
    }
    
    # Create backend
    print("\n3. Creating backend service...")
    backend_service = create_service(owner_id, repo_url, backend_config)
    if not backend_service:
        return False
    
    # Wait a bit
    time.sleep(2)
    
    # Create frontend
    print("\n4. Creating frontend service...")
    frontend_service = create_service(owner_id, repo_url, frontend_config)
    if not frontend_service:
        return False
    
    print("\n" + "=" * 60)
    print("[OK] Deployment initiated!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Go to https://dashboard.render.com")
    print("2. Add environment variables (secrets) to both services")
    print("3. Services will auto-deploy from GitHub")
    print("\nBackend URL: https://genesis-backend.onrender.com")
    print("Frontend URL: https://genesis-frontend.onrender.com")
    print("\nNote: First deployment takes 5-10 minutes")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

