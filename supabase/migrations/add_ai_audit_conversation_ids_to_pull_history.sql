-- Migration: Add ai_audit_conversation_ids field to conversation_pull_history table
-- This field stores the filtered conversation IDs that were actually sent to n8n for AI analysis
-- (After filtering from the full conversation_ids list)

ALTER TABLE conversation_pull_history 
ADD COLUMN IF NOT EXISTS ai_audit_conversation_ids JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN conversation_pull_history.ai_audit_conversation_ids IS 'Array of conversation IDs that were filtered and sent to n8n for AI analysis (typically 10 IDs after filtering by rating priority)';

-- Create index for faster queries (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_pull_history_ai_audit_conversation_ids 
    ON conversation_pull_history USING GIN (ai_audit_conversation_ids);

