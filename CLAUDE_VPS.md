# CLAUDE.md for VPS Deployment

**THIS FILE IS FOR CLAUDE CODE RUNNING ON THE CONTABO VPS (154.12.244.112)**

This file provides guidance to Claude Code when working with the Genesis system deployed on the Contabo Windows VPS.

---

## VPS Environment Overview

**VPS Details:**
- Provider: Contabo VPS 20 SSD
- OS: Windows Server
- IP: 154.12.244.112
- RAM: 12 GB
- CPU: 6 cores
- Storage: 200 GB SSD
- Location: C:\Genesis

**Cloud Services:**
- MongoDB Atlas (FREE tier): genesisvps.bcno0n2.mongodb.net
- Redis Cloud (FREE tier): redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com

**Running Services:**
- A2A Service: Port 8000 (REST API for 26 agents)
- Dashboard API: Port 5001 (Monitoring backend)
- Dashboard UI: Port 3000 (Next.js frontend)

---

## Key Differences from Local Development

### 1. Environment Mode
```env
GENESIS_ENV=production
ENVIRONMENT=production
```
**VPS runs in PRODUCTION mode** - different security, logging, and error handling than local development.

### 2. Database Configuration
```env
# Cloud-hosted MongoDB (not local)
MONGODB_URI=mongodb+srv://genesisvps:chartres6693@genesisvps.bcno0n2.mongodb.net/

# Cloud-hosted Redis (not local)
REDIS_URI=redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436
```
**No local database installation required** - all data is in the cloud.

### 3. File Paths
All Genesis files are located at: `C:\Genesis`

```powershell
# NOT: C:\Users\Ben\Desktop\Github\Claude-Clean-Code-Genesis
# YES: C:\Genesis
```

### 4. Service Management
Services run via batch files:
- `C:\Genesis\START_A2A_SERVICE.bat`
- `C:\Genesis\START_DASHBOARD_API.bat`
- `C:\Genesis\START_DASHBOARD_UI.bat`

---

## Common Commands for VPS

### Check Service Status
```powershell
# See all running Genesis services
Get-Process | Where-Object {$_.ProcessName -match "python|node"}

# Check specific service ports
Test-NetConnection -ComputerName localhost -Port 8000  # A2A
Test-NetConnection -ComputerName localhost -Port 5001  # Dashboard API
Test-NetConnection -ComputerName localhost -Port 3000  # Dashboard UI
```

### View Logs
```powershell
# Real-time log viewing
Get-Content C:\Genesis\logs\genesis_agent.log -Wait -Tail 50

# View specific log sections
Get-Content C:\Genesis\logs\genesis_agent.log -Tail 100 | Select-String "ERROR"
Get-Content C:\Genesis\logs\infrastructure.log -Tail 100

# Dashboard events
Get-Content C:\Genesis\logs\business_generation\events.jsonl -Tail 20
```

### Restart Services
```powershell
# Stop service: Ctrl+C in the PowerShell window running the service

# Start service: Run the batch file again
C:\Genesis\START_A2A_SERVICE.bat
C:\Genesis\START_DASHBOARD_API.bat
C:\Genesis\START_DASHBOARD_UI.bat
```

### Test Database Connections
```powershell
# Test MongoDB Atlas
python -c "from pymongo import MongoClient; print(MongoClient('mongodb+srv://genesisvps:chartres6693@genesisvps.bcno0n2.mongodb.net/').admin.command('ping'))"

# Test Redis Cloud
python -c "import redis; r=redis.from_url('redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436'); print(r.ping())"
```

### Run Business Generation
```powershell
cd C:\Genesis

# Generate single business
python scripts\autonomous_fully_integrated.py --count 1 --min-score 70.0

# Generate multiple businesses
python scripts\autonomous_fully_integrated.py --count 3 --min-score 75.0

# Continuous autonomous operation
python scripts\autonomous_business_orchestrator.py --continuous
```

### Check System Health
```powershell
# Check API health
curl http://localhost:8000/health
curl http://localhost:5001/health

# List available agents
curl http://localhost:8000/agents

# View metrics
curl http://localhost:5001/api/metrics
```

---

## Important VPS-Specific Notes

