#!/usr/bin/env bash
# =============================================================
# Masjid Connect — Deploy Script
# =============================================================
# WHAT THIS DOES:
#   Pulls the latest code, rebuilds the app, runs database
#   updates, and restarts everything. Takes about 2 minutes.
#
# HOW TO USE:
#   1. SSH into your server:  ssh mosque@your-server-ip
#   2. Go to the project:     cd /home/mosque/Masjid-Connect/backend
#   3. Run this script:       ./scripts/deploy.sh
#
# WHAT HAPPENS:
#   1. Pulls latest code from GitHub
#   2. Builds a new Docker image
#   3. Runs database migrations (if any)
#   4. Collects static files (admin CSS/JS)
#   5. Restarts containers
#   6. Checks that everything is working
# =============================================================

set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$BACKEND_DIR"

echo "============================================"
echo "   Masjid Connect — Deploying"
echo "   $(date)"
echo "============================================"
echo ""

# -----------------------------------------------------------
# Step 1: Pull latest code
# -----------------------------------------------------------
echo "Step 1/6: Pulling latest code from GitHub..."
git pull origin main
echo "Done."
echo ""

# -----------------------------------------------------------
# Step 2: Build Docker image
# -----------------------------------------------------------
echo "Step 2/6: Building new Docker image..."
echo "(This may take a few minutes the first time)"
docker compose -f "$COMPOSE_FILE" build web
echo "Done."
echo ""

# -----------------------------------------------------------
# Step 3: Run database migrations
# -----------------------------------------------------------
echo "Step 3/6: Running database migrations..."
docker compose -f "$COMPOSE_FILE" run --rm web python manage.py migrate --noinput
echo "Done."
echo ""

# -----------------------------------------------------------
# Step 4: Collect static files
# -----------------------------------------------------------
echo "Step 4/6: Collecting static files..."
docker compose -f "$COMPOSE_FILE" run --rm web python manage.py collectstatic --noinput
echo "Done."
echo ""

# -----------------------------------------------------------
# Step 5: Restart containers
# -----------------------------------------------------------
echo "Step 5/6: Restarting containers..."
docker compose -f "$COMPOSE_FILE" up -d
echo "Done."
echo ""

# -----------------------------------------------------------
# Step 6: Health check
# -----------------------------------------------------------
echo "Step 6/6: Checking that everything is working..."
echo "Waiting 10 seconds for the app to start..."
sleep 10

HEALTH=$(curl -sf http://localhost:8000/health/ 2>/dev/null || echo "FAILED")

if echo "$HEALTH" | grep -q "ok"; then
    echo ""
    echo "============================================"
    echo "   DEPLOY SUCCESSFUL!"
    echo "   App is running and healthy."
    echo "   $(date)"
    echo "============================================"
else
    echo ""
    echo "============================================"
    echo "   WARNING: Health check did not pass!"
    echo "============================================"
    echo ""
    echo "The app may still be starting up. Wait 30 seconds and try:"
    echo "  curl http://localhost:8000/health/"
    echo ""
    echo "If it still fails, check the logs:"
    echo "  docker compose -f $COMPOSE_FILE logs web --tail 100"
    echo ""
    echo "To roll back to the previous version:"
    echo "  git log --oneline -5    (find the previous commit)"
    echo "  git checkout <commit>   (go back to it)"
    echo "  ./scripts/deploy.sh     (redeploy)"
    exit 1
fi
