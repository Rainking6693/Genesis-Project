# Simple Deployment Guide - NO VERCEL

**Date:** November 12, 2025
**Status:** Production Ready
**Default Platform:** Railway

---

## Overview

Genesis now uses **Railway as the default deployment platform** instead of Vercel. This provides a simpler, more flexible deployment experience with better support for all app types.

### Why Not Vercel?

- Vercel deployment disabled per user request
- Railway/Render are simpler and more versatile
- Better support for Python, Node.js, and static apps
- More transparent pricing and configuration

---

## Quick Start

### Deploy Any Genesis Business

```bash
# Deploy to Railway (default)
python scripts/simple_deploy.py --path businesses/fully_integrated/saas/my-app

# Deploy to Render
python scripts/simple_deploy.py --path businesses/fully_integrated/saas/my-app --platform render

# Deploy to PythonAnywhere (Python apps only)
python scripts/simple_deploy.py --path businesses/fully_integrated/saas/my-app --platform pythonanywhere

# Deploy to GitHub Pages (static sites)
python scripts/simple_deploy.py --path businesses/fully_integrated/saas/my-app --platform github-pages
```

---

## Supported Platforms

### 1. Railway (Default, Recommended)

**Best for:** All app types (Node.js, Python, static)

**Pros:**
- Automatic deployments from Git
- Built-in databases (PostgreSQL, Redis, MySQL)
- Simple CLI and web interface
- $5/month free credit
- One-command deployment

**Setup:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy (automatic)
python scripts/simple_deploy.py --path YOUR_APP_PATH
```

**Manual deployment:**
```bash
cd YOUR_APP_PATH
railway login
railway init
railway up
railway open
```

**Configuration:**
- Creates `railway.toml` automatically
- Auto-detects app type
- Environment variables: `railway variables set KEY=value`
- Logs: `railway logs`

**Docs:** https://docs.railway.app

---

### 2. Render

**Best for:** Full-stack apps with databases

**Pros:**
- Free tier (750 hours/month)
- Auto-deploy from GitHub
- Built-in SSL certificates
- PostgreSQL included

**Setup:**
```bash
python scripts/simple_deploy.py --path YOUR_APP_PATH --platform render
```

**Manual deployment:**
1. Push code to GitHub
2. Go to https://dashboard.render.com
3. Click "New" -> "Web Service"
4. Connect GitHub repo
5. Render auto-detects `render.yaml`

**Configuration:**
- Creates `render.yaml` automatically
- Environment variables in dashboard
- Free tier limitations: 512MB RAM, sleeps after 15min inactivity

**Docs:** https://render.com/docs

---

### 3. PythonAnywhere

**Best for:** Python web apps (Flask, Django)

**Pros:**
- Free tier available
- Easy MySQL/PostgreSQL setup
- Simple file upload interface
- No credit card required

**Setup:**
```bash
# Get API token from https://www.pythonanywhere.com/account/#api_token
python scripts/deploy_pythonanywhere.py --username YOUR_USERNAME --api-token YOUR_TOKEN
```

**OR use simple deploy:**
```bash
python scripts/simple_deploy.py --path YOUR_APP_PATH --platform pythonanywhere
# (Provides instructions for manual setup)
```

**Configuration:**
- Python 3.10 supported
- WSGI configuration auto-generated
- Free tier: One web app at username.pythonanywhere.com

**Docs:** https://help.pythonanywhere.com

---

### 4. GitHub Pages

**Best for:** Static sites (HTML/CSS/JS, React builds)

**Pros:**
- Completely free
- Custom domains supported
- Automatic HTTPS
- Deploy from GitHub repo

**Setup:**
```bash
python scripts/simple_deploy.py --path YOUR_APP_PATH --platform github-pages
```

**Manual deployment:**
1. Push code to GitHub
2. Go to repo Settings -> Pages
3. Select "Deploy from branch" -> "main" -> "/" (root)
4. Click "Save"

**Site URL:** `https://YOUR_USERNAME.github.io/YOUR_REPO`

**Configuration:**
- Build output goes in root or `/docs` folder
- Custom domains: Add CNAME file
- Free tier: Unlimited static sites

**Docs:** https://pages.github.com

---

## Configuration

### Set Default Platform

Edit `.env`:
```bash
DEFAULT_DEPLOY_PLATFORM=railway  # or render, pythonanywhere, github-pages
DISABLE_VERCEL_DEPLOY=true
```

### Auto-Generated Files

The deployment script automatically creates:

**Railway (`railway.toml`):**
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"  # or "python app.py"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[env]
NODE_ENV = "production"
```

**Render (`render.yaml`):**
```yaml
services:
  - type: web
    name: my-app
    env: node  # or python, static
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
```

---

## Usage from Code

### Python API

```python
from infrastructure.simple_deploy_wrapper import deploy_app, get_deployment_instructions

# Deploy an app
result = deploy_app("businesses/fully_integrated/saas/my-app")

