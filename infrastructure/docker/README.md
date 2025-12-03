# Genesis Docker Tools - Website Generation Stack

This directory contains Docker configurations and agent integrations for the Genesis autonomous website generation pipeline.

## Overview

The Docker tools stack provides self-hosted alternatives to commercial services, enabling Genesis to operate with minimal external dependencies and costs.

## Tools Included

| Tool | Image | Port(s) | Target Agent | Purpose |
|------|-------|---------|--------------|---------|
| Gitea | `gitea/gitea:latest` | 3000, 2222 | HybridBuilderAgent | Code storage, free website hosting |
| Coolify | `coollabsio/coolify:latest` | 8000, 3001 | HybridDeployAgent | Self-hosted PaaS deployment |
| Lago | `getlago/lago-api:latest` | 3002, 8080 | HybridBillingAgent | Open-source billing (Stripe alt) |
| Supabase PostgreSQL | `supabase/postgres:latest` | 5432 | HybridBuilderAgent, HybridBillingAgent | Database services |
| Postal | `postalserver/postal:latest` | 25, 5000 | HybridMarketingAgent | Email sending |
| n8n | `n8nio/n8n:latest` | 5678 | HybridMarketingAgent, HybridSEOAgent | Workflow automation |
| Plausible | `plausible/analytics:latest` | 8001 | HybridSEOAgent | Privacy-first analytics |
| SearXNG | `searxng/searxng:latest` | 8888 | SEOAgent | Meta-search for SEO |
| Matomo | `matomo:latest` | 8082 | SEOAgent | Full analytics suite |

## Quick Start

### 1. Pull Docker Images

```bash
# Pull all images at once
docker-compose -f docker-compose.genesis-tools.yml pull

# Or pull individually
docker pull gitea/gitea:latest
docker pull getlago/lago-api:latest
docker pull supabase/postgres:latest
docker pull postalserver/postal:latest
docker pull n8nio/n8n:latest
docker pull plausible/analytics:latest
docker pull searxng/searxng:latest
docker pull matomo:latest
```

### 2. Start Services

```bash
# Start all services
docker-compose -f docker-compose.genesis-tools.yml up -d

# Start specific services
docker-compose -f docker-compose.genesis-tools.yml up -d gitea n8n plausible

# Check status
docker-compose -f docker-compose.genesis-tools.yml ps
```

### 3. Stop Services

```bash
# Stop all
docker-compose -f docker-compose.genesis-tools.yml down

# Stop specific service
docker-compose -f docker-compose.genesis-tools.yml stop gitea
```

## Configuration

### Environment Variables

All configuration is managed through the project's `.env` file. Key variables:

```bash
# Cloudflare (DNS/CDN)
CLOUDFLARE_API_KEY=your_key
CLOUDFLARE_ZONE_ID=your_zone
CLOUDFLARE_EMAIL=your_email

# Porkbun (Domain registrar)
PORKBUN_API_KEY=your_key
PORKBUN_SECRET_KEY=your_secret

# Gitea
GITEA_API_TOKEN=your_token
GITEA_ADMIN_USER=genesis
GITEA_ADMIN_PASSWORD=secure_password

# Lago Billing
LAGO_API_KEY=your_key
LAGO_SECRET_KEY_BASE=64_char_secret

# n8n Automation
N8N_USER=genesis
N8N_PASSWORD=secure_password

# Plausible Analytics
PLAUSIBLE_SECRET_KEY=64_char_secret
PLAUSIBLE_API_KEY=your_key

# Postal Email
POSTAL_API_KEY=your_key

# Matomo
MATOMO_AUTH_TOKEN=your_token
```

## Agent Integrations

Each Docker tool has a corresponding integration module in `agent_integrations/`:

```
agent_integrations/
  __init__.py
  gitea_integration.py      # HybridBuilderAgent
  lago_integration.py       # HybridBillingAgent
  n8n_integration.py        # HybridMarketingAgent, HybridSEOAgent
  plausible_integration.py  # HybridSEOAgent
  searxng_integration.py    # SEOAgent
  matomo_integration.py     # SEOAgent
  postal_integration.py     # HybridMarketingAgent
```

### Usage Example

```python
from infrastructure.docker.agent_integrations import GiteaIntegration, LagoIntegration

# Create repository and push code
gitea = GiteaIntegration()
repo = await gitea.create_repository("my-website")
await gitea.push_code(repo["name"], "/path/to/code")
await gitea.enable_pages(repo["name"])

# Set up billing
lago = LagoIntegration()
customer = await lago.create_customer(
    external_id="cust_123",
    name="Acme Corp",
    email="billing@acme.com"
)
await lago.create_subscription(customer["external_id"], "basic_monthly")
```

## Service URLs (Default)

| Service | URL | Notes |
|---------|-----|-------|
| Gitea | http://localhost:3000 | Web UI + API |
| Lago API | http://localhost:3002 | REST API |
| Lago Frontend | http://localhost:8080 | Dashboard |
| n8n | http://localhost:5678 | Workflow editor |
| Plausible | http://localhost:8001 | Analytics dashboard |
| SearXNG | http://localhost:8888 | Search interface |
| Matomo | http://localhost:8082 | Analytics dashboard |
| Postal | http://localhost:5000 | Mail admin |

## Resource Requirements

Estimated resources for running all services:

- **RAM**: 8-12 GB minimum
- **CPU**: 4+ cores recommended
- **Storage**: 50+ GB for databases and logs
- **Network**: Ports 25, 2222, 3000-3002, 5000, 5432, 5678, 8000-8082, 8888

## Troubleshooting

### Docker Daemon Not Running

```bash
# Windows
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Wait for startup, then verify
docker info
```

### Service Health Checks

```bash
# Check all services
docker-compose -f docker-compose.genesis-tools.yml ps

# View logs
docker-compose -f docker-compose.genesis-tools.yml logs gitea
docker-compose -f docker-compose.genesis-tools.yml logs -f n8n
```

### Port Conflicts

If ports are in use, edit `docker-compose.genesis-tools.yml` to change mappings:

```yaml
ports:
  - "3001:3000"  # Map container 3000 to host 3001
```

## External API Keys Required

Some functionality requires external API keys:

1. **Cloudflare** - For DNS management and CDN
   - Get from: https://dash.cloudflare.com/profile/api-tokens

2. **Porkbun** - For domain registration (alternative to Name.com)
   - Get from: https://porkbun.com/account/api

These are optional but recommended for full autonomous operation.

## Security Notes

- All default passwords in `.env` should be changed for production
- Postal requires proper DNS (SPF, DKIM, DMARC) configuration for email delivery
- Consider using Docker secrets for sensitive values in production
- Network isolation via Docker networks is configured by default

## Maintenance

### Backup Data

```bash
# Backup volumes
docker run --rm -v genesis-gitea-data:/data -v $(pwd):/backup alpine tar czf /backup/gitea-backup.tar.gz /data
```

### Update Images

```bash
docker-compose -f docker-compose.genesis-tools.yml pull
docker-compose -f docker-compose.genesis-tools.yml up -d
```

## Files in This Directory

```
infrastructure/docker/
  docker-compose.genesis-tools.yml  # Main compose file
  genesis_docker_config.py          # Python configuration module
  deepseek-ocr-cpu.Dockerfile       # Existing OCR Dockerfile
  README.md                         # This file
  agent_integrations/               # Agent integration modules
    __init__.py
    gitea_integration.py
    lago_integration.py
    n8n_integration.py
    plausible_integration.py
    searxng_integration.py
    matomo_integration.py
    postal_integration.py
```
