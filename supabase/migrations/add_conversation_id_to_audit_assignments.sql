-- Migration: Add conversation_id column to audit_assignments table
-- This allows linking audit assignments to Intercom conversations

-- Add conversation_id column (nullable, as existing assignments won't have this)
ALTER TABLE audit_assignments
ADD COLUMN IF NOT EXISTS conversation_id TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN audit_assignments.conversation_id IS 'Intercom conversation ID linked to this audit assignment';

-- Optional: Add an index for faster lookups by conversation_id
CREATE INDEX IF NOT EXISTS idx_audit_assignments_conversation_id 
ON audit_assignments(conversation_id) 
WHERE conversation_id IS NOT NULL;

