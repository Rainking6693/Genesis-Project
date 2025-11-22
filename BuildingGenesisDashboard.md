\# Genesis Dashboard - Complete Deployment Guide



This guide provides step-by-step instructions to deploy the Genesis Mission Control Dashboard on a new VPS.



---



\## 📋 Prerequisites



\*\*VPS Details:\*\*

\- IP Address: `135.181.100.213`

\- OS: Ubuntu 22.04 or later

\- RAM: 4GB minimum

\- Domain: `taxtok.org` (DNS A records pointing to `135.181.100.213`)



\*\*Required Access:\*\*

\- SSH access to VPS as root or sudo user

\- Domain registrar access to set DNS records



---



\## ⚙️ Part 1: Install Dependencies



ff

\### SSH into VPS



```bash

ssh root@135.181.100.213

```



\### Update System and Install Required Packages



```bash

apt update \&\& apt upgrade -y

apt install -y python3 python3-pip python3-venv nginx

```



\### Install Python Packages



```bash

pip3 install fastapi uvicorn requests

```



\*\*Expected Output:\*\* Packages installed successfully



---



\## 📁 Part 2: Create Dashboard Infrastructure



\### Create Event Emitter Module



\*\*Location:\*\* `/root/genesis/genesis-rebuild/infrastructure/event\_emitter.py`



```bash

mkdir -p /root/genesis/genesis-rebuild/infrastructure



cat > /root/genesis/genesis-rebuild/infrastructure/event\_emitter.py << 'EOF'

"""Event Emitter for Genesis Dashboard Integration"""

import requests

import logging

from datetime import datetime

from typing import Dict, Any, Optional

import json



logger = logging.getLogger("event\_emitter")



class GenesisEventEmitter:

&nbsp;   """Sends events from Genesis to Dashboard API"""

&nbsp;   

&nbsp;   def \_\_init\_\_(self, api\_url: str = "http://localhost:8001"):

&nbsp;       self.api\_url = api\_url.rstrip('/')

&nbsp;       self.enabled = True

&nbsp;       logger.info(f"EventEmitter initialized: {self.api\_url}")

&nbsp;   

&nbsp;   def emit(self, event\_type: str, data: Dict\[str, Any], 

&nbsp;            business\_name: Optional\[str] = None,

&nbsp;            agent\_name: Optional\[str] = None,

&nbsp;            message: Optional\[str] = None):

&nbsp;       """

&nbsp;       Send an event to the dashboard

&nbsp;       

&nbsp;       Args:

&nbsp;           event\_type: Type of event (e.g., 'agent\_started', 'deployment\_complete')

&nbsp;           data: Event payload

&nbsp;           business\_name: Name of business being worked on

&nbsp;           agent\_name: Name of agent performing action

&nbsp;           message: Human-readable message

&nbsp;       """

&nbsp;       if not self.enabled:

&nbsp;           return

&nbsp;       

&nbsp;       try:

&nbsp;           payload = {

&nbsp;               "timestamp": datetime.now().isoformat(),

&nbsp;               "type": event\_type,

&nbsp;               "business\_name": business\_name,

&nbsp;               "agent\_name": agent\_name,

&nbsp;               "message": message,

&nbsp;               "data": data

&nbsp;           }

&nbsp;           

&nbsp;           response = requests.post(

&nbsp;               f"{self.api\_url}/events",

&nbsp;               json=payload,

&nbsp;               timeout=2

&nbsp;           )

&nbsp;           

&nbsp;           if response.status\_code != 200:

&nbsp;               logger.warning(f"Dashboard API returned {response.status\_code}")

&nbsp;               

&nbsp;       except requests.exceptions.RequestException as e:

&nbsp;           logger.debug(f"Could not send event to dashboard: {e}")

&nbsp;       except Exception as e:

&nbsp;           logger.error(f"Event emission error: {e}")

&nbsp;   

&nbsp;   def disable(self):

&nbsp;       """Disable event emission"""

&nbsp;       self.enabled = False

&nbsp;       logger.info("EventEmitter disabled")

&nbsp;   

&nbsp;   def enable(self):

&nbsp;       """Enable event emission"""

&nbsp;       self.enabled = True

&nbsp;       logger.info("EventEmitter enabled")

EOF

```



\*\*Expected Output:\*\* File created



---



\## 🖥️ Part 3: Create Dashboard API



\*\*Location:\*\* `/root/genesis/genesis-rebuild/dashboard/api.py`



