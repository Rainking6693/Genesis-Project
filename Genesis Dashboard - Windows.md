# Genesis Dashboard - Windows Server Deployment Guide

This guide provides step-by-step instructions to deploy the Genesis Mission Control Dashboard on a Windows Server VPS.

---

## 📋 Prerequisites

**VPS Details:**
- IP Address: `135.181.100.213`
- OS: Windows Server 2019 or later
- RAM: 4GB minimum
- Domain: `taxtok.org` (DNS A records pointing to `135.181.100.213`)

**Required Access:**
- RDP (Remote Desktop) access to Windows Server
- Administrator privileges
- Domain registrar access to set DNS records

---

## 🔌 Part 1: Connect to Your Windows Server

### Connect via Remote Desktop

**On your local Windows computer:**

1. Press `Windows Key + R`
2. Type: `mstsc`
3. Enter: `135.181.100.213`
4. Click "Connect"
5. Enter your administrator username and password

---

## ⚙️ Part 2: Install Python

### Download and Install Python

**In your RDP session (on the Windows Server):**

1. **Open PowerShell as Administrator**
   - Right-click Start menu
   - Click "Windows PowerShell (Admin)"

2. **Download Python installer:**

```powershell
# Create downloads directory
New-Item -Path "C:\Downloads" -ItemType Directory -Force

# Download Python 3.12
Invoke-WebRequest -Uri "https://www.python.org/ftp/python/3.12.0/python-3.12.0-amd64.exe" -OutFile "C:\Downloads\python-installer.exe"
```

3. **Install Python (silent install):**

```powershell
Start-Process -FilePath "C:\Downloads\python-installer.exe" -ArgumentList "/quiet", "InstallAllUsers=1", "PrependPath=1", "Include_test=0" -Wait
```

4. **Verify Python is installed:**

```powershell
# Close and reopen PowerShell as Admin, then:
python --version
```

**Expected Output:** `Python 3.12.0` (or similar)

5. **Install pip packages:**

```powershell
pip install fastapi uvicorn requests
```

**Expected Output:** Packages installed successfully

---

## 📁 Part 3: Create Dashboard Files

### Create Directory Structure

```powershell
# Create main directories
New-Item -Path "C:\Genesis\dashboard\static" -ItemType Directory -Force
New-Item -Path "C:\Genesis\infrastructure" -ItemType Directory -Force
```

### Create Event Emitter Module

**Location:** `C:\Genesis\infrastructure\event_emitter.py`

```powershell
@"
"""Event Emitter for Genesis Dashboard Integration"""
import requests
import logging
from datetime import datetime
from typing import Dict, Any, Optional
import json

logger = logging.getLogger("event_emitter")

class GenesisEventEmitter:
    """Sends events from Genesis to Dashboard API"""
    
    def __init__(self, api_url: str = "http://localhost:8001"):
        self.api_url = api_url.rstrip('/')
        self.enabled = True
        logger.info(f"EventEmitter initialized: {self.api_url}")
    
    def emit(self, event_type: str, data: Dict[str, Any], 
             business_name: Optional[str] = None,
             agent_name: Optional[str] = None,
             message: Optional[str] = None):
        """
        Send an event to the dashboard
        
        Args:
            event_type: Type of event (e.g., 'agent_started', 'deployment_complete')
            data: Event payload
            business_name: Name of business being worked on
            agent_name: Name of agent performing action
            message: Human-readable message
        """
        if not self.enabled:
            return
        
        try:
            payload = {
                "timestamp": datetime.now().isoformat(),
                "type": event_type,
                "business_name": business_name,
                "agent_name": agent_name,
                "message": message,
                "data": data
            }
            
            response = requests.post(
                f"{self.api_url}/events",
                json=payload,
                timeout=2
            )
            
            if response.status_code != 200:
                logger.warning(f"Dashboard API returned {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            logger.debug(f"Could not send event to dashboard: {e}")
        except Exception as e:
            logger.error(f"Event emission error: {e}")
    
    def disable(self):
        """Disable event emission"""
        self.enabled = False
        logger.info("EventEmitter disabled")
    
    def enable(self):
        """Enable event emission"""
        self.enabled = True
        logger.info("EventEmitter enabled")
"@ | Out-File -FilePath "C:\Genesis\infrastructure\event_emitter.py" -Encoding UTF8
```

