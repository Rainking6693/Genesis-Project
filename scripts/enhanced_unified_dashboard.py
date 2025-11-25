#!/usr/bin/env python3
"""
ENHANCED UNIFIED GENESIS DASHBOARD
Single dashboard with plain English status + detailed agent activity
Replaces need for 4 separate dashboards
"""

import json
import sys
import os
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime
import urllib.request
import urllib.error

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from infrastructure.full_system_integrator import get_integrator
    from infrastructure.business_monitor import get_monitor
except ImportError:
    # Fallback if infrastructure not available
    get_integrator = None
    get_monitor = None


# Plain English translations
AGENT_DISPLAY_NAMES = {
    "genesis_meta_agent": "Genesis Meta Agent (Master Orchestrator)",
    "genesis_meta": "Genesis Meta Agent (Master Orchestrator)",
    "meta_agent": "Genesis Meta Agent (Master Orchestrator)",
    "builder_agent": "Website Builder",
    "qa_agent": "Quality Checker",
    "deploy_agent": "Deployment System",
    "marketing_agent": "Marketing Assistant",
    "finance_agent": "Payment Processor",
    "content_agent": "Content Creator",
    "seo_agent": "SEO Optimizer",
    "security_agent": "Security Monitor",
    "analytics_agent": "Analytics Tracker",
    "support_agent": "Customer Support",
    "sales_agent": "Sales Assistant",
    "legal_agent": "Legal Advisor",
    "architect_agent": "System Architect",
    "frontend_agent": "Frontend Developer",
    "backend_agent": "Backend Developer",
    "spec_agent": "Specification Writer",
    "monitoring_agent": "System Monitor",
    "maintenance_agent": "Maintenance System",
    "research_agent": "Research Assistant",
    "darwin_agent": "Evolution System",
    "analyst_agent": "Data Analyst",
    "domain_name_agent": "Domain Manager",
}

STATUS_TRANSLATIONS = {
    "operational": "Working normally",
    "degraded": "Experiencing minor issues",
    "down": "Currently unavailable",
    "maintenance": "Undergoing scheduled maintenance",
    "initialized": "Ready and working",
    "enabled": "Ready to use",
    "error": "Needs attention",
}

def translate_agent_name(agent_name: str) -> str:
    """Convert technical agent name to plain English"""
    return AGENT_DISPLAY_NAMES.get(agent_name, agent_name.replace("_", " ").title())

def translate_status(status: str) -> str:
    """Convert technical status to plain English"""
    return STATUS_TRANSLATIONS.get(status.lower(), status.replace("_", " ").title())