```bash

mkdir -p /root/genesis/genesis-rebuild/dashboard



cat > /root/genesis/genesis-rebuild/dashboard/api.py << 'EOF'

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



app.add\_middleware(

&nbsp;   CORSMiddleware,

&nbsp;   allow\_origins=\["\*"],

&nbsp;   allow\_credentials=True,

&nbsp;   allow\_methods=\["\*"],

&nbsp;   allow\_headers=\["\*"],

)



DB\_PATH = Path(\_\_file\_\_).parent / "genesis\_events.db"



def init\_db():

&nbsp;   """Initialize SQLite database"""

&nbsp;   conn = sqlite3.connect(str(DB\_PATH))

&nbsp;   conn.execute("""

&nbsp;       CREATE TABLE IF NOT EXISTS events (

&nbsp;           id INTEGER PRIMARY KEY AUTOINCREMENT,

&nbsp;           timestamp TEXT NOT NULL,

&nbsp;           event\_type TEXT NOT NULL,

&nbsp;           business\_name TEXT,

&nbsp;           agent\_name TEXT,

&nbsp;           message TEXT,

&nbsp;           data TEXT,

&nbsp;           created\_at TEXT DEFAULT CURRENT\_TIMESTAMP

&nbsp;       )

&nbsp;   """)

&nbsp;   

&nbsp;   conn.execute("""

&nbsp;       CREATE TABLE IF NOT EXISTS businesses (

&nbsp;           id INTEGER PRIMARY KEY AUTOINCREMENT,

&nbsp;           name TEXT UNIQUE NOT NULL,

&nbsp;           status TEXT,

&nbsp;           deployment\_url TEXT,

&nbsp;           github\_url TEXT,

&nbsp;           revenue REAL DEFAULT 0,

&nbsp;           costs REAL DEFAULT 0,

&nbsp;           created\_at TEXT DEFAULT CURRENT\_TIMESTAMP,

&nbsp;           updated\_at TEXT DEFAULT CURRENT\_TIMESTAMP

&nbsp;       )

&nbsp;   """)

&nbsp;   

&nbsp;   conn.execute("""

&nbsp;       CREATE INDEX IF NOT EXISTS idx\_events\_timestamp 

&nbsp;       ON events(timestamp DESC)

&nbsp;   """)

&nbsp;   

&nbsp;   conn.execute("""

&nbsp;       CREATE INDEX IF NOT EXISTS idx\_events\_business 

&nbsp;       ON events(business\_name)

&nbsp;   """)

&nbsp;   

&nbsp;   conn.commit()

&nbsp;   conn.close()



init\_db()



@app.post("/events")

async def receive\_event(event: dict):

&nbsp;   """Receive event from Genesis"""

&nbsp;   conn = sqlite3.connect(str(DB\_PATH))

&nbsp;   

&nbsp;   try:

&nbsp;       conn.execute("""

&nbsp;           INSERT INTO events (timestamp, event\_type, business\_name, agent\_name, message, data)

&nbsp;           VALUES (?, ?, ?, ?, ?, ?)

&nbsp;       """, (

&nbsp;           event.get("timestamp", datetime.now().isoformat()),

&nbsp;           event.get("type"),

&nbsp;           event.get("business\_name"),

&nbsp;           event.get("agent\_name"),

&nbsp;           event.get("message"),

&nbsp;           json.dumps(event.get("data", {}))

&nbsp;       ))

&nbsp;       

&nbsp;       if event.get("business\_name"):

&nbsp;           business\_name = event\["business\_name"]

&nbsp;           event\_type = event.get("type")

&nbsp;           

&nbsp;           if event\_type == "deployment\_complete":

&nbsp;               conn.execute("""

&nbsp;                   INSERT OR REPLACE INTO businesses (name, status, deployment\_url, github\_url, updated\_at)

&nbsp;                   VALUES (?, 'live', ?, ?, ?)

&nbsp;               """, (

&nbsp;                   business\_name,

&nbsp;                   event.get("data", {}).get("url"),

&nbsp;                   event.get("data", {}).get("github"),

&nbsp;                   datetime.now().isoformat()

&nbsp;               ))

&nbsp;           elif event\_type in \["deployment\_failed", "business\_killed"]:

&nbsp;               conn.execute("""

&nbsp;                   INSERT OR IGNORE INTO businesses (name, status, updated\_at)

&nbsp;                   VALUES (?, 'failed', ?)

&nbsp;               """, (business\_name, datetime.now().isoformat()))

&nbsp;               

&nbsp;               conn.execute("""

&nbsp;                   UPDATE businesses SET status = 'failed', updated\_at = ?

&nbsp;                   WHERE name = ?

&nbsp;               """, (datetime.now().isoformat(), business\_name))

&nbsp;           elif event\_type == "business\_generation\_started":

&nbsp;               conn.execute("""

&nbsp;                   INSERT OR IGNORE INTO businesses (name, status, updated\_at)

&nbsp;                   VALUES (?, 'building', ?)

&nbsp;               """, (business\_name, datetime.now().isoformat()))

&nbsp;       

&nbsp;       conn.commit()

&nbsp;       return {"status": "received", "event\_id": conn.lastrowid}

&nbsp;       

&nbsp;   except Exception as e:

&nbsp;       conn.rollback()

&nbsp;       raise HTTPException(status\_code=500, detail=str(e))

&nbsp;   finally:

&nbsp;       conn.close()



@app.get("/events/recent")

async def get\_recent\_events(limit: int = 100, business\_name: Optional\[str] = None):

&nbsp;   """Get recent events"""

&nbsp;   conn = sqlite3.connect(str(DB\_PATH))

&nbsp;   

&nbsp;   if business\_name:

&nbsp;       cursor = conn.execute("""

&nbsp;           SELECT \* FROM events 

&nbsp;           WHERE business\_name = ?

&nbsp;           ORDER BY id DESC 

&nbsp;           LIMIT ?

&nbsp;       """, (business\_name, limit))

&nbsp;   else:

&nbsp;       cursor = conn.execute("""

&nbsp;           SELECT \* FROM events 

&nbsp;           ORDER BY id DESC 

&nbsp;           LIMIT ?

&nbsp;       """, (limit,))

&nbsp;   

&nbsp;   events = \[]

&nbsp;   for row in cursor.fetchall():

&nbsp;       events.append({

&nbsp;           "id": row\[0],

&nbsp;           "timestamp": row\[1],

&nbsp;           "type": row\[2],

&nbsp;           "business\_name": row\[3],

&nbsp;           "agent\_name": row\[4],

&nbsp;           "message": row\[5],

&nbsp;           "data": json.loads(row\[6]) if row\[6] else {}

&nbsp;       })

&nbsp;   

&nbsp;   conn.close()

&nbsp;   return events



@app.get("/businesses")

async def get\_businesses():

&nbsp;   """Get all businesses"""

&nbsp;   conn = sqlite3.connect(str(DB\_PATH))

&nbsp;   cursor = conn.execute("""

&nbsp;       SELECT name, status, deployment\_url, github\_url, revenue, costs, created\_at, updated\_at

&nbsp;       FROM businesses

&nbsp;       ORDER BY updated\_at DESC

&nbsp;   """)

&nbsp;   

&nbsp;   businesses = \[]

&nbsp;   for row in cursor.fetchall():

&nbsp;       businesses.append({

&nbsp;           "name": row\[0],

&nbsp;           "status": row\[1],

&nbsp;           "deployment\_url": row\[2],

&nbsp;           "github\_url": row\[3],

&nbsp;           "revenue": row\[4],

&nbsp;           "costs": row\[5],

&nbsp;           "created\_at": row\[6],

&nbsp;           "updated\_at": row\[7]

&nbsp;       })

&nbsp;   

&nbsp;   conn.close()

&nbsp;   return businesses



@app.get("/agents/status")

async def get\_agent\_status():

&nbsp;   """Get status of all agents"""

&nbsp;   conn = sqlite3.connect(str(DB\_PATH))

&nbsp;   

&nbsp;   cursor = conn.execute("""

&nbsp;       SELECT agent\_name, MAX(timestamp) as last\_active, COUNT(\*) as event\_count

&nbsp;       FROM events

&nbsp;       WHERE agent\_name IS NOT NULL

&nbsp;       GROUP BY agent\_name

&nbsp;       ORDER BY last\_active DESC

&nbsp;   """)

&nbsp;   

&nbsp;   agents = \[]

&nbsp;   for row in cursor.fetchall():

&nbsp;       agents.append({

&nbsp;           "name": row\[0],

&nbsp;           "last\_active": row\[1],

&nbsp;           "event\_count": row\[2],

&nbsp;           "status": "active" if is\_recent(row\[1]) else "idle"

&nbsp;       })

&nbsp;   

&nbsp;   conn.close()

&nbsp;   return agents



@app.get("/stats")

async def get\_stats():

&nbsp;   """Get overall statistics"""

&nbsp;   conn = sqlite3.connect(str(DB\_PATH))

&nbsp;   

&nbsp;   cursor = conn.execute("""

&nbsp;       SELECT status, COUNT(\*) 

&nbsp;       FROM businesses 

&nbsp;       GROUP BY status

&nbsp;   """)

&nbsp;   status\_counts = dict(cursor.fetchall())

&nbsp;   

&nbsp;   cursor = conn.execute("""

&nbsp;       SELECT SUM(revenue), SUM(costs)

&nbsp;       FROM businesses

&nbsp;   """)

&nbsp;   revenue, costs = cursor.fetchone()

&nbsp;   

&nbsp;   yesterday = (datetime.now() - timedelta(days=1)).isoformat()

&nbsp;   cursor = conn.execute("""

&nbsp;       SELECT COUNT(\*)

&nbsp;       FROM events

&nbsp;       WHERE timestamp > ?

&nbsp;   """, (yesterday,))

&nbsp;   recent\_events = cursor.fetchone()\[0]

&nbsp;   

&nbsp;   conn.close()

&nbsp;   

&nbsp;   return {

&nbsp;       "businesses": {

&nbsp;           "live": status\_counts.get("live", 0),

&nbsp;           "building": status\_counts.get("building", 0),

&nbsp;           "failed": status\_counts.get("failed", 0),

&nbsp;           "total": sum(status\_counts.values())

&nbsp;       },

&nbsp;       "revenue": revenue or 0,

&nbsp;       "costs": costs or 0,

&nbsp;       "profit": (revenue or 0) - (costs or 0),

&nbsp;       "events\_24h": recent\_events

&nbsp;   }



def is\_recent(timestamp\_str: str, minutes: int = 5) -> bool:

&nbsp;   """Check if timestamp is recent"""

&nbsp;   try:

&nbsp;       ts = datetime.fromisoformat(timestamp\_str)

&nbsp;       return datetime.now() - ts < timedelta(minutes=minutes)

&nbsp;   except:

&nbsp;       return False



@app.get("/health")

async def health\_check():

&nbsp;   """Health check"""

&nbsp;   return {"status": "healthy", "timestamp": datetime.now().isoformat()}



dashboard\_dir = Path(\_\_file\_\_).parent / "static"

dashboard\_dir.mkdir(exist\_ok=True)



@app.get("/")

async def serve\_dashboard():

&nbsp;   """Serve dashboard"""

&nbsp;   index\_file = dashboard\_dir / "index.html"

&nbsp;   if index\_file.exists():

&nbsp;       return FileResponse(index\_file)

&nbsp;   return {"message": "Dashboard API running. Frontend at /static/index.html"}



if \_\_name\_\_ == "\_\_main\_\_":

&nbsp;   import uvicorn

&nbsp;   uvicorn.run(app, host="0.0.0.0", port=8001)

EOF

```



