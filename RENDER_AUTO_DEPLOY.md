# Render Auto-Deploy - DONE

## ✅ Your render.yaml is pushed to GitHub

Render will automatically detect it when you connect your repo.

## What to do in Render Dashboard:

1. Go to: https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**  
3. Select your repo: `Rainking6693/Claude-Clean-Code-Genesis`
4. Render will **auto-detect** `render.yaml` and create both services automatically
5. Add environment variables (see below)
6. Done!

## Environment Variables to Add:

**Backend (`genesis-backend`):**
- REDIS_URL
- OPENROUTER_API_KEY  
- SERPER_API_KEY
- JINA_API_KEY
- GOOGLE_AI_STUDIO_KEY
- GITHUB_TOKEN
- A2A_API_KEY
- (All from your .env file)

**Frontend (`genesis-frontend`):**
- NEXT_PUBLIC_API_URL=https://genesis-backend.onrender.com

That's it! Render handles the rest automatically.

