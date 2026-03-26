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
# Step 2: Tag previous image for rollback, then build
# -----------------------------------------------------------
echo "Step 2/7: Building new Docker image..."
PREV_IMAGE=$(docker compose -f "$COMPOSE_FILE" images web -q 2>/dev/null || true)
if [ -n "$PREV_IMAGE" ]; then
    docker tag "$PREV_IMAGE" masjid-connect-web:rollback 2>/dev/null || true
    echo "  (Previous image tagged for rollback)"
fi
docker compose -f "$COMPOSE_FILE" build web
echo "Done."
echo ""

# -----------------------------------------------------------
# Step 3: Preview database migrations
# -----------------------------------------------------------
echo "Step 3/8: Checking pending database migrations..."
docker compose -f "$COMPOSE_FILE" run --rm web python manage.py migrate --plan 2>&1 || true
echo ""

# -----------------------------------------------------------
# Step 4: Pre-migration database backup
# -----------------------------------------------------------
echo "Step 4/8: Backing up database before migration..."
"$BACKEND_DIR/scripts/backup.sh" || {
    echo "WARNING: Backup failed. Continuing with deploy — check backup script."
}
echo ""

# -----------------------------------------------------------
# Step 5: Run database migrations
# -----------------------------------------------------------
echo "Step 5/8: Running database migrations..."
docker compose -f "$COMPOSE_FILE" run --rm web python manage.py migrate --noinput
echo "Done."
echo ""

# -----------------------------------------------------------
# Step 6: Collect static files
# -----------------------------------------------------------
echo "Step 6/8: Collecting static files..."
docker compose -f "$COMPOSE_FILE" run --rm web python manage.py collectstatic --noinput
echo "Done."
echo ""

# -----------------------------------------------------------
# Step 7: Restart containers
# -----------------------------------------------------------
echo "Step 7/8: Restarting containers..."
docker compose -f "$COMPOSE_FILE" up -d
echo "Done."
echo ""

# -----------------------------------------------------------
# Step 8: Health check (with automatic rollback)
# -----------------------------------------------------------
echo "Step 8/8: Checking that everything is working..."
echo "Waiting for the app to start (up to 30 seconds)..."

HEALTH="FAILED"
for i in 1 2 3; do
    sleep 10
    HEALTH=$(curl -sf http://localhost:8000/health/ 2>/dev/null || echo "FAILED")
    if echo "$HEALTH" | grep -q "ok"; then
        break
    fi
    echo "  Attempt $i/3: not ready yet..."
done

if echo "$HEALTH" | grep -q "ok"; then
    echo ""
    echo "============================================"
    echo "   DEPLOY SUCCESSFUL!"
    echo "   App is running and healthy."
    echo "   $(date)"
    echo "============================================"
    # Clean up old images (keep last 2 for rollback safety)
    docker image prune -f --filter "until=168h" 2>/dev/null || true
else
    echo ""
    echo "============================================"
    echo "   HEALTH CHECK FAILED — Rolling back..."
    echo "============================================"
    echo ""

    # Attempt automatic rollback if previous image exists
    if docker image inspect masjid-connect-web:rollback >/dev/null 2>&1; then
        echo "Rolling back to previous image..."
        docker compose -f "$COMPOSE_FILE" down
        docker tag masjid-connect-web:rollback "$(docker compose -f "$COMPOSE_FILE" config --images | grep web | head -1)" 2>/dev/null || true
        docker compose -f "$COMPOSE_FILE" up -d
        sleep 10
        ROLLBACK_HEALTH=$(curl -sf http://localhost:8000/health/ 2>/dev/null || echo "FAILED")
        if echo "$ROLLBACK_HEALTH" | grep -q "ok"; then
            echo "Rollback successful — previous version restored."
        else
            echo "Rollback also failed. Manual intervention required."
        fi
    else
        echo "No rollback image available. Manual intervention required."
        echo ""
        echo "Check the logs:"
        echo "  docker compose -f $COMPOSE_FILE logs web --tail 100"
    fi
    exit 1
fi