\*\*Expected Output:\*\* File created



---



\## 🎨 Part 4: Create Dashboard Frontend



\*\*Location:\*\* `/root/genesis/genesis-rebuild/dashboard/static/index.html`



```bash

mkdir -p /root/genesis/genesis-rebuild/dashboard/static



cat > /root/genesis/genesis-rebuild/dashboard/static/index.html << 'HTMLEOF'

<!DOCTYPE html>

<html lang="en">

<head>

&nbsp;   <meta charset="UTF-8">

&nbsp;   <meta name="viewport" content="width=device-width, initial-scale=1.0">

&nbsp;   <title>Genesis Mission Control</title>

&nbsp;   <style>

&nbsp;       \* { margin: 0; padding: 0; box-sizing: border-box; }

&nbsp;       body { background: #0a0e1a; color: #e0e0e0; font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace; line-height: 1.6; }

&nbsp;       .container { max-width: 1400px; margin: 0 auto; padding: 20px; }

&nbsp;       .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3); }

&nbsp;       .header h1 { font-size: 2.5em; font-weight: 700; margin-bottom: 15px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }

&nbsp;       .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px; }

&nbsp;       .stat-card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 8px; padding: 15px; border: 1px solid rgba(255, 255, 255, 0.2); }

&nbsp;       .stat-card .label { font-size: 0.9em; opacity: 0.8; margin-bottom: 5px; }

&nbsp;       .stat-card .value { font-size: 2em; font-weight: 700; }

&nbsp;       .section { background: #1a1e2e; border-radius: 12px; padding: 25px; margin-bottom: 25px; border: 1px solid #2a2e3e; }

&nbsp;       .section-title { font-size: 1.5em; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #667eea; }

&nbsp;       .event-feed { max-height: 600px; overflow-y: auto; }

&nbsp;       .event { background: #252936; border-left: 4px solid #00ff00; padding: 15px; margin-bottom: 10px; border-radius: 6px; transition: all 0.3s ease; }

&nbsp;       .event:hover { background: #2a2f3e; transform: translateX(5px); }

&nbsp;       .event.error { border-left-color: #ff4444; }

&nbsp;       .event.warning { border-left-color: #ffaa00; }

&nbsp;       .event .timestamp { color: #888; font-size: 0.85em; margin-bottom: 5px; }

&nbsp;       .event .agent-name { color: #667eea; font-weight: 600; margin-right: 10px; }

&nbsp;       .event .message { color: #e0e0e0; }

&nbsp;       .agents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; }

&nbsp;       .agent-card { background: #252936; border-radius: 8px; padding: 15px; border: 2px solid #2a2e3e; transition: all 0.3s ease; }

&nbsp;       .agent-card:hover { border-color: #667eea; transform: translateY(-2px); }

&nbsp;       .agent-card.active { border-color: #00ff00; box-shadow: 0 0 20px rgba(0, 255, 0, 0.2); }

&nbsp;       .agent-card .name { font-weight: 600; margin-bottom: 8px; font-size: 1.1em; }

&nbsp;       .agent-card .status { font-size: 0.85em; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 5px; }

&nbsp;       .agent-card .status.active { background: rgba(0, 255, 0, 0.2); color: #00ff00; }

&nbsp;       .agent-card .status.idle { background: rgba(136, 136, 136, 0.2); color: #888; }

&nbsp;       .agent-card .last-active { font-size: 0.8em; color: #888; }

&nbsp;       .businesses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }

&nbsp;       .business-card { background: #252936; border-radius: 8px; padding: 20px; border: 2px solid #2a2e3e; }

&nbsp;       .business-card.live { border-color: #00ff00; }

&nbsp;       .business-card.building { border-color: #ffaa00; }

&nbsp;       .business-card.failed { border-color: #ff4444; }

&nbsp;       .business-card .name { font-size: 1.3em; font-weight: 600; margin-bottom: 10px; }

&nbsp;       .business-card .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 0.85em; font-weight: 600; margin-bottom: 15px; }

&nbsp;       .business-card .status-badge.live { background: rgba(0, 255, 0, 0.2); color: #00ff00; }

&nbsp;       .business-card .status-badge.building { background: rgba(255, 170, 0, 0.2); color: #ffaa00; }

&nbsp;       .business-card .status-badge.failed { background: rgba(255, 68, 68, 0.2); color: #ff4444; }

&nbsp;       .business-card .link { display: block; color: #667eea; text-decoration: none; margin: 5px 0; font-size: 0.9em; }

&nbsp;       .business-card .link:hover { text-decoration: underline; }

&nbsp;       .loading { text-align: center; padding: 40px; color: #888; }

&nbsp;       .pulse { animation: pulse 2s infinite; }

&nbsp;       @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

&nbsp;       ::-webkit-scrollbar { width: 10px; }

&nbsp;       ::-webkit-scrollbar-track { background: #1a1e2e; }

&nbsp;       ::-webkit-scrollbar-thumb { background: #667eea; border-radius: 5px; }

&nbsp;       ::-webkit-scrollbar-thumb:hover { background: #764ba2; }

&nbsp;   </style>

</head>

<body>

&nbsp;   <div class="container">

&nbsp;       <div class="header">

&nbsp;           <h1>🚀 GENESIS MISSION CONTROL</h1>

&nbsp;           <div class="stats-grid">

&nbsp;               <div class="stat-card"><div class="label">Active Businesses</div><div class="value" id="stat-active">0</div></div>

&nbsp;               <div class="stat-card"><div class="label">Total Revenue</div><div class="value" id="stat-revenue">$0</div></div>

&nbsp;               <div class="stat-card"><div class="label">Total Costs</div><div class="value" id="stat-costs">$0</div></div>

&nbsp;               <div class="stat-card"><div class="label">Net Profit</div><div class="value" id="stat-profit">$0</div></div>

&nbsp;               <div class="stat-card"><div class="label">Events (24h)</div><div class="value" id="stat-events">0</div></div>

&nbsp;           </div>

&nbsp;       </div>

&nbsp;       <div class="section">

&nbsp;           <h2 class="section-title">🤖 Agent Status (25 Agents)</h2>

&nbsp;           <div id="agents-container" class="agents-grid"><div class="loading pulse">Loading agents...</div></div>

&nbsp;       </div>

&nbsp;       <div class="section">

&nbsp;           <h2 class="section-title">🏢 Business Portfolio</h2>

&nbsp;           <div id="businesses-container" class="businesses-grid"><div class="loading pulse">Loading businesses...</div></div>

&nbsp;       </div>

&nbsp;       <div class="section">

&nbsp;           <h2 class="section-title">📡 Live Event Feed</h2>

&nbsp;           <div id="event-feed" class="event-feed"><div class="loading pulse">Waiting for events...</div></div>

&nbsp;       </div>

&nbsp;   </div>

&nbsp;   <script>

&nbsp;       const API\_URL = window.location.origin;

&nbsp;       function formatTime(isoString) { const date = new Date(isoString); return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

&nbsp;       function timeAgo(isoString) { const date = new Date(isoString); const seconds = Math.floor((new Date() - date) / 1000); if (seconds < 60) return `${seconds}s ago`; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`; if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`; return `${Math.floor(seconds / 86400)}d ago`; }

&nbsp;       async function updateStats() { try { const response = await fetch(`${API\_URL}/stats`); const data = await response.json(); document.getElementById('stat-active').textContent = data.businesses.live; document.getElementById('stat-revenue').textContent = `$${data.revenue.toFixed(2)}`; document.getElementById('stat-costs').textContent = `$${data.costs.toFixed(2)}`; document.getElementById('stat-profit').textContent = `$${data.profit.toFixed(2)}`; document.getElementById('stat-events').textContent = data.events\_24h; } catch (error) { console.error('Failed to update stats:', error); } }

&nbsp;       async function updateAgents() { try { const response = await fetch(`${API\_URL}/agents/status`); const agents = await response.json(); const container = document.getElementById('agents-container'); if (agents.length === 0) { container.innerHTML = '<div class="loading">No agent activity yet</div>'; return; } container.innerHTML = agents.map(agent => `<div class="agent-card ${agent.status}"><div class="name">${agent.name}</div><div class="status ${agent.status}">${agent.status}</div><div class="last-active">${timeAgo(agent.last\_active)}</div></div>`).join(''); } catch (error) { console.error('Failed to update agents:', error); } }

&nbsp;       async function updateBusinesses() { try { const response = await fetch(`${API\_URL}/businesses`); const businesses = await response.json(); const container = document.getElementById('businesses-container'); if (businesses.length === 0) { container.innerHTML = '<div class="loading">No businesses created yet</div>'; return; } container.innerHTML = businesses.map(biz => `<div class="business-card ${biz.status}"><div class="name">${biz.name}</div><div class="status-badge ${biz.status}">${biz.status.toUpperCase()}</div>${biz.deployment\_url ? `<a href="${biz.deployment\_url}" target="\_blank" class="link">🌐 View Live Site</a>` : ''}${biz.github\_url ? `<a href="${biz.github\_url}" target="\_blank" class="link">📦 GitHub Repo</a>` : ''}<div style="margin-top: 10px; font-size: 0.85em; color: #888;">Created: ${timeAgo(biz.created\_at)}</div></div>`).join(''); } catch (error) { console.error('Failed to update businesses:', error); } }

&nbsp;       async function updateEvents() { try { const response = await fetch(`${API\_URL}/events/recent?limit=50`); const events = await response.json(); const container = document.getElementById('event-feed'); if (events.length === 0) { container.innerHTML = '<div class="loading pulse">Waiting for events...</div>'; return; } container.innerHTML = events.map(event => { let className = 'event'; if (event.type.includes('error') || event.type.includes('failed')) className += ' error'; else if (event.type.includes('warning')) className += ' warning'; return `<div class="${className}"><div class="timestamp">${formatTime(event.timestamp)}</div>${event.agent\_name ? `<span class="agent-name">${event.agent\_name}:</span>` : ''}<span class="message">${event.message || event.type}</span></div>`; }).join(''); } catch (error) { console.error('Failed to update events:', error); } }

&nbsp;       function updateAll() { updateStats(); updateAgents(); updateBusinesses(); updateEvents(); }

&nbsp;       updateAll(); setInterval(updateAll, 5000);

&nbsp;   </script>

</body>

</html>

HTMLEOF

```



