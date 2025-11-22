#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Render.com Blueprint Deployment Script
Uses render.yaml blueprint for easier deployment
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
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

def get_owner_id():
    """Get owner ID"""
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
            if url.startswith("git@"):
                url = url.replace(":", "/").replace("git@", "https://")
            if url.endswith(".git"):
                url = url[:-4]
            return url
    except:
        pass
    return None

def create_blueprint(owner_id, repo_url):
    """Create services from render.yaml blueprint"""
    url = f"{RENDER_API_BASE}/owners/{owner_id}/blueprints"
    
    payload = {
        "blueprint": {
            "services": [
                {
                    "type": "web",
                    "name": "genesis-backend",
                    "env": "python",
                    "region": "oregon",
                    "plan": "free",
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
                },
                {
                    "type": "web",
                    "name": "genesis-frontend",
                    "env": "python",
                    "region": "oregon",
                    "plan": "free",
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
            ]
        },
        "repo": repo_url,
        "branch": "main"
    }
    
    response = requests.post(url, headers=HEADERS, json=payload)
    
    if response.status_code == 201:
        blueprint = response.json()
        print(f"[OK] Blueprint created: {blueprint.get('id')}")
        return blueprint
    else:
        print(f"[ERROR] Failed to create blueprint: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def main():
    print("=" * 60)
    print("Deploying Genesis to Render.com (Blueprint)")
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
        repo_url = input("Enter GitHub repo URL: ")
    print(f"[OK] Repo: {repo_url}")
    
    # Create blueprint
    print("\n3. Creating services from blueprint...")
    blueprint = create_blueprint(owner_id, repo_url)
    if not blueprint:
        print("\n[INFO] Blueprint API may not be available. Using manual setup instead...")
        print("\nPlease use the web interface:")
        print("1. Go to https://dashboard.render.com")
        print("2. Click 'New +' -> 'Blueprint'")
        print("3. Connect your GitHub repo")
        print("4. Render will auto-detect render.yaml")
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

