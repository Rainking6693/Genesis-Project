#!/bin/bash
# Create all required secrets for Genesis in Google Cloud Secret Manager
# Usage: ./scripts/create_cloudrun_secrets.sh

set -e

echo "🔐 Creating secrets for Genesis in Google Cloud Secret Manager..."
echo ""

# Required secrets
SECRETS=(
  "OPENAI_API_KEY"
  "ANTHROPIC_API_KEY"
  "GOOGLE_API_KEY"
  "A2A_API_KEY"
  "MONGODB_URI"
  "REDIS_URL"
)

# Create secrets (will prompt for values)
for SECRET in "${SECRETS[@]}"; do
  echo "Creating secret: $SECRET"
  
  # Check if secret already exists
  if gcloud secrets describe "$SECRET" &>/dev/null; then
    echo "  ⚠️  Secret $SECRET already exists. Adding new version..."
    echo -n "Enter value for $SECRET: "
    read -s VALUE
    echo ""
    echo -n "$VALUE" | gcloud secrets versions add "$SECRET" --data-file=-
  else
    echo -n "Enter value for $SECRET: "
    read -s VALUE
    echo ""
    echo -n "$VALUE" | gcloud secrets create "$SECRET" --data-file=-
  fi
  
  echo "  ✅ Secret $SECRET created/updated"
  echo ""
done

# Grant Cloud Run service account access
echo "🔑 Granting Cloud Run access to secrets..."
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for SECRET in "${SECRETS[@]}"; do
  echo "Granting access to $SECRET..."
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet
  echo "  ✅ Access granted"
done

echo ""
echo "✅ All secrets created and permissions set!"
echo ""
echo "Next step: Deploy with:"
echo "  ./deploy_cloudrun.sh"