\*\*Expected Output:\*\* File created



---



\## 🌐 Part 5: Configure Nginx



\### Install Nginx (if not already installed)



```bash

apt install -y nginx

```



\### Create Nginx Configuration for Dashboard



```bash

cat > /etc/nginx/sites-available/genesis-dashboard << 'EOF'

server {

&nbsp;   listen 80;

&nbsp;   server\_name taxtok.org www.taxtok.org;



&nbsp;   location / {

&nbsp;       proxy\_pass http://127.0.0.1:8001;

&nbsp;       proxy\_http\_version 1.1;

&nbsp;       proxy\_set\_header Upgrade $http\_upgrade;

&nbsp;       proxy\_set\_header Connection "upgrade";

&nbsp;       proxy\_set\_header Host $host;

&nbsp;       proxy\_cache\_bypass $http\_upgrade;

&nbsp;       proxy\_set\_header X-Real-IP $remote\_addr;

&nbsp;       proxy\_set\_header X-Forwarded-For $proxy\_add\_x\_forwarded\_for;

&nbsp;       proxy\_set\_header X-Forwarded-Proto $scheme;

&nbsp;   }

}

EOF

```



\### Enable the Site



```bash

\# Remove default nginx site

rm -f /etc/nginx/sites-enabled/default



\# Link genesis-dashboard config

ln -s /etc/nginx/sites-available/genesis-dashboard /etc/nginx/sites-enabled/



\# Test configuration

nginx -t

```



