# Phase 5A Deployment Checklist

**Status:** 90% Complete - Ready for Docker deployment
**Created:** November 8, 2025
**Estimated Time to 100%:** 30 minutes - 2 hours

---

## Pre-Deployment Checklist

### 1. Secret Files ✅

**Location:** `secrets/`

- [x] `skyvern_api_key.txt` created
- [ ] **CRITICAL:** Replace placeholder with real Skyvern API key
- [x] `openai_api_key.txt` extracted from .env (128 chars)
- [x] `anthropic_api_key.txt` extracted from .env (108 chars)
- [x] `skyvern_db_password.txt` generated (44 chars, secure)

**Action Required:**
```bash
# Edit this file and replace the placeholder
notepad secrets/skyvern_api_key.txt

# OR use command line (replace YOUR_REAL_KEY)
echo "YOUR_REAL_KEY" > secrets/skyvern_api_key.txt
```

### 2. Directory Structure ✅

- [x] `skyvern_tasks/` created (6 YAML files)
- [x] `skyvern_workflows/` created (empty, ready for future workflows)
- [x] `skyvern_data/` created (empty, will store task execution data)
- [x] `scripts/` created (postgres_init.sh)
- [x] `infrastructure/browser_automation/` created (SkyvernClient)

### 3. YAML Task Definitions ✅ 6/6

- [x] `submit_product_hunt.yaml` (2,060 bytes)
- [x] `submit_betalist.yaml` (1,759 bytes)
- [x] `submit_hackernews.yaml` (1,214 bytes)
- [x] `submit_indiehackers.yaml` (1,475 bytes)
- [x] `submit_microlaunch.yaml` (1,550 bytes)
- [x] `submit_saashub.yaml` (1,891 bytes)

### 4. Python Client ✅

- [x] `infrastructure/browser_automation/skyvern_client.py` (12,664 bytes)
- [x] `infrastructure/browser_automation/__init__.py` (252 bytes)

### 5. Middleware Framework ✅

- [x] `infrastructure/middleware/base.py` (3,781 bytes)
- [x] `infrastructure/middleware/policy_middleware.py` (16,660 bytes)
- [x] `infrastructure/middleware/capability_middleware.py` (23,948 bytes)
- [x] `infrastructure/middleware/toolrm_middleware.py` (25,719 bytes)

---

## Deployment Steps

### Step 1: Verify Secret Files (5 minutes)

```bash
# Navigate to project directory
cd "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\Claude Clean Code"

# Run validation
python -c "
from pathlib import Path
secrets = Path('secrets')
for f in ['skyvern_api_key.txt', 'openai_api_key.txt', 'anthropic_api_key.txt', 'skyvern_db_password.txt']:
    p = secrets / f
    content = p.read_text().strip()
    status = 'PLACEHOLDER' if 'placeholder' in content.lower() else f'{len(content)} chars'
    print(f'{f}: {status}')
"
```

**Expected Output:**
```
skyvern_api_key.txt: 64 chars  (NOT "PLACEHOLDER")
openai_api_key.txt: 128 chars
anthropic_api_key.txt: 108 chars
skyvern_db_password.txt: 44 chars
```

**If you see "PLACEHOLDER":**
1. Get your Skyvern API key from https://www.skyvern.com/dashboard
2. Replace the placeholder:
   ```bash
   echo "sk-skyvern-YOUR_REAL_KEY_HERE" > secrets/skyvern_api_key.txt
   ```

### Step 2: Deploy Skyvern Docker Service (10 minutes)

```bash
# Start Skyvern services in detached mode
docker-compose -f docker-compose.skyvern.yml up -d

# Expected output:
# Creating network "genesis-internal"
# Creating volume "skyvern_db"
# Creating volume "skyvern_logs"
# Creating genesis-skyvern-db
# Creating genesis-skyvern
```

### Step 3: Verify Container Status (2 minutes)

```bash
# Check container status
docker-compose -f docker-compose.skyvern.yml ps

# Expected output:
# NAME                  STATUS
# genesis-skyvern       Up 30 seconds  Healthy
# genesis-skyvern-db    Up 35 seconds  Healthy
```

