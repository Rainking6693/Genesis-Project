# Render Manual Deployment - Step by Step

## Deploy Backend First

### Step 1: Create Backend Service
1. Go to: https://dashboard.render.com
2. Click **"New +"** button (top right)
3. Click **"Web Service"**
4. Connect your GitHub account (if not already)
5. Select repository: **`Rainking6693/Claude-Clean-Code-Genesis`**
6. Click **"Connect"**

### Step 2: Configure Backend
Fill in these settings:

- **Name:** `genesis-backend`
- **Region:** `Oregon (US West)`
- **Branch:** `main`
- **Root Directory:** (leave empty)
- **Runtime:** `Python 3`
- **Build Command:** 
  ```
  pip install --upgrade pip setuptools wheel && pip install -r requirements_production.txt
  ```
- **Start Command:**
  ```
  python a2a_fastapi.py
  ```
- **Plan:** `Free`

### Step 3: Add Backend Environment Variables
Scroll down to **"Environment Variables"** section, click **"Add Environment Variable"** for each:

```
GENESIS_ENV = production
A2A_HOST = 0.0.0.0
PORT = 8000
A2A_PORT = 8000
PYTHONUNBUFFERED = 1
REDIS_URL = redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436
OPENROUTER_API_KEY = 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
SERPER_API_KEY = 3861159e44657fc519dfa9a688866937135376c1
JINA_API_KEY = jina_2aa20c05fa84493c9524baa0bd85a8dfyzQ9oh8wiLkzxxvHidUJXg7qBMBp
GOOGLE_AI_STUDIO_KEY = AIzaSyAc5lGnaAGDLlYsG1EOfceobFVK9Ge_FeA
GITHUB_TOKEN = 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
A2A_API_KEY = tdbEVGqBpmFShznkmb2rLaQTElZZXzkmnatZabr9ig8
EVENT_BUS_TYPE = redis_stream
STORAGE_BACKEND = redis
OMNIDAEMON_API_ENABLED = true
MEMORI_DATABASE_URL = sqlite:///./data/genesis_memory.db
GENESIS_MEMORY_BACKEND = memori
```

### Step 4: Create Backend
Click **"Create Web Service"** at the bottom

---

## Deploy Frontend Second

### Step 5: Create Frontend Service
1. Click **"New +"** again
2. Click **"Web Service"**
3. Select same repository: **`Rainking6693/Claude-Clean-Code-Genesis`**

### Step 6: Configure Frontend
Fill in these settings:

- **Name:** `genesis-frontend`
- **Region:** `Oregon (US West)`
- **Branch:** `main`
- **Root Directory:** `dashboard`
- **Runtime:** `Python 3`
- **Build Command:**
  ```
  pip install --upgrade pip && pip install -r requirements.txt
  ```
- **Start Command:**
  ```
  python app.py
  ```
- **Plan:** `Free`

### Step 7: Add Frontend Environment Variables
Add these:

```
FLASK_ENV = production
FLASK_DEBUG = 0
NEXT_PUBLIC_API_URL = https://genesis-backend.onrender.com
```

**Note:** Update `NEXT_PUBLIC_API_URL` after backend deploys to get the actual URL.

### Step 8: Create Frontend
Click **"Create Web Service"**

---

## Wait for Deployment

- First deployment: **5-10 minutes**
- Watch progress in **Logs** tab for each service
- Services will build and start automatically

---

## Access Your Apps

After deployment completes:

- **Backend API:** https://genesis-backend.onrender.com
- **Backend Health:** https://genesis-backend.onrender.com/health
- **Backend Docs:** https://genesis-backend.onrender.com/docs
- **Frontend Dashboard:** https://genesis-frontend.onrender.com

---

## That's It!

No blueprint needed - just create 2 web services manually. Simple!

