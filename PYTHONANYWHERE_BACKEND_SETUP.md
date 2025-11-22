# PythonAnywhere Backend Setup - Quick Guide

## ✅ Deployment Status

The backend web app has been configured via API. Now you need to:

## Step 1: Upload Code

**Option A: Git (Recommended)**
```bash
# In PythonAnywhere Bash console
cd ~
git clone https://github.com/yourusername/genesis.git Claude-Clean-Code-Genesis
cd Claude-Clean-Code-Genesis
```

**Option B: Files Tab**
1. Go to PythonAnywhere **Files** tab
2. Navigate to `/home/rainking632/`
3. Upload entire repo (or use git)

## Step 2: Install Dependencies

```bash
cd ~/Claude-Clean-Code-Genesis
pip3.10 install --user fastapi uvicorn[standard] python-dotenv
pip3.10 install --user -r requirements_production.txt
```

## Step 3: Set Environment Variables

In **Web** tab → Your web app → **Environment variables**, add:

```
GENESIS_ENV=production
A2A_HOST=0.0.0.0
PORT=8000
A2A_PORT=8000
PYTHONUNBUFFERED=1
REDIS_URL=redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436
OPENROUTER_API_KEY=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
SERPER_API_KEY=3861159e44657fc519dfa9a688866937135376c1
JINA_API_KEY=jina_2aa20c05fa84493c9524baa0bd85a8dfyzQ9oh8wiLkzxxvHidUJXg7qBMBp
GOOGLE_AI_STUDIO_KEY=AIzaSyAc5lGnaAGDLlYsG1EOfceobFVK9Ge_FeA
GITHUB_TOKEN=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
A2A_API_KEY=tdbEVGqBpmFShznkmb2rLaQTElZZXzkmnatZabr9ig8
```

## Step 4: Configure Database (Optional)

If using MySQL:
1. Go to **Databases** tab
2. Create database: `rainking632$genesis`
3. Add to environment variables:
   ```
   MONGODB_URI=mysql://rainking632:PASSWORD@rainking632.mysql.pythonanywhere-services.com/rainking632$genesis
   ```

## Step 5: Reload Web App

Click **"Reload"** button in Web tab.

## Step 6: Test

```bash
curl https://rainking632.pythonanywhere.com/health
```

Should return:
```json
{"status":"healthy","version":"2.0.0","uptime_seconds":...}
```

## WSGI File Location

The WSGI file is automatically configured at:
`/var/www/rainking632_pythonanywhere_com_wsgi.py`

It points to:
- Source code: `/home/rainking632/Claude-Clean-Code-Genesis`
- Entry point: `a2a_fastapi.py`

## Troubleshooting

### Import Errors
- Check Python version is 3.10
- Verify dependencies: `pip3.10 list | grep fastapi`
- Check sys.path in WSGI file

### 500 Errors
- Check error logs in Web tab
- Verify environment variables
- Check file permissions

### Module Not Found
- Ensure all dependencies installed with `--user` flag
- Check PythonAnywhere uses Python 3.10