**If containers are "starting":**
- Wait 30-60 seconds for health checks to pass
- Run `docker-compose -f docker-compose.skyvern.yml ps` again

**If containers are "unhealthy":**
```bash
# Check logs
docker logs genesis-skyvern --tail 50
docker logs genesis-skyvern-db --tail 50

# Look for errors like:
# - "Authentication failed" → Check API keys
# - "Connection refused" → Database not ready, wait longer
# - "Permission denied" → Check file permissions
```

### Step 4: Test Health Endpoint (2 minutes)

```bash
# Test Skyvern health endpoint
curl http://localhost:8000/health

# Expected output:
# {"status": "healthy"}
```

**If connection refused:**
- Service not fully started yet, wait 30 seconds
- Check containers are running: `docker-compose -f docker-compose.skyvern.yml ps`

**If authentication error:**
- Check `secrets/skyvern_api_key.txt` is correct
- Restart container: `docker-compose -f docker-compose.skyvern.yml restart skyvern-backend`

### Step 5: Run Integration Test (5 minutes)

Create test file:
```bash
cat > test_skyvern.py << 'EOF'
import asyncio
import sys
sys.path.insert(0, 'infrastructure')

from browser_automation.skyvern_client import SkyvernClient

async def main():
    client = SkyvernClient()

    # Health check
    print("Testing health check...")
    healthy = await client.health_check()

    if healthy:
        print("✓ Skyvern service is HEALTHY")
        print("✓ Integration test PASSED")
        return 0
    else:
        print("✗ Skyvern service is UNHEALTHY")
        print("✗ Integration test FAILED")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
EOF

# Run test
python test_skyvern.py
```

**Expected Output:**
```
Testing health check...
✓ Skyvern service is HEALTHY
✓ Integration test PASSED
```

---

## Post-Deployment Validation

### Validate All Components

```bash
# Run full validation
python -c "
from pathlib import Path
import subprocess
import json

print('='*60)
print('PHASE 5A DEPLOYMENT VALIDATION')
print('='*60)

# 1. Secret files
print('\n1. Secret Files:')
secrets_ok = True
for f in ['skyvern_api_key.txt', 'openai_api_key.txt', 'anthropic_api_key.txt', 'skyvern_db_password.txt']:
    p = Path('secrets') / f
    if p.exists():
        content = p.read_text().strip()
        if 'placeholder' in content.lower():
            print(f'   [FAIL] {f}: Still using placeholder')
            secrets_ok = False
        else:
            print(f'   [OK] {f}')
    else:
        print(f'   [FAIL] {f}: Missing')
        secrets_ok = False

# 2. Docker containers
print('\n2. Docker Containers:')
try:
    result = subprocess.run(
        ['docker', 'ps', '--filter', 'name=genesis-skyvern', '--format', '{{.Names}}:{{.Status}}'],
        capture_output=True, text=True, timeout=10
    )
    containers = result.stdout.strip().split('\n')
    docker_ok = len([c for c in containers if 'Up' in c]) >= 2
    for container in containers:
        if container:
            name, status = container.split(':', 1)
            print(f'   [OK] {name}: {status}' if 'Up' in status else f'   [FAIL] {name}: {status}')
except Exception as e:
    print(f'   [FAIL] Docker check failed: {e}')
    docker_ok = False

# 3. Skyvern health
print('\n3. Skyvern Health:')
try:
    import urllib.request
    response = urllib.request.urlopen('http://localhost:8000/health', timeout=10)
    health_data = response.read().decode()
    print(f'   [OK] Health endpoint: {health_data}')
    health_ok = True
except Exception as e:
    print(f'   [FAIL] Health endpoint: {e}')
    health_ok = False

# 4. Task definitions
print('\n4. Task Definitions:')
tasks = list(Path('skyvern_tasks').glob('*.yaml'))
print(f'   [OK] {len(tasks)} YAML task files')
tasks_ok = len(tasks) >= 6

# 5. Python client
print('\n5. Python Client:')
client_file = Path('infrastructure/browser_automation/skyvern_client.py')
print(f'   [OK] SkyvernClient: {client_file.stat().st_size} bytes' if client_file.exists() else '   [FAIL] SkyvernClient: Missing')
client_ok = client_file.exists()

# Summary
print('\n' + '='*60)
print('SUMMARY')
print('='*60)
all_ok = secrets_ok and docker_ok and health_ok and tasks_ok and client_ok
if all_ok:
    print('✓ ALL CHECKS PASSED')
    print('\nPhase 5A: 100% COMPLETE')
    print('Ready for production use!')
else:
    print('✗ SOME CHECKS FAILED')
    print('\nPhase 5A: ~90% COMPLETE')
    print('Fix issues above before production use.')
"
```

