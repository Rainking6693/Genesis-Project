#!/usr/bin/env python3
"""
PythonAnywhere Deployment Script
Deploys Genesis backend and frontend to PythonAnywhere
"""

import requests
import json
import os
import time
from pathlib import Path

# PythonAnywhere API credentials
API_TOKEN = "d96e5e35ee2070fd3d41f83ddb856859a7f4ea7d"
USERNAME = "rainking632"
API_BASE = f"https://www.pythonanywhere.com/api/v0/user/{USERNAME}/"

def get_headers():
    """Get API headers with authentication"""
    return {
        "Authorization": f"Token {API_TOKEN}",
        "Content-Type": "application/json"
    }

def list_webapps():
    """List all web apps"""
    response = requests.get(f"{API_BASE}webapps/", headers=get_headers())
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error listing webapps: {response.status_code} - {response.text}")
        return []

def create_webapp(domain_name, python_version="3.10"):
    """Create a new web app"""
    data = {
        "domain_name": domain_name,
        "python_version": python_version
    }
    response = requests.post(
        f"{API_BASE}webapps/",
        headers=get_headers(),
        json=data
    )
    if response.status_code == 201:
        return response.json()
    else:
        print(f"Error creating webapp: {response.status_code} - {response.text}")
        return None

def update_webapp_source(domain_name, source_code_path):
    """Update web app source code"""
    # This would typically be done via git or file upload
    # For now, we'll use the file API
    print(f"Note: Source code should be uploaded via PythonAnywhere Files tab or git")
    return True

def reload_webapp(domain_name):
    """Reload web app"""
    response = requests.post(
        f"{API_BASE}webapps/{domain_name}/reload/",
        headers=get_headers()
    )
    if response.status_code == 200:
        print(f"✅ Web app {domain_name} reloaded successfully")
        return True
    else:
        print(f"Error reloading webapp: {response.status_code} - {response.text}")
        return False

def set_environment_variables(domain_name, env_vars):
    """Set environment variables for web app"""
    # PythonAnywhere uses .env files or environment variables in web app config
    print(f"Note: Set environment variables via PythonAnywhere web app configuration")
    print(f"Variables to set: {list(env_vars.keys())}")
    return True

def main():
    """Main deployment function"""
    print("🚀 Deploying Genesis to PythonAnywhere...")
    print(f"User: {USERNAME}")
    
    # List existing web apps
    print("\n📋 Checking existing web apps...")
    webapps = list_webapps()
    print(f"Found {len(webapps)} web app(s)")
    
    # Backend app
    backend_domain = f"{USERNAME}.pythonanywhere.com"
    backend_app = None
    
    for app in webapps:
        if backend_domain in app.get("domain_name", ""):
            backend_app = app
            break
    
    if not backend_app:
        print(f"\n📦 Creating backend web app: {backend_domain}")
        backend_app = create_webapp(backend_domain)
        if backend_app:
            print(f"✅ Backend app created: {backend_app.get('id')}")
    else:
        print(f"✅ Backend app exists: {backend_app.get('id')}")
    
    # Frontend app (separate subdomain)
    frontend_domain = f"{USERNAME}-frontend.pythonanywhere.com"
    frontend_app = None
    
    for app in webapps:
        if frontend_domain in app.get("domain_name", ""):
            frontend_app = app
            break
    
    if not frontend_app:
        print(f"\n📦 Creating frontend web app: {frontend_domain}")
        frontend_app = create_webapp(frontend_domain)
        if frontend_app:
            print(f"✅ Frontend app created: {frontend_app.get('id')}")
    else:
        print(f"✅ Frontend app exists: {frontend_app.get('id')}")
    
    print("\n✅ Deployment setup complete!")
    print("\n📝 Next steps:")
    print("1. Upload code via PythonAnywhere Files tab or git")
    print("2. Configure WSGI file for backend (a2a_fastapi.py)")
    print("3. Configure WSGI file for frontend (dashboard/app.py)")
    print("4. Set environment variables in web app configuration")
    print("5. Reload web apps")

if __name__ == "__main__":
    main()

