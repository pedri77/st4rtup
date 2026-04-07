#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# st4rtup production database backup — encrypted + tiered retention
#
# Writes a daily encrypted pg_dump to /opt/st4rtup/backups/daily/
# On the 1st of each month, also copies to /opt/st4rtup/backups/monthly/
#
# Retention:
#   daily:   30 most recent files (~30 days)
#   monthly: 12 most recent files (~1 year)
#
# Encryption: GPG symmetric (AES256) with passphrase from .env
# ─────────────────────────────────────────────────────────────────
set -u

# Load DB credentials
source /opt/st4rtup/backup.env

# Load GPG passphrase from the main .env (keeps secrets in one place)
BACKUP_GPG_PASSPHRASE=$(grep '^BACKUP_GPG_PASSPHRASE=' /opt/st4rtup/.env | cut -d= -f2-)

if [ -z "${BACKUP_GPG_PASSPHRASE:-}" ]; then
    echo "[$(date)] ERROR: BACKUP_GPG_PASSPHRASE not set in /opt/st4rtup/.env"
    exit 1
fi

DATE=$(date +%Y%m%d_%H%M)
DAY_OF_MONTH=$(date +%d)
BACKUP_ROOT=/opt/st4rtup/backups
DAILY_DIR=$BACKUP_ROOT/daily
MONTHLY_DIR=$BACKUP_ROOT/monthly
mkdir -p "$DAILY_DIR" "$MONTHLY_DIR"

DUMP_FILE="$DAILY_DIR/st4rtup_${DATE}.dump"
ENCRYPTED_FILE="${DUMP_FILE}.gpg"

# ─── 1. Dump ──────────────────────────────────────────────────
PGPASSWORD=$SUPABASE_DB_PASSWORD pg_dump \
    -h db.ufwjtzvfclnmbskemdjp.supabase.co \
    -p 5432 \
    -U postgres \
    -d postgres \
    --no-owner \
    --no-acl \
    -F c \
    -f "$DUMP_FILE" 2>&1

if [ $? -ne 0 ] || [ ! -f "$DUMP_FILE" ]; then
    echo "[$(date)] Backup FAILED at pg_dump stage"
    exit 2
fi

SIZE_RAW=$(du -h "$DUMP_FILE" | cut -f1)
echo "[$(date)] Dump OK: $(basename $DUMP_FILE) ($SIZE_RAW)"

# ─── 2. Encrypt with GPG (symmetric AES256) ───────────────────
echo "$BACKUP_GPG_PASSPHRASE" | gpg \
    --batch --yes --passphrase-fd 0 \
    --cipher-algo AES256 \
    --symmetric \
    --output "$ENCRYPTED_FILE" \
    "$DUMP_FILE"

if [ $? -ne 0 ] || [ ! -f "$ENCRYPTED_FILE" ]; then
    echo "[$(date)] Encryption FAILED"
    rm -f "$DUMP_FILE"
    exit 3
fi

# Remove the plaintext dump — we only keep the encrypted version
rm -f "$DUMP_FILE"
SIZE_ENC=$(du -h "$ENCRYPTED_FILE" | cut -f1)
echo "[$(date)] Encrypted OK: $(basename $ENCRYPTED_FILE) ($SIZE_ENC)"

# ─── 3. Monthly copy (on the 1st of each month) ───────────────
if [ "$DAY_OF_MONTH" = "01" ]; then
    MONTHLY_FILE="$MONTHLY_DIR/st4rtup_$(date +%Y%m).dump.gpg"
    cp "$ENCRYPTED_FILE" "$MONTHLY_FILE"
    echo "[$(date)] Monthly copy: $(basename $MONTHLY_FILE)"
fi

# ─── 4. Retention ─────────────────────────────────────────────
# Daily: keep last 30 files
DAILY_COUNT=$(ls -1 "$DAILY_DIR"/*.gpg 2>/dev/null | wc -l)
if [ "$DAILY_COUNT" -gt 30 ]; then
    ls -1t "$DAILY_DIR"/*.gpg | tail -n +31 | while read -r old; do
        rm -f "$old"
        echo "[$(date)] Rotated daily: $(basename $old)"
    done
fi

# Monthly: keep last 12 files
MONTHLY_COUNT=$(ls -1 "$MONTHLY_DIR"/*.gpg 2>/dev/null | wc -l)
if [ "$MONTHLY_COUNT" -gt 12 ]; then
    ls -1t "$MONTHLY_DIR"/*.gpg | tail -n +13 | while read -r old; do
        rm -f "$old"
        echo "[$(date)] Rotated monthly: $(basename $old)"
    done
fi

# ─── 5. Also clean up the old unencrypted backups from the previous script ─
find "$BACKUP_ROOT" -maxdepth 1 -name '*.dump' -not -name '*.gpg' -mtime +1 -delete 2>/dev/null

echo "[$(date)] Backup complete. Daily: $DAILY_COUNT, Monthly: $MONTHLY_COUNT"
exit 0
