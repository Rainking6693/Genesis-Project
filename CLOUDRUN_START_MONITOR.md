# Cloud Run: Start & Monitor Genesis (Cloud-Only)

## 🚀 Starting Genesis on Cloud Run

### Deploy (Starts Automatically)

```powershell
.\deploy_cloudrun.ps1
```

**Or manually:**
```powershell
gcloud run deploy genesis-a2a `
  --source . `
  --region us-central1 `
  --allow-unauthenticated `
  --port 8000
```

**Once deployed, Genesis starts automatically and stays running.**

---

## 📊 Monitoring in Cloud Console

### 1. View Service Status

**Web Console:**
- Go to: https://console.cloud.google.com/run
- Click on `genesis-a2a` service
- See: Status, URL, logs, metrics

**CLI:**
```powershell
# Get service info
gcloud run services describe genesis-a2a --region us-central1

# Get service URL
gcloud run services describe genesis-a2a --region us-central1 --format "value(status.url)"
```

---

### 2. View Logs (Real-Time)

**CLI (Real-Time):**
```powershell
# Watch logs live
gcloud run services logs tail genesis-a2a --region us-central1

# Last 100 lines
gcloud run services logs read genesis-a2a --region us-central1 --limit 100

# Filter for errors
gcloud run services logs read genesis-a2a --region us-central1 --limit 100 | Select-String "ERROR"
```

**Web Console:**
- Go to: https://console.cloud.google.com/run
- Click `genesis-a2a` → "Logs" tab
- See real-time logs

---

### 3. Check Health

**Get your service URL first:**
```powershell
$url = gcloud run services describe genesis-a2a --region us-central1 --format "value(status.url)"
Write-Host "Service URL: $url"
```

**Test health:**
```powershell
curl "$url/health"
```

**Expected:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "agents_available": 21,
  "uptime_seconds": 123.45
}
```

---

### 4. View Metrics (CPU, Memory, Requests)

**Web Console:**
- Go to: https://console.cloud.google.com/run
- Click `genesis-a2a` → "Metrics" tab
- See: Requests, Latency, CPU, Memory, Errors

**CLI:**
```powershell
# Get service metrics
gcloud run services describe genesis-a2a --region us-central1 --format yaml
```

---

### 5. Monitor API Usage

**Test API endpoint:**
```powershell
$url = gcloud run services describe genesis-a2a --region us-central1 --format "value(status.url)"

# List agents
curl "$url/agents" -H "X-API-Key: your-key"

# Health check
curl "$url/health"
```

---

## 🎯 Quick Commands Reference

### Get Service Info
```powershell
gcloud run services describe genesis-a2a --region us-central1
```

### Get Service URL
```powershell
gcloud run services describe genesis-a2a --region us-central1 --format "value(status.url)"
```

### View Logs (Live)
```powershell
gcloud run services logs tail genesis-a2a --region us-central1
```

### View Recent Logs
```powershell
gcloud run services logs read genesis-a2a --region us-central1 --limit 50
```

### List All Services
```powershell
gcloud run services list
```

### Check Service Status
```powershell
gcloud run services describe genesis-a2a --region us-central1 --format "value(status.conditions[0].status)"
```

---

## 🔍 Monitoring Dashboard

**Cloud Console Dashboard:**
1. Go to: https://console.cloud.google.com/run
2. Click your service
3. See tabs:
   - **Overview**: Status, URL, revisions
   - **Logs**: Real-time logs
   - **Metrics**: CPU, memory, requests, latency
   - **Revisions**: Deployment history

---

## 🚨 Alerts & Monitoring

### Set Up Alerts (Optional)

**In Cloud Console:**
1. Go to: https://console.cloud.google.com/monitoring/alerting
2. Create alert policy
3. Monitor:
   - High error rate
   - High latency
   - Service down

---

## 📱 Status Check Script

**Quick status check:**
```powershell
# Check if service is running
$status = gcloud run services describe genesis-a2a --region us-central1 --format "value(status.conditions[0].status)"
if ($status -eq "True") {
    $url = gcloud run services describe genesis-a2a --region us-central1 --format "value(status.url)"
    Write-Host "✅ Genesis is running at: $url" -ForegroundColor Green
    
    # Test health
    $health = curl "$url/health" 2>&1
    Write-Host "Health check: $health"
} else {
    Write-Host "❌ Service not running" -ForegroundColor Red
}
```

---

## 🎯 Summary

**Start Genesis:**
```powershell
.\deploy_cloudrun.ps1
```
(Starts automatically after deployment)

**Monitor:**
- **Web**: https://console.cloud.google.com/run
- **Logs**: `gcloud run services logs tail genesis-a2a --region us-central1`
- **Health**: `curl https://your-url.run.app/health`

**That's it!** Everything runs in the cloud, no local setup needed.

