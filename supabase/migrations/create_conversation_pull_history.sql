-- Migration: Create conversation_pull_history table
-- This table stores the history of conversation pulls from Intercom

CREATE TABLE IF NOT EXISTS conversation_pull_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Who pulled the conversations
    pulled_by_email TEXT NOT NULL,
    pulled_by_name TEXT,
    
    -- Employee information that was pulled
    employee_name TEXT NOT NULL,
    employee_email TEXT NOT NULL,
    employee_admin_id TEXT NOT NULL, -- Admin ID from Intercom admin cache
    employee_intercom_name TEXT, -- Intercom name from intercom_admin_cache table (fetched using employee_admin_id)
    
    -- Pull details
    pull_date DATE NOT NULL, -- Date the conversations were pulled (e.g., 2025-11-10)
    conversation_count INTEGER NOT NULL DEFAULT 0, -- Number of conversations found (e.g., 100)
    
    -- Conversation IDs stored as JSONB array
    -- Example: ["1", "2", "4", "1212", "100"]
    conversation_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE conversation_pull_history IS 'Stores history of conversation pulls from Intercom';
COMMENT ON COLUMN conversation_pull_history.pulled_by_email IS 'Email of the user who pulled the conversations';
COMMENT ON COLUMN conversation_pull_history.employee_admin_id IS 'Intercom admin ID from the admin cache';
COMMENT ON COLUMN conversation_pull_history.conversation_ids IS 'Array of conversation IDs as JSONB: ["1", "2", "4", "1212", "100"]';
COMMENT ON COLUMN conversation_pull_history.pull_date IS 'Date for which conversations were pulled (e.g., 2025-11-10)';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_pull_history_pulled_by_email 
    ON conversation_pull_history(pulled_by_email);

CREATE INDEX IF NOT EXISTS idx_pull_history_employee_email 
    ON conversation_pull_history(employee_email);

CREATE INDEX IF NOT EXISTS idx_pull_history_employee_admin_id 
    ON conversation_pull_history(employee_admin_id);

CREATE INDEX IF NOT EXISTS idx_pull_history_pull_date 
    ON conversation_pull_history(pull_date);

CREATE INDEX IF NOT EXISTS idx_pull_history_created_at 
    ON conversation_pull_history(created_at DESC);

-- Index for querying conversation IDs (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_pull_history_conversation_ids 
    ON conversation_pull_history USING GIN (conversation_ids);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_pull_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_conversation_pull_history_updated_at
    BEFORE UPDATE ON conversation_pull_history
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_pull_history_updated_at();

