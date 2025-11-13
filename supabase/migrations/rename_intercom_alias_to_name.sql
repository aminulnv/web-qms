-- Migration: Rename employee_intercom_alias to employee_intercom_name
-- This field stores the Intercom name from intercom_admin_cache table

-- Rename the column
ALTER TABLE conversation_pull_history 
RENAME COLUMN employee_intercom_alias TO employee_intercom_name;

-- Update the comment to clarify it's the Intercom name from the cache
COMMENT ON COLUMN conversation_pull_history.employee_intercom_name IS 'Intercom name from intercom_admin_cache table (fetched using employee_admin_id)';

-- Update existing data: populate employee_intercom_name from intercom_admin_cache
UPDATE conversation_pull_history cph
SET employee_intercom_name = iac.name
FROM intercom_admin_cache iac
WHERE cph.employee_admin_id = iac.id
  AND cph.employee_intercom_name IS NULL
  AND iac.name IS NOT NULL;


