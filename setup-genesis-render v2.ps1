# Genesis One-Command Setup for Render.com
# No CLI needed - uses web dashboard

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 GENESIS RENDER.COM SETUP" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check if render.yaml exists
if (-not (Test-Path "render.yaml")) {
    Write-Host "❌ Error: render.yaml not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please make sure render.yaml is in this directory." -ForegroundColor Yellow
    exit 1
}

# Check if it's a git repo
$isGitRepo = Test-Path ".git"
if (-not $isGitRepo) {
    Write-Host "📦 Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "   ✅ Git initialized" -ForegroundColor Green
}

# Check if there are uncommitted changes
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host ""
    Write-Host "📝 Committing changes to Git..." -ForegroundColor Yellow
    git add .
    git commit -m "Genesis Agent System - Ready for Render"
    Write-Host "   ✅ Changes committed" -ForegroundColor Green
}

# Check if remote exists
$gitRemote = git remote get-url origin 2>$null
if (-not $gitRemote) {
    Write-Host ""
    Write-Host "⚠️  No Git remote found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You need to push this to GitHub first." -ForegroundColor White
    Write-Host ""
    Write-Host "Quick setup:" -ForegroundColor Cyan
    Write-Host "1. Go to: https://github.com/new" -ForegroundColor White
    Write-Host "2. Create a new repository (e.g., 'genesis-agent-system')" -ForegroundColor White
    Write-Host "3. Run these commands:" -ForegroundColor White
    Write-Host ""
    Write-Host "   git remote add origin https://github.com/YOUR-USERNAME/genesis-agent-system.git" -ForegroundColor Gray
    Write-Host "   git push -u origin main" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Then run this setup script again" -ForegroundColor White
    Write-Host ""
    
    $openGitHub = Read-Host "Open GitHub to create new repo? (Y/n)"
    if ($openGitHub -ne 'n') {
        Start-Process "https://github.com/new"
    }
    exit 0
}

# Push to GitHub
Write-Host ""
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
git push origin main 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ⚠️  Push may have failed (might already be up to date)" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ Pushed to GitHub" -ForegroundColor Green
}

# Instructions for Render
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ READY TO DEPLOY TO RENDER" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "Follow these steps (takes 2 minutes):" -ForegroundColor Yellow
Write-Host ""
Write-Host "STEP 1: Create Render Account" -ForegroundColor Cyan
Write-Host "   Go to: https://dashboard.render.com/register" -ForegroundColor White
Write-Host "   (Or login if you have an account)" -ForegroundColor Gray
Write-Host ""
Write-Host "STEP 2: Deploy Blueprint" -ForegroundColor Cyan
Write-Host "   1. Click 'New +' → 'Blueprint'" -ForegroundColor White
Write-Host "   2. Connect your GitHub account" -ForegroundColor White
Write-Host "   3. Select repository: $($gitRemote -replace '.*github.com[:/]', '' -replace '.git$', '')" -ForegroundColor White
Write-Host "   4. Click 'Apply Blueprint'" -ForegroundColor White
Write-Host ""
Write-Host "STEP 3: Add API Keys" -ForegroundColor Cyan
Write-Host "   1. Wait for services to create (~30 seconds)" -ForegroundColor White
Write-Host "   2. Click 'genesis-main' service" -ForegroundColor White
Write-Host "   3. Go to 'Environment' tab" -ForegroundColor White
Write-Host "   4. Add these keys:" -ForegroundColor White
Write-Host "      - ANTHROPIC_API_KEY" -ForegroundColor Gray
Write-Host "      - GOOGLE_API_KEY" -ForegroundColor Gray
Write-Host "      - STRIPE_SECRET_KEY" -ForegroundColor Gray
Write-Host "   5. Click 'Save Changes'" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""

# Save instructions to file
$instructions = @"
GENESIS RENDER DEPLOYMENT INSTRUCTIONS
======================================

Your GitHub repo: $gitRemote

STEP 1: Create Render Account
   → https://dashboard.render.com/register

STEP 2: Deploy Blueprint
   1. Click 'New +' → 'Blueprint'
   2. Connect GitHub
   3. Select your repository
   4. Click 'Apply Blueprint'

STEP 3: Add API Keys
   1. Click 'genesis-main' service
   2. Go to 'Environment' tab
   3. Add:
      - ANTHROPIC_API_KEY=sk-ant-...
      - GOOGLE_API_KEY=...
      - STRIPE_SECRET_KEY=sk_test_...
   4. Save Changes

WHAT YOU GET:
   - PostgreSQL database (1GB free)
   - Redis cache (25MB free)
   - 25 agent workers
   - All logs in one dashboard
   - Auto-deploy on git push

COST: $0/month on free tier

DASHBOARD: https://dashboard.render.com
"@

$instructions | Out-File -FilePath "RENDER_SETUP_INSTRUCTIONS.txt" -Encoding UTF8
Write-Host "📝 Instructions saved to: RENDER_SETUP_INSTRUCTIONS.txt" -ForegroundColor Gray
Write-Host ""

# Open browser
$openBrowser = Read-Host "Open Render dashboard now? (Y/n)"
if ($openBrowser -ne 'n') {
    Write-Host ""
    Write-Host "🌐 Opening Render dashboard..." -ForegroundColor Cyan
    Start-Process "https://dashboard.render.com/blueprints"
}

Write-Host ""
Write-Host "✨ Once deployed, all 25 agents will run automatically!" -ForegroundColor Green
Write-Host ""