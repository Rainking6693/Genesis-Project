#!/bin/bash
# Deploy Genesis A2A Service to Google Cloud Run
# Usage: ./deploy_cloudrun.sh [service-name] [region]

SERVICE_NAME=${1:-genesis-a2a}
REGION=${2:-us-central1}

echo "🚀 Deploying Genesis A2A Service to Google Cloud Run..."
echo "   Service: $SERVICE_NAME"
echo "   Region: $REGION"
echo ""

gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --port 8000 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 0 \
  --set-env-vars GENESIS_ENV=production

echo ""
echo "✅ Deployment complete!"
echo "   Get URL: gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'"

