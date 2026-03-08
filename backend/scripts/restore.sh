#!/usr/bin/env bash
# =============================================================
# Masjid Connect — Database Restore Script
# =============================================================
# WHAT THIS DOES:
#   Restores your database from a backup file.
#   Use this if something went wrong and you need to go back
#   to a previous version of your data.
#
# HOW TO USE:
#   ./scripts/restore.sh /home/mosque/backups/daily/masjid_connect_2026-03-08_030000.sql.gz
#
# WARNING:
#   This will REPLACE all current data with the backup data.
#   Make sure you really want to do this!
# =============================================================

set -euo pipefail

# -----------------------------------------------------------
# Check that a backup file was provided
# -----------------------------------------------------------
if [ $# -eq 0 ]; then
    echo "ERROR: You need to tell me which backup file to restore."
    echo ""
    echo "Usage: ./scripts/restore.sh <path-to-backup-file>"
    echo ""
    echo "Example:"
    echo "  ./scripts/restore.sh /home/mosque/backups/daily/masjid_connect_2026-03-08_030000.sql.gz"
    echo ""
    echo "Available backups:"
    echo ""
    echo "--- Daily ---"
    ls -1t /home/mosque/backups/daily/*.sql.gz 2>/dev/null | head -10 || echo "  (none)"
    echo ""
    echo "--- Weekly ---"
    ls -1t /home/mosque/backups/weekly/*.sql.gz 2>/dev/null | head -5 || echo "  (none)"
    echo ""
    echo "--- Monthly ---"
    ls -1t /home/mosque/backups/monthly/*.sql.gz 2>/dev/null | head -5 || echo "  (none)"
    exit 1
fi

BACKUP_FILE="$1"
COMPOSE_FILE="/home/mosque/Masjid-Connect/backend/docker-compose.prod.yml"
DB_SERVICE="db"
DB_NAME="${POSTGRES_DB:-masjid_connect}"
DB_USER="${POSTGRES_USER:-mosque}"

# -----------------------------------------------------------
# Check the backup file exists
# -----------------------------------------------------------
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: File not found: $BACKUP_FILE"
    echo "Check the path and try again."
    exit 1
fi

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "=== Masjid Connect Database Restore ==="
echo "Backup file: $BACKUP_FILE"
echo "File size:   $FILESIZE"
echo ""

# -----------------------------------------------------------
# Ask for confirmation (this is destructive!)
# -----------------------------------------------------------
echo "WARNING: This will REPLACE ALL current data with this backup."
echo "Any changes made after this backup was created will be LOST."
echo ""
read -p "Are you sure you want to continue? Type 'yes' to confirm: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Cancelled. Nothing was changed."
    exit 0
fi

# -----------------------------------------------------------
# Create a safety backup before restoring
# -----------------------------------------------------------
echo ""
echo "Step 1/4: Creating a safety backup of current data (just in case)..."
SAFETY_BACKUP="/home/mosque/backups/daily/BEFORE_RESTORE_$(date +%Y-%m-%d_%H%M%S).sql.gz"
mkdir -p /home/mosque/backups/daily
docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
    pg_dump -U "$DB_USER" "$DB_NAME" \
    | gzip > "$SAFETY_BACKUP" || true
echo "Safety backup saved to: $SAFETY_BACKUP"

# -----------------------------------------------------------
# Stop the web service (so no one writes to the database during restore)
# -----------------------------------------------------------
echo ""
echo "Step 2/4: Stopping the web service..."
docker compose -f "$COMPOSE_FILE" stop web

# -----------------------------------------------------------
# Restore the database
# -----------------------------------------------------------
echo ""
echo "Step 3/4: Restoring database from backup..."

# Drop and recreate the database
docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
    psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
    psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Load the backup
gunzip -c "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
    psql -U "$DB_USER" -d "$DB_NAME"

echo "Database restored successfully!"

# -----------------------------------------------------------
# Restart the web service
# -----------------------------------------------------------
echo ""
echo "Step 4/4: Starting the web service back up..."
docker compose -f "$COMPOSE_FILE" start web

# Wait a moment for it to start
sleep 5

# -----------------------------------------------------------
# Verify everything is working
# -----------------------------------------------------------
echo ""
echo "Checking health..."
HEALTH=$(curl -sf http://localhost:8000/health/ || echo "FAILED")

if echo "$HEALTH" | grep -q "ok"; then
    echo "Health check passed! Everything is working."
else
    echo "WARNING: Health check did not pass."
    echo "Check the logs: docker compose -f $COMPOSE_FILE logs web --tail 50"
fi

echo ""
echo "=== Restore Complete ==="
echo "Restored from: $BACKUP_FILE"
echo "Safety backup: $SAFETY_BACKUP"
