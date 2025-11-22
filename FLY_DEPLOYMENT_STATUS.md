# Fly.io Deployment Status

## Current Status

### Backend (genesis-backend.fly.dev)
- **Last Successful Deployment:** Nov 14, 2025 at 22:30 (v2)
- **Current Status:** Deploying (background process running)
- **Region:** ord (Chicago)
- **Secrets Configured:**
  - ✅ `LANGWATCH_API_KEY`

### Frontend (genesis-frontend.fly.dev)
- **Last Successful Deployment:** Nov 15, 2025 at 00:41 (v4)
- **Current Status:** Deploying (background process running)
- **Region:** ord (Chicago)
- **Secrets Configured:**
  - ✅ `NEXT_PUBLIC_API_URL`

## Required Secrets

### Backend Secrets Needed

Based on `a2a_fastapi.py` and deployment requirements:

**Critical:**
- `A2A_API_KEY` or `GENESIS_API_KEY` - API authentication key
- `OPENAI_API_KEY` - OpenAI GPT-4o access
- `ANTHROPIC_API_KEY` - Anthropic Claude access
- `GOOGLE_API_KEY` - Google Gemini access

**Optional but Recommended:**
- `MONGODB_URI` - Database connection (if using MongoDB)
- `REDIS_URL` - Redis cache connection (if using Redis)
- `CORS_ALLOWED_ORIGINS` - CORS origins (defaults to localhost)
- `GENESIS_ENV` - Set to "production"

### Frontend Secrets Needed

**Required:**
- `NEXT_PUBLIC_API_URL` - ✅ Already set (points to backend API)

**Optional:**
- `FLASK_ENV` - Set to "production"

## Deployment Commands

### Check Deployment Status
```powershell
flyctl status -a genesis-backend
flyctl status -a genesis-frontend
```

### View Logs
```powershell
flyctl logs -a genesis-backend
flyctl logs -a genesis-frontend
```

### Set Secrets (Backend)
```powershell
flyctl secrets set -a genesis-backend A2A_API_KEY=your-key-here
flyctl secrets set -a genesis-backend OPENAI_API_KEY=sk-...
flyctl secrets set -a genesis-backend ANTHROPIC_API_KEY=sk-ant-...
flyctl secrets set -a genesis-backend GOOGLE_API_KEY=...
```

### Set Secrets (Frontend)
```powershell
flyctl secrets set -a genesis-frontend FLASK_ENV=production
```

### Deploy
```powershell
# Backend
flyctl deploy -a genesis-backend --config fly.backend.toml

# Frontend
flyctl deploy -a genesis-frontend --config fly.frontend.toml
```

## Configuration Files

- `fly.backend.toml` - Backend configuration (A2A FastAPI service)
- `fly.frontend.toml` - Frontend configuration (Dashboard Flask app)
- `Dockerfile` - Backend Docker image
- `Dockerfile.frontend` - Frontend Docker image

## Next Steps

1. ✅ Deployments are running in background
2. ⏳ Wait for deployments to complete
3. ⚠️ Verify all required secrets are set
4. ✅ Test endpoints:
   - https://genesis-backend.fly.dev/health
   - https://genesis-frontend.fly.dev/

## Time Since Last Deployment

- **Backend:** ~6 days ago (Nov 14, 2025)
- **Frontend:** ~5 days ago (Nov 15, 2025)
- **Current Deployments:** Running now (started ~2 minutes ago)

