# Google Cloud Run Secrets - Quick Setup

## What I Found in Your .env

✅ **Found:**
- `A2A_API_KEY`
- `MONGODB_URI`
- `REDIS_URL`

❌ **Missing (need to add):**
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`

## Setup Steps

### 1. Install gcloud CLI (if not installed)

**Option A: Download installer**
- https://cloud.google.com/sdk/docs/install
- Run installer, restart PowerShell

**Option B: Chocolatey**
```powershell
choco install gcloudsdk
```

### 2. Login and set project
```powershell
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 3. Add missing keys to .env

Add these lines to your `.env` file:
```
OPENAI_API_KEY=sk-proj-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
GOOGLE_API_KEY=AIzaSy-your-key-here
```

### 4. Create all secrets automatically

```powershell
.\scripts\setup_gcloud_and_secrets.ps1
```

This will:
- Read your .env file
- Create all secrets in Google Cloud
- Grant Cloud Run access
- Done!

## Manual Creation (if script fails)

```powershell
# Create each secret
echo -n "your-openai-key" | gcloud secrets create OPENAI_API_KEY --data-file=-
echo -n "your-anthropic-key" | gcloud secrets create ANTHROPIC_API_KEY --data-file=-
echo -n "your-google-key" | gcloud secrets create GOOGLE_API_KEY --data-file=-
echo -n "tdbEVGqBpmFShznkmb2rLaQTElZZXzkmnatZabr9ig8" | gcloud secrets create A2A_API_KEY --data-file=-
echo -n "mongodb://localhost:27017/genesis" | gcloud secrets create MONGODB_URI --data-file=-
echo -n "redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436" | gcloud secrets create REDIS_URL --data-file=-
```

## That's It!

Once secrets are created, deploy:
```powershell
.\deploy_cloudrun.ps1
```