class EnhancedUnifiedDashboardHandler(BaseHTTPRequestHandler):
    """Enhanced unified dashboard with plain English status."""
    
    def do_GET(self):
        if self.path == "/":
            self.serve_unified_dashboard()
        elif self.path == "/api/all":
            self.serve_all_metrics()
        elif self.path == "/api/agents":
            self.serve_agent_status()
        elif self.path == "/api/activity":
            self.serve_agent_activity()
        else:
            self.send_error(404)
    
    def serve_unified_dashboard(self):
        html = """
<!DOCTYPE html>
<html>
<head>
    <title>🚀 Genesis Dashboard - All Systems</title>
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
        
        /* Plain English Status Banner */
        .status-banner {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            border: 2px solid #475569;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .status-banner.operational {
            border-color: #22c55e;
            background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
        }
        .status-banner.degraded {
            border-color: #eab308;
            background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
        }
        .status-banner.down {
            border-color: #ef4444;
            background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
        }
        .status-banner h2 {
            font-size: 28px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .status-banner p {
            font-size: 18px;
            opacity: 0.9;
            line-height: 1.6;
        }
        .status-banner .agent-list {
            margin-top: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 12px;
        }
        .status-banner .agent-item {
            padding: 12px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 6px;
            font-size: 14px;
        }
        .status-banner .agent-item .name {
            font-weight: 600;
            margin-bottom: 4px;
        }
        .status-banner .agent-item .status {
            font-size: 12px;
            opacity: 0.8;
        }
        
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
        
        /* Agent Activity Feed */
        .activity-feed {
            max-height: 400px;
            overflow-y: auto;
        }
        .activity-item {
            padding: 12px;
            background: #0f172a;
            border-radius: 6px;
            margin-bottom: 8px;
            border-left: 3px solid #667eea;
            font-size: 14px;
        }
        .activity-item .time {
            color: #64748b;
            font-size: 12px;
            margin-bottom: 4px;
        }
        .activity-item .message {
            color: #e2e8f0;
        }
        
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
            cursor: pointer;
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
        <!-- Plain English Status Banner -->
        <div class="status-banner" id="statusBanner">
            <h2 id="statusTitle">Loading system status...</h2>
            <p id="statusMessage">Checking all systems...</p>
            <div class="agent-list" id="agentStatusList"></div>
        </div>
        
        <div class="header">
            <h1>🚀 Genesis Unified Dashboard</h1>
            <p>Real-time monitoring of all systems + business generation + agent activity</p>
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
        
        <!-- Agent Activity Feed -->
        <div class="card grid-wide">
            <h2>📋 Agent Activity (What Agents Are Doing)</h2>
            <div class="activity-feed" id="agentActivity"></div>
            
            <!-- Active Generation (moved here) -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155;">
                <h3 style="color: #60a5fa; font-size: 16px; margin-bottom: 16px;">⏳ Active Generation</h3>
                <div id="activeGeneration"></div>
            </div>
            
            <!-- Recent Completions (moved here) -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155;">
                <h3 style="color: #60a5fa; font-size: 16px; margin-bottom: 16px;">✅ Recent Completions</h3>
                <table style="width: 100%;">
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
        
        <!-- All Systems Status -->
        <div class="card grid-wide">
            <h2>🔧 All Systems Status</h2>
            <div id="allSystems"></div>
        </div>
    </div>
    
    <div class="refresh" onclick="updateDashboard()">🔄 Refresh Now</div>
    
    <script>
        // Plain English agent names mapping
        const agentNames = {
            "genesis_meta_agent": "Genesis Meta Agent (Master Orchestrator)",
            "genesis_meta": "Genesis Meta Agent (Master Orchestrator)",
            "meta_agent": "Genesis Meta Agent (Master Orchestrator)",
            "builder_agent": "Website Builder",
            "qa_agent": "Quality Checker",
            "deploy_agent": "Deployment System",
            "marketing_agent": "Marketing Assistant",
            "finance_agent": "Payment Processor",
            "content_agent": "Content Creator",
            "seo_agent": "SEO Optimizer",
            "security_agent": "Security Monitor",
            "analytics_agent": "Analytics Tracker",
            "support_agent": "Customer Support",
            "sales_agent": "Sales Assistant",
            "legal_agent": "Legal Advisor",
            "architect_agent": "System Architect",
            "frontend_agent": "Frontend Developer",
            "backend_agent": "Backend Developer",
            "spec_agent": "Specification Writer",
            "monitoring_agent": "System Monitor",
            "maintenance_agent": "Maintenance System",
            "research_agent": "Research Assistant",
            "darwin_agent": "Evolution System",
            "analyst_agent": "Data Analyst",
            "domain_name_agent": "Domain Manager"
        };
        
        function getAgentDisplayName(agentName) {
            return agentNames[agentName] || agentName.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
        }
        
        function updateStatusBanner(data) {
            const banner = document.getElementById('statusBanner');
            const title = document.getElementById('statusTitle');
            const message = document.getElementById('statusMessage');
            const agentList = document.getElementById('agentStatusList');
            
            const systems = data.systems || {};
            const systemRunning = systems.system_running !== false; // Default to true if not specified
            const operational = systems.operational || 0;
            const total = systems.total || 1;
            const percentage = total > 0 ? (operational / total * 100).toFixed(0) : 0;
            
            let statusClass = 'operational';
            let statusIcon = '✅';
            let statusText = 'All Systems Operational';
            let statusMessage = `All ${total} systems are working correctly. Your business generation system is ready to create new businesses.`;
            
            // Check if system is actually running
            if (!systemRunning) {
                statusClass = 'down';
                statusIcon = '⏸️';
                statusText = 'System Not Running';
                statusMessage = `Genesis system is not currently running. Start the system to begin monitoring.`;
            } else if (percentage < 50) {
                statusClass = 'down';
                statusIcon = '❌';
                statusText = 'Systems Experiencing Issues';
                statusMessage = `Some systems are currently unavailable. ${operational} out of ${total} systems are working.`;
            } else if (percentage < 90) {
                statusClass = 'degraded';
                statusIcon = '⚠️';
                statusText = 'Some Systems Need Attention';
                statusMessage = `Most systems are working, but ${total - operational} systems need attention.`;
            }
            
            banner.className = `status-banner ${statusClass}`;
            title.innerHTML = `${statusIcon} ${statusText}`;
            message.textContent = statusMessage;
            
            // Agent status list - always include Genesis Meta Agent first
            const agents = data.agents || [];
            
            // Ensure Genesis Meta Agent is in the list
            const hasMetaAgent = agents.some(a => {
                const name = (a.name || a.id || '').toLowerCase();
                return name.includes('genesis_meta') || name.includes('meta_agent');
            });
            
            if (!hasMetaAgent) {
                agents.unshift({
                    id: 'genesis_meta_agent',
                    name: 'genesis_meta_agent',
                    status: systemRunning ? 'operational' : 'down',
                    display_name: 'Genesis Meta Agent (Master Orchestrator)'
                });
            }
            
            if (agents.length > 0) {
                // Sort to put Genesis Meta Agent first
                agents.sort((a, b) => {
                    const aName = (a.name || a.id || '').toLowerCase();
                    const bName = (b.name || b.id || '').toLowerCase();
                    if (aName.includes('genesis_meta') || aName.includes('meta_agent')) return -1;
                    if (bName.includes('genesis_meta') || bName.includes('meta_agent')) return 1;
                    return 0;
                });
                
                agentList.innerHTML = agents.slice(0, 12).map(agent => {
                    const displayName = getAgentDisplayName(agent.name || agent.id || '');
                    const status = agent.status || (systemRunning ? 'operational' : 'down');
                    const statusText = status === 'operational' ? 'Working normally' : 
                                      status === 'degraded' ? 'Minor issues' : 
                                      status === 'down' ? 'Not running' : 'Needs attention';
                    const statusColor = status === 'operational' ? '#22c55e' : 
                                       status === 'degraded' ? '#eab308' : '#ef4444';
                    
                    return `
                        <div class="agent-item">
                            <div class="name">${displayName}</div>
                            <div class="status" style="color: ${statusColor}">${statusText}</div>
                        </div>
                    `;
                }).join('');
            } else {
                agentList.innerHTML = '<div class="agent-item"><div class="name">No agents detected. Start Genesis system to see agent status.</div></div>';
            }
        }
        
        function updateAgentActivity(data) {
            const feed = document.getElementById('agentActivity');
            const activities = data.activities || [];
            
            if (activities.length === 0) {
                feed.innerHTML = '<div class="activity-item"><div class="message">No recent agent activity. Agents will appear here when they start working.</div></div>';
                return;
            }
            
            feed.innerHTML = activities.map(activity => {
                const agentName = getAgentDisplayName(activity.agent || 'Unknown');
                const time = new Date(activity.timestamp || Date.now()).toLocaleTimeString();
                const message = activity.message || activity.action || 'Working...';
                
                return `
                    <div class="activity-item">
                        <div class="time">${time}</div>
                        <div class="message"><strong>${agentName}</strong>: ${message}</div>
                    </div>
                `;
            }).join('');
        }
        
        function updateDashboard() {
            Promise.all([
                fetch('/api/all').then(r => r.json()),
                fetch('/api/agents').then(r => r.json()).catch(() => ({agents: []})),
                fetch('/api/activity').then(r => r.json()).catch(() => ({activities: []}))
            ]).then(([allData, agentData, activityData]) => {
                const combinedData = {
                    ...allData,
                    agents: agentData.agents || [],
                    activities: activityData.activities || []
                };
                
                updateStatusBanner(combinedData);
                updateAgentActivity(combinedData);
                updateBusinessStats(combinedData.business);
                updateSystemHealth(combinedData.systems);
                updateCostMetrics(combinedData.business);
                updateAllSystems(combinedData.systems);
                // Active and Recent are now in the Agent Activity section
                updateActive(combinedData.business?.active_businesses);
                updateRecent(combinedData.business?.recent_completions);
            }).catch(e => {
                console.error('Error:', e);
                document.getElementById('statusBanner').innerHTML = '<h2>⚠️ Unable to connect to Genesis system</h2><p>Please check if Genesis is running.</p>';
            });
        }
        
        function updateBusinessStats(data) {
            if (!data) return;
            const stats = data.global_stats || {};
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
            if (!systems) return;
            const total = systems.total || 0;
            const operational = systems.operational || 0;
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
            if (!data) return;
            const stats = data.global_stats || {};
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
            if (!data) {
                document.getElementById('allSystems').innerHTML = '<p style="color: #64748b;">System not running. Start Genesis to see system status.</p>';
                return;
            }
            
            const layers = data.by_layer || {};
            
            // System explanations for common error systems
            const systemExplanations = {
                'Modular Prompts': 'Optional: Layered prompt assembly system. Not required for basic operation.',
                'AgentGit': 'Optional: Plan versioning system. Not required for basic operation.',
                'MDP Document Ingester': 'Optional: Document ingestion for RAG. Not required for basic operation.',
                'MAPE-K Loop': 'Optional: Continuous improvement loop. Not required for basic operation.',
                'ToolRM Scoring': 'Optional: Tool analytics and scoring. Not required for basic operation.',
                'FlowMesh Routing': 'Optional: Advanced queue management. Not required for basic operation.',
                'CPU Offload': 'Optional: Performance optimization. Not required for basic operation.',
                'LangGraph Store': 'Optional: Graph persistence system. Not required for basic operation.'
            };
            
            let html = '';
            
            if (Object.keys(layers).length === 0) {
                html = '<p style="color: #64748b;">System not running. Start Genesis to see system status.</p>';
            } else {
                Object.keys(layers).sort().forEach(layer => {
                    const systems = layers[layer];
                    html += `
                        <div class="layer-section">
                            <div class="layer-title">${layer}</div>
                            <div class="system-list">
                    `;
                    
                    systems.forEach(sys => {
                        const sysName = sys.name || '';
                        const explanation = systemExplanations[sysName] || '';
                        const badge = sys.initialized ? 
                            '<span class="badge badge-active">✓ Active</span>' :
                            (sys.enabled ? '<span class="badge badge-ready">Ready</span>' : '<span class="badge badge-error">Error</span>');
                        
                        html += `
                            <div class="system-item">
                                <div>
                                    <div class="system-name">${sysName}</div>
                                    ${explanation ? `<div class="system-layer" style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${explanation}</div>` : ''}
                                    ${sys.metadata ? `<div class="system-layer">${Object.values(sys.metadata)[0] || ''}</div>` : ''}
                                </div>
                                ${badge}
                            </div>
                        `;
                    });
                    
                    html += '</div></div>';
                });
            }
            
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
                    <td style="color: ${parseFloat(biz.success_rate || biz.quality || 0) > 90 ? '#22c55e' : '#ef4444'}">${biz.success_rate || biz.quality || 'N/A'}</td>
                </tr>
            `).join('');
        }
        
        // Initial load
        updateDashboard();
        
        // Auto-refresh every 3 seconds
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
            data = {
                'business': self._get_business_data(),
                'systems': self._get_systems_data(),
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
    
    def serve_agent_status(self):
        """Serve agent status with plain English names."""
        try:
            agents = []
            
            # Try to get from A2A service
            try:
                req = urllib.request.Request('http://localhost:8000/agents')
                req.add_header('X-API-Key', os.getenv('A2A_API_KEY', ''))
                with urllib.request.urlopen(req, timeout=2) as response:
                    a2a_agents = json.loads(response.read())
                    for agent in a2a_agents.get('agents', []):
                        agents.append({
                            'id': agent.get('name', ''),
                            'name': agent.get('name', ''),
                            'status': 'operational',
                            'display_name': translate_agent_name(agent.get('name', ''))
                        })
            except:
                pass
            
            # Try to get from dashboard API
            try:
                with urllib.request.urlopen('http://localhost:5001/api/agents/all', timeout=2) as response:
                    dashboard_agents = json.loads(response.read())
                    for agent in dashboard_agents.get('agents', []):
                        agents.append({
                            'id': agent.get('name', ''),
                            'name': agent.get('name', ''),
                            'status': agent.get('status', 'operational'),
                            'display_name': translate_agent_name(agent.get('name', ''))
                        })
            except:
                pass
            
            # Fallback: create default agent list
            if not agents:
                for agent_id in AGENT_DISPLAY_NAMES.keys():
                    agents.append({
                        'id': agent_id,
                        'name': agent_id,
                        'status': 'operational',
                        'display_name': translate_agent_name(agent_id)
                    })
            
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({'agents': agents}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e), 'agents': []}).encode())
    
    def serve_agent_activity(self):
        """Serve recent agent activity from logs."""
        try:
            activities = []
            
            # Try to read from logs
            log_path = Path(__file__).parent.parent / 'logs' / 'business_generation' / 'events.jsonl'
            if log_path.exists():
                try:
                    with open(log_path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        for line in lines[-20:]:  # Last 20 events
                            try:
                                event = json.loads(line.strip())
                                if event.get('agent') or event.get('action'):
                                    activities.append({
                                        'agent': event.get('agent', 'system'),
                                        'action': event.get('action', ''),
                                        'message': event.get('message', event.get('action', 'Working...')),
                                        'timestamp': event.get('timestamp', datetime.utcnow().isoformat())
                                    })
                            except:
                                pass
                except:
                    pass
            
            # Try dashboard API
            try:
                with urllib.request.urlopen('http://localhost:5001/api/events', timeout=2) as response:
                    events = json.loads(response.read())
                    for event in events.get('events', [])[-20:]:
                        activities.append({
                            'agent': event.get('agent', 'system'),
                            'action': event.get('action', ''),
                            'message': event.get('message', event.get('action', 'Working...')),
                            'timestamp': event.get('timestamp', datetime.utcnow().isoformat())
                        })
            except:
                pass
            
            # Reverse to show newest first
            activities.reverse()
            
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({'activities': activities[:20]}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e), 'activities': []}).encode())
    
    def _get_business_data(self):
        """Get business generation data."""
        try:
            if get_monitor:
                monitor = get_monitor()
                return monitor.get_dashboard_data()
        except:
            pass
        
        # Fallback data
        return {
            'global_stats': {
                'total_businesses': 0,
                'completed': 0,
                'in_progress': 0,
                'total_cost_usd': 0,
                'total_components': 0,
                'total_lines_of_code': 0
            },
            'active_businesses': [],
            'recent_completions': []
        }
    
    def _get_systems_data(self):
        """Get systems status data with real health checks."""
        try:
            # Check if Genesis is actually running
            is_running = self._check_genesis_running()
            
            if not is_running:
                # System not running - return minimal data
                return {
                    'total': 79,
                    'operational': 0,
                    'by_layer': {},
                    'system_running': False
                }
            
            if get_integrator:
                integrator = get_integrator()
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
                
                return {
                    'total': total_systems,
                    'operational': operational_systems,
                    'by_layer': systems_by_layer,
                    'system_running': True
                }
        except Exception as e:
            # Error getting data - system likely not running
            return {
                'total': 79,
                'operational': 0,
                'by_layer': {},
                'system_running': False,
                'error': str(e)
            }
        
        # Fallback - system not running
        return {
            'total': 79,
            'operational': 0,
            'by_layer': {},
            'system_running': False
        }
    
    def _check_genesis_running(self):
        """Check if Genesis system is actually running."""
        # Check A2A service
        try:
            req = urllib.request.Request('http://localhost:8000/health')
            req.add_header('X-API-Key', os.getenv('A2A_API_KEY', ''))
            with urllib.request.urlopen(req, timeout=1) as response:
                if response.status == 200:
                    return True
        except:
            pass
        
        # Check dashboard API
        try:
            with urllib.request.urlopen('http://localhost:5001/health', timeout=1) as response:
                if response.status == 200:
                    return True
        except:
            pass
        
        # Check if integrator can be loaded
        try:
            if get_integrator:
                integrator = get_integrator()
                # If we can get the integrator, system is at least partially running
                return True
        except:
            pass
        
        return False
    
    def log_message(self, format, *args):
        pass


def main():
    port = 8888
    server = HTTPServer(("0.0.0.0", port), EnhancedUnifiedDashboardHandler)
    
    print("\n" + "="*80)
    print(" "*10 + "🚀 GENESIS ENHANCED UNIFIED DASHBOARD 🚀" + " "*10)
    print("="*80)
    print(f"\n✅ Dashboard: http://localhost:{port}")
    print(f"\n📊 Features:")
    print(f"   • Plain English status banner (top)")
    print(f"   • Real-time agent activity feed")
    print(f"   • All 79 systems status")
    print(f"   • Business generation metrics")
    print(f"   • Cost & performance tracking")
    print(f"\n🔄 Auto-refresh: 3 seconds")
    print(f"\n💡 This replaces all 4 separate dashboards!")
    print(f"\nPress Ctrl+C to stop")
    print("="*80 + "\n")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\nShutting down...")
        server.shutdown()


if __name__ == "__main__":
    main()

