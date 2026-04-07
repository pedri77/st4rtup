# Backup & Restore Playbook

Production database backup strategy, encryption details, and restore procedures.

## Overview

st4rtup uses a **tiered backup strategy** with two independent layers:

| Layer | Provider | Retention | Encryption | Use case |
|-------|----------|-----------|------------|----------|
| L1 — Managed | Supabase Pro | 7 days, physical PITR | AES-256 at rest | Fast operational restore (single click in dashboard) |
| L2 — Off-site | Hetzner `/opt/st4rtup/backups/` | 30 daily + 12 monthly | GPG AES256 symmetric | Independent of Supabase, GDPR retention, disaster recovery |

The off-site layer runs as a cron on the Hetzner VPS and dumps the Supabase DB to local encrypted files. This gives us two independent recovery paths.

---

## L1 — Supabase managed backups

- **Trigger**: Supabase runs a physical base backup daily around 07:30 UTC.
- **Access**: Dashboard → Database → Backups → click **Restore** on any row.
- **Point-in-time recovery**: BETA feature, lets you restore to any timestamp within the retention window.
- **Storage objects**: ⚠️ NOT included. Files uploaded via the Supabase Storage API are NOT in these backups.

**Retention limits (Pro plan)**: 7 days. For longer retention upgrade to Team (14 days) or Enterprise (30+ days with PITR).

**When to use L1**: operational recovery within the last week (accidentally dropped table, bad migration, data corruption).

---

## L2 — Off-site encrypted backups on Hetzner

### Schedule

Cron runs `/opt/st4rtup/backup.sh` daily at 03:00 UTC:

```cron
0 3 * * * /opt/st4rtup/backup.sh >> /var/log/st4rtup-backup.log 2>&1
```

### Layout

```
/opt/st4rtup/backups/
├── daily/          # Last 30 encrypted daily backups
│   ├── st4rtup_20260407_0300.dump.gpg
│   ├── st4rtup_20260406_0300.dump.gpg
│   └── ...
└── monthly/        # Last 12 encrypted monthly backups (1st of month)
    ├── st4rtup_202604.dump.gpg
    ├── st4rtup_202603.dump.gpg
    └── ...
```

### Encryption

- **Algorithm**: GPG symmetric with AES256
- **Passphrase**: stored in `/opt/st4rtup/.env` as `BACKUP_GPG_PASSPHRASE`
- **Passphrase backup**: **must** also be in your password manager. If you lose it, the backups are unrecoverable.

### Retention policy

- **Daily**: 30 most recent files. Rotation: script keeps the 30 newest, deletes the rest.
- **Monthly**: 12 most recent files. Created only on the 1st of each month. Rotation: keeps 12 newest.
- Total disk footprint: ~42 files × ~100 KB each = **~4.5 MB** (compresses extremely well).

### Format

Each file is a `pg_dump -F c` (custom compressed format) wrapped in GPG. Two-step decompression on restore.

---

## Restore procedures

### Scenario A — Operational rollback within 7 days (use L1)

Fastest path. Use Supabase dashboard:

1. Open Supabase Dashboard → **Database → Backups**
2. Click **Restore** on the desired date
3. Confirm the restore (creates a new project or replaces the current one depending on the dialog)
4. Wait ~5-10 min for completion
5. Verify via `./scripts/smoke-test.sh`

⚠️ **Restoring replaces the entire current DB.** Coordinate with the team.

### Scenario B — Older than 7 days or Supabase unreachable (use L2)

