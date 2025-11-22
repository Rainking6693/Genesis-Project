# Claude Clean Code - Production Ready

This folder contains all the fixed, audited, and production-ready code.

## What's Running (Weekend Training)

1. **Autonomous Scheduler** (Bash ID: 4a856d)
   - Generates businesses every 5-10 minutes
   - Log: `autonomous_scheduler_weekend.log`
   - Heartbeat: `/tmp/genesis_scheduler_heartbeat.json`

2. **A2A Service** (Port 8000)
   - 15 Genesis agents available via API
   - Health: http://localhost:8000/health
   - Log: `a2a_service_weekend.log`

## Key Files

- `scripts/autonomous_scheduler.py` - Fixed scheduler (Shane + Hudson audited)
- `a2a_fastapi.py` - A2A service (Jackson + Cora audited)
- `infrastructure/` - All core systems (65 integrations)
- Deployment configs: `railway.toml`, `render.yaml`, `fly.toml`

## Monitoring

Check logs:
```bash
tail -f autonomous_scheduler_weekend.log
tail -f a2a_service_weekend.log
cat /tmp/genesis_scheduler_heartbeat.json
```

Check health:
```bash
curl http://localhost:8000/health
```

## Audit Scores

- Autonomous Scheduler: 9.15/10 (Hudson)
- A2A Service: 7.2/10 (Hudson) - Production ready
- Deployment Package: 10.0/10 (Cora)
## 🚀 One-Click GitHub Codespace

1. Click **Code ▸ Codespaces ▸ Create codespace on main**.
2. When the online VS Code window appears, run:
   ```bash
   ./scripts/codespace_bootstrap.sh
   ```
   That command copies `.env.example` into `.env`/`.env.production` (if they don’t exist) and launches Docker with the database, cache, OCR, and monitoring profiles enabled.

The public endpoints are automatically forwarded, so the main API lives at `https://$CODESPACE_NAME-8000.app.github.dev` and the monitoring stack (Grafana/Prometheus) shows up on port 3000. Update `.env.production` inside the Codespace whenever you’re ready to plug in real credentials.
