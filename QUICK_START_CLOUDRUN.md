# Quick Start: Deploy to Google Cloud Run

## Step 1: Install gcloud CLI

**Download:** https://cloud.google.com/sdk/docs/install

Or via Chocolatey:
```powershell
choco install gcloudsdk
```

## Step 2: Login

```powershell
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## Step 3: Create Secrets (Automatic)

```powershell
.\scripts\create_secrets_now.ps1
```

This reads your `.env` and creates:
- OPENAI_API_KEY ✅ (found in .env)
- ANTHROPIC_API_KEY ✅ (found in .env)
- GOOGLE_API_KEY ✅ (using GEMINI_API_KEY from .env)
- A2A_API_KEY ✅ (found in .env)
- MONGODB_URI ✅ (found in .env)
- REDIS_URL ✅ (found in .env)

## Step 4: Deploy

```powershell
.\deploy_cloudrun.ps1
```

## Done! 🎉

Your service will be live at: `https://genesis-a2a-xxxxx.run.app`

