# Genesis Monitoring Dashboard

Real-time web-based monitoring dashboard for the Genesis multi-agent system.

## Features

### Executive Overview
- Monthly revenue, costs, and profit
- Active businesses count
- Tasks completed (30-day)
- System-wide success rate

### Agent Performance (15 Agents)
- Individual success rates with bar chart visualization
- Average latency per agent
- Cost per task
- Quality scores (0-10)
- Tasks completed (7-day)

### Orchestration Metrics
- **HTDAG:** Task decomposition stats (total, avg depth, avg nodes, circular dependencies)
- **HALO:** Agent routing (decisions, avg time, load balancing, failures)
- **AOP:** Validation results (total, solvability, completeness, redundancy)
- **Circuit Breaker:** Status, trips, failures

### Evolution & Learning
- **SE-Darwin:** Evolution runs, improvements generated, quality improvement, archive size
- **ATLAS:** Online learning updates, knowledge items, learning rate
- **AgentGit:** Commits, versions tracked, rollbacks

### Safety & Governance
- **Policy Violations:** Total, by severity (critical/high/medium)
- **Human Oversight:** Approvals requested/granted/denied, avg response time
- **WaltzRL Safety:** Unsafe detections, feedback loops, safety score

### Cost Optimization (Phase 6)
- Monthly cost comparison (baseline vs. current)
- Cost reduction percentage (88-92%)
- LLM usage distribution (GPT-4o, Gemini Flash, Claude Sonnet)
- Active optimizations status (SGLang Router, Memento CaseBank, vLLM Caching, etc.)

## Quick Start

### Local Development

```bash
# Navigate to dashboard directory
cd dashboard/

# Install dependencies
pip install -r requirements.txt

# Run development server
python app.py

# Access dashboard
# Open browser to http://localhost:5000
```

### PythonAnywhere Deployment

