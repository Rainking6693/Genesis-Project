#!/usr/bin/env python3
"""
PythonAnywhere Backend Deployment
Deploys Genesis A2A FastAPI service to PythonAnywhere
"""

import requests
import json
import sys

API_TOKEN = "d96e5e35ee2070fd3d41f83ddb856859a7f4ea7d"
USERNAME = "rainking632"
BASE_URL = f"https://www.pythonanywhere.com/api/v0/user/{USERNAME}/"

def get_headers():
    return {
        "Authorization": f"Token {API_TOKEN}",
        "Content-Type": "application/json"
    }

def list_webapps():
    """List all web apps"""
    response = requests.get(f"{BASE_URL}webapps/", headers=get_headers())
    if response.status_code == 200:
        return response.json()
    print(f"Error: {response.status_code} - {response.text}")
    return []

def create_webapp(domain_name):
    """Create web app"""
    data = {"domain_name": domain_name, "python_version": "python310"}
    response = requests.post(f"{BASE_URL}webapps/", headers=get_headers(), json=data)
    if response.status_code == 201:
        return response.json()
    print(f"Error creating webapp: {response.status_code} - {response.text}")
    return None

def reload_webapp(domain_name):
    """Reload web app"""
    response = requests.post(f"{BASE_URL}webapps/{domain_name}/reload/", headers=get_headers())
    return response.status_code == 200

def main():
    print("Deploying Genesis Backend to PythonAnywhere...")
    
    # Check existing apps
    webapps = list_webapps()
    domain = f"{USERNAME}.pythonanywhere.com"
    
    app_exists = any(domain in app.get("domain_name", "") for app in webapps)
    
    if not app_exists:
        print(f"Creating web app: {domain}")
        result = create_webapp(domain)
        if result:
            print(f"Web app created: {result.get('id')}")
    else:
        print(f"Web app already exists: {domain}")
    
    print("\nNext steps:")
    print("1. Upload code to /home/rainking632/Claude-Clean-Code-Genesis")
    print("2. Configure WSGI file (see pythonanywhere_backend.wsgi)")
    print("3. Set environment variables in web app config")
    print("4. Reload web app")

if __name__ == "__main__":
    main()

