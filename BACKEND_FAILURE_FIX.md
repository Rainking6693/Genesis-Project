# Backend Failure Fix

## Problem

The backend was failing with:
```
ModuleNotFoundError: No module named 'scripts'
File "/app/backend/api.py", line 26
from scripts.analyze_memory_patterns import MemoryAnalytics
```

## Root Cause

1. **Wrong Dockerfile:** Fly.io config was using `Dockerfile.backend` (doesn't exist)
2. **Wrong entry point:** Trying to run `backend.api_minimal:app` instead of `a2a_fastapi.py`
3. **Wrong health check path:** Config had `/api/health` but `a2a_fastapi.py` uses `/health`

## Solution

1. ✅ Updated `fly.backend.toml` to use correct `Dockerfile` (not `Dockerfile.backend`)
2. ✅ Dockerfile already has correct CMD: `python a2a_fastapi.py`
3. ✅ Health check path fixed to `/health` (matches a2a_fastapi.py)
4. ✅ Deploying with corrected configuration

## Files Updated

- `fly.backend.toml` - Fixed Dockerfile path and health check

## Next Steps

1. Wait for deployment to complete
2. Check status: `flyctl status -a genesis-backend`
3. Test: `curl https://genesis-backend.fly.dev/health`