**Expected Output:** File created

### Create Dashboard API

**Location:** `C:\Genesis\dashboard\api.py`

```powershell
@"
"""Genesis Dashboard API - Receives events and serves data"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import sqlite3
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import json
from pathlib import Path

app = FastAPI(title="Genesis Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = Path(__file__).parent / "genesis_events.db"

def init_db():
    """Initialize SQLite database"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            event_type TEXT NOT NULL,
            business_name TEXT,
            agent_name TEXT,
            message TEXT,
            data TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.execute("""
        CREATE TABLE IF NOT EXISTS businesses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            status TEXT,
            deployment_url TEXT,
            github_url TEXT,
            revenue REAL DEFAULT 0,
            costs REAL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_events_timestamp 
        ON events(timestamp DESC)
    """)
    
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_events_business 
        ON events(business_name)
    """)
    
    conn.commit()
    conn.close()

init_db()

@app.post("/events")
async def receive_event(event: dict):
    """Receive event from Genesis"""
    conn = sqlite3.connect(str(DB_PATH))
    
    try:
        conn.execute("""
            INSERT INTO events (timestamp, event_type, business_name, agent_name, message, data)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            event.get("timestamp", datetime.now().isoformat()),
            event.get("type"),
            event.get("business_name"),
            event.get("agent_name"),
            event.get("message"),
            json.dumps(event.get("data", {}))
        ))
        
        if event.get("business_name"):
            business_name = event["business_name"]
            event_type = event.get("type")
            
            if event_type == "deployment_complete":
                conn.execute("""
                    INSERT OR REPLACE INTO businesses (name, status, deployment_url, github_url, updated_at)
                    VALUES (?, 'live', ?, ?, ?)
                """, (
                    business_name,
                    event.get("data", {}).get("url"),
                    event.get("data", {}).get("github"),
                    datetime.now().isoformat()
                ))
            elif event_type in ["deployment_failed", "business_killed"]:
                conn.execute("""
                    INSERT OR IGNORE INTO businesses (name, status, updated_at)
                    VALUES (?, 'failed', ?)
                """, (business_name, datetime.now().isoformat()))
                
                conn.execute("""
                    UPDATE businesses SET status = 'failed', updated_at = ?
                    WHERE name = ?
                """, (datetime.now().isoformat(), business_name))
            elif event_type == "business_generation_started":
                conn.execute("""
                    INSERT OR IGNORE INTO businesses (name, status, updated_at)
                    VALUES (?, 'building', ?)
                """, (business_name, datetime.now().isoformat()))
        
        conn.commit()
        return {"status": "received", "event_id": conn.lastrowid}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/events/recent")
async def get_recent_events(limit: int = 100, business_name: Optional[str] = None):
    """Get recent events"""
    conn = sqlite3.connect(str(DB_PATH))
    
    if business_name:
        cursor = conn.execute("""
            SELECT * FROM events 
            WHERE business_name = ?
            ORDER BY id DESC 
            LIMIT ?
        """, (business_name, limit))
    else:
        cursor = conn.execute("""
            SELECT * FROM events 
            ORDER BY id DESC 
            LIMIT ?
        """, (limit,))
    
    events = []
    for row in cursor.fetchall():
        events.append({
            "id": row[0],
            "timestamp": row[1],
            "type": row[2],
            "business_name": row[3],
            "agent_name": row[4],
            "message": row[5],
            "data": json.loads(row[6]) if row[6] else {}
        })
    
    conn.close()
    return events

@app.get("/businesses")
async def get_businesses():
    """Get all businesses"""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.execute("""
        SELECT name, status, deployment_url, github_url, revenue, costs, created_at, updated_at
        FROM businesses
        ORDER BY updated_at DESC
    """)
    
    businesses = []
    for row in cursor.fetchall():
        businesses.append({
            "name": row[0],
            "status": row[1],
            "deployment_url": row[2],
            "github_url": row[3],
            "revenue": row[4],
            "costs": row[5],
            "created_at": row[6],
            "updated_at": row[7]
        })
    
    conn.close()
    return businesses

@app.get("/agents/status")
async def get_agent_status():
    """Get status of all agents"""
    conn = sqlite3.connect(str(DB_PATH))
    
    cursor = conn.execute("""
        SELECT agent_name, MAX(timestamp) as last_active, COUNT(*) as event_count
        FROM events
        WHERE agent_name IS NOT NULL
        GROUP BY agent_name
        ORDER BY last_active DESC
    """)
    
    agents = []
    for row in cursor.fetchall():
        agents.append({
            "name": row[0],
            "last_active": row[1],
            "event_count": row[2],
            "status": "active" if is_recent(row[1]) else "idle"
        })
    
    conn.close()
    return agents

@app.get("/stats")
async def get_stats():
    """Get overall statistics"""
    conn = sqlite3.connect(str(DB_PATH))
    
    cursor = conn.execute("""
        SELECT status, COUNT(*) 
        FROM businesses 
        GROUP BY status
    """)
    status_counts = dict(cursor.fetchall())
    
    cursor = conn.execute("""
        SELECT SUM(revenue), SUM(costs)
        FROM businesses
    """)
    revenue, costs = cursor.fetchone()
    
    yesterday = (datetime.now() - timedelta(days=1)).isoformat()
    cursor = conn.execute("""
        SELECT COUNT(*)
        FROM events
        WHERE timestamp > ?
    """, (yesterday,))
    recent_events = cursor.fetchone()[0]
    
    conn.close()
    
    return {
        "businesses": {
            "live": status_counts.get("live", 0),
            "building": status_counts.get("building", 0),
            "failed": status_counts.get("failed", 0),
            "total": sum(status_counts.values())
        },
        "revenue": revenue or 0,
        "costs": costs or 0,
        "profit": (revenue or 0) - (costs or 0),
        "events_24h": recent_events
    }

def is_recent(timestamp_str: str, minutes: int = 5) -> bool:
    """Check if timestamp is recent"""
    try:
        ts = datetime.fromisoformat(timestamp_str)
        return datetime.now() - ts < timedelta(minutes=minutes)
    except:
        return False

@app.get("/health")
async def health_check():
    """Health check"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

dashboard_dir = Path(__file__).parent / "static"
dashboard_dir.mkdir(exist_ok=True)

@app.get("/")
async def serve_dashboard():
    """Serve dashboard"""
    index_file = dashboard_dir / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "Dashboard API running. Frontend at /static/index.html"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
"@ | Out-File -FilePath "C:\Genesis\dashboard\api.py" -Encoding UTF8
```

