#!/usr/bin/env python3
"""
Script to add org_id column to all models that don't have it yet.
Run from st4rtup/backend/ directory.

Usage: python ../scripts/add_org_id_to_models.py
"""
import re
from pathlib import Path

MODELS_DIR = Path("app/models")

# org_id line to insert (after __tablename__ line)
ORG_ID_LINE = '    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)\n'

# Models that should get org_id
TARGET_MODELS = [
    "marketing.py",
    "brand.py",
    "competitor.py",
    "playbook.py",
    "okr.py",
    "social.py",
    "landing.py",
    "media.py",
    "pricing.py",
    "cost.py",
    "llm_visibility.py",
    "pipeline_rule.py",
    "marketing_document.py",
    "marketing_webhook.py",
    "kpi.py",
    "backlink.py",
    "forms.py",
    "publication.py",
    "rss_feed.py",
]

# Models that should NOT get org_id
SKIP = [
    "base.py", "enums.py", "models.py", "__init__.py",
    "user.py",  # linked via OrgMember
    "organization.py",  # IS the org table
    "system.py",  # singleton per-org (already handled)
    "subscription.py",  # linked to user
    "audit_log.py",  # system-level
    "webhook_log.py",  # system-level
    "webhook_subscription.py",  # system-level
    "usage_event.py",  # has user_id
    "form_token.py",  # auth tokens
    "affiliate.py",  # already has org_id
    "article.py",  # already has org_id
    "call.py",  # already has org_id
    "contact.py",  # already has org_id
    "crm.py",  # already has org_id
    "deal_room_doc.py",  # already has org_id
    "lead.py",  # already has org_id
    "notification.py",  # already has org_id
    "payment.py",  # already has org_id
    "pipeline.py",  # already has org_id
    "seo.py",  # already has org_id
    "service_catalog.py",  # already has org_id
    "survey.py",  # already has org_id
    "wa_conversation.py",  # already has org_id
]


def add_org_id_to_file(filepath: Path) -> bool:
    """Add org_id column after __tablename__ in each class."""
    content = filepath.read_text()

    # Skip if already has org_id
    if "org_id" in content:
        print(f"  SKIP {filepath.name} (already has org_id)")
        return False

    # Ensure ForeignKey import exists
    if "ForeignKey" not in content:
        content = content.replace(
            "from sqlalchemy import Column",
            "from sqlalchemy import Column, ForeignKey",
        )
        # Handle other import styles
        if "ForeignKey" not in content and "from sqlalchemy import" in content:
            content = re.sub(
                r"(from sqlalchemy import .+)",
                r"\1, ForeignKey",
                content,
                count=1,
            )

    # Ensure UUID import exists
    if "from sqlalchemy.dialects.postgresql import UUID" not in content:
        if "from sqlalchemy" in content:
            # Add after last sqlalchemy import
            last_import = content.rfind("from sqlalchemy")
            end_of_line = content.find("\n", last_import)
            content = (
                content[: end_of_line + 1]
                + "from sqlalchemy.dialects.postgresql import UUID\n"
                + content[end_of_line + 1 :]
            )

    # Find each __tablename__ and add org_id after the line
    lines = content.split("\n")
    new_lines = []
    added = False
    for i, line in enumerate(lines):
        new_lines.append(line)
        if "__tablename__" in line and "org_id" not in "".join(lines[i : i + 5]):
            # Add org_id after __tablename__
            new_lines.append("")
            new_lines.append(
                '    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)'
            )
            added = True

    if added:
        filepath.write_text("\n".join(new_lines))
        print(f"  ADDED org_id to {filepath.name}")
        return True
    else:
        print(f"  SKIP {filepath.name} (no __tablename__ found)")
        return False


def main():
    modified = 0
    for model_file in TARGET_MODELS:
        filepath = MODELS_DIR / model_file
        if filepath.exists():
            if add_org_id_to_file(filepath):
                modified += 1
        else:
            print(f"  NOT FOUND: {model_file}")

    print(f"\nDone. Modified {modified} files.")
    print("Next steps:")
    print("  1. Run: psql $DATABASE_URL < ../scripts/add_org_id_all_tables.sql")
    print("  2. Update endpoints to filter by org_id")
    print("  3. Deploy")


if __name__ == "__main__":
    main()
