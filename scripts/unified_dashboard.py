#!/usr/bin/env python3
"""
UNIFIED GENESIS DASHBOARD
One dashboard to rule them all - real-time metrics from ALL 53 systems
"""

import json
import sys
import time
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.full_system_integrator import get_integrator
from infrastructure.business_monitor import get_monitor


class UnifiedDashboardHandler(BaseHTTPRequestHandler):
    """Unified dashboard showing ALL systems + business generation."""
    
    def do_GET(self):
        if self.path == "/":
            self.serve_unified_dashboard()
        elif self.path == "/api/all":
            self.serve_all_metrics()
        else:
            self.send_error(404)
    
    def serve_unified_dashboard(self):
        html = """
<!DOCTYPE html>
<html>
<head>
    <title>🚀 Genesis Unified Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            background: #0a0e1a;
            color: #e2e8f0;
            padding: 20px;
        }
        .container { max-width: 1800px; margin: 0 auto; }
        
        /* Header */
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
        }
        .header h1 { font-size: 36px; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 16px; }
        
        /* Grid Layout */
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .grid-wide { grid-column: 1 / -1; }
        
        /* Cards */
        .card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .card h2 {
            color: #60a5fa;
            font-size: 18px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        /* Stats */
        .stat { margin-bottom: 16px; }
        .stat-label { color: #94a3b8; font-size: 13px; margin-bottom: 4px; }
        .stat-value { font-size: 28px; font-weight: 700; color: #60a5fa; }
        
        /* System Status */
        .system-list { display: grid; gap: 8px; }
        .system-item {
            padding: 12px;
            background: #0f172a;
            border-radius: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
        }
        .system-name { color: #e2e8f0; }
        .system-layer { color: #64748b; font-size: 12px; }
        
        /* Status Badges */
        .badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge-active { background: #22c55e; color: #000; }
        .badge-ready { background: #eab308; color: #000; }
        .badge-error { background: #ef4444; color: #fff; }
        
        /* Table */
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; }
        th { color: #94a3b8; font-weight: 600; font-size: 13px; }
        td { color: #e2e8f0; font-size: 14px; }
        
        /* Progress */
        .progress { background: #334155; height: 8px; border-radius: 4px; overflow: hidden; }
        .progress-bar { background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; transition: width 0.5s; }
        
        /* Refresh */
        .refresh {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            border-radius: 24px;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
        }
        
        /* Layer Sections */
        .layer-section {
            background: #0f172a;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 12px;
        }
        .layer-title {
            color: #60a5fa;
            font-weight: 600;
            margin-bottom: 12px;
            font-size: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Genesis Unified Dashboard</h1>
            <p>Real-time monitoring of all 53 systems + business generation</p>
        </div>
        
        <div class="grid">
            <!-- Business Stats -->
            <div class="card">
                <h2>📊 Business Generation</h2>
                <div id="businessStats"></div>
            </div>
            
            <!-- System Health -->
            <div class="card">
                <h2>⚡ System Health</h2>
                <div id="systemHealth"></div>
            </div>
            
            <!-- Cost & Performance -->
            <div class="card">
                <h2>💰 Cost & Performance</h2>
                <div id="costMetrics"></div>
            </div>
        </div>
        
        <!-- All Systems Status -->
        <div class="card grid-wide">
            <h2>🔧 All 53 Systems Status</h2>
            <div id="allSystems"></div>
        </div>
        
        <!-- Active Generation -->
        <div class="card grid-wide">
            <h2>⏳ Active Generation</h2>
            <div id="activeGeneration"></div>
        </div>
        
        <!-- Recent Businesses -->
        <div class="card grid-wide">
            <h2>✅ Recent Completions</h2>
            <table>
                <thead>
                    <tr>
                        <th>Business</th>
                        <th>Type</th>
                        <th>Duration</th>
                        <th>Components</th>
                        <th>Cost</th>
                        <th>Quality</th>
                    </tr>
                </thead>
                <tbody id="recentTable"></tbody>
            </table>
        </div>
    </div>
    
    <div class="refresh">● Live (refreshing every 3s)</div>
    
    <script>
        function updateDashboard() {
            fetch('/api/all')
                .then(r => r.json())
                .then(data => {
                    updateBusinessStats(data.business);
                    updateSystemHealth(data.systems);
                    updateCostMetrics(data.business);
                    updateAllSystems(data.systems);
                    updateActive(data.business.active_businesses);
                    updateRecent(data.business.recent_completions);
                })
                .catch(e => console.error('Error:', e));
        }
        
        function updateBusinessStats(data) {
            const stats = data.global_stats;
            document.getElementById('businessStats').innerHTML = `
                <div class="stat">
                    <div class="stat-label">Total Generated</div>
                    <div class="stat-value">${stats.total_businesses || 0}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Completed</div>
                    <div class="stat-value" style="color: #22c55e">${stats.completed || 0}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">In Progress</div>
                    <div class="stat-value" style="color: #eab308">${stats.in_progress || 0}</div>
                </div>
            `;
        }
        
        function updateSystemHealth(systems) {
            const total = systems.total;
            const operational = systems.operational;
            const percentage = total > 0 ? (operational / total * 100).toFixed(1) : 0;
            
            document.getElementById('systemHealth').innerHTML = `
                <div class="stat">
                    <div class="stat-label">Systems Operational</div>
                    <div class="stat-value">${operational}/${total}</div>
                </div>
                <div class="progress">
                    <div class="progress-bar" style="width: ${percentage}%"></div>
                </div>
                <div style="margin-top: 8px; font-size: 13px; color: #94a3b8;">
                    ${percentage}% health
                </div>
            `;
        }
        
        function updateCostMetrics(data) {
            const stats = data.global_stats;
            document.getElementById('costMetrics').innerHTML = `
                <div class="stat">
                    <div class="stat-label">Total Cost</div>
                    <div class="stat-value">$${(stats.total_cost_usd || 0).toFixed(4)}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Components Built</div>
                    <div class="stat-value">${stats.total_components || 0}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Lines of Code</div>
                    <div class="stat-value">${(stats.total_lines_of_code || 0).toLocaleString()}</div>
                </div>
            `;
        }
        
        function updateAllSystems(data) {
            const layers = data.by_layer || {};
            let html = '';
            
            Object.keys(layers).sort().forEach(layer => {
                const systems = layers[layer];
                html += `
                    <div class="layer-section">
                        <div class="layer-title">${layer}</div>
                        <div class="system-list">
                `;
                
                systems.forEach(sys => {
                    const badge = sys.initialized ? 
                        '<span class="badge badge-active">✓ Active</span>' :
                        (sys.enabled ? '<span class="badge badge-ready">Ready</span>' : '<span class="badge badge-error">Error</span>');
                    
                    html += `
                        <div class="system-item">
                            <div>
                                <div class="system-name">${sys.name}</div>
                                ${sys.metadata ? `<div class="system-layer">${Object.values(sys.metadata)[0] || ''}</div>` : ''}
                            </div>
                            ${badge}
                        </div>
                    `;
                });
                
                html += '</div></div>';
            });
            
            document.getElementById('allSystems').innerHTML = html || '<p style="color: #64748b;">Loading systems...</p>';
        }
        
        function updateActive(active) {
            const div = document.getElementById('activeGeneration');
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
                        <span style="color: #eab308;">● ${biz.status}</span>
                    </div>
                </div>
            `).join('');
        }
        
        function updateRecent(recent) {
            const tbody = document.getElementById('recentTable');
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
                    <td style="color: ${parseFloat(biz.success_rate) > 90 ? '#22c55e' : '#ef4444'}">${biz.success_rate}</td>
                </tr>
            `).join('');
        }
        
        // Initial load
        updateDashboard();
        
        // Fast refresh (3 seconds)
        setInterval(updateDashboard, 3000);
    </script>
</body>
</html>
        """
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()
        self.wfile.write(html.encode())
    
    def serve_all_metrics(self):
        """Serve combined metrics from ALL systems."""
        try:
            # Get system integrator
            integrator = get_integrator()
            
            # Get business monitor
            monitor = get_monitor()
            business_data = monitor.get_dashboard_data()
            
            # Get system status report
            systems_by_layer = {}
            total_systems = 0
            operational_systems = 0
            
            for sys_name, status in integrator.systems.items():
                layer = status.layer
                if layer not in systems_by_layer:
                    systems_by_layer[layer] = []
                
                systems_by_layer[layer].append({
                    'name': status.name,
                    'enabled': status.enabled,
                    'initialized': status.initialized,
                    'error': status.error,
                    'metadata': status.metadata
                })
                
                total_systems += 1
                if status.initialized:
                    operational_systems += 1
            
            data = {
                'business': business_data,
                'systems': {
                    'total': total_systems,
                    'operational': operational_systems,
                    'by_layer': systems_by_layer
                },
                'timestamp': datetime.utcnow().isoformat()
            }
            
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
    
    def log_message(self, format, *args):
        pass


def main():
    port = 8888
    server = HTTPServer(("0.0.0.0", port), UnifiedDashboardHandler)
    
    print("\n" + "="*80)
    print(" "*15 + "🚀 GENESIS UNIFIED DASHBOARD - ALL SYSTEMS 🚀" + " "*15)
    print("="*80)
    print(f"\n✅ Dashboard: http://localhost:{port}")
    print(f"\n📊 Showing:")
    print(f"   • All 53 systems status (real-time)")
    print(f"   • Business generation metrics")
    print(f"   • Cost & performance tracking")
    print(f"   • Component-level details")
    print(f"\n🔄 Auto-refresh: 3 seconds")
    print(f"\n💡 Run business generation in another terminal:")
    print(f"   python3 scripts/autonomous_fully_integrated.py --count 10 --min-score 70")
    print(f"\nPress Ctrl+C to stop")
    print("="*80 + "\n")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\nShutting down...")
        server.shutdown()


if __name__ == "__main__":
    main()
