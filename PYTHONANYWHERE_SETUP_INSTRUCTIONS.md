# PythonAnywhere Deployment Instructions

## Credentials
- **Username:** `rainking632`
- **API Token:** `d96e5e35ee2070fd3d41f83ddb856859a7f4ea7d`
- **Database Host:** `rainking632.mysql.pythonanywhere-services.com`
- **Database User:** `rainking632`

## Step 1: Upload Code

### Option A: Git (Recommended)
```bash
# In PythonAnywhere Bash console
cd ~
git clone https://github.com/yourusername/genesis.git Claude-Clean-Code-Genesis
cd Claude-Clean-Code-Genesis
```

### Option B: Files Tab
1. Go to PythonAnywhere Files tab
2. Navigate to `/home/rainking632/`
3. Upload entire repo (zip and extract, or use git)

## Step 2: Install Dependencies

```bash
cd ~/Claude-Clean-Code-Genesis
pip3.10 install --user fastapi uvicorn[standard] python-dotenv
pip3.10 install --user -r requirements_production.txt
```

## Step 3: Configure Backend Web App

1. Go to **Web** tab in PythonAnywhere
2. Click **"Add a new web app"**
3. Choose domain: **`rainking632.pythonanywhere.com`**
4. Select **"Manual configuration"** (not Flask wizard)
5. Python version: **3.10**

## Step 4: Configure Backend WSGI File

1. In Web tab, click **WSGI configuration file** link
2. Replace all content with:

```python
import sys
import os

project_home = '/home/rainking632/Claude-Clean-Code-Genesis'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

os.chdir(project_home)

from dotenv import load_dotenv
load_dotenv(os.path.join(project_home, '.env'))

from a2a_fastapi import app
application = app
```

## Step 5: Set Backend Environment Variables

In Web tab, scroll to **Environment variables** section, add:

```
GENESIS_ENV=production
A2A_HOST=0.0.0.0
PORT=8000
A2A_PORT=8000
PYTHONUNBUFFERED=1
REDIS_URL=redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436
MONGODB_URI=mongodb://localhost:27017/genesis
OPENROUTER_API_KEY=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
SERPER_API_KEY=3861159e44657fc519dfa9a688866937135376c1
JINA_API_KEY=jina_2aa20c05fa84493c9524baa0bd85a8dfyzQ9oh8wiLkzxxvHidUJXg7qBMBp
GOOGLE_AI_STUDIO_KEY=AIzaSyAc5lGnaAGDLlYsG1EOfceobFVK9Ge_FeA
GITHUB_TOKEN=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
A2A_API_KEY=tdbEVGqBpmFShznkmb2rLaQTElZZXzkmnatZabr9ig8
EVENT_BUS_TYPE=redis_stream
STORAGE_BACKEND=redis
OMNIDAEMON_API_ENABLED=true
MEMORI_DATABASE_URL=sqlite:///./data/genesis_memory.db
GENESIS_MEMORY_BACKEND=memori
```

## Step 6: Configure Frontend Web App

1. Go to **Web** tab
2. Click **"Add a new web app"** (or use subdirectory)
3. Domain: **`rainking632-frontend.pythonanywhere.com`** (or subdirectory)
4. **Manual configuration**, Python 3.10

## Step 7: Configure Frontend WSGI File

```python
import sys
import os

project_home = '/home/rainking632/Claude-Clean-Code-Genesis'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

os.chdir(os.path.join(project_home, 'dashboard'))

from dotenv import load_dotenv
load_dotenv(os.path.join(project_home, '.env'))

from app import app as application
```

## Step 8: Configure Frontend Static Files

In Web tab, add static file mapping:
- **URL:** `/static/`
- **Directory:** `/home/rainking632/Claude-Clean-Code-Genesis/dashboard/static`

## Step 9: Set Frontend Environment Variables

```
FLASK_ENV=production
NEXT_PUBLIC_API_URL=https://rainking632.pythonanywhere.com
```

## Step 10: Configure Database (Optional)

If using MySQL:
1. Go to **Databases** tab
2. Create database: `rainking632$genesis`
3. Update `.env`:
   ```
   MONGODB_URI=mysql://rainking632:PASSWORD@rainking632.mysql.pythonanywhere-services.com/rainking632$genesis
   ```

## Step 11: Reload Apps

Click **"Reload"** button for both web apps.

## Step 12: Test

- **Backend:** https://rainking632.pythonanywhere.com/health
- **Frontend:** https://rainking632-frontend.pythonanywhere.com/

## Files Created

- `pythonanywhere_backend.wsgi` - Backend WSGI configuration
- `pythonanywhere_frontend.wsgi` - Frontend WSGI configuration
- `deploy_pythonanywhere_backend.py` - API deployment script

## Troubleshooting

### Import Errors
- Check Python version (must be 3.10)
- Verify all dependencies installed: `pip3.10 list`
- Check sys.path in WSGI file

### 500 Errors
- Check error logs in Web tab
- Verify environment variables are set
- Check file permissions

### Database Connection
- Verify MySQL password in Databases tab
- Check database name format: `username$dbname`

