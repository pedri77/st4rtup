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
# Failure alerting: any non-zero exit → Sentry event (via curl to DSN)
# ─────────────────────────────────────────────────────────────────
set -u

# Load DB credentials
source /opt/st4rtup/backup.env

# Load GPG passphrase and Sentry DSN from the main .env (single source of secrets)
BACKUP_GPG_PASSPHRASE=$(grep '^BACKUP_GPG_PASSPHRASE=' /opt/st4rtup/.env | cut -d= -f2-)
SENTRY_DSN=$(grep '^SENTRY_DSN=' /opt/st4rtup/.env | cut -d= -f2-)
TELEGRAM_BOT_TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' /opt/st4rtup/.env | cut -d= -f2-)
TELEGRAM_CHAT_ID=$(grep '^TELEGRAM_CHAT_ID=' /opt/st4rtup/.env | cut -d= -f2-)

# ─── Failure handler: send a message to Telegram via Bot API ───
_alert_telegram() {
    local message="$1"
    if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
        return 0
    fi
    local text="🚨 *st4rtup backup FAILED*%0A%0A${message}%0A%0AHost: $(hostname)%0ATime: $(date '+%Y-%m-%d %H:%M:%S %Z')"
    curl -sS --max-time 10 \
         -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
         -d "chat_id=${TELEGRAM_CHAT_ID}" \
         -d "text=${text}" \
         -d "parse_mode=Markdown" >/dev/null 2>&1 || true
}

# ─── Success notification to Telegram ───
_notify_telegram_success() {
    if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
        return 0
    fi
    local text="✅ *st4rtup backup OK*%0A%0AFile: ${1}%0ASize: ${2}%0ADaily: ${3} | Monthly: ${4}%0ATime: $(date '+%Y-%m-%d %H:%M:%S %Z')"
    curl -sS --max-time 10 \
         -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
         -d "chat_id=${TELEGRAM_CHAT_ID}" \
         -d "text=${text}" \
         -d "parse_mode=Markdown" >/dev/null 2>&1 || true
}

# ─── Failure handler: send an event to Sentry via its Store API ───
# Uses curl so there are no Python dependencies in the backup pipeline.
_alert_sentry() {
    local message="$1"
    if [ -z "${SENTRY_DSN:-}" ]; then
        return 0
    fi
    # Parse https://<key>@o<orgid>.ingest.<region>.sentry.io/<projectid>
    local key=$(echo "$SENTRY_DSN" | sed -E 's|https://([^@]+)@.*|\1|')
    local host=$(echo "$SENTRY_DSN" | sed -E 's|https://[^@]+@([^/]+)/.*|\1|')
    local project=$(echo "$SENTRY_DSN" | sed -E 's|.*/([0-9]+)$|\1|')
    if [ -z "$key" ] || [ -z "$host" ] || [ -z "$project" ]; then
        echo "[$(date)] WARN: Could not parse SENTRY_DSN, skipping alert"
        return 0
    fi
    local payload=$(cat <<PAYLOAD
{
  "message": "st4rtup backup FAILED: ${message}",
  "level": "error",
  "platform": "other",
  "environment": "production",
  "tags": {"service": "backup", "component": "ops/backup.sh"}
}
PAYLOAD
)
    curl -sS --max-time 10 \
         -X POST "https://${host}/api/${project}/store/" \
         -H "Content-Type: application/json" \
         -H "X-Sentry-Auth: Sentry sentry_version=7, sentry_key=${key}, sentry_client=st4rtup-backup/1.0" \
         -d "$payload" >/dev/null 2>&1 || true
}

# Trap any UNEXPECTED exit (set -u or unhandled command failures).
# Explicit error paths below set _ALERTED=1 before `exit` to prevent
# double-posting to Sentry.
_ALERTED=0
trap '_rc=$?; if [ $_rc -ne 0 ] && [ "$_ALERTED" = "0" ]; then _alert_sentry "script exited with code $_rc"; _alert_telegram "script exited with code $_rc"; fi' EXIT

if [ -z "${BACKUP_GPG_PASSPHRASE:-}" ]; then
    echo "[$(date)] ERROR: BACKUP_GPG_PASSPHRASE not set in /opt/st4rtup/.env"
    _alert_sentry "BACKUP_GPG_PASSPHRASE missing from .env"
    _alert_telegram "BACKUP_GPG_PASSPHRASE missing from .env"
    _ALERTED=1; exit 1
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
    _alert_sentry "pg_dump failed — check Supabase connectivity or credentials"
    _alert_telegram "pg_dump failed — check Supabase connectivity or credentials"
    _ALERTED=1; exit 2
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
    _alert_sentry "GPG encryption failed — check BACKUP_GPG_PASSPHRASE or disk space"
    _alert_telegram "GPG encryption failed — check BACKUP_GPG_PASSPHRASE or disk space"
    _ALERTED=1; exit 3
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
_notify_telegram_success "$(basename $ENCRYPTED_FILE)" "$SIZE_ENC" "$DAILY_COUNT" "$MONTHLY_COUNT"
exit 0
