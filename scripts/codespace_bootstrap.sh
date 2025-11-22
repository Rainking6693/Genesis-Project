#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ ! -f .env.production ]; then
  echo "Creating .env.production from template"
  cp .env.example .env.production
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi

if ! docker info >/dev/null 2>&1; then
  echo "Waiting for Docker to start..."
  sleep 5
fi

PROFILES=(--profile database --profile cache --profile monitoring)

echo "Starting Docker Compose (database, cache, monitoring profiles)..."
if ! docker compose "${PROFILES[@]}" up -d --pull missing; then
  echo "⚠️ Optional profiles failed. Retrying with core services only."
  docker compose up -d --pull missing
fi

echo "✅ Genesis stack is starting inside Codespaces."
echo "API available at: https://${CODESPACE_NAME}-8000.app.github.dev"
echo "Grafana/monitoring (if enabled): https://${CODESPACE_NAME}-3000.app.github.dev"