### 1. No Local Development Mode
The VPS does NOT use development mode. Always work in production context:
- Security checks are enforced
- Agent authentication required
- Circuit breakers active
- Full observability enabled

### 2. Resource Constraints
- RAM: 12 GB (monitor usage with `Get-Process`)
- CPU: 6 cores (parallel operations are optimized)
- Storage: 200 GB (monitor with `Get-PSDrive C`)

### 3. Network Access
Services are accessible from external IPs:
- A2A API: http://154.12.244.112:8000
- Dashboard API: http://154.12.244.112:5001
- Dashboard UI: http://154.12.244.112:3000

**Security**: Windows Firewall configured for these ports only.

### 4. Auto-Start (Optional)
Services can be configured as Windows Services using NSSM:
```powershell
# Install NSSM: https://nssm.cc/download
C:\nssm\nssm.exe install GenesisA2A "C:\Python312\python.exe" "C:\Genesis\a2a_fastapi.py"
C:\nssm\nssm.exe start GenesisA2A
```

---

## Troubleshooting on VPS

### Service Won't Start
1. Check if port is already in use:
   ```powershell
   Get-NetTCPConnection -LocalPort 8000
   ```
2. Check logs for errors:
   ```powershell
   Get-Content C:\Genesis\logs\genesis_agent.log -Tail 50
   ```
3. Verify Python/Node are installed:
   ```powershell
   python --version  # Should be 3.12.4
   node --version    # Should be 20.x
   ```

### MongoDB Connection Fails
1. Verify VPS IP is whitelisted in MongoDB Atlas:
   - Go to https://cloud.mongodb.com
   - Network Access → Check 154.12.244.112 is listed
2. Test connection string:
   ```powershell
   python -c "from pymongo import MongoClient; print(MongoClient('mongodb+srv://genesisvps:chartres6693@genesisvps.bcno0n2.mongodb.net/').list_database_names())"
   ```

### Redis Connection Fails
1. Verify Redis Cloud endpoint is correct
2. Test connection:
   ```powershell
   python -c "import redis; r=redis.from_url('redis://default:HUnUEhJub6XmKqUyo6XmQr9RST9GIZgX@redis-13436.c52.us-east-1-4.ec2.cloud.redislabs.com:13436'); print(r.info())"
   ```

### Port Not Accessible Externally
1. Check Windows Firewall rules:
   ```powershell
   Get-NetFirewallRule -DisplayName "Genesis*"
   ```
2. Check Contabo control panel firewall settings
3. Verify service is running:
   ```powershell
   Get-Process | Where-Object {$_.ProcessName -eq "python"}
   ```

### High Memory Usage
```powershell
# Check memory usage
Get-Process python | Sort-Object WorkingSet -Descending | Select-Object -First 5

# If needed, restart services to free memory
# Stop: Ctrl+C in service window
# Start: Run .bat file again
```

---

## Development Workflow on VPS

### Making Code Changes
1. **Edit files locally** on your development PC
2. **Test locally** first (if possible)
3. **Copy updated files to VPS**:
   ```powershell
   # From local PC:
   Copy-Item "C:\Users\Ben\Desktop\Github\Claude-Clean-Code-Genesis\infrastructure\*.py" "\\154.12.244.112\C$\Genesis\infrastructure\" -Recurse -Force
   ```
4. **Restart affected services** on VPS

### Git Workflow (Recommended)
```powershell
# On VPS:
cd C:\Genesis
git pull origin main
# Then restart services
```

### Testing Changes
```powershell
# Run tests on VPS
cd C:\Genesis
python -m pytest tests/ -v

# Or run specific test suite
python scripts\verify_all_systems.py
```

---

## Monitoring & Metrics

### Real-Time Dashboard
Access at: http://154.12.244.112:3000

Shows:
- Total businesses generated
- Revenue potential
- Quality scores
- Active agents
- System health

### Log Files Location
```
C:\Genesis\logs\
├── genesis_agent.log          # Main agent logs
├── infrastructure.log          # Infrastructure logs
├── nightly-es-training.log    # ES training logs
└── business_generation\
    └── events.jsonl           # Dashboard events
```

### Metrics Files
```
C:\Genesis\metrics\
└── es_training_metrics.json   # Evolution strategies metrics
```