\*\*Expected Output:\*\* `nginx: configuration file test is successful`



\### Start Nginx



```bash

systemctl start nginx

systemctl enable nginx

```



\*\*Expected Output:\*\* Nginx started successfully



---



\## 🔥 Part 6: Configure Firewall



\### Allow Required Ports



```bash

ufw allow 22/tcp

ufw allow 80/tcp

ufw allow 443/tcp

ufw --force enable

```



\*\*Expected Output:\*\* Firewall configured and enabled



---



\## 🌍 Part 7: Configure DNS



\*\*In your domain registrar for `taxtok.org`:\*\*



Add these DNS records:



| Type | Name | Value | TTL |

|------|------|-------|-----|

| A | @ | 135.181.100.213 | 300 |

| A | www | 135.181.100.213 | 300 |



\*\*Wait 10-15 minutes for DNS to propagate.\*\*



---



\## 🚀 Part 8: Start Dashboard API



\### Start Dashboard API as Background Service



```bash

cd /root/genesis/genesis-rebuild/dashboard

nohup python3 api.py > dashboard.log 2>\&1 \&

```



\*\*Expected Output:\*\* Dashboard API running in background



\### Verify Dashboard API is Running



```bash

ps aux | grep api.py

```



\*\*Expected Output:\*\* Should show python3 process running api.py



