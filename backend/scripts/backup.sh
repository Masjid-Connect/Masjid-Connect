#!/usr/bin/env bash
# =============================================================
# Masjid Connect — Database Backup Script
# =============================================================
# WHAT THIS DOES:
#   Creates a compressed copy of your database.
#   If something goes wrong, you can use restore.sh to bring it back.
#
# HOW TO USE:
#   ./scripts/backup.sh
#
# HOW TO SET UP AUTOMATIC DAILY BACKUPS:
#   1. Open the cron editor:  crontab -e
#   2. Add this line (runs every day at 3:00 AM):
#      0 3 * * * /home/mosque/Masjid-Connect/backend/scripts/backup.sh
#   3. Save and close
#
# WHERE BACKUPS GO:
#   /home/mosque/backups/
#   Files are named like: masjid_connect_2026-03-08_030000.sql.gz
# =============================================================

set -euo pipefail

# -----------------------------------------------------------
# Settings (change these if your setup is different)
# -----------------------------------------------------------
BACKUP_DIR="/home/mosque/backups"
COMPOSE_FILE="/home/mosque/Masjid-Connect/backend/docker-compose.prod.yml"
DB_SERVICE="db"
DB_NAME="${POSTGRES_DB:-masjid_connect}"
DB_USER="${POSTGRES_USER:-mosque}"

# How many backups to keep
KEEP_DAILY=30       # Last 30 days
KEEP_WEEKLY=12      # Last 12 weeks (Sundays)
KEEP_MONTHLY=12     # Last 12 months (1st of month)

# Offsite backup (DigitalOcean Spaces / S3-compatible)
# Set these environment variables to enable offsite sync:
#   BACKUP_S3_BUCKET   — e.g. s3://masjid-backups
#   BACKUP_S3_ENDPOINT — e.g. https://lon1.digitaloceanspaces.com
# Credentials: configure via ~/.aws/credentials or AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
BACKUP_S3_BUCKET="${BACKUP_S3_BUCKET:-}"
BACKUP_S3_ENDPOINT="${BACKUP_S3_ENDPOINT:-}"

# -----------------------------------------------------------
# Create backup directory if it doesn't exist
# -----------------------------------------------------------
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"
mkdir -p "$BACKUP_DIR/monthly"

# -----------------------------------------------------------
# Create the backup
# -----------------------------------------------------------
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
FILENAME="masjid_connect_${TIMESTAMP}.sql.gz"
DAILY_PATH="$BACKUP_DIR/daily/$FILENAME"

echo "=== Masjid Connect Backup ==="
echo "Time: $(date)"
echo "Backing up database to: $DAILY_PATH"

# Dump the database and compress it
docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
    pg_dump -U "$DB_USER" "$DB_NAME" \
    | gzip > "$DAILY_PATH"

# Check if the backup file was created and is not empty
if [ ! -s "$DAILY_PATH" ]; then
    echo "ERROR: Backup file is empty or was not created!"
    echo "Something went wrong. Check that the database is running."
    exit 1
fi

FILESIZE=$(du -h "$DAILY_PATH" | cut -f1)
echo "Backup created successfully! Size: $FILESIZE"

# -----------------------------------------------------------
# Copy to weekly backup (if today is Sunday)
# -----------------------------------------------------------
DAY_OF_WEEK=$(date +%u)   # 7 = Sunday
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    cp "$DAILY_PATH" "$BACKUP_DIR/weekly/$FILENAME"
    echo "Weekly backup saved."
fi

# -----------------------------------------------------------
# Copy to monthly backup (if today is the 1st)
# -----------------------------------------------------------
DAY_OF_MONTH=$(date +%d)
if [ "$DAY_OF_MONTH" -eq 1 ]; then
    cp "$DAILY_PATH" "$BACKUP_DIR/monthly/$FILENAME"
    echo "Monthly backup saved."
fi

