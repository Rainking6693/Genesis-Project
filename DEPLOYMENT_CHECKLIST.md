# Genesis Deployment Checklist

**Quick reference for deploying Genesis to production**

---

## Pre-Deployment (Required)

### 1. Create Secrets Directory

```bash
mkdir -p secrets
```

### 2. Add API Keys

```bash
# OpenAI (required)
echo -n "sk-your-openai-key" > secrets/openai_api_key.txt

# Anthropic (required)
echo -n "sk-ant-your-anthropic-key" > secrets/anthropic_api_key.txt

# Google Gemini (required)
echo -n "your-google-api-key" > secrets/google_api_key.txt

# Skyvern (optional)
echo -n "your-skyvern-key" > secrets/skyvern_api_key.txt
```

### 3. Generate Passwords

```bash
# MongoDB
openssl rand -base64 32 > secrets/mongodb_password.txt

# PostgreSQL
openssl rand -base64 32 > secrets/skyvern_db_password.txt

# Grafana
openssl rand -base64 32 > secrets/grafana_admin_password.txt
```

### 4. Configure Environment

```bash
# Copy template
cp .env.production .env.production.local

# Edit with your values
nano .env.production.local
```

**Required variables:**
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`
- `MONGODB_URI`
- `REDIS_URL`

### 5. Validate Configuration

```bash
chmod +x validate_deployment.sh
./validate_deployment.sh
```

---

## Docker Compose Deployment

```bash
# Build images
docker compose -f docker-compose.production.yml build

# Start services
docker compose -f docker-compose.production.yml up -d

# Check status
docker compose -f docker-compose.production.yml ps

# View logs
docker compose -f docker-compose.production.yml logs -f

# Test health
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8002/health
```

---

## Railway Deployment

```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Add database plugins
railway add --plugin mongodb
railway add --plugin redis
railway add --plugin postgresql

# Set secrets
railway variables set OPENAI_API_KEY=sk-...
railway variables set ANTHROPIC_API_KEY=sk-ant-...
railway variables set GOOGLE_API_KEY=...

# Deploy
railway up

# View logs
railway logs
```

---

## Render Deployment

1. Go to https://render.com/dashboard
2. Click "New +" > "Blueprint"
3. Connect GitHub repository
4. Select branch: `main`
5. Render auto-detects `render.yaml`
6. Set environment variables in dashboard
7. Click "Apply"

**Set these secrets for EACH service:**
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`
- `MONGODB_URI` (from MongoDB Atlas)
- `REDIS_URL` (from Render Redis add-on)

---

## Kubernetes Deployment

```bash
# Create namespace
kubectl create namespace genesis-production

# Create secrets
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
  --from-literal=SLACK_WEBHOOK_URL=https://... \
  -n genesis-production

# Deploy
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Check status
kubectl get all -n genesis-production
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# A2A Service
curl http://localhost:8000/health

# Skyvern
curl http://localhost:8001/health

# OCR Service
curl http://localhost:8002/health
```

**Expected:** HTTP 200 OK with JSON response

### 2. Check Logs

```bash
# Docker Compose
docker compose -f docker-compose.production.yml logs -f a2a-service

# Railway
railway logs genesis-a2a-service

# Kubernetes
kubectl logs -f deployment/genesis-a2a-service -n genesis-production
```

**Look for:** No ERROR messages, "Service started" messages

### 3. Verify Databases

```bash
# MongoDB
docker compose exec genesis-mongodb mongosh -u genesis -p <password>

# Redis
docker compose exec genesis-redis redis-cli -a <password> ping

# PostgreSQL
docker compose exec genesis-skyvern-postgres psql -U skyvern
```

**Expected:** Successful connections

### 4. Access Monitoring

- **Grafana:** http://localhost:3000
- **Prometheus:** http://localhost:9090
- **Credentials:** admin / (from `secrets/grafana_admin_password.txt`)

### 5. Test Autonomous Scheduler

```bash
# Check logs for scheduler activity
docker compose logs -f autonomous-scheduler | grep "SCHEDULER"
```

**Expected:** Log messages every 5-10 minutes

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose logs -f [service-name]

# Restart
docker compose restart [service-name]
```

### Database Connection Failed

```bash
# Check MongoDB
docker compose exec genesis-mongodb mongosh --eval "db.adminCommand('ping')"

# Check Redis
docker compose exec genesis-redis redis-cli ping

# Check network
docker network inspect genesis-production
```

### Port Already in Use

```bash
# Find process
lsof -i :8000
netstat -tuln | grep 8000

# Kill process
kill -9 <PID>
```

### Out of Memory

```bash
# Check usage
docker stats

# Increase limits in docker-compose.production.yml
# memory: 8G
```

---

## Security Checklist

- [ ] Secrets in `secrets/` directory (NOT in git)
- [ ] Strong passwords (32+ characters)
- [ ] `.env.production` NOT committed to git
- [ ] HTTPS enabled (production)
- [ ] Database authentication enabled
- [ ] Firewall rules configured
- [ ] Log monitoring enabled
- [ ] Slack alerts configured

---

## Maintenance

### Daily

- [ ] Check Grafana dashboards
- [ ] Review error logs
- [ ] Verify health endpoints

### Weekly

- [ ] Review Slack alerts
- [ ] Check disk usage
- [ ] Monitor costs

### Monthly

- [ ] Update Docker images
- [ ] Review security logs
- [ ] Backup databases

### Quarterly

- [ ] Rotate API keys
- [ ] Security audit
- [ ] Performance review

---

## Quick Commands

### Docker Compose

```bash
# Start
docker compose -f docker-compose.production.yml up -d

# Stop
docker compose -f docker-compose.production.yml down

# Restart
docker compose -f docker-compose.production.yml restart

# Logs
docker compose -f docker-compose.production.yml logs -f

# Status
docker compose -f docker-compose.production.yml ps

# Scale
docker compose -f docker-compose.production.yml up -d --scale a2a-service=3
```

### Railway

```bash
# Deploy
railway up

# Logs
railway logs

# Status
railway status

# Open dashboard
railway open
```

### Kubernetes

```bash
# Get all
kubectl get all -n genesis-production

# Logs
kubectl logs -f deployment/genesis-a2a-service -n genesis-production

# Port forward
kubectl port-forward svc/genesis-a2a-service 8000:80 -n genesis-production

# Scale
kubectl scale deployment genesis-a2a-service --replicas=5 -n genesis-production
```

---

## Emergency Contacts

- **Logs:** Check Grafana/Prometheus first
- **Alerts:** Slack #genesis-alerts channel
- **Documentation:** `DEPLOYMENT_README.md`
- **Validation:** `./validate_deployment.sh`

---

**Last Updated:** November 8, 2025
**Status:** ✅ Production Ready
