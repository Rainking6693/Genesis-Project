#!/bin/bash
# Monitoring Setup Script (VPS-optimized)
# Sets up Grafana + shadcn UI dashboards

set -e

echo "════════════════════════════════════════════════════════════"
echo "  Genesis Monitoring Setup"
echo "════════════════════════════════════════════════════════════"
echo ""

# Step 1: Setup Grafana
echo "▶ Step 1/5: Setting up Grafana..."

# Remove existing Grafana container if it exists
if docker ps -a | grep -q grafana; then
    echo "  Removing existing Grafana container..."
    docker stop grafana 2>/dev/null || true
    docker rm grafana 2>/dev/null || true
fi

# Create Grafana data directory
mkdir -p ~/grafana/data
chmod 777 ~/grafana/data

# Run Grafana container
docker run -d \
  --name=grafana \
  -p 3000:3000 \
  -v ~/grafana/data:/var/lib/grafana \
  -e "GF_SECURITY_ADMIN_PASSWORD=admin" \
  -e "GF_SERVER_ROOT_URL=http://localhost:3000" \
  grafana/grafana:latest

sleep 5
echo "✅ Grafana running at http://localhost:3000"
echo "   Login: admin / admin"
echo ""

# Step 2: Check Prometheus
echo "▶ Step 2/5: Checking Prometheus..."
if curl -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
  echo "✅ Prometheus is running at http://localhost:9090"
else
  echo "⚠️  Prometheus not running. Start with:"
  echo "   docker run -d --name=prometheus -p 9090:9090 prom/prometheus"
fi
echo ""

# Step 3: Create Grafana dashboard JSON
echo "▶ Step 3/5: Creating Genesis dashboard JSON..."
cat > ~/genesis_dashboard.json << 'DASHBOARDEOF'
{
  "dashboard": {
    "title": "Genesis Agent Monitoring",
    "tags": ["genesis", "agents", "production"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Active Agents",
        "type": "stat",
        "targets": [{
          "expr": "count(genesis_agent_active{status='running'})",
          "legendFormat": "Active Agents"
        }],
        "gridPos": {"h": 4, "w": 6, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Task Success Rate",
        "type": "gauge",
        "targets": [{
          "expr": "rate(genesis_task_completed_total[5m]) / rate(genesis_task_started_total[5m]) * 100",
          "legendFormat": "Success %"
        }],
        "gridPos": {"h": 4, "w": 6, "x": 6, "y": 0}
      },
      {
        "id": 3,
        "title": "Business Generation Progress",
        "type": "graph",
        "targets": [{
          "expr": "genesis_business_generation_progress",
          "legendFormat": "{{business_name}}"
        }],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 4}
      }
    ],
    "refresh": "5s",
    "time": {"from": "now-1h", "to": "now"}
  }
}
DASHBOARDEOF
echo "✅ Dashboard JSON created: ~/genesis_dashboard.json"
echo ""

# Step 4: Manual Grafana configuration
echo "▶ Step 4/5: Grafana Configuration (MANUAL STEPS)"
echo ""
echo "  Open http://localhost:3000 in your browser"
echo "  1. Login: admin / admin (change password if prompted)"
echo "  2. Go to: Configuration → Data Sources → Add data source"
echo "  3. Select: Prometheus"
echo "  4. Set URL: http://localhost:9090"
echo "  5. Click: Save & Test"
echo "  6. Go to: Dashboards → Import"
echo "  7. Upload: ~/genesis_dashboard.json"
echo "  8. Select data source: Prometheus"
echo "  9. Click: Import"
echo ""
echo "  Press Enter when done..."
read

# Step 5: Setup shadcn UI (optional)
echo "▶ Step 5/5: shadcn UI Setup (Optional)"
echo ""
echo "  To set up shadcn/ui dashboard:"
echo "  $ cd /home/genesis/genesis-rebuild"
echo "  $ npx create-next-app@latest genesis-dashboard --typescript --tailwind"
echo "  $ cd genesis-dashboard"
echo "  $ npx shadcn@latest init"
echo "  $ npx shadcn@latest add card button badge progress"
echo "  $ npm run dev"
echo ""
echo "  Skip for now? (monitoring works with Grafana only) [Y/n]"
read -r response
if [[ "$response" =~ ^[Yy]$ ]] || [[ -z "$response" ]]; then
    echo "  Skipping shadcn setup for now"
else
    cd /home/genesis/genesis-rebuild
    npx create-next-app@latest genesis-dashboard --typescript --tailwind --app --no-src-dir --eslint
fi
echo ""

# Summary
echo "════════════════════════════════════════════════════════════"
echo "  MONITORING SETUP COMPLETE"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Grafana: http://localhost:3000 (admin/admin)"
echo "Prometheus: http://localhost:9090"
echo ""
echo "Next steps:"
echo "  1. Complete Grafana configuration above"
echo "  2. Run business generation tonight"
echo "  3. Monitor progress in Grafana"
echo ""
echo "════════════════════════════════════════════════════════════"
