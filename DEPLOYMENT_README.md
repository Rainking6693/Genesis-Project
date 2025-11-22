# Genesis Production Deployment Guide

**Created:** November 8, 2025
**Updated:** November 8, 2025
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Deployment Options](#deployment-options)
5. [Configuration](#configuration)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Security](#security)

---

## Overview

Genesis is a multi-service AI agent system with the following components:

| Service | Description | Port | Type |
|---------|-------------|------|------|
| **A2A Service** | Main API Gateway | 8000 | Web |
| **Autonomous Scheduler** | Business generation worker | N/A | Worker |
| **Skyvern** | Browser automation | 8001 | Web |
| **DeepSeek OCR** | Document OCR service | 8002 | Web |
| **MongoDB** | Shared memory storage | 27017 | Database |
| **Redis** | Caching & state | 6379 | Cache |
| **PostgreSQL** | Skyvern database | 5432 | Database |

**Total Stack:** 7 services + 3 cron jobs + monitoring (Prometheus + Grafana)

---

## Prerequisites

### Required Software

- **Docker:** 24.0+ with Docker Compose v2
- **Git:** For version control
- **Python:** 3.12+ (for local development)

### Optional Software

- **kubectl:** For Kubernetes deployments
- **Railway CLI:** For Railway deployments
- **Render CLI:** For Render deployments

### Required API Keys

- **OpenAI API Key:** `sk-...` (GPT-4o for orchestration)
- **Anthropic API Key:** `sk-ant-...` (Claude for code generation)
- **Google API Key:** For Gemini (high-throughput tasks)
- **Skyvern API Key:** (if using browser automation)

### Recommended Resources

**Minimum:**
- CPU: 4 cores
- RAM: 8GB
- Disk: 50GB

**Production:**
- CPU: 8+ cores
- RAM: 16GB+
- Disk: 100GB+

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/genesis.git
cd genesis
```

### 2. Create Secrets

```bash
# Create secrets directory
mkdir -p secrets

# Add API keys (one per file, no newlines)
echo -n "sk-your-openai-key" > secrets/openai_api_key.txt
echo -n "sk-ant-your-anthropic-key" > secrets/anthropic_api_key.txt
echo -n "your-google-key" > secrets/google_api_key.txt
echo -n "your-skyvern-key" > secrets/skyvern_api_key.txt

# Generate strong passwords
openssl rand -base64 32 > secrets/mongodb_password.txt
openssl rand -base64 32 > secrets/skyvern_db_password.txt
openssl rand -base64 32 > secrets/grafana_admin_password.txt
```

### 3. Configure Environment

```bash
# Copy production environment template
cp .env.production .env.production.local

# Edit with your values
nano .env.production.local
```

**Required variables:**

```bash
GENESIS_ENV=production
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
MONGODB_URI=mongodb://genesis:PASSWORD@genesis-mongodb:27017/genesis
REDIS_URL=redis://:PASSWORD@genesis-redis:6379
```

### 4. Validate Configuration

```bash
# Make validation script executable
chmod +x validate_deployment.sh

# Run validation
./validate_deployment.sh
```

### 5. Deploy

```bash
# Build all services
docker compose -f docker-compose.production.yml build

# Start all services
docker compose -f docker-compose.production.yml up -d

# Check status
docker compose -f docker-compose.production.yml ps

# View logs
docker compose -f docker-compose.production.yml logs -f
```

### 6. Verify Deployment

```bash
# Health checks
curl http://localhost:8000/health  # A2A Service
curl http://localhost:8001/health  # Skyvern
curl http://localhost:8002/health  # OCR Service

# Access Grafana
open http://localhost:3000  # admin / (password from secrets/grafana_admin_password.txt)

# Access Prometheus
open http://localhost:9090
```

---

## Deployment Options

### Option 1: Docker Compose (Recommended for Single Server)

**Pros:** Simple, fast, full control
**Cons:** Single server, manual scaling
**Cost:** $28-56/month (VPS)

```bash
# Deploy full stack
docker compose -f docker-compose.production.yml up -d

# Deploy core services only (no monitoring)
docker compose -f docker-compose.production.yml up -d a2a-service autonomous-scheduler genesis-mongodb genesis-redis

# Deploy with Skyvern
docker compose -f docker-compose.production.yml up -d a2a-service autonomous-scheduler skyvern-backend

# Scale A2A service to 3 instances
docker compose -f docker-compose.production.yml up -d --scale a2a-service=3
```

**Configuration file:** `docker-compose.production.yml`

---

### Option 2: Railway (Recommended for PaaS)

**Pros:** Auto-scaling, managed databases, cron jobs, zero-config SSL
**Cons:** Vendor lock-in, higher cost at scale
**Cost:** ~$100/month (all services)

#### Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Add database plugins
railway add --plugin mongodb
railway add --plugin redis
railway add --plugin postgresql

# Set environment variables
railway variables set OPENAI_API_KEY=sk-...
railway variables set ANTHROPIC_API_KEY=sk-ant-...
railway variables set GOOGLE_API_KEY=...

# Deploy
railway up
```

**Configuration file:** `railway.toml`

**Features:**
- ✅ 4 web services (A2A, Scheduler, Skyvern, OCR)
- ✅ 3 cron jobs (ES training, DB cleanup, health monitoring)
- ✅ Auto-scaling based on CPU/memory
- ✅ Built-in logging and metrics
- ✅ Zero-downtime deployments

---

### Option 3: Render

**Pros:** Generous free tier, simple pricing, auto-scaling
**Cons:** No native MongoDB (use Atlas), limited regions
**Cost:** ~$42/month (all Starter) or $7/month (single service + free DBs)

#### Setup

```bash
# 1. Create Render account
# Visit: https://render.com/signup

# 2. Connect GitHub repository
# Dashboard > New > Blueprint
# - Select repository
# - Choose branch: main
# - Render auto-detects render.yaml

# 3. Set environment variables for each service
# Dashboard > Service > Environment
# Add all secrets from .env.production

# 4. Deploy
# Render auto-deploys on git push to main
# Or manually: Dashboard > Service > Manual Deploy
```

**Configuration file:** `render.yaml`

**Features:**
- ✅ 4 web services + 1 worker
- ✅ 3 cron jobs
- ✅ Free PostgreSQL and Redis add-ons
- ✅ Auto-deploy on git push
- ✅ Free SSL certificates

**Note:** Use MongoDB Atlas (free M0 cluster) for MongoDB.

---

### Option 4: Kubernetes (GKE/EKS/AKS)

**Pros:** Ultimate scalability, cloud-native, HA out-of-the-box
**Cons:** Complex setup, higher cost, requires K8s expertise
**Cost:** ~$340/month (3 nodes on GKE/EKS)

#### Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Install cloud CLI (choose one)
gcloud init  # Google Cloud
aws configure  # AWS
az login  # Azure
```

#### Setup

```bash
# 1. Build and push Docker images
docker build -t gcr.io/your-project/genesis-a2a:latest .
docker push gcr.io/your-project/genesis-a2a:latest

# 2. Create namespace
kubectl create namespace genesis-production

# 3. Create secrets
kubectl create secret generic genesis-secrets \
  --from-literal=OPENAI_API_KEY=sk-... \
  --from-literal=ANTHROPIC_API_KEY=sk-ant-... \
  --from-literal=GOOGLE_API_KEY=... \
  --from-literal=MONGODB_URI=mongodb://... \
  --from-literal=REDIS_URL=redis://... \
  --from-literal=REDIS_PASSWORD=... \
  --from-literal=MONGODB_PASSWORD=... \
  --from-literal=POSTGRES_PASSWORD=... \
  --from-literal=SKYVERN_API_KEY=... \
  --from-literal=SLACK_WEBHOOK_URL=https://hooks.slack.com/... \
  -n genesis-production

# 4. Deploy
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# 5. Verify
kubectl get all -n genesis-production
kubectl get pods -n genesis-production
kubectl get services -n genesis-production

# 6. Access services
kubectl port-forward svc/genesis-a2a-service 8000:80 -n genesis-production
```

**Configuration files:**
- `k8s/deployment.yaml` - Deployments, CronJobs, PVCs
- `k8s/service.yaml` - Services, Ingress, HPA, Network Policies

**Features:**
- ✅ Horizontal Pod Autoscaling (HPA)
- ✅ Rolling updates & rollbacks
- ✅ Network policies for security
- ✅ LoadBalancer + Ingress (HTTPS)
- ✅ Pod Disruption Budgets
- ✅ CronJobs for scheduled tasks

---

## Configuration

### Environment Variables

**Required:**

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-...` |
| `GOOGLE_API_KEY` | Google Gemini key | `AIza...` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://...` |
| `REDIS_URL` | Redis connection string | `redis://...` |

**Optional:**

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level | `INFO` |
| `SCHEDULER_MIN_INTERVAL` | Min scheduler interval (seconds) | `300` |
| `SCHEDULER_MAX_INTERVAL` | Max scheduler interval (seconds) | `600` |
| `ENABLE_CACHE` | Enable Redis caching | `true` |
| `SLACK_WEBHOOK_URL` | Slack alerts webhook | (none) |

### Service Configuration

Each service can be configured via:

1. **Environment variables** (`.env.production`)
2. **Config files** (`config/*.yml`)
3. **Secrets** (`secrets/*.txt` for Docker)

### Feature Flags

Genesis uses feature flags for gradual rollout:

```bash
# Enable/disable features in .env.production
ENABLE_SKYVERN=true
ENABLE_OCR=true
ENABLE_ES_TRAINING=true
ENABLE_MONITORING=true
```

---

## Monitoring

### Prometheus (Metrics)

**Access:** http://localhost:9090

**Key Metrics:**
- `genesis_tasks_total` - Total tasks processed
- `genesis_tasks_success_rate` - Task success rate
- `genesis_api_request_duration_seconds` - API latency
- `genesis_agent_execution_duration_seconds` - Agent execution time

### Grafana (Dashboards)

**Access:** http://localhost:3000
**Default credentials:** admin / (from secrets)

**Pre-built dashboards:**
- Genesis Overview
- A2A Service Performance
- Database Health
- Agent Performance

### Alerting

Configure Slack/PagerDuty alerts in `monitoring/alertmanager.yml`:

```yaml
receivers:
- name: 'slack-alerts'
  slack_configs:
  - api_url: 'YOUR_SLACK_WEBHOOK_URL'
    channel: '#genesis-alerts'
```

### Health Monitoring Cron

Runs every 15 minutes via `scripts/health_monitor.py`:

- ✅ Check all service health endpoints
- ✅ Verify database connections
- ✅ Monitor disk usage
- ✅ Send alerts on failures

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose -f docker-compose.production.yml logs -f [service-name]

# Check environment variables
docker compose -f docker-compose.production.yml config

# Restart service
docker compose -f docker-compose.production.yml restart [service-name]
```

### Database Connection Errors

```bash
# Test MongoDB connection
docker compose exec genesis-mongodb mongosh -u genesis -p genesis_password

# Test Redis connection
docker compose exec genesis-redis redis-cli -a YOUR_PASSWORD ping

# Check network
docker network inspect genesis-production
```

### Health Check Failures

```bash
# Test health endpoints
curl -v http://localhost:8000/health
curl -v http://localhost:8001/health
curl -v http://localhost:8002/health

# Check service logs
docker compose logs -f a2a-service
```

### Out of Memory

```bash
# Check resource usage
docker stats

# Increase memory limits in docker-compose.production.yml
# deploy.resources.limits.memory: 8G
```

### Port Already in Use

```bash
# Find process using port
lsof -i :8000
netstat -tuln | grep 8000

# Kill process or change port in config
```

---

## Security

### Best Practices

1. **Never commit secrets to git**
   - Use `.env.production` (gitignored)
   - Use Docker secrets for production

2. **Rotate API keys quarterly**
   ```bash
   # Update secrets
   echo -n "new-key" > secrets/openai_api_key.txt
   # Restart services
   docker compose restart
   ```

3. **Use strong database passwords**
   ```bash
   # Generate 32-char password
   openssl rand -base64 32
   ```

4. **Enable HTTPS in production**
   - Use Nginx reverse proxy with Let's Encrypt
   - Or use cloud provider SSL (Railway/Render auto-provide)

5. **Restrict database access**
   - MongoDB: Enable authentication
   - Redis: Set `requirepass`
   - PostgreSQL: Use SCRAM-SHA-256

6. **Monitor logs for security events**
   ```bash
   # Check for unauthorized access
   docker compose logs | grep -i "unauthorized\|forbidden\|401\|403"
   ```

7. **Set up firewall rules**
   ```bash
   # Only expose necessary ports
   # Block: 27017 (MongoDB), 6379 (Redis), 5432 (PostgreSQL)
   # Allow: 8000 (A2A), 8001 (Skyvern), 8002 (OCR)
   ```

### Secrets Management

**Docker Compose:**
```bash
# secrets/ directory (gitignored)
secrets/
├── openai_api_key.txt
├── anthropic_api_key.txt
├── mongodb_password.txt
└── ...
```

**Kubernetes:**
```bash
# kubectl secrets (base64 encoded)
kubectl create secret generic genesis-secrets \
  --from-literal=OPENAI_API_KEY=sk-...
```

**Railway/Render:**
```bash
# Dashboard environment variables (encrypted at rest)
# Set via web UI: Dashboard > Service > Environment
```

---

## Next Steps

1. **Complete deployment checklist:**
   - [ ] Create secrets directory
   - [ ] Add all API keys
   - [ ] Configure .env.production
   - [ ] Run validation script
   - [ ] Deploy services
   - [ ] Verify health checks
   - [ ] Set up monitoring alerts
   - [ ] Configure backups

2. **Test deployment:**
   - [ ] Test A2A API endpoint
   - [ ] Verify autonomous scheduler is running
   - [ ] Test Skyvern browser automation
   - [ ] Test OCR service
   - [ ] Check Grafana dashboards

3. **Production hardening:**
   - [ ] Enable HTTPS
   - [ ] Set up backups (MongoDB, PostgreSQL)
   - [ ] Configure log aggregation
   - [ ] Set up alerting (Slack/PagerDuty)
   - [ ] Document runbooks

---

## Support

- **Documentation:** `/docs/`
- **Issues:** GitHub Issues
- **Monitoring:** Grafana dashboards
- **Health Check:** `scripts/health_monitor.py`

---

**Last Updated:** November 8, 2025
**Version:** 1.0.0
**Status:** ✅ Production Ready