See [DASHBOARD_DEPLOYMENT_GUIDE.md](../DASHBOARD_DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

**Quick steps:**
1. Upload dashboard files to PythonAnywhere
2. Install dependencies: `pip3.10 install --user -r requirements.txt`
3. Configure WSGI file with correct paths
4. Set up static files mapping
5. Reload web app
6. Access at `https://yourusername.pythonanywhere.com`

## API Endpoints

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

### Example API Calls

```bash
# Get all metrics
curl http://localhost:5000/api/metrics

# Get agent performance only
curl http://localhost:5000/api/metrics/agents

# Save metrics snapshot
curl -X POST http://localhost:5000/api/snapshot

# Health check
curl http://localhost:5000/api/health
```

## Configuration

### Auto-Refresh Interval

Edit `static/js/dashboard.js`:

```javascript
const REFRESH_INTERVAL = 30000; // 30 seconds (change as needed)
```

### Metrics Collection

Edit `metrics_collector.py` to customize:
- Log file patterns
- Metrics calculation logic
- Default values
- Time windows (7-day, 30-day, etc.)

### UI Styling

Edit `static/css/dashboard.css` to change:
- Color scheme (see `:root` variables)
- Layout (grid configurations)
- Font sizes
- Spacing

## Data Sources

The dashboard collects metrics from:

1. **Log files** (`logs/*.log`)
   - Pattern matching for events (success, failure, routing, etc.)
   - Timestamp-based filtering (last 7 days, 30 days, etc.)
   - Metric extraction (latency, cost, quality scores)

2. **Metrics files** (`metrics/*.json`)
   - Saved snapshots of historical metrics
   - Trend analysis data

3. **Business directory** (`businesses/`)
   - Count of active autonomous businesses

4. **System state** (in-memory)
   - Circuit breaker status
   - Current optimization flags

## File Structure

```
dashboard/
├── app.py                      # Flask web application
├── metrics_collector.py        # Metrics collection logic
├── requirements.txt            # Python dependencies
├── README.md                   # This file
├── templates/
│   └── index.html             # Dashboard HTML template
├── static/
│   ├── css/
│   │   └── dashboard.css      # Styling
│   └── js/
│       └── dashboard.js       # Frontend logic + Chart.js
├── metrics/                    # Metrics storage (auto-created)
│   ├── metrics_latest.json    # Most recent metrics
│   └── metrics_YYYYMMDD_HHMMSS.json  # Historical snapshots
└── logs/                       # Log files (from Genesis system)
```

## Metrics Collection Details

### Log Pattern Examples

The metrics collector uses regex patterns to extract data from logs:

```python
# Count pattern occurrences
self._count_log_pattern(r"Task completed successfully", days=30)

# Extract numeric averages
self._extract_metric_avg(r"latency=(\d+\.?\d*)ms", days=7, default=150.0)

# Get latest value
self._extract_metric_latest(r"archive_size=(\d+)", default=47)
```

### Timestamp Filtering

Logs are filtered by timestamp (last N days):

```
2025-10-25 14:30:45 - Task completed successfully
^                   ^
|                   |
Timestamp format    Log message
(YYYY-MM-DD HH:MM:SS)
```

### Default Values

When no log data is found, the collector uses sensible defaults based on:
- Phase 6 optimization targets (88-92% cost reduction)
- Expected agent performance (90%+ success rates)
- Typical orchestration metrics

## Charts

The dashboard uses [Chart.js](https://www.chartjs.org/) for visualizations:

1. **Agent Performance Bar Chart**
   - Shows success rate per agent
   - Color-coded by performance level

2. **Cost Comparison Bar Chart**
   - Baseline vs. current monthly costs
   - Visual representation of 88% reduction

3. **LLM Usage Pie Chart**
   - Distribution across GPT-4o, Gemini Flash, Claude Sonnet
   - Shows optimization towards cheaper models

## Auto-Refresh

The dashboard automatically refreshes every 30 seconds:

- Updates all metrics from logs
- Refreshes all charts
- Updates "Last updated" timestamp
- No page reload required (AJAX)

## Snapshot Feature

Save current metrics for historical analysis:

1. Click "📸 Save Snapshot" button
2. Creates timestamped JSON file in `metrics/` directory
3. Also updates `metrics_latest.json`
4. Can be used for trend analysis, reporting, debugging

## Responsive Design

The dashboard is fully responsive and works on:

- Desktop (1400px+): Full grid layout
- Tablet (768px-1024px): Adjusted grid columns
- Mobile (< 768px): Single column layout

## Color Coding

Visual indicators throughout the dashboard:

- 🟢 **Green (Success):** Good performance, closed circuit breaker
- 🟡 **Yellow (Warning):** Medium severity, degraded performance
- 🔴 **Red (Error):** Critical issues, failures, open circuit breaker

## Performance

- Minimal server resources required
- Fast metrics collection (< 1 second for full scan)
- Efficient log parsing (regex-based)
- Client-side rendering (Chart.js)
- Auto-refresh without full page reload

## Browser Compatibility

Tested and working on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Dashboard shows all zeros

**Issue:** No log data found

**Fix:**
1. Check that `logs/` directory exists and contains `.log` files
2. Verify log format matches expected timestamp pattern
3. Create sample logs for testing (see deployment guide)

### Charts not displaying

**Issue:** Chart.js not loading

**Fix:**
1. Check internet connection (Chart.js loads from CDN)
2. Verify `static/js/dashboard.js` exists
3. Check browser console for JavaScript errors

### Metrics not updating

**Issue:** Auto-refresh not working

**Fix:**
1. Check browser console for API errors
2. Verify Flask server is running
3. Test `/api/metrics` endpoint directly

### 500 Error on PythonAnywhere

**Issue:** Server error

**Fix:**
1. Check error logs in PythonAnywhere Web tab
2. Verify all dependencies installed
3. Check WSGI file path configuration
4. Ensure file permissions are correct

## Future Enhancements

Planned features:

- [ ] Historical trend charts (7-day, 30-day)
- [ ] Alerting system (email/SMS on critical issues)
- [ ] Export to PDF/Excel
- [ ] Dark/light theme toggle
- [ ] Custom metric definitions via UI
- [ ] Real-time WebSocket updates
- [ ] Multi-user access with role-based permissions
- [ ] Integration with Prometheus/Grafana
- [ ] Mobile app (React Native)

## Contributing

To add new metrics:

1. Update `metrics_collector.py` with new collection methods
2. Add UI elements to `templates/index.html`
3. Update styling in `static/css/dashboard.css`
4. Add JavaScript update logic in `static/js/dashboard.js`
5. Test locally before deploying

## License

Part of the Genesis multi-agent system project.

## Support

For issues or questions:
1. Check [DASHBOARD_DEPLOYMENT_GUIDE.md](../DASHBOARD_DEPLOYMENT_GUIDE.md)
2. Review error logs
3. Test API endpoints directly
4. Verify log file formats

---

**Dashboard Version:** 1.0.0
**Last Updated:** October 2025
**Compatible with:** Genesis Phase 6 (Production Ready)
