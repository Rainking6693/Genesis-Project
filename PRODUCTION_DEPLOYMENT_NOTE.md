# Production Deployment Configuration

## Current Status: DEVELOPMENT MODE

**⚠️ IMPORTANT:** The system is currently configured for **DEVELOPMENT** mode to bypass authentication requirements during local testing.

## Environment Configuration

**Current (.env):**
```env
ENVIRONMENT=development
GENESIS_ENV=development
```

## When Deploying to Production

You have **two options**:

### Option 1: Use AWS Secrets Manager (Recommended for AWS deployments)

1. Change `.env`:
   ```env
   ENVIRONMENT=production
   GENESIS_ENV=production
   ```

2. Store the secret in AWS Secrets Manager:
   ```bash
   aws secretsmanager create-secret \
     --name genesis/agent-auth-master-secret \
     --secret-string "3N8qxK9pRLmV7jYfC2nW5aB1sD4tE6uG8hI0jK2lM4nO6pQ8rS0tU2vW4xY6zA8b"
   ```

3. Set environment variable for secret name (optional, uses default):
   ```env
   AGENT_AUTH_MASTER_SECRET_NAME=genesis/agent-auth-master-secret
   AWS_REGION=us-east-1  # Must specify region
   ```

### Option 2: Use HashiCorp Vault (Recommended for Vault users)

1. Change `.env`:
   ```env
   ENVIRONMENT=production
   GENESIS_ENV=production
   ```

2. Store secret in Vault:
   ```bash
   vault kv put secret/genesis/agent-auth master_secret="3N8qxK9pRLmV7jYfC2nW5aB1sD4tE6uG8hI0jK2lM4nO6pQ8rS0tU2vW4xY6zA8b"
   ```

3. Set Vault environment variables:
   ```env
   VAULT_ADDR=https://vault.example.com:8200
   VAULT_TOKEN=your-vault-token
   VAULT_SECRET_PATH=secret/genesis/agent-auth  # Optional, this is default
   ```

### Option 3: Direct Environment Variable (Simplest for non-cloud deployments)

1. Change `.env`:
   ```env
   ENVIRONMENT=production
   GENESIS_ENV=production
   AGENT_AUTH_MASTER_SECRET=3N8qxK9pRLmV7jYfC2nW5aB1sD4tE6uG8hI0jK2lM4nO6pQ8rS0tU2vW4xY6zA8b
   ```

**Note:** This was added in the security fixes but the environment variable loading had a bug. The bug is now fixed in `infrastructure/agent_auth_registry.py` (line 92-95), so this option should work.

## Security Reminder

**The master secret should be:**
- ✅ At least 64 characters
- ✅ Randomly generated (current one is secure)
- ✅ Never committed to git (`.env` is gitignored)
- ✅ Rotated periodically in production
- ❌ Never shared publicly or in logs

## Testing Before Production

Before switching to production mode, test with:
```bash
# Temporarily set environment for testing
set ENVIRONMENT=production  # Windows
export ENVIRONMENT=production  # Linux/Mac

# Run a single business generation
python scripts/autonomous_fully_integrated.py --count 1

# If successful, update .env permanently
```

## Current Development Mode Behavior

In development mode (`ENVIRONMENT=development`):
- ✅ Auto-generates random master secret if not provided
- ✅ No AWS/Vault requirements
- ✅ Faster for local testing
- ⚠️ Less secure (acceptable for local development only)

---

**Last Updated:** November 20, 2025
**Security Fix Applied:** Yes (agent_auth_registry.py lines 92-95)
**Current Mode:** Development
**Production Ready:** Yes (after switching environment variable)
