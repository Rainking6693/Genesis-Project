#!/usr/bin/env python3
"""
Web-Based Agent Activity Dashboard

Serves a simple HTML dashboard showing real-time agent activity.
No dependencies needed - uses Python standard library only.

Usage:
    python scripts/serve_monitor_dashboard.py
    
    Then open: http://localhost:8888
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

sys.path.insert(0, str(Path(__file__).parent.parent))

HOPX_LOG_DIR = Path("logs/hopx_environments")
HOPX_STATE_PATH = HOPX_LOG_DIR / "active_environments.json"
HOPX_EVENTS_PATH = HOPX_LOG_DIR / "events.jsonl"


def _load_json_file(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text())
    except Exception:
        return default


def _load_hopx_events(limit: int):
    if not HOPX_EVENTS_PATH.exists():
        return []
    try:
        with HOPX_EVENTS_PATH.open("r", encoding="utf-8") as handle:
            lines = handle.readlines()[-limit:]
        events = []
        for line in lines:
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        return events
    except Exception:
        return []


class DashboardHandler(BaseHTTPRequestHandler):
    """HTTP handler for dashboard."""
    
    def do_GET(self):
        """Handle GET requests."""
        if self.path == "/":
            self.serve_dashboard_html()
        elif self.path == "/api/stats":
            self.serve_stats_json()
        elif self.path == "/api/events":
            self.serve_events()
        elif self.path == "/api/hopx/active":
            self.serve_hopx_active()
        elif self.path == "/api/hopx/metrics":
            self.serve_hopx_metrics()
        else:
            self.send_error(404)
    
    def serve_dashboard_html(self):
        """Serve the dashboard HTML page."""
        html = """
<!DOCTYPE html>
<html>
<head>
    <title>Genesis Agent Monitor</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #0f172a;
            color: #e2e8f0;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 { color: #60a5fa; margin-bottom: 5px; }
        .subtitle { color: #94a3b8; margin-bottom: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px; }
        .stat-label { color: #94a3b8; font-size: 14px; margin-bottom: 5px; }
        .stat-value { font-size: 32px; font-weight: bold; color: #60a5fa; }
        .section { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .section h2 { margin-top: 0; color: #60a5fa; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; }
        th { color: #94a3b8; font-weight: 600; font-size: 14px; }
        td { color: #e2e8f0; }
        .status-success { color: #22c55e; }
        .status-failed { color: #ef4444; }
        .status-progress { color: #eab308; }
        .progress-bar { background: #334155; height: 20px; border-radius: 4px; overflow: hidden; }
        .progress-fill { background: #60a5fa; height: 100%; transition: width 0.3s; }
        .refresh { color: #94a3b8; font-size: 12px; margin-top: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 Genesis Agent Monitor</h1>
        <div class="subtitle">Real-time business generation tracking</div>
        
        <div class="stats-grid" id="statsGrid"></div>
        
        <div class="section">
            <h2>⏳ Active Generation</h2>
            <div id="activeBusinesses"></div>
        </div>
        
        <div class="section">
            <h2>✅ Recent Completions</h2>
            <table id="recentTable">
                <thead>
                    <tr>
                        <th>Business</th>
                        <th>Type</th>
                        <th>Duration</th>
                        <th>Components</th>
                        <th>Cost</th>
                        <th>Success Rate</th>
                    </tr>
                </thead>
                <tbody id="recentBody"></tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>🔧 Component Statistics</h2>
            <table id="componentTable">
                <thead>
                    <tr>
                        <th>Component</th>
                        <th>Attempted</th>
                        <th>Succeeded</th>
                        <th>Failed</th>
                        <th>Success Rate</th>
                    </tr>
                </thead>
                <tbody id="componentBody"></tbody>
            </table>
        </div>
        
        <div class="refresh">Auto-refreshing every 5 seconds...</div>
    </div>
    
    <script>
        function updateDashboard() {
            fetch('/api/stats')
                .then(r => r.json())
                .then(data => {
                    updateStats(data.global_stats);
                    updateActive(data.active_businesses);
                    updateRecent(data.recent_completions);
                    updateComponents(data.component_stats);
                })
                .catch(e => console.error('Error:', e));
        }
        
        function updateStats(stats) {
            const grid = document.getElementById('statsGrid');
            grid.innerHTML = `
                <div class="stat-card">
                    <div class="stat-label">Total Businesses</div>
                    <div class="stat-value">${stats.total_businesses || 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Completed</div>
                    <div class="stat-value status-success">${stats.completed || 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">In Progress</div>
                    <div class="stat-value status-progress">${stats.in_progress || 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total Cost</div>
                    <div class="stat-value">$${(stats.total_cost_usd || 0).toFixed(4)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Components</div>
                    <div class="stat-value">${stats.total_components || 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Lines of Code</div>
                    <div class="stat-value">${(stats.total_lines_of_code || 0).toLocaleString()}</div>
                </div>
            `;
        }
        
        function updateActive(active) {
            const div = document.getElementById('activeBusinesses');
            if (!active || active.length === 0) {
                div.innerHTML = '<p style="color: #64748b;">No active generation</p>';
                return;
            }
            
            div.innerHTML = active.map(biz => `
                <div style="margin-bottom: 15px; padding: 15px; background: #0f172a; border-radius: 6px;">
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">
                        ${biz.name} <span style="color: #64748b;">(${biz.type})</span>
                    </div>
                    <div style="display: flex; gap: 20px; font-size: 14px; color: #94a3b8;">
                        <span>Progress: ${biz.progress}</span>
                        <span>Duration: ${biz.duration}</span>
                        <span class="status-progress">● ${biz.status}</span>
                    </div>
                </div>
            `).join('');
        }
        
        function updateRecent(recent) {
            const tbody = document.getElementById('recentBody');
            if (!recent || recent.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">No completed businesses yet</td></tr>';
                return;
            }
            
            tbody.innerHTML = recent.map(biz => `
                <tr>
                    <td>${biz.name}</td>
                    <td>${biz.type}</td>
                    <td>${biz.duration}</td>
                    <td>${biz.components}</td>
                    <td>${biz.cost}</td>
                    <td class="${parseFloat(biz.success_rate) > 90 ? 'status-success' : 'status-failed'}">${biz.success_rate}</td>
                </tr>
            `).join('');
        }
        
        function updateComponents(components) {
            const tbody = document.getElementById('componentBody');
            if (!components || Object.keys(components).length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748b;">No component data yet</td></tr>';
                return;
            }
            
            const sorted = Object.entries(components)
                .sort((a, b) => (b[1].attempted || 0) - (a[1].attempted || 0))
                .slice(0, 15);
            
            tbody.innerHTML = sorted.map(([name, stats]) => {
                const success_rate = stats.success_rate || 0;
                const status_class = success_rate > 90 ? 'status-success' : success_rate > 70 ? 'status-progress' : 'status-failed';
                
                return `
                    <tr>
                        <td>${name}</td>
                        <td>${stats.attempted || 0}</td>
                        <td class="status-success">${stats.succeeded || 0}</td>
                        <td class="status-failed">${stats.failed || 0}</td>
                        <td class="${status_class}">${success_rate.toFixed(1)}%</td>
                    </tr>
                `;
            }).join('');
        }
        
        // Initial load
        updateDashboard();
        
        // Auto-refresh every 5 seconds
        setInterval(updateDashboard, 5000);
    </script>
</body>
</html>
        """
        
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()
        self.wfile.write(html.encode())
    
    def serve_stats_json(self):
        """Serve statistics as JSON."""
        from infrastructure.business_monitor import get_monitor
        
        monitor = get_monitor()
        data = monitor.get_dashboard_data()
        
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def serve_events(self):
        """Serve recent events."""
        events_file = Path("logs/business_generation/events.jsonl")
        events = []
        
        if events_file.exists():
            with open(events_file) as f:
                for line in f.readlines()[-50:]:  # Last 50 events
                    try:
                        events.append(json.loads(line))
                    except:
                        pass
        
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(events).encode())
    
    def serve_hopx_active(self):
        data = _load_json_file(HOPX_STATE_PATH, {})
        active = list(data.values()) if isinstance(data, dict) else []
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"active": active}).encode())
    
    def serve_hopx_metrics(self):
        state = _load_json_file(HOPX_STATE_PATH, {})
        events = _load_hopx_events(limit=200)
        active_envs = list(state.values()) if isinstance(state, dict) else []
        oldest = min((env.get("created_at", 0) for env in active_envs), default=None)
        metrics = {
            "active_count": len(active_envs),
            "oldest_environment_seconds": (
                datetime.utcnow().timestamp() - oldest if oldest else 0
            ),
            "recent_events": events,
        }
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(metrics).encode())
    
    def log_message(self, format, *args):
        """Suppress log messages."""
        pass


def main():
    """Start the dashboard server."""
    port = 8888
    server = HTTPServer(("0.0.0.0", port), DashboardHandler)
    
    print("\n" + "="*80)
    print(" "*20 + "🤖 GENESIS AGENT MONITOR - WEB DASHBOARD" + " "*20)
    print("="*80)
    print(f"\nDashboard running on: http://localhost:{port}")
    print(f"\nAccess from your machine:")
    print(f"  1. SSH tunnel: ssh -L 8888:localhost:8888 genesis@5.161.211.16")
    print(f"  2. Open browser: http://localhost:8888")
    print(f"\nPress Ctrl+C to stop")
    print("="*80 + "\n")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\nShutting down dashboard...")
        server.shutdown()


if __name__ == "__main__":
    main()

