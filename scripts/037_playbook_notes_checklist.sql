-- 037: Playbook notes + checklist fields
ALTER TABLE sales_tactics ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE sales_tactics ADD COLUMN IF NOT EXISTS checklist JSON;
