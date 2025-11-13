-- Migration: Add ai_audit_status field to conversation_pull_history table
-- This field tracks whether conversations from this pull have been sent to AI audit (n8n)
-- States: 'sent' (sent to n8n), 'done' (processing complete)

ALTER TABLE conversation_pull_history 
ADD COLUMN IF NOT EXISTS ai_audit_status TEXT DEFAULT NULL;

-- Add check constraint to ensure only valid values
ALTER TABLE conversation_pull_history
ADD CONSTRAINT check_ai_audit_status 
CHECK (ai_audit_status IS NULL OR ai_audit_status IN ('sent', 'done'));

-- Add comment for documentation
COMMENT ON COLUMN conversation_pull_history.ai_audit_status IS 'Status of AI audit: sent (sent to n8n), done (processing complete), or NULL (not sent yet)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pull_history_ai_audit_status 
    ON conversation_pull_history(ai_audit_status);