```bash
# 1. SSH into Hetzner
ssh -i ~/.ssh/id_hetzner root@188.245.166.253

# 2. Pick the backup to restore
ls -lt /opt/st4rtup/backups/daily/
ls -lt /opt/st4rtup/backups/monthly/

# 3. Decrypt with the passphrase (reads BACKUP_GPG_PASSPHRASE from .env)
PASSPHRASE=$(grep '^BACKUP_GPG_PASSPHRASE=' /opt/st4rtup/.env | cut -d= -f2-)
FILE=/opt/st4rtup/backups/daily/st4rtup_20260407_0300.dump.gpg
echo "$PASSPHRASE" | gpg --batch --passphrase-fd 0 --decrypt \
    --output /tmp/restore.dump "$FILE"

# 4. Verify the dump is readable (no restore yet)
pg_restore --list /tmp/restore.dump | head -20

# 5. Restore into a **NEW** Supabase project first (NEVER restore directly
#    over production without a dry run)
NEW_DB_URL="postgresql://postgres:<new_password>@db.<new_ref>.supabase.co:5432/postgres"
pg_restore --no-owner --no-acl --clean --if-exists \
    --dbname="$NEW_DB_URL" \
    --jobs=4 \
    /tmp/restore.dump

# 6. Validate the new DB (count rows, check recent entries, run smoke tests)
psql "$NEW_DB_URL" -c "SELECT count(*) FROM leads; SELECT count(*) FROM users;"

# 7. Only if validation passes, switch DATABASE_URL in /opt/st4rtup/.env
#    and restart the backend:
sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$NEW_DB_URL|" /opt/st4rtup/.env
systemctl restart st4rtup

# 8. Cleanup
rm /tmp/restore.dump
```

### Scenario C — Partial restore (single table)

When you only need to recover one table:

```bash
# Decrypt first (same as Scenario B step 3)

# List contents and find the table
pg_restore --list /tmp/restore.dump | grep -i "TABLE.*leads"

# Extract only that table
pg_restore --no-owner --no-acl \
    --table=leads \
    --data-only \
    --dbname="$DATABASE_URL" \
    /tmp/restore.dump
```

⚠️ Be aware of FK constraints — `--data-only` on a single table may fail if it references other tables that changed.

---

## Verification checklist (quarterly)

Run this every 3 months to make sure backups actually work:

- [ ] `ls /opt/st4rtup/backups/daily/ | wc -l` returns ~30
- [ ] `ls /opt/st4rtup/backups/monthly/ | wc -l` returns 1-12
- [ ] The most recent file is < 24h old: `ls -lt /opt/st4rtup/backups/daily/ | head -2`
- [ ] Test decryption:
  ```bash
  PASSPHRASE=$(grep '^BACKUP_GPG_PASSPHRASE=' /opt/st4rtup/.env | cut -d= -f2-)
  LATEST=$(ls -t /opt/st4rtup/backups/daily/*.gpg | head -1)
  echo "$PASSPHRASE" | gpg --batch --passphrase-fd 0 --decrypt \
      --output /tmp/verify.dump "$LATEST"
  pg_restore --list /tmp/verify.dump | wc -l  # should return ~1000+ TOC entries
  rm /tmp/verify.dump
  ```
- [ ] Test a full restore against a throwaway Supabase project (Scenario B steps 3-6)
- [ ] Check `/var/log/st4rtup-backup.log` for any FAILED entries in the last 3 months
- [ ] Verify Supabase dashboard shows daily backups in the Database Backups section
- [ ] Log the verification in `docs/operations/backup-verification-log.md`

---

## Known gaps

1. **Storage objects (Supabase bucket files) are NOT backed up**.
   TODO: add a step to `backup.sh` that calls the Supabase Storage API to export bucket contents. Not critical yet because st4rtup doesn't use Storage heavily.

2. **Single-location off-site**: Hetzner backups live on the same VPS as the backend. If the entire VPS is lost (Hetzner DC fire, account suspension), we lose L2. L1 in Supabase protects against this, but only 7 days back.
   TODO: provision a Hetzner Storage Box (~€3.81/mo for 1 TB) and add an `rsync` step at the end of `backup.sh` that pushes encrypted files to the Storage Box via SFTP.

3. **No alerting on backup failure**. `/var/log/st4rtup-backup.log` captures failures but nobody watches it.
   TODO: add a post-backup webhook to Sentry or Telegram that fires on `exit != 0`.

4. **Never tested a real restore in production**. We've verified decrypt + `pg_restore --list`, but not a full restore into a live DB.
   TODO: schedule a restore drill next quarter.

---

## Related docs

- [Secret rotation](secret-rotation.md) — includes how to rotate `BACKUP_GPG_PASSPHRASE`
- [`SECURITY.md`](../../SECURITY.md) — overall security posture
- [`CLAUDE.md`](../../CLAUDE.md) — project conventions
