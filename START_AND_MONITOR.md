# How to Start & Monitor Genesis

## 🚀 Starting Genesis

### Option 1: Start A2A Service (Recommended)

**Local:**
```powershell
python a2a_fastapi.py
```

**Or use the startup script:**
```powershell
START_GENESIS_MEMORI.bat a2a-service
```

**Service will be at:**
- API: http://localhost:8000
- Health: http://localhost:8000/health
- Docs: http://localhost:8000/docs

---

### Option 2: Cloud Run (If Deployed)

**Check status:**
```powershell
gcloud run services describe genesis-a2a --region us-central1
```

**Get URL:**
```powershell
gcloud run services describe genesis-a2a --region us-central1 --format "value(status.url)"
```

**View logs:**
```powershell
gcloud run services logs read genesis-a2a --region us-central1 --limit 50
```

---

## 📊 Monitoring Genesis

### 1. Health Check

**Local:**
```powershell
curl http://localhost:8000/health
```

**Cloud Run:**
```powershell
curl https://your-service-url.run.app/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "agents_available": 21,
  "uptime_seconds": 123.45
}
```

---

### 2. View Logs

**Local (PowerShell):**
```powershell
# Logs print to console when running
# Or check logs/ directory if logging to file
Get-Content logs\*.log -Tail 50
```

**Cloud Run:**
```powershell
# Real-time logs
gcloud run services logs tail genesis-a2a --region us-central1

# Last 100 lines
gcloud run services logs read genesis-a2a --region us-central1 --limit 100
```

---

### 3. API Endpoints

**List all agents:**
```powershell
curl http://localhost:8000/agents -H "X-API-Key: your-key"
```

**Invoke an agent:**
```powershell
curl -X POST http://localhost:8000/invoke `
  -H "X-API-Key: your-key" `
  -H "Content-Type: application/json" `
  -d '{
    "agent": "builder_agent",
    "task": "Build a React button component"
  }'
```

---

### 4. Dashboard (If Available)

**Start monitoring dashboard:**
```powershell
python scripts/start_monitoring.py
```

**Or:**
```powershell
START_GENESIS_MEMORI.bat dashboard
```

**Access at:** http://localhost:8501 (Streamlit)

---

## 🔍 Quick Status Check

**Is Genesis running?**

```powershell
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Or test health endpoint
curl http://localhost:8000/health
```

**What's Genesis doing?**

```powershell
# View recent logs
Get-Content logs\*.log -Tail 20

# Or if running in console, check the output
```

---

## 🎯 Common Commands

### Start Genesis
```powershell
python a2a_fastapi.py
```

### Check if Running
```powershell
curl http://localhost:8000/health
```

### View Logs
```powershell
# Local
Get-Content logs\*.log -Tail 50

# Cloud Run
gcloud run services logs read genesis-a2a --region us-central1
```

### Stop Genesis
```powershell
# Press Ctrl+C in the terminal running it
# Or find process and kill:
Get-Process python | Where-Object {$_.Path -like "*genesis*"} | Stop-Process
```

---

## 📱 Monitoring Checklist

- [ ] Service is running (health check returns 200)
- [ ] Logs show no errors
- [ ] Agents are available (21 agents listed)
- [ ] API responds to requests
- [ ] No memory/CPU issues

---

## 🆘 Troubleshooting

**Service won't start?**
- Check if port 8000 is free: `netstat -ano | findstr :8000`
- Check .env file has all required keys
- Check logs for errors

**Service running but not responding?**
- Check health endpoint: `curl http://localhost:8000/health`
- Check logs for errors
- Verify API key is correct

**Cloud Run deployment stuck?**
- Check deployment status: `gcloud run services describe genesis-a2a`
- View build logs in Cloud Console
- Check if secrets are created correctly

