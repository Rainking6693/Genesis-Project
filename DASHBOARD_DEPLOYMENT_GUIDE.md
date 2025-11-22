# Genesis Monitoring Dashboard - PythonAnywhere Deployment Guide

## Overview

This guide walks you through deploying the Genesis Monitoring Dashboard to PythonAnywhere. The dashboard provides real-time monitoring of your Genesis multi-agent system with metrics for revenue, costs, agent performance, orchestration, evolution, safety, and cost optimization.

## Prerequisites

- PythonAnywhere account (Free tier or $5/month tier)
- Genesis system with logs and metrics
- Basic command line knowledge

## Files Created

```
dashboard/
├── app.py                      # Flask web application
├── metrics_collector.py        # Metrics collection logic
├── templates/
│   └── index.html             # Dashboard UI
├── static/
│   ├── css/
│   │   └── dashboard.css      # Styling
│   └── js/
│       └── dashboard.js       # Frontend logic + Chart.js
├── metrics/                    # Metrics storage (auto-created)
└── requirements.txt            # Python dependencies
```

## Step-by-Step Deployment

### Step 1: Create `requirements.txt`

Create a file at `dashboard/requirements.txt` with:

```txt
Flask==3.0.0
Werkzeug==3.0.1
```

### Step 2: Upload Files to PythonAnywhere

1. **Sign up/Login to PythonAnywhere:**
   - Go to https://www.pythonanywhere.com
   - Create an account or login

2. **Upload via Files tab:**
   - Click "Files" in the navigation
   - Create directory: `/home/yourusername/genesis/dashboard`
   - Upload all dashboard files:
     - `app.py`
     - `metrics_collector.py`
     - `requirements.txt`
     - `templates/index.html`
     - `static/css/dashboard.css`
     - `static/js/dashboard.js`

3. **Alternative: Upload via Git (Recommended):**
   ```bash
   # On PythonAnywhere Bash console
   cd ~
   git clone https://github.com/yourusername/genesis.git
   cd genesis/Claude\ Clean\ Code/dashboard
   ```

### Step 3: Install Dependencies

1. Open a **Bash console** from PythonAnywhere dashboard
2. Navigate to your dashboard directory:
   ```bash
   cd ~/genesis/Claude\ Clean\ Code/dashboard
   ```
3. Install dependencies:
   ```bash
   pip3.10 install --user -r requirements.txt
   ```

### Step 4: Configure Web App

1. Go to **Web** tab in PythonAnywhere
2. Click **Add a new web app**
3. Choose **Manual configuration** (not Flask wizard)
4. Select **Python 3.10**

### Step 5: Configure WSGI File

1. In the Web tab, click on the WSGI configuration file link
2. Delete all content and replace with:

```python
# WSGI configuration for Genesis Dashboard
import sys
import os

# Add dashboard directory to path
path = '/home/yourusername/genesis/Claude Clean Code/dashboard'
if path not in sys.path:
    sys.path.insert(0, path)

# Set working directory
os.chdir(path)

# Import Flask app
from app import app as application
```

**Important:** Replace `yourusername` with your actual PythonAnywhere username!

### Step 6: Configure Static Files

1. In the Web tab, scroll to **Static files** section
2. Add a new static file mapping:
   - URL: `/static/`
   - Directory: `/home/yourusername/genesis/Claude Clean Code/dashboard/static`

### Step 7: Set Working Directory

1. In the Web tab, scroll to **Code** section
2. Set **Working directory** to:
   ```
   /home/yourusername/genesis/Claude Clean Code/dashboard
   ```

### Step 8: Configure Logs and Metrics Paths

Edit `metrics_collector.py` to use correct paths:

```python
# In __init__ method, update paths if needed
def __init__(self, base_path: str = None):
    if base_path is None:
        # PythonAnywhere: Use absolute path
        base_path = Path("/home/yourusername/genesis/Claude Clean Code")
    self.base_path = Path(base_path)
    # ... rest of code
```

### Step 9: Reload Web App

1. In the Web tab, click the big green **Reload** button
2. Wait for reload to complete

### Step 10: Access Your Dashboard

