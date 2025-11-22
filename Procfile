# Procfile for Heroku/Railway/Render deployment
# Defines process types for the Genesis platform

# ============================================================================
# GENESIS AUTONOMOUS SCHEDULER (PRIMARY)
# ============================================================================
# Worker process: Autonomous business generation scheduler
# Runs continuously, generating businesses every 5-10 minutes
worker: python scripts/autonomous_scheduler.py --min-interval 5 --max-interval 10

# ============================================================================
# OPTIONAL: HEALTH CHECK WEB SERVICE
# ============================================================================
# Provides HTTP endpoints for monitoring the scheduler worker
# Uncomment if your deployment platform requires HTTP health checks
# web: python scripts/health_check_server.py

# ============================================================================
# LEGACY: A2A SERVICE
# ============================================================================
# A2A Service - Web server process (if still needed)
# web: uvicorn a2a_fastapi:app --host 0.0.0.0 --port ${PORT:-8000} --workers 4 --log-level info

# Alternative: Use Gunicorn with Uvicorn workers for better production stability
# web: gunicorn a2a_fastapi:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8000} --access-logfile - --error-logfile -

# ============================================================================
# DEPLOYMENT INSTRUCTIONS
# ============================================================================
# For Heroku: Scale worker process with: heroku ps:scale worker=1
# For Railway: Worker process starts automatically
# For Render: Use render.yaml configuration (worker type)