\### Test Dashboard API



```bash

curl http://localhost:8001/health

```



\*\*Expected Output:\*\* 

```json

{"status":"healthy","timestamp":"2025-11-21T..."}

```



---



\## 🧪 Part 9: Test Everything



\### Test 1: Dashboard API Health



```bash

curl http://localhost:8001/health

```



\*\*Expected:\*\* `{"status":"healthy",...}`



\### Test 2: Send Test Event



```bash

cd /root/genesis/genesis-rebuild

python3 -c "

from infrastructure.event\_emitter import GenesisEventEmitter

emitter = GenesisEventEmitter(api\_url='http://localhost:8001')

emitter.emit('test\_event', {'test': 'data'}, message='🧪 Dashboard test successful!')

print('✅ Test event sent')

"

```



\*\*Expected:\*\* `✅ Test event sent`



\### Test 3: Verify Event Was Stored



```bash

curl http://localhost:8001/events/recent | python3 -m json.tool

```



\*\*Expected:\*\* JSON array with your test event



\### Test 4: Test From Browser



\*\*Wait 10-15 minutes after DNS setup, then:\*\*



Open browser and go to: \*\*http://taxtok.org\*\*



\*\*Expected:\*\* Beautiful Genesis Mission Control dashboard



---



\## 🔗 Part 10: Integrate Genesis Meta Agent



