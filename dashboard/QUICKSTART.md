# Genesis Dashboard - Quick Start

## 1-Minute Local Setup

```bash
# Navigate to dashboard directory
cd dashboard/

# Install dependencies
pip install -r requirements.txt

# Run test to create sample data
python test_dashboard.py

# Start dashboard
python app.py

# Open browser
# Go to http://localhost:5000
```

## What You'll See

**Executive Overview:**
- Revenue: $50.00/month
- Costs: $40.00/month (88% reduction from $500 baseline)
- Profit: $10.00/month
- Active Businesses: 5
- Tasks Completed: 350 (30 days)
- Success Rate: 95.8%

**Agent Performance:**
- 15 agents with individual metrics
- Success rates 90-100%
- Latency 150-170ms
- Costs $0.05-0.09 per task
- Quality scores 8-9/10

**Orchestration:**
- HTDAG decompositions running
- HALO routing decisions tracked
- AOP validations passing
- Circuit breaker: CLOSED (healthy)

**Cost Optimization:**
- 88% cost reduction achieved
- LLM usage: 67% Gemini (cheap), 20% Claude, 13% GPT-4o
- All 5 Phase 6 optimizations active

**Evolution:**
- SE-Darwin: 7 evolution runs, 12.5% quality improvements
- ATLAS: Online learning active
- AgentGit: Version control tracking

**Safety:**
- 0 policy violations
- Human approvals granted
- WaltzRL safety score: 94.2

## Auto-Refresh

The dashboard automatically updates every 30 seconds.

## API Access

- **All Metrics:** http://localhost:5000/api/metrics
- **Executive Only:** http://localhost:5000/api/metrics/executive
- **Agents Only:** http://localhost:5000/api/metrics/agents
- **Health Check:** http://localhost:5000/api/health

## Save Snapshot

Click "📸 Save Snapshot" button to save current metrics to:
- `metrics/metrics_YYYYMMDD_HHMMSS.json` (timestamped)
- `metrics/metrics_latest.json` (always latest)

## Deploy to PythonAnywhere

See [DASHBOARD_DEPLOYMENT_GUIDE.md](../DASHBOARD_DEPLOYMENT_GUIDE.md) for full instructions.

**Short version:**
1. Upload dashboard folder to PythonAnywhere
2. Install: `pip3.10 install --user -r requirements.txt`
3. Configure WSGI file with paths
4. Set static files mapping
5. Reload web app
6. Access at `https://yourusername.pythonanywhere.com`

## Troubleshooting

### Dashboard shows zeros
Run `python test_dashboard.py` to create sample data.

### CSS/JS not loading
Check static files mapping and ensure Flask is serving from correct directory.

### API errors
Check that `logs/` and `metrics/` directories exist and are readable.

## Next Steps

1. **Customize metrics:** Edit `metrics_collector.py` to add your own patterns
2. **Change colors:** Edit `static/css/dashboard.css` (see `:root` variables)
3. **Adjust refresh rate:** Edit `static/js/dashboard.js` (REFRESH_INTERVAL constant)
4. **Add authentication:** See deployment guide for basic auth setup

## File Structure

```
dashboard/
├── app.py                      # Flask web app (5 KB)
├── metrics_collector.py        # Metrics logic (19 KB)
├── requirements.txt            # Dependencies (31 bytes)
├── test_dashboard.py           # Test script (10 KB)
├── README.md                   # Full documentation (10 KB)
├── QUICKSTART.md              # This file
├── templates/
│   └── index.html             # Dashboard UI (12 KB)
├── static/
│   ├── css/
│   │   └── dashboard.css      # Styling (9 KB)
│   └── js/
│       └── dashboard.js       # Frontend logic (8 KB)
├── metrics/                    # Auto-created
│   ├── metrics_latest.json
│   └── metrics_*.json
└── logs/                       # Auto-created by test
    ├── system.log
    ├── agents.log
    └── llm.log
```

**Total Size:** ~65 KB (excluding dependencies)

## Performance

- **Metrics Collection:** < 1 second for full scan
- **Dashboard Load:** < 500ms
- **Auto-Refresh:** 30 seconds (configurable)
- **Memory Usage:** ~50 MB
- **CPU Usage:** Minimal (< 1% idle, < 5% during refresh)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies

- Flask 3.0.0
- Werkzeug 3.0.1
- Chart.js 4.4.0 (loaded from CDN)

## Cost

- **Local:** Free (runs on your machine)
- **PythonAnywhere Free:** $0/month (limited)
- **PythonAnywhere Hacker:** $5/month (recommended)
- **VPS (Hetzner):** $5.39/month (best value)

## Features

✅ Real-time metrics (30s refresh)
✅ 6 dashboard sections
✅ 3 Chart.js visualizations
✅ RESTful API (7 endpoints)
✅ Metrics snapshots
✅ Responsive design
✅ Dark theme
✅ Auto-refresh
✅ Health check
✅ Sample data generator
✅ Production-ready
✅ PythonAnywhere compatible

---

**Ready to go!** Start with `python test_dashboard.py`, then `python app.py`.