---

## Troubleshooting

### Issue: Container won't start

**Symptoms:**
```
docker-compose -f docker-compose.skyvern.yml ps
# Shows: genesis-skyvern  Restarting
```

**Solution:**
```bash
# Check logs
docker logs genesis-skyvern --tail 100

# Common issues:
# 1. API key invalid → Replace in secrets/skyvern_api_key.txt
# 2. Port 8000 in use → Change port in docker-compose.skyvern.yml
# 3. Database not ready → Wait 60 seconds, database takes time to initialize
```

### Issue: Health check fails

**Symptoms:**
```bash
curl http://localhost:8000/health
# Returns: Connection refused
```

**Solution:**
```bash
# 1. Check container is running
docker ps | grep genesis-skyvern

# 2. Check container logs
docker logs genesis-skyvern --tail 50

# 3. Check port is exposed
docker port genesis-skyvern
# Should show: 8000/tcp -> 0.0.0.0:8000

# 4. Wait longer (service takes 30-60s to fully start)
sleep 30 && curl http://localhost:8000/health
```

### Issue: Authentication errors

**Symptoms:**
```
docker logs genesis-skyvern
# Shows: Authentication failed: Invalid API key
```

**Solution:**
```bash
# 1. Verify API key is correct
cat secrets/skyvern_api_key.txt
# Should NOT contain "placeholder"

# 2. Replace with real key
echo "sk-skyvern-YOUR_REAL_KEY" > secrets/skyvern_api_key.txt

# 3. Restart container
docker-compose -f docker-compose.skyvern.yml restart skyvern-backend

# 4. Wait 30 seconds and check health
sleep 30 && curl http://localhost:8000/health
```

---

## Rollback Procedure

If deployment fails and you need to rollback:

```bash
# Stop and remove containers
docker-compose -f docker-compose.skyvern.yml down

# Remove volumes (CAUTION: deletes all task data)
docker volume rm genesis_skyvern_db
docker volume rm genesis_skyvern_logs

# Remove network
docker network rm genesis-internal

# Start from scratch
docker-compose -f docker-compose.skyvern.yml up -d
```

---

## Success Criteria

Phase 5A is considered **100% complete** when:

- [ ] All secret files exist and contain real values (no placeholders)
- [ ] Docker containers are running and healthy
- [ ] Health endpoint returns `{"status": "healthy"}`
- [ ] Integration test passes
- [ ] At least 6 YAML task definitions exist
- [ ] SkyvernClient can be imported without errors

**Current Status:** 90% (Docker deployment pending)

**Blockers:**
1. Skyvern API key placeholder needs replacement
2. Docker service not started

**Estimated Time to 100%:** 30 minutes - 2 hours (depending on API key availability)

---

## Next Steps After 100% Completion

### Phase 5B: MarketingAgent Integration (2-4 hours)

1. Modify `agents/marketing_agent.py`
2. Add `submit_to_directories()` method using SkyvernClient
3. Create integration tests
4. Test with real directory submissions

### Phase 5C: Monitoring & Optimization (1 week)

1. Track directory submission success rates
2. Optimize YAML task definitions based on failures
3. Add more directories (AlternativeTo, G2, Capterra)
4. Implement workflow orchestration

---

**Document Created:** November 8, 2025
**Owner:** Phase 5A Execution Coordinator
**Status:** READY FOR DEPLOYMENT