\### Add Event Emitter Import



\*\*In your Genesis meta agent file\*\* (`genesis\_meta\_agent.py`), add this import at the top:



```python

from infrastructure.event\_emitter import GenesisEventEmitter

```



\### Initialize Event Emitter



\*\*In the `\_\_init\_\_` method of your Genesis class\*\*, add:



```python

\# Dashboard Integration

self.event\_emitter = GenesisEventEmitter(

&nbsp;   api\_url=os.getenv("DASHBOARD\_API\_URL", "http://localhost:8001")

)

logger.info("✅ Dashboard event emitter initialized")

```



\### Add Event Emissions



\*\*Throughout your Genesis code\*\*, add event emissions at key points:



```python

\# Example: When business generation starts

self.event\_emitter.emit(

&nbsp;   event\_type="business\_generation\_started",

&nbsp;   business\_name=business\_spec.name,

&nbsp;   agent\_name="Genesis",

&nbsp;   message=f"🎯 Starting {business\_spec.name}",

&nbsp;   data={"type": business\_spec.business\_type}

)



\# Example: When agent completes work

self.event\_emitter.emit(

&nbsp;   event\_type="agent\_completed",

&nbsp;   business\_name=business\_spec.name,

&nbsp;   agent\_name="Spec Agent",

&nbsp;   message=f"✅ Generated specifications",

&nbsp;   data={"file\_count": len(files)}

)



\# Example: When deployment completes

self.event\_emitter.emit(

&nbsp;   event\_type="deployment\_complete",

&nbsp;   business\_name=business\_spec.name,

&nbsp;   agent\_name="Genesis",

&nbsp;   message=f"✅ {business\_spec.name} is LIVE!",

&nbsp;   data={

&nbsp;       "url": deployment\_url,

&nbsp;       "github": github\_url

&nbsp;   }

)

```



