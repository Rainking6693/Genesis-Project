# Google Cloud Run - Required Secrets

## Secrets to Create

Create these secrets in Google Cloud Secret Manager:

```
OPENAI_API_KEY
ANTHROPIC_API_KEY
GOOGLE_API_KEY
A2A_API_KEY (or GENESIS_API_KEY)
MONGODB_URI (optional - if using MongoDB)
REDIS_URL (optional - if using Redis)
```

## Format

Each secret is just the raw value (no quotes, no formatting):

```
OPENAI_API_KEY = sk-proj-abc123...
ANTHROPIC_API_KEY = sk-ant-api03-abc123...
GOOGLE_API_KEY = AIzaSyAbc123...
A2A_API_KEY = your-api-key-here
MONGODB_URI = mongodb://user:pass@host:27017/db
REDIS_URL = redis://host:6379
```

## Create Commands

```bash
# Create each secret (you'll be prompted to paste the value)
echo -n "sk-proj-..." | gcloud secrets create OPENAI_API_KEY --data-file=-
echo -n "sk-ant-..." | gcloud secrets create ANTHROPIC_API_KEY --data-file=-
echo -n "AIzaSy..." | gcloud secrets create GOOGLE_API_KEY --data-file=-
echo -n "your-key" | gcloud secrets create A2A_API_KEY --data-file=-
```

## Deploy with Secrets

```bash
gcloud run deploy genesis-a2a \
  --source . \
  --region us-central1 \
  --update-secrets OPENAI_API_KEY=OPENAI_API_KEY:latest \
  --update-secrets ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest \
  --update-secrets GOOGLE_API_KEY=GOOGLE_API_KEY:latest \
  --update-secrets A2A_API_KEY=A2A_API_KEY:latest
```

That's it. Secrets become environment variables automatically.