Your dashboard is now live at:
```
https://yourusername.pythonanywhere.com
```

## Testing

### Test Metrics Collection

Open a Bash console and run:

```bash
cd ~/genesis/Claude\ Clean\ Code/dashboard
python3.10 metrics_collector.py
```

You should see JSON output with collected metrics.

### Test API Endpoints

Visit these URLs in your browser:

- `https://yourusername.pythonanywhere.com/` - Main dashboard
- `https://yourusername.pythonanywhere.com/api/health` - Health check
- `https://yourusername.pythonanywhere.com/api/metrics` - All metrics JSON

### Test Auto-Refresh

The dashboard should auto-refresh every 30 seconds. Watch the "Last updated" timestamp in the header.

## Troubleshooting

### Error: "No module named 'app'"

**Fix:** Check your WSGI file path matches your actual directory structure.

### Error: "Template not found"

**Fix:** Ensure `templates/` directory is in the same folder as `app.py`.

### Dashboard shows zeros

**Fix:** Check that logs and metrics directories exist and contain data:

```bash
cd ~/genesis/Claude\ Clean\ Code
ls -la logs/
ls -la metrics/
```

If empty, create sample log entries:

```bash
mkdir -p logs metrics
echo "2025-10-25 14:30:45 - Task completed successfully" >> logs/system.log
echo "2025-10-25 14:31:00 - Builder agent success latency=150ms" >> logs/agents.log
```

### Static files not loading (CSS/JS missing)

**Fix:**
1. Verify static files mapping in Web tab
2. Check file permissions:
   ```bash
   chmod -R 755 ~/genesis/Claude\ Clean\ Code/dashboard/static
   ```

### 500 Internal Server Error

**Fix:** Check error logs:
1. Go to Web tab
2. Click on error log link
3. Read the error message
4. Common issues:
   - Missing dependencies (run `pip3.10 install --user -r requirements.txt`)
   - Path issues (check WSGI file)
   - Permissions (run `chmod -R 755 ~/genesis`)

## Customization

### Change Auto-Refresh Interval

Edit `dashboard/static/js/dashboard.js`:

```javascript
// Line 4 - Change from 30000 (30 sec) to desired milliseconds
const REFRESH_INTERVAL = 60000; // 60 seconds
```

### Customize Metrics Collection

Edit `dashboard/metrics_collector.py` to add custom metrics:

```python
def _collect_custom_metrics(self) -> Dict[str, Any]:
    """Add your custom metrics here."""
    return {
        "custom_metric": self._count_log_pattern(r"your_pattern", days=7)
    }
```

### Customize UI Colors

Edit `dashboard/static/css/dashboard.css`:

```css
:root {
    --primary-color: #2563eb;  /* Change primary color */
    --success-color: #10b981;  /* Change success color */
    /* ... etc ... */
}
```

## Production Optimizations

### 1. Enable HTTPS (Free tier already includes this)

Your PythonAnywhere subdomain automatically has HTTPS.

### 2. Set Up Scheduled Metrics Snapshots

1. Go to **Tasks** tab in PythonAnywhere
2. Add a daily scheduled task:
   ```bash
   cd ~/genesis/Claude\ Clean\ Code/dashboard && python3.10 -c "from metrics_collector import MetricsCollector; MetricsCollector().save_metrics_snapshot()"
   ```
3. Set to run daily at midnight

### 3. Log Rotation (Prevent disk space issues)

Create a cleanup script `dashboard/cleanup_old_logs.py`:

```python
import os
from pathlib import Path
from datetime import datetime, timedelta

def cleanup_old_files(directory, days=30):
    cutoff = datetime.now() - timedelta(days=days)
    for file in Path(directory).glob("*.log"):
        if datetime.fromtimestamp(file.stat().st_mtime) < cutoff:
            file.unlink()
            print(f"Deleted: {file}")

if __name__ == "__main__":
    cleanup_old_files("../logs")
    cleanup_old_files("../metrics")
```

Schedule weekly via Tasks tab:
```bash
cd ~/genesis/Claude\ Clean\ Code/dashboard && python3.10 cleanup_old_logs.py
```

### 4. Add Basic Authentication (Optional)