# -----------------------------------------------------------
# Clean up old backups
# -----------------------------------------------------------
echo "Cleaning old backups..."

# Delete daily backups older than $KEEP_DAILY days
find "$BACKUP_DIR/daily" -name "*.sql.gz" -mtime +$KEEP_DAILY -delete 2>/dev/null || true

# Delete weekly backups older than $KEEP_WEEKLY weeks
find "$BACKUP_DIR/weekly" -name "*.sql.gz" -mtime +$((KEEP_WEEKLY * 7)) -delete 2>/dev/null || true

# Delete monthly backups older than $KEEP_MONTHLY months
find "$BACKUP_DIR/monthly" -name "*.sql.gz" -mtime +$((KEEP_MONTHLY * 30)) -delete 2>/dev/null || true

# -----------------------------------------------------------
# Upload to offsite storage (S3-compatible)
# -----------------------------------------------------------
if [ -n "$BACKUP_S3_BUCKET" ]; then
    echo "Uploading to offsite storage: $BACKUP_S3_BUCKET"
    S3_ARGS=""
    if [ -n "$BACKUP_S3_ENDPOINT" ]; then
        S3_ARGS="--endpoint-url $BACKUP_S3_ENDPOINT"
    fi

    # Upload the daily backup
    if aws s3 cp "$DAILY_PATH" "$BACKUP_S3_BUCKET/daily/$FILENAME" $S3_ARGS; then
        echo "Offsite upload successful: daily/$FILENAME"
    else
        echo "WARNING: Offsite upload failed! Local backup is still safe at $DAILY_PATH"
    fi

    # Upload weekly/monthly copies if they were created
    if [ "$DAY_OF_WEEK" -eq 7 ]; then
        aws s3 cp "$DAILY_PATH" "$BACKUP_S3_BUCKET/weekly/$FILENAME" $S3_ARGS || true
    fi
    if [ "$DAY_OF_MONTH" -eq 1 ]; then
        aws s3 cp "$DAILY_PATH" "$BACKUP_S3_BUCKET/monthly/$FILENAME" $S3_ARGS || true
    fi

    # Clean up old offsite backups (mirror local retention policy)
    CUTOFF_DAILY=$(date -d "-${KEEP_DAILY} days" +%Y-%m-%d 2>/dev/null || date -v-${KEEP_DAILY}d +%Y-%m-%d)
    echo "Cleaning offsite backups older than $CUTOFF_DAILY..."
    aws s3 ls "$BACKUP_S3_BUCKET/daily/" $S3_ARGS 2>/dev/null | while read -r line; do
        FILE_DATE=$(echo "$line" | grep -oP 'masjid_connect_\K\d{4}-\d{2}-\d{2}' || true)
        if [ -n "$FILE_DATE" ] && [[ "$FILE_DATE" < "$CUTOFF_DAILY" ]]; then
            FILE_NAME=$(echo "$line" | awk '{print $NF}')
            aws s3 rm "$BACKUP_S3_BUCKET/daily/$FILE_NAME" $S3_ARGS || true
        fi
    done
else
    echo "Offsite backup: SKIPPED (BACKUP_S3_BUCKET not set)"
    echo "  To enable, set BACKUP_S3_BUCKET and BACKUP_S3_ENDPOINT environment variables."
fi

# -----------------------------------------------------------
# Summary
# -----------------------------------------------------------
echo ""
echo "=== Backup Summary ==="
echo "Daily backups:   $(ls -1 "$BACKUP_DIR/daily"/*.sql.gz 2>/dev/null | wc -l)"
echo "Weekly backups:  $(ls -1 "$BACKUP_DIR/weekly"/*.sql.gz 2>/dev/null | wc -l)"
echo "Monthly backups: $(ls -1 "$BACKUP_DIR/monthly"/*.sql.gz 2>/dev/null | wc -l)"
echo "Disk used:       $(du -sh "$BACKUP_DIR" | cut -f1)"
echo "=== Done ==="