if result["success"]:
    print(f"✅ Deployed to {result['platform']}")
else:
    print(f"❌ Deployment failed: {result['error']}")

# Get instructions
instructions = get_deployment_instructions(app_type="nodejs")
print(instructions)
```

### Deploy Agent Integration

Genesis deploy agents automatically use the simple deploy wrapper:

```python
from infrastructure.simple_deploy_wrapper import get_deploy_wrapper

wrapper = get_deploy_wrapper()

# Deploy with default platform (Railway)
result = wrapper.deploy_app("path/to/app")

# Deploy with specific platform
result = wrapper.deploy_app("path/to/app", platform="render")
```

---

## Platform Comparison

| Feature | Railway | Render | PythonAnywhere | GitHub Pages |
|---------|---------|--------|----------------|--------------|
| **Free Tier** | $5/month credit | 750 hrs/month | 1 web app | Unlimited |
| **Node.js** | ✅ Yes | ✅ Yes | ❌ No | ⚠️ Build only |
| **Python** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| **Static Sites** | ✅ Yes | ✅ Yes | ⚠️ Limited | ✅ Yes |
| **Database** | PostgreSQL, MySQL, Redis | PostgreSQL | MySQL, PostgreSQL | ❌ No |
| **Auto-Deploy** | Git push | GitHub | API/Manual | GitHub |
| **Custom Domains** | ✅ All plans | ✅ Paid plans | ✅ Paid plans | ✅ Free |
| **SSL** | ✅ Automatic | ✅ Automatic | ✅ Automatic | ✅ Automatic |
| **CLI** | ✅ Excellent | ⚠️ Limited | ⚠️ API only | ⚠️ Git only |
| **Sleep/Inactivity** | ❌ Never | ✅ 15min (free) | ❌ Never | ❌ Never |
| **Best For** | All apps | Full-stack | Python apps | Static sites |

**Recommendation:** Use Railway for most Genesis businesses.

---

## Troubleshooting

### Railway CLI Not Found

```bash
# Install Railway CLI
npm i -g @railway/cli

# Verify installation
railway version
```

### Git Not Initialized

The script automatically initializes git and creates initial commit:
```bash
git init
git add .
git commit -m "Initial commit"
```

### App Type Detection Fails

The script detects app type from:
- `package.json` → Node.js
- `requirements.txt` → Python
- `index.html` → Static

Ensure your app has the appropriate file.

### Deployment Fails

Check logs:
```bash
# Railway
railway logs

# Render
# View logs in dashboard: https://dashboard.render.com

# PythonAnywhere
# View logs in "Web" tab -> Error log
```

---

## Migration from Vercel

If you have existing Vercel deployments:

1. **Export environment variables** from Vercel dashboard
2. **Remove `vercel.json`** from your app
3. **Deploy to Railway:**
   ```bash
   python scripts/simple_deploy.py --path YOUR_APP_PATH
   ```
4. **Set environment variables:**
   ```bash
   railway variables set KEY=value
   ```
5. **Update DNS** to point to new deployment

---

## Examples

### Deploy Next.js App to Railway

```bash
python scripts/simple_deploy.py --path businesses/fully_integrated/saas/invoice-app
# Railway auto-detects Next.js and configures build
```

### Deploy Flask App to PythonAnywhere

```bash
python scripts/deploy_pythonanywhere.py \
  --username myusername \
  --api-token YOUR_API_TOKEN
```

### Deploy React Static Site to GitHub Pages

```bash
cd businesses/fully_integrated/saas/dashboard
npm run build
python scripts/simple_deploy.py --path . --platform github-pages
```

---

## Cost Estimates

### Railway (Recommended)
- Free tier: $5/month credit
- Typical usage: $2-3/month per app
- **Estimate:** Free for 1-2 apps, $5-10/month for 3-5 apps

### Render
- Free tier: 750 hours/month (1 app running 24/7)
- Paid: $7/month per web service
- **Estimate:** Free for 1 app, $7-14/month for 2-3 apps

### PythonAnywhere
- Free tier: 1 web app
- Paid: $5/month (Hacker plan)
- **Estimate:** Free for 1 app, $5/month for multiple apps

### GitHub Pages
- Free tier: Unlimited static sites
- **Estimate:** $0/month (always free)

**Overall:** Genesis deployments cost $0-10/month depending on scale.

---

## Summary

**Vercel is disabled.** Use these platforms instead:

1. **Railway** (default) - Best all-around choice
2. **Render** - Good for full-stack apps with databases
3. **PythonAnywhere** - Perfect for Python apps
4. **GitHub Pages** - Free static site hosting

**Quick deploy:**
```bash
python scripts/simple_deploy.py --path YOUR_APP_PATH
```

**Change default platform in `.env`:**
```bash
DEFAULT_DEPLOY_PLATFORM=railway
```

---

**Updated:** November 12, 2025
**Default Platform:** Railway
**Vercel Status:** Disabled
**Status:** Production Ready