For added security, add this to `app.py`:

```python
from functools import wraps
from flask import request, Response

def check_auth(username, password):
    """Check if username/password is valid."""
    return username == 'admin' and password == 'your_secure_password'

def authenticate():
    """Send 401 response."""
    return Response(
        'Authentication required', 401,
        {'WWW-Authenticate': 'Basic realm="Genesis Dashboard"'}
    )

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated

# Add @requires_auth to routes
@app.route('/')
@requires_auth
def index():
    return render_template('index.html')
```

## Monitoring & Maintenance

### Check Dashboard Uptime

PythonAnywhere has built-in uptime monitoring. Check:
- Web tab > "Web app is running" indicator
- Error logs for issues

### Monitor Resource Usage

Free tier limits:
- CPU: 100 seconds/day
- Disk: 512 MB
- Traffic: Reasonable limits

Upgrade to $5/month for:
- Always-on apps
- More CPU time
- 1 GB disk space
- Custom domains

### Update Dashboard Code

To deploy updates:

1. **Via Git:**
   ```bash
   cd ~/genesis/Claude\ Clean\ Code
   git pull origin main
   ```

2. **Via Files tab:**
   - Upload modified files
   - Overwrite existing

3. **Reload:**
   - Go to Web tab
   - Click Reload button

## API Documentation

### Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Dashboard UI |
| `/api/metrics` | GET | All metrics JSON |
| `/api/metrics/executive` | GET | Executive overview only |
| `/api/metrics/agents` | GET | Agent performance only |
| `/api/metrics/orchestration` | GET | Orchestration metrics only |
| `/api/metrics/evolution` | GET | Evolution/learning metrics only |
| `/api/metrics/safety` | GET | Safety/governance metrics only |
| `/api/metrics/costs` | GET | Cost optimization metrics only |
| `/api/snapshot` | POST | Save metrics snapshot |
| `/api/health` | GET | Health check |

### Example API Usage

```bash
# Get all metrics
curl https://yourusername.pythonanywhere.com/api/metrics

# Save snapshot
curl -X POST https://yourusername.pythonanywhere.com/api/snapshot

# Health check
curl https://yourusername.pythonanywhere.com/api/health
```

## Support & Resources

- **PythonAnywhere Help:** https://help.pythonanywhere.com
- **Flask Documentation:** https://flask.palletsprojects.com
- **Chart.js Documentation:** https://www.chartjs.org/docs

## Success Checklist

- [ ] All files uploaded to PythonAnywhere
- [ ] Dependencies installed (`Flask`, `Werkzeug`)
- [ ] WSGI file configured with correct paths
- [ ] Static files mapping configured
- [ ] Working directory set
- [ ] Web app reloaded
- [ ] Dashboard accessible at `yourusername.pythonanywhere.com`
- [ ] Health check returns `{"status": "healthy"}`
- [ ] Metrics endpoint returns valid JSON
- [ ] Charts display correctly
- [ ] Auto-refresh working (30 second updates)
- [ ] Snapshot save working

## Next Steps

Once deployed:

1. **Monitor regularly:** Check dashboard daily for system health
2. **Set up alerts:** Configure Prometheus/Grafana for advanced alerting (separate setup)
3. **Analyze trends:** Review 7-day and 30-day metrics for patterns
4. **Optimize costs:** Use cost breakdown to identify optimization opportunities
5. **Scale up:** When traffic grows, upgrade to $5/month tier or move to VPS

## Estimated Costs

- **Free Tier:** $0/month (sufficient for testing/personal use)
- **Hacker Tier:** $5/month (recommended for production, always-on)
- **Web Developer Tier:** $12/month (custom domain support)

For high-traffic production use (1000+ businesses), consider:
- DigitalOcean: $6/month (1 GB RAM, 25 GB SSD)
- Hetzner: $5.39/month (2 GB RAM, 40 GB SSD) - Best value
- AWS/Azure: Variable pricing with auto-scaling

---

**Deployment Complete!** Your Genesis Monitoring Dashboard is now live and collecting real-time metrics.

For questions or issues, check the error logs in PythonAnywhere's Web tab.
