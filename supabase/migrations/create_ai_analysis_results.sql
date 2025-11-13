-- Migration: Create ai_analysis_results table
-- This table stores AI analysis results for conversations

CREATE TABLE IF NOT EXISTS ai_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Conversation reference
    conversation_id TEXT NOT NULL, -- Intercom conversation ID
    
    -- Employee information
    employee_email TEXT NOT NULL,
    employee_name TEXT,
    employee_admin_id TEXT, -- Admin ID from Intercom
    
    -- Analysis details
    analysis_status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed
    analysed_at TIMESTAMPTZ, -- When the analysis was completed
    
    -- Analysis results (stored as JSONB for flexibility)
    -- Can store scores, insights, recommendations, etc.
    analysis_data JSONB DEFAULT '{}'::jsonb,
    
    -- Who requested/triggered the analysis
    analysed_by_email TEXT, -- Email of user who triggered the analysis
    analysed_by_name TEXT,
    
    -- Reference to pull history (optional)
    pull_history_id UUID REFERENCES conversation_pull_history(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one analysis per conversation (can be updated)
    UNIQUE(conversation_id)
);

-- Add comments for documentation
COMMENT ON TABLE ai_analysis_results IS 'Stores AI analysis results for conversations';
COMMENT ON COLUMN ai_analysis_results.conversation_id IS 'Intercom conversation ID';
COMMENT ON COLUMN ai_analysis_results.analysis_status IS 'Status: pending, completed, failed';
COMMENT ON COLUMN ai_analysis_results.analysis_data IS 'JSONB object containing analysis results, scores, insights, etc.';
COMMENT ON COLUMN ai_analysis_results.pull_history_id IS 'Reference to the pull history record if analysis was triggered from a pull';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_analysis_conversation_id 
    ON ai_analysis_results(conversation_id);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_employee_email 
    ON ai_analysis_results(employee_email);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_status 
    ON ai_analysis_results(analysis_status);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_analysed_at 
    ON ai_analysis_results(analysed_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_pull_history_id 
    ON ai_analysis_results(pull_history_id);

-- Index for querying analysis_data (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_ai_analysis_data 
    ON ai_analysis_results USING GIN (analysis_data);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_analysis_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_ai_analysis_results_updated_at
    BEFORE UPDATE ON ai_analysis_results
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_analysis_results_updated_at();