---

## Production Safety

### What's Enabled
- ✓ Agent authentication (AGENT_AUTH_MASTER_SECRET)
- ✓ Circuit breakers (auto-disable failing components)
- ✓ Prompt shield (input sanitization)
- ✓ Task counter (prevent infinite loops)
- ✓ Sandbox execution (isolated environments)
- ✓ Rate limiting (per-agent limits)
- ✓ Cost optimization (DAAO routing)

### What to Avoid
- ❌ Never disable AGENT_AUTH_ENABLED in production
- ❌ Don't expose .env file (contains API keys)
- ❌ Don't run as Administrator unnecessarily
- ❌ Don't disable circuit breakers without monitoring
- ❌ Don't ignore ERROR logs

---

## Quick Reference

### Service URLs
```
A2A API:       http://154.12.244.112:8000
A2A Docs:      http://154.12.244.112:8000/docs
Dashboard API: http://154.12.244.112:5001
Dashboard UI:  http://154.12.244.112:3000
Health Check:  http://154.12.244.112:8000/health
```

### Common Paths
```
Code:          C:\Genesis
Logs:          C:\Genesis\logs
Config:        C:\Genesis\.env
Businesses:    C:\Genesis\businesses\fully_integrated
Data:          C:\Genesis\data
```

### Key Environment Variables
```env
GENESIS_ENV=production
MONGODB_URI=mongodb+srv://genesisvps:chartres6693@...
REDIS_URI=redis://default:HUnU...@redis-13436...
AGENT_AUTH_MASTER_SECRET=3N8qxK9pRLmV7jYfC2nW5aB1sD4tE6uG8hI0jK2lM4nO6pQ8rS0tU2vW4xY6zA8b
A2A_API_KEY=tdbEVGqBpmFShznkmb2rLaQTElZZXzkmnatZabr9ig8
```

---

## When Working with Claude Code on VPS

### Context for Claude
When asking Claude Code for help on the VPS, provide:
1. **Environment**: "I'm on the Contabo VPS (154.12.244.112)"
2. **Service**: "Working with [A2A Service / Dashboard / Business Generation]"
3. **Error logs**: Copy relevant error messages from logs
4. **What you tried**: Steps already attempted

### Example Prompts
```
"On the VPS, the A2A service won't start. Here's the error from C:\Genesis\logs\genesis_agent.log: [paste error]"

"I'm on the VPS and need to generate 10 businesses. What command should I run?"

"The Dashboard UI on the VPS shows no data. How do I check if the Dashboard API is running?"
```

---

## Architecture Reminder

The VPS runs the **same 79-integration Genesis system** as local development, with these active services:

**Layer 1 - Orchestration:**
- HTDAG (task decomposition)
- HALO (agent routing)
- AOP (plan validation)
- DAAO (cost optimization)

**Layer 2 - Evolution:**
- SE-Darwin (self-improvement)
- TrajectoryPool (learning memory)
- DreamGym (synthetic RL - if enabled)

**Layer 3 - Communication:**
- A2A Protocol (26 agents exposed via REST API)

**Layer 6 - Memory:**
- Memori SQL (MongoDB-backed)
- CaseBank (case-based reasoning)
- Memory×Router (hybrid retrieval)

All 26 agents are available via the A2A Service on port 8000.

---

## Support & Documentation

**Main Documentation**: See C:\Genesis\CLAUDE.md for full system documentation

**VPS-Specific Guides**:
- `DEPLOY_TO_CONTABO_VPS.md` - Full deployment guide
- `READY_TO_DEPLOY.md` - Quick start guide
- `VPS_QUICK_START.md` - 5-step deployment

**For Issues**:
1. Check logs: `C:\Genesis\logs\genesis_agent.log`
2. Test databases: MongoDB Atlas / Redis Cloud connections
3. Verify services: `Get-Process | Where-Object {$_.ProcessName -match "python|node"}`
4. Check firewall: `Get-NetFirewallRule -DisplayName "Genesis*"`

---

**VPS Status**: Production-ready deployment with MongoDB Atlas + Redis Cloud
**Last Updated**: 2025-11-21
**Deployment Version**: Genesis v79 (all integrations active)