**Expected Output:** File created

### Create Dashboard Frontend (HTML)

**Location:** `C:\Genesis\dashboard\static\index.html`

**This file is too large for a single PowerShell command. Create it manually:**

1. Open Notepad on the Windows Server
2. Copy the HTML content below
3. Save as: `C:\Genesis\dashboard\static\index.html`

**HTML Content:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Genesis Mission Control</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0a0e1a; color: #e0e0e0; font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace; line-height: 1.6; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3); }
        .header h1 { font-size: 2.5em; font-weight: 700; margin-bottom: 15px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px; }
        .stat-card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 8px; padding: 15px; border: 1px solid rgba(255, 255, 255, 0.2); }
        .stat-card .label { font-size: 0.9em; opacity: 0.8; margin-bottom: 5px; }
        .stat-card .value { font-size: 2em; font-weight: 700; }
        .section { background: #1a1e2e; border-radius: 12px; padding: 25px; margin-bottom: 25px; border: 1px solid #2a2e3e; }
        .section-title { font-size: 1.5em; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #667eea; }
        .event-feed { max-height: 600px; overflow-y: auto; }
        .event { background: #252936; border-left: 4px solid #00ff00; padding: 15px; margin-bottom: 10px; border-radius: 6px; transition: all 0.3s ease; }
        .event:hover { background: #2a2f3e; transform: translateX(5px); }
        .event.error { border-left-color: #ff4444; }
        .event.warning { border-left-color: #ffaa00; }
        .event .timestamp { color: #888; font-size: 0.85em; margin-bottom: 5px; }
        .event .agent-name { color: #667eea; font-weight: 600; margin-right: 10px; }
        .event .message { color: #e0e0e0; }
        .agents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; }
        .agent-card { background: #252936; border-radius: 8px; padding: 15px; border: 2px solid #2a2e3e; transition: all 0.3s ease; }
        .agent-card:hover { border-color: #667eea; transform: translateY(-2px); }
        .agent-card.active { border-color: #00ff00; box-shadow: 0 0 20px rgba(0, 255, 0, 0.2); }
        .agent-card .name { font-weight: 600; margin-bottom: 8px; font-size: 1.1em; }
        .agent-card .status { font-size: 0.85em; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 5px; }
        .agent-card .status.active { background: rgba(0, 255, 0, 0.2); color: #00ff00; }
        .agent-card .status.idle { background: rgba(136, 136, 136, 0.2); color: #888; }
        .agent-card .last-active { font-size: 0.8em; color: #888; }
        .businesses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .business-card { background: #252936; border-radius: 8px; padding: 20px; border: 2px solid #2a2e3e; }
        .business-card.live { border-color: #00ff00; }
        .business-card.building { border-color: #ffaa00; }
        .business-card.failed { border-color: #ff4444; }
        .business-card .name { font-size: 1.3em; font-weight: 600; margin-bottom: 10px; }
        .business-card .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 0.85em; font-weight: 600; margin-bottom: 15px; }
        .business-card .status-badge.live { background: rgba(0, 255, 0, 0.2); color: #00ff00; }
        .business-card .status-badge.building { background: rgba(255, 170, 0, 0.2); color: #ffaa00; }
        .business-card .status-badge.failed { background: rgba(255, 68, 68, 0.2); color: #ff4444; }
        .business-card .link { display: block; color: #667eea; text-decoration: none; margin: 5px 0; font-size: 0.9em; }
        .business-card .link:hover { text-decoration: underline; }
        .loading { text-align: center; padding: 40px; color: #888; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        ::-webkit-scrollbar { width: 10px; }
        ::-webkit-scrollbar-track { background: #1a1e2e; }
        ::-webkit-scrollbar-thumb { background: #667eea; border-radius: 5px; }
        ::-webkit-scrollbar-thumb:hover { background: #764ba2; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 GENESIS MISSION CONTROL</h1>
            <div class="stats-grid">
                <div class="stat-card"><div class="label">Active Businesses</div><div class="value" id="stat-active">0</div></div>
                <div class="stat-card"><div class="label">Total Revenue</div><div class="value" id="stat-revenue">$0</div></div>
                <div class="stat-card"><div class="label">Total Costs</div><div class="value" id="stat-costs">$0</div></div>
                <div class="stat-card"><div class="label">Net Profit</div><div class="value" id="stat-profit">$0</div></div>
                <div class="stat-card"><div class="label">Events (24h)</div><div class="value" id="stat-events">0</div></div>
            </div>
        </div>
        <div class="section">
            <h2 class="section-title">🤖 Agent Status (25 Agents)</h2>
            <div id="agents-container" class="agents-grid"><div class="loading pulse">Loading agents...</div></div>
        </div>
        <div class="section">
            <h2 class="section-title">🏢 Business Portfolio</h2>
            <div id="businesses-container" class="businesses-grid"><div class="loading pulse">Loading businesses...</div></div>
        </div>
        <div class="section">
            <h2 class="section-title">📡 Live Event Feed</h2>
            <div id="event-feed" class="event-feed"><div class="loading pulse">Waiting for events...</div></div>
        </div>
    </div>
    <script>
        const API_URL = window.location.origin;
        function formatTime(isoString) { const date = new Date(isoString); return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
        function timeAgo(isoString) { const date = new Date(isoString); const seconds = Math.floor((new Date() - date) / 1000); if (seconds < 60) return `${seconds}s ago`; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`; if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`; return `${Math.floor(seconds / 86400)}d ago`; }
        async function updateStats() { try { const response = await fetch(`${API_URL}/stats`); const data = await response.json(); document.getElementById('stat-active').textContent = data.businesses.live; document.getElementById('stat-revenue').textContent = `$${data.revenue.toFixed(2)}`; document.getElementById('stat-costs').textContent = `$${data.costs.toFixed(2)}`; document.getElementById('stat-profit').textContent = `$${data.profit.toFixed(2)}`; document.getElementById('stat-events').textContent = data.events_24h; } catch (error) { console.error('Failed to update stats:', error); } }
        async function updateAgents() { try { const response = await fetch(`${API_URL}/agents/status`); const agents = await response.json(); const container = document.getElementById('agents-container'); if (agents.length === 0) { container.innerHTML = '<div class="loading">No agent activity yet</div>'; return; } container.innerHTML = agents.map(agent => `<div class="agent-card ${agent.status}"><div class="name">${agent.name}</div><div class="status ${agent.status}">${agent.status}</div><div class="last-active">${timeAgo(agent.last_active)}</div></div>`).join(''); } catch (error) { console.error('Failed to update agents:', error); } }
        async function updateBusinesses() { try { const response = await fetch(`${API_URL}/businesses`); const businesses = await response.json(); const container = document.getElementById('businesses-container'); if (businesses.length === 0) { container.innerHTML = '<div class="loading">No businesses created yet</div>'; return; } container.innerHTML = businesses.map(biz => `<div class="business-card ${biz.status}"><div class="name">${biz.name}</div><div class="status-badge ${biz.status}">${biz.status.toUpperCase()}</div>${biz.deployment_url ? `<a href="${biz.deployment_url}" target="_blank" class="link">🌐 View Live Site</a>` : ''}${biz.github_url ? `<a href="${biz.github_url}" target="_blank" class="link">📦 GitHub Repo</a>` : ''}<div style="margin-top: 10px; font-size: 0.85em; color: #888;">Created: ${timeAgo(biz.created_at)}</div></div>`).join(''); } catch (error) { console.error('Failed to update businesses:', error); } }
        async function updateEvents() { try { const response = await fetch(`${API_URL}/events/recent?limit=50`); const events = await response.json(); const container = document.getElementById('event-feed'); if (events.length === 0) { container.innerHTML = '<div class="loading pulse">Waiting for events...</div>'; return; } container.innerHTML = events.map(event => { let className = 'event'; if (event.type.includes('error') || event.type.includes('failed')) className += ' error'; else if (event.type.includes('warning')) className += ' warning'; return `<div class="${className}"><div class="timestamp">${formatTime(event.timestamp)}</div>${event.agent_name ? `<span class="agent-name">${event.agent_name}:</span>` : ''}<span class="message">${event.message || event.type}</span></div>`; }).join(''); } catch (error) { console.error('Failed to update events:', error); } }
        function updateAll() { updateStats(); updateAgents(); updateBusinesses(); updateEvents(); }
        updateAll(); setInterval(updateAll, 5000);
    </script>
</body>
</html>
```

**Save the file.**

---

## 🌐 Part 4: Configure IIS (Internet Information Services)

### Install IIS

**In PowerShell as Administrator:**

```powershell
# Install IIS
Install-WindowsFeature -Name Web-Server -IncludeManagementTools

# Install URL Rewrite module (for reverse proxy)
# Download URL Rewrite
Invoke-WebRequest -Uri "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi" -OutFile "C:\Downloads\urlrewrite.msi"

# Install URL Rewrite
Start-Process msiexec.exe -ArgumentList "/i C:\Downloads\urlrewrite.msi /quiet" -Wait

# Install Application Request Routing (ARR) for reverse proxy
Invoke-WebRequest -Uri "https://download.microsoft.com/download/E/9/8/E9849D6A-020E-47E4-9FD0-A023E99B54EB/requestRouter_amd64.msi" -OutFile "C:\Downloads\arr.msi"
Start-Process msiexec.exe -ArgumentList "/i C:\Downloads\arr.msi /quiet" -Wait
```

**Expected Output:** IIS installed successfully

### Enable ARR Proxy

```powershell
# Open IIS Manager programmatically and enable proxy
Import-Module WebAdministration

# Set ARR proxy settings
Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter "system.webServer/proxy" -Name "enabled" -Value "True"
```

### Create IIS Site for Dashboard

```powershell
# Remove default website
Remove-WebSite -Name "Default Web Site"

# Create new site
New-WebSite -Name "GenesisDashboard" -Port 80 -PhysicalPath "C:\Genesis\dashboard\static" -ApplicationPool "DefaultAppPool"

# Configure reverse proxy to port 8001
$ruleName = "ReverseProxyToAPI"
$siteName = "GenesisDashboard"

Add-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/rewrite/rules" -Name "." -Value @{
    name = $ruleName
    stopProcessing = 'True'
}

Set-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/rewrite/rules/rule[@name='$ruleName']/match" -Name "url" -Value "^api/(.*)"

Add-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/rewrite/rules/rule[@name='$ruleName']/action" -Name "." -Value @{
    type = 'Rewrite'
    url = 'http://localhost:8001/{R:1}'
}
```

**Alternative: Manual IIS Configuration**

If the PowerShell commands don't work, configure manually:

1. Open **IIS Manager**
   - Press `Windows Key`
   - Type "IIS"
   - Click "Internet Information Services (IIS) Manager"

2. **Remove Default Website:**
   - Expand server name
   - Right-click "Default Web Site"
   - Click "Remove"

3. **Create New Site:**
   - Right-click "Sites"
   - Click "Add Website"
   - Site name: `GenesisDashboard`
   - Physical path: `C:\Genesis\dashboard\static`
   - Port: `80`
   - Click "OK"

4. **Configure Reverse Proxy:**
   - Click on "GenesisDashboard" site
   - Double-click "URL Rewrite"
   - Click "Add Rule(s)" in right panel
   - Select "Reverse Proxy"
   - Enter: `localhost:8001`
   - Click "OK"

---

## 🔥 Part 5: Configure Windows Firewall

### Allow HTTP Traffic

```powershell
# Allow port 80 (HTTP)
New-NetFirewallRule -DisplayName "Allow HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Allow port 443 (HTTPS) for future SSL
New-NetFirewallRule -DisplayName "Allow HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# Allow port 8001 for Dashboard API (localhost only)
New-NetFirewallRule -DisplayName "Dashboard API" -Direction Inbound -Protocol TCP -LocalPort 8001 -Action Allow -RemoteAddress LocalSubnet
```

**Expected Output:** Firewall rules created

---

## 🌍 Part 6: Configure DNS

**In your domain registrar for `taxtok.org`:**

Add these DNS records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 135.181.100.213 | 300 |
| A | www | 135.181.100.213 | 300 |

**Wait 10-15 minutes for DNS to propagate.**

---

## 🚀 Part 7: Start Dashboard API

### Test Dashboard API Manually First

```powershell
cd C:\Genesis\dashboard
python api.py
```

**Expected Output:**
```
INFO:     Started server process [...]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001
```

**Press `Ctrl+C` to stop it.** (We'll make it auto-start next)

### Create Windows Service for Dashboard API

**We'll use NSSM (Non-Sucking Service Manager) to run Python as a service:**

```powershell
# Download NSSM
Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile "C:\Downloads\nssm.zip"

# Extract NSSM
Expand-Archive -Path "C:\Downloads\nssm.zip" -DestinationPath "C:\Downloads\nssm"

# Copy nssm.exe to system directory
Copy-Item "C:\Downloads\nssm\nssm-2.24\win64\nssm.exe" -Destination "C:\Windows\System32\"

# Install Dashboard API as Windows service
nssm install GenesisDashboardAPI python "C:\Genesis\dashboard\api.py"
nssm set GenesisDashboardAPI AppDirectory "C:\Genesis\dashboard"
nssm set GenesisDashboardAPI DisplayName "Genesis Dashboard API"
nssm set GenesisDashboardAPI Description "Genesis Mission Control Dashboard API"
nssm set GenesisDashboardAPI Start SERVICE_AUTO_START

# Start the service
Start-Service GenesisDashboardAPI
```

**Expected Output:** Service installed and started

### Verify Dashboard API Service

```powershell
Get-Service GenesisDashboardAPI
```

**Expected Output:** Status should be "Running"

---

## 🧪 Part 8: Test Everything

### Test 1: Dashboard API Health

```powershell
Invoke-WebRequest -Uri "http://localhost:8001/health" | Select-Object -ExpandProperty Content
```

**Expected Output:** `{"status":"healthy","timestamp":"..."}`

### Test 2: Send Test Event

```powershell
cd C:\Genesis
python -c "from infrastructure.event_emitter import GenesisEventEmitter; emitter = GenesisEventEmitter(api_url='http://localhost:8001'); emitter.emit('test_event', {'test': 'data'}, message='🧪 Dashboard test successful!'); print('✅ Test event sent')"
```

**Expected Output:** `✅ Test event sent`

### Test 3: Verify Event Was Stored

```powershell
Invoke-WebRequest -Uri "http://localhost:8001/events/recent" | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json
```

**Expected Output:** JSON array with your test event

### Test 4: Test IIS

```powershell
Invoke-WebRequest -Uri "http://localhost/" | Select-Object StatusCode
```

**Expected Output:** `StatusCode : 200`

### Test 5: Test From Browser (On Windows Server)

Open **Internet Explorer** or **Edge** and go to:

**http://localhost**

**Expected:** Genesis Mission Control dashboard loads

### Test 6: Test From Outside (After DNS Propagates)

**On your local computer**, open browser and go to:

**http://taxtok.org**

**Expected:** Dashboard loads (wait 10-15 min after DNS setup)

---

## 🔗 Part 9: Integrate Genesis Meta Agent

### Add Event Emitter to Your Genesis Code

**Wherever your Genesis meta agent Python file is located**, add these modifications:

**1. Add import at the top:**

```python
import sys
sys.path.append('C:\\Genesis')
from infrastructure.event_emitter import GenesisEventEmitter
```

**2. Initialize in `__init__` method:**

```python
# Dashboard Integration
self.event_emitter = GenesisEventEmitter(
    api_url="http://localhost:8001"
)
logger.info("✅ Dashboard event emitter initialized")
```

**3. Add event emissions throughout your code:**

```python
# Example: Business generation started
self.event_emitter.emit(
    event_type="business_generation_started",
    business_name=business_name,
    agent_name="Genesis",
    message=f"🎯 Starting {business_name}",
    data={"type": business_type}
)

# Example: Agent completed work
self.event_emitter.emit(
    event_type="agent_completed",
    business_name=business_name,
    agent_name="Spec Agent",
    message="✅ Generated specifications",
    data={"file_count": 12}
)

# Example: Deployment complete
self.event_emitter.emit(
    event_type="deployment_complete",
    business_name=business_name,
    agent_name="Genesis",
    message=f"✅ {business_name} is LIVE!",
    data={
        "url": deployment_url,
        "github": github_url
    }
)
```

---

## 🔒 Part 10: Optional - Add SSL Certificate

### Using Let's Encrypt with Win-ACME

```powershell
# Download Win-ACME
Invoke-WebRequest -Uri "https://github.com/win-acme/win-acme/releases/download/v2.2.8.1623/win-acme.v2.2.8.1623.x64.trimmed.zip" -OutFile "C:\Downloads\win-acme.zip"

# Extract
Expand-Archive -Path "C:\Downloads\win-acme.zip" -DestinationPath "C:\win-acme"

# Run Win-ACME (interactive)
cd C:\win-acme
.\wacs.exe
```

**Follow the prompts:**
1. Choose option `N` (Create new certificate)
2. Choose option `1` (Single binding of an IIS site)
3. Select your `GenesisDashboard` site
4. Choose default options for everything else
5. Enter your email when asked

**Expected Output:** SSL certificate installed, HTTPS now works

Now dashboard is available at: **https://taxtok.org**

---

## 📊 Part 11: Verify Everything Works

### Final Checklist

**In PowerShell:**

```powershell
# Check Dashboard API service
Get-Service GenesisDashboardAPI

# Check IIS
Get-Website | Where-Object {$_.Name -eq "GenesisDashboard"}

# Test API health
Invoke-WebRequest -Uri "http://localhost:8001/health"

# Test DNS (after 10-15 min)
nslookup taxtok.org
```

**In Browser (on local computer):**

Go to: **http://taxtok.org**

**Expected:** Beautiful Genesis Mission Control dashboard

---

## 🐛 Troubleshooting

### Dashboard API Won't Start

**Check if Python is in PATH:**
```powershell
python --version
```

**Check service status:**
```powershell
Get-Service GenesisDashboardAPI
Get-EventLog -LogName Application -Source GenesisDashboardAPI -Newest 10
```

**Start service manually:**
```powershell
Start-Service GenesisDashboardAPI
```

### IIS Not Working

**Check if IIS is running:**
```powershell
Get-Service W3SVC
```

**Start IIS:**
```powershell
Start-Service W3SVC
```

**Check IIS site:**
```powershell
Get-Website
```

### Can't Access Dashboard From Outside

**Check Windows Firewall:**
```powershell
Get-NetFirewallRule -DisplayName "Allow HTTP"
```

**Check if port 80 is listening:**
```powershell
netstat -an | findstr ":80"
```

**Test DNS:**
```powershell
nslookup taxtok.org
```

Should show `135.181.100.213`

### Events Not Showing Up

**Check Dashboard API logs:**
```powershell
# View service logs
Get-EventLog -LogName Application -Newest 50 | Where-Object {$_.Source -eq "GenesisDashboardAPI"}
```

**Test event emission:**
```powershell
python -c "from infrastructure.event_emitter import GenesisEventEmitter; e = GenesisEventEmitter(); e.emit('test', {}, message='Test'); print('Sent')"
```

### Port Already In Use

**Find what's using port 8001:**
```powershell
netstat -ano | findstr ":8001"
```

**Kill the process:**
```powershell
Stop-Process -Id <PID> -Force
```

---

## ✅ Verification Checklist

- [ ] Python installed and working
- [ ] Dashboard files created in `C:\Genesis\`
- [ ] Dashboard API service running
- [ ] IIS installed and running
- [ ] IIS site created and working
- [ ] Windows Firewall allows port 80
- [ ] DNS points to `135.181.100.213`
- [ ] Dashboard loads at `http://taxtok.org`
- [ ] Test event successfully sent
- [ ] Genesis meta agent has event emitter integrated

---

## 📝 Summary

You now have a complete Genesis Dashboard deployment at:

- **URL:** http://taxtok.org (or https:// if SSL configured)
- **Dashboard API:** Running as Windows service on port 8001
- **Web Server:** IIS serving dashboard on port 80
- **Database:** SQLite at `C:\Genesis\dashboard\genesis_events.db`
- **Auto-start:** Windows service starts on boot

The dashboard updates every 5 seconds and shows:
- 🤖 Real-time agent status (all 25 agents)
- 🏢 Business portfolio with live/building/failed states
- 📡 Live event feed in plain English
- 💰 Revenue, costs, and profit tracking

---

## 🎯 Next Steps

1. **Run Genesis** and watch events appear in real-time at http://taxtok.org
2. **Add more event emissions** throughout Genesis code for better visibility
3. **Monitor agent performance** and business creation progress
4. **Scale to multiple VPS** instances (all reporting to same dashboard)

---

## 📂 File Structure

```
C:\Genesis\
├── infrastructure\
│   └── event_emitter.py
└── dashboard\
    ├── api.py
    ├── genesis_events.db (created on first run)
    └── static\
        └── index.html
```

---

## 🔄 Managing the Dashboard

### Stop Dashboard API

```powershell
Stop-Service GenesisDashboardAPI
```

### Start Dashboard API

```powershell
Start-Service GenesisDashboardAPI
```

### Restart Dashboard API

```powershell
Restart-Service GenesisDashboardAPI
```

### View Dashboard API Status

```powershell
Get-Service GenesisDashboardAPI
```

### View Dashboard API Logs

```powershell
Get-EventLog -LogName Application -Source GenesisDashboardAPI -Newest 20
```

---

**Dashboard is ready! Open http://taxtok.org and watch your Genesis agents work!** 🚀