#!/usr/bin/env python3
"""
Script to add org_id filtering to endpoints that don't have it yet.

Strategy:
  1. Add `from app.core.tenant import get_org_id` import
  2. Add `org_id: str = Depends(get_org_id)` to list/create/get endpoints
  3. Add `.where(Model.org_id == org_id)` to SELECT queries
  4. Add `obj.org_id = org_id` to CREATE operations

Run from st4rtup/backend/ directory.
"""
import re
from pathlib import Path

ENDPOINTS_DIR = Path("app/api/v1/endpoints")

# Endpoints to modify (those not yet using get_org_id)
TARGETS = [
    "notifications.py",
    "chat.py",
    "reports.py",
    "settings.py",
    "campaigns.py",
    "funnels.py",
    "marketing_assets.py",
    "utm_codes.py",
    "marketing_calendar.py",
    "marketing_alerts.py",
    "marketing_analytics.py",
    "marketing_documents.py",
    "marketing_webhooks.py",
    "brand.py",
    "pricing.py",
    "competitors.py",
    "playbook.py",
    "gtm_dashboard.py",
    "media.py",
    "okr.py",
    "social.py",
    "landings.py",
    "content_pipeline.py",
    "report_builder.py",
    "cost_control.py",
    "contracts.py",
    "linkedin.py",
    "seo.py",
    "llm_visibility.py",
    "pipeline_rules.py",
    "audit_log.py",
]

# Endpoints that should NOT be modified
SKIP = [
    "auth.py",  # no org context yet (pre-login)
    "admin.py",  # super-admin, cross-org
    "public_api.py",  # public
    "public_forms.py",  # public
    "email_tracking.py",  # tracking pixels (public)
    "mcp_gateway.py",  # proxy
    "agents.py",  # agent registry (system-level)
    "airtable.py",  # external integration
    "external_analytics.py",  # GA4/GSC (per user, not per org)
    "youtube.py",  # external
    "security.py",  # 2FA/sessions (per user)
    "affiliates.py",  # already handled
    "analytics_internal.py",  # internal
    "automation_tasks.py",  # linked to automations (already filtered)
]


def add_org_import(content: str) -> str:
    """Add get_org_id import if not present."""
    if "get_org_id" in content:
        return content

    # Find the last import line from app.core
    if "from app.core.tenant import" in content:
        return content

    # Add after the last `from app.core` import
    if "from app.core" in content:
        content = re.sub(
            r"(from app\.core\.\w+ import .+\n)",
            r"\1from app.core.tenant import get_org_id\n",
            content,
            count=1,
        )
    elif "from app.core.security import" in content:
        content = content.replace(
            "from app.core.security import",
            "from app.core.tenant import get_org_id\nfrom app.core.security import",
        )
    else:
        # Fallback: add at the top after other imports
        lines = content.split("\n")
        insert_at = 0
        for i, line in enumerate(lines):
            if line.startswith("from ") or line.startswith("import "):
                insert_at = i + 1
        lines.insert(insert_at, "from app.core.tenant import get_org_id")
        content = "\n".join(lines)

    return content


def process_file(filepath: Path) -> bool:
    """Add org_id import to endpoint file."""
    content = filepath.read_text()

    if "get_org_id" in content:
        print(f"  SKIP {filepath.name} (already has get_org_id)")
        return False

    new_content = add_org_import(content)

    if new_content != content:
        filepath.write_text(new_content)
        print(f"  ADDED import to {filepath.name}")
        return True

    print(f"  NO CHANGE {filepath.name}")
    return False


def main():
    modified = 0
    for endpoint_file in TARGETS:
        filepath = ENDPOINTS_DIR / endpoint_file
        if filepath.exists():
            if process_file(filepath):
                modified += 1
        else:
            print(f"  NOT FOUND: {endpoint_file}")

    print(f"\nDone. Added imports to {modified} files.")
    print("\nIMPORTANT: The import is added but individual endpoint functions")
    print("still need manual review to add:")
    print("  - org_id: str = Depends(get_org_id)  in function params")
    print("  - .where(Model.org_id == org_id)     in SELECT queries")
    print("  - obj.org_id = org_id                 in CREATE operations")
    print("\nThis requires understanding each endpoint's query structure.")
    print("See existing endpoints (leads.py, visits.py) for the pattern.")


if __name__ == "__main__":
    main()
