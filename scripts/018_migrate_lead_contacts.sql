-- Migrate existing lead contact data into contacts table
-- Only creates contacts for leads that have at least a contact_name
INSERT INTO contacts (lead_id, full_name, email, phone, linkedin_url, job_title, is_primary, role_type, influence_level, relationship_status)
SELECT
    id AS lead_id,
    contact_name AS full_name,
    contact_email AS email,
    contact_phone AS phone,
    contact_linkedin AS linkedin_url,
    contact_title AS job_title,
    TRUE AS is_primary,
    'other' AS role_type,
    'unknown' AS influence_level,
    'unknown' AS relationship_status
FROM leads
WHERE contact_name IS NOT NULL
  AND contact_name != ''
  AND NOT EXISTS (
    SELECT 1 FROM contacts c WHERE c.lead_id = leads.id
  );
