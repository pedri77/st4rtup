#!/usr/bin/env bash
#
# deploy.sh — Deploy st4rtup backend to Hetzner via rsync + restart
#
# Usage:
#   ./ops/deploy.sh              # Deploy from local repo
#   ./ops/deploy.sh --dry-run    # Show what would be synced
#
# Prerequisites:
#   - SSH key: ~/.ssh/id_hetzner
#   - Server: 188.245.166.253 (root@)
#   - Backend at /opt/st4rtup on server
#
set -euo pipefail

REMOTE_HOST="root@188.245.166.253"
REMOTE_DIR="/opt/st4rtup"
SSH_KEY="$HOME/.ssh/id_hetzner"
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=10"
DRY_RUN=""

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="--dry-run"
  echo "=== DRY RUN ==="
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Deploying st4rtup backend ==="
echo "    From: $REPO_ROOT/backend"
echo "    To:   $REMOTE_HOST:$REMOTE_DIR"
echo ""

# 1. Sync app code
echo "[1/5] Syncing app/ code..."
rsync -az $DRY_RUN --delete \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.pytest_cache' \
  -e "ssh $SSH_OPTS" \
  "$REPO_ROOT/backend/app/" \
  "$REMOTE_HOST:$REMOTE_DIR/app/"

# 2. Sync alembic migrations
echo "[2/5] Syncing alembic migrations..."
rsync -az $DRY_RUN --delete \
  --exclude '__pycache__' \
  -e "ssh $SSH_OPTS" \
  "$REPO_ROOT/backend/alembic/" \
  "$REMOTE_HOST:$REMOTE_DIR/alembic/"

# 3. Sync requirements.txt and install new deps
echo "[3/5] Syncing requirements.txt..."
rsync -az $DRY_RUN \
  -e "ssh $SSH_OPTS" \
  "$REPO_ROOT/backend/requirements.txt" \
  "$REMOTE_HOST:$REMOTE_DIR/requirements.txt"

if [[ -z "$DRY_RUN" ]]; then
  echo "    Installing dependencies..."
  ssh $SSH_OPTS "$REMOTE_HOST" \
    "cd $REMOTE_DIR && venv/bin/pip install -q -r requirements.txt 2>&1 | tail -3"
fi

# 4. Restart service
if [[ -z "$DRY_RUN" ]]; then
  echo "[4/5] Restarting st4rtup service..."
  ssh $SSH_OPTS "$REMOTE_HOST" "systemctl restart st4rtup"
  sleep 3
fi

# 5. Health check
if [[ -z "$DRY_RUN" ]]; then
  echo "[5/5] Health check..."
  for i in $(seq 1 10); do
    if ssh $SSH_OPTS "$REMOTE_HOST" "curl -sf http://127.0.0.1:8001/ready" > /dev/null 2>&1; then
      echo "    /ready OK after ${i}s"
      # Show metrics summary
      ssh $SSH_OPTS "$REMOTE_HOST" \
        "curl -s http://127.0.0.1:8001/ready && echo '' && systemctl is-active st4rtup"
      echo ""
      echo "=== Deploy complete ==="
      exit 0
    fi
    sleep 2
  done
  echo "    /ready FAILED after 20s"
  echo "    Checking logs..."
  ssh $SSH_OPTS "$REMOTE_HOST" "journalctl -u st4rtup --no-pager -n 10"
  exit 1
else
  echo "[4/5] Skipped (dry run)"
  echo "[5/5] Skipped (dry run)"
  echo ""
  echo "=== Dry run complete ==="
fi
