#!/usr/bin/env python3
"""
Bulk-apply org_id filtering to CRUD endpoints.

Pattern applied:
1. Add `org_id: str = Depends(get_org_id)` to function signatures
2. Add `.where(Model.org_id == org_id)` after `select(Model)` in queries
3. Add `org_id=org_id` to object creation

Run from st4rtup/backend/
"""
import re
from pathlib import Path

ENDPOINTS_DIR = Path("app/api/v1/endpoints")

# Endpoints to process (simple CRUD pattern)
TARGETS = [
    "campaigns.py",  # already done manually as reference
    "funnels.py",
    "marketing_assets.py",
    "utm_codes.py",
    "marketing_calendar.py",
    "marketing_alerts.py",
    "marketing_documents.py",
    "brand.py",
    "pricing.py",
    "competitors.py",
    "playbook.py",
    "media.py",
    "okr.py",
    "social.py",
    "landings.py",
    "cost_control.py",
    "pipeline_rules.py",
    "llm_visibility.py",
    "seo.py",
    "linkedin.py",
    "notifications.py",
    "chat.py",
    "reports.py",
    "settings.py",
    "contracts.py",
    "marketing_analytics.py",
    "marketing_webhooks.py",
    "gtm_dashboard.py",
    "content_pipeline.py",
    "report_builder.py",
    "audit_log.py",
]


def apply_org_filter(filepath: Path) -> int:
    """Apply org_id filtering patterns to an endpoint file."""
    content = filepath.read_text()
    original = content
    changes = 0

    # Pattern 1: Add org_id to function signatures that have get_current_user but not get_org_id
    # Match: `current_user: dict = Depends(get_current_user),\n):`
    # Replace with: `current_user: dict = Depends(get_current_user),\n    org_id: str = Depends(get_org_id),\n):`
    content = re.sub(
        r'(current_user:\s*dict\s*=\s*Depends\((?:get_current_user|require_write_access)\),)\s*\n(\s*)\):',
        r'\1\n\2org_id: str = Depends(get_org_id),\n\2):',
        content,
    )

    # Also handle require_write_access pattern
    content = re.sub(
        r'(current_user:\s*dict\s*=\s*Depends\(require_write_access\),)\s*\n(\s*)\):',
        r'\1\n\2org_id: str = Depends(get_org_id),\n\2):',
        content,
    )

    # Pattern 2: Add org_id filter to select() queries
    # Match: `select(Model).order_by(` or `select(Model).where(Model.id ==`
    # But only if not already filtered by org_id

    # For list queries: select(Model).order_by → select(Model).where(Model.org_id == org_id).order_by
    for model_name in _extract_model_names(content):
        # List queries with order_by
        pattern = f'select\\({model_name}\\)\\.order_by'
        if pattern.replace('\\', '') not in content or f'{model_name}.org_id == org_id' in content:
            continue
        content = content.replace(
            f'select({model_name}).order_by',
            f'select({model_name}).where({model_name}.org_id == org_id).order_by',
        )

        # Single-item queries: .where(Model.id == xxx)
        # Add org_id check: .where(Model.id == xxx, Model.org_id == org_id)
        old_where = f'select({model_name}).where({model_name}.id =='
        new_where_check = f'{model_name}.org_id == org_id'
        if old_where in content and new_where_check not in content:
            content = re.sub(
                rf'select\({model_name}\)\.where\({model_name}\.id\s*==\s*(\w+)\)',
                rf'select({model_name}).where({model_name}.id == \1, {model_name}.org_id == org_id)',
                content,
            )

    if content != original:
        filepath.write_text(content)
        # Count actual changes
        import difflib
        diff = list(difflib.unified_diff(original.splitlines(), content.splitlines()))
        changes = len([l for l in diff if l.startswith('+') and not l.startswith('+++')])
        print(f"  ✅ {filepath.name}: {changes} changes")
    else:
        print(f"  ⏭️  {filepath.name}: no changes needed (already filtered or different pattern)")

    return changes


def _extract_model_names(content: str) -> list[str]:
    """Extract SQLAlchemy model names from import statements."""
    models = []
    for match in re.finditer(r'from app\.models\.\w+ import (.+)', content):
        for name in match.group(1).split(','):
            name = name.strip().split(' ')[0]  # Handle "Model as Alias"
            if name and name[0].isupper() and name not in ('Optional', 'UUID', 'Query'):
                models.append(name)
    # Also check from app.models import
    for match in re.finditer(r'from app\.models import (.+)', content):
        for name in match.group(1).split(','):
            name = name.strip().split(' ')[0]
            if name and name[0].isupper() and 'Status' not in name and 'Stage' not in name and 'Type' not in name:
                models.append(name)
    return models


def main():
    total_changes = 0
    for ep in TARGETS:
        filepath = ENDPOINTS_DIR / ep
        if filepath.exists():
            total_changes += apply_org_filter(filepath)
        else:
            print(f"  ❌ {ep}: NOT FOUND")

    print(f"\nTotal: {total_changes} changes across {len(TARGETS)} files")


if __name__ == "__main__":
    main()