---



\## 🔒 Part 11: Optional - Add SSL Certificate



\### Install Certbot



```bash

apt install -y certbot python3-certbot-nginx

```



\### Get SSL Certificate



```bash

certbot --nginx -d taxtok.org -d www.taxtok.org --non-interactive --agree-tos -m your-email@example.com

```



\*\*Replace `your-email@example.com` with your actual email.\*\*



\*\*Expected Output:\*\* `Successfully received certificate`



Now dashboard is available at: \*\*https://taxtok.org\*\*



---



\## 📊 Part 12: Make Dashboard API Auto-Start on Boot



\### Create Systemd Service



```bash

cat > /etc/systemd/system/genesis-dashboard.service << 'EOF'

\[Unit]

Description=Genesis Dashboard API

After=network.target



\[Service]

Type=simple

User=root

WorkingDirectory=/root/genesis/genesis-rebuild/dashboard

ExecStart=/usr/bin/python3 /root/genesis/genesis-rebuild/dashboard/api.py

Restart=always

RestartSec=10



\[Install]

WantedBy=multi-user.target

EOF

```



\### Enable and Start Service



```bash

systemctl daemon-reload

systemctl enable genesis-dashboard

systemctl start genesis-dashboard

```



\### Check Service Status



```bash

systemctl status genesis-dashboard

```



\*\*Expected Output:\*\* `Active: active (running)`



---



\## ✅ Verification Checklist



\- \[ ] Dashboard API responds at `http://localhost:8001/health`

\- \[ ] Test event successfully sent and stored

\- \[ ] Nginx is running and configured correctly

\- \[ ] Firewall allows ports 80 and 443

\- \[ ] DNS records point to `135.181.100.213`

\- \[ ] Dashboard loads at `http://taxtok.org`

\- \[ ] Genesis meta agent has event emitter integrated

\- \[ ] Dashboard auto-starts on VPS reboot



---



\## 🐛 Troubleshooting



\### Dashboard doesn't load in browser



\*\*Check DNS:\*\*

```bash

ping -4 taxtok.org

```

Should show `135.181.100.213`



\*\*Check if Nginx is running:\*\*

```bash

systemctl status nginx

```



\*\*Check if Dashboard API is running:\*\*

```bash

ps aux | grep api.py

```



\### Events not showing up



\*\*Check Dashboard API logs:\*\*

```bash

tail -f /root/genesis/genesis-rebuild/dashboard/dashboard.log

```



\*\*Test event emission manually:\*\*

```bash

curl -X POST http://localhost:8001/events \\

&nbsp; -H "Content-Type: application/json" \\

&nbsp; -d '{"type":"test","message":"Manual test"}'

```



\### Port already in use



\*\*Check what's using port 8001:\*\*

```bash

sudo lsof -i :8001

```



\*\*Kill the process:\*\*

```bash

sudo kill -9 <PID>

```



---



\## 📝 Summary



You now have a complete Genesis Dashboard deployment at:

\- \*\*URL:\*\* http://taxtok.org (or https:// if SSL configured)

\- \*\*Dashboard API:\*\* Running on port 8001

\- \*\*Database:\*\* SQLite at `/root/genesis/genesis-rebuild/dashboard/genesis\_events.db`

\- \*\*Auto-start:\*\* Systemd service ensures dashboard runs on boot



The dashboard updates every 5 seconds and shows:

\- 🤖 Real-time agent status

\- 🏢 Business portfolio with live/building/failed states

\- 📡 Live event feed in plain English

\- 💰 Revenue, costs, and profit tracking



---



\## 🎯 Next Steps



1\. Run Genesis and watch events appear in real-time

2\. Add more event emissions throughout Genesis code for better visibility

3\. Monitor agent performance and business creation

4\. Scale to multiple VPS instances (all reporting to same dashboard)



---



\*\*Dashboard is ready! Open http://taxtok.org and watch your Genesis agents work!\*\* 🚀

