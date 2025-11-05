-- Create reversal_change_log table for comprehensive audit trail
-- This table tracks all changes made during reversal processing for analytics

CREATE TABLE IF NOT EXISTS reversal_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id TEXT NOT NULL,
    scorecard_table_name TEXT NOT NULL,
    reversal_requested_at TIMESTAMPTZ NOT NULL,
    
    -- Original audit state (before changes)
    original_score DECIMAL(5,2),
    original_passing_status TEXT,
    original_parameters JSONB, -- Stores all parameter values before changes
    original_feedback JSONB,   -- Stores all feedback values before changes
    
    -- Changed audit state (after edits)
    changed_parameters JSONB,  -- Only stores parameters that were changed
    changed_feedback JSONB,    -- Only stores feedback that was changed
    new_score DECIMAL(5,2),
    new_passing_status TEXT,
    
    -- Change metadata
    parameters_changed_count INTEGER DEFAULT 0,
    feedback_changed_count INTEGER DEFAULT 0,
    score_change DECIMAL(5,2), -- new_score - original_score
    passing_status_changed BOOLEAN DEFAULT FALSE,
    
    -- Reversal decision
    reversal_decision TEXT, -- 'approved' or 'rejected'
    reversal_approved BOOLEAN,
    reversal_responded_at TIMESTAMPTZ,
    
    -- Auditor information
    processed_by_email TEXT NOT NULL,
    processed_by_name TEXT,
    approved_by_email TEXT,
    approved_by_name TEXT,
    
    -- SLA tracking
    sla_hours DECIMAL(10,2),
    delay_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_reversal_change_log_audit_id ON reversal_change_log(audit_id);
CREATE INDEX IF NOT EXISTS idx_reversal_change_log_table ON reversal_change_log(scorecard_table_name);
CREATE INDEX IF NOT EXISTS idx_reversal_change_log_processed_by ON reversal_change_log(processed_by_email);
CREATE INDEX IF NOT EXISTS idx_reversal_change_log_decision ON reversal_change_log(reversal_decision);
CREATE INDEX IF NOT EXISTS idx_reversal_change_log_date ON reversal_change_log(reversal_requested_at);
CREATE INDEX IF NOT EXISTS idx_reversal_change_log_created_at ON reversal_change_log(created_at);

-- Add comment for documentation
COMMENT ON TABLE reversal_change_log IS 'Comprehensive audit trail of all changes made during reversal processing. Used for analytics on auditor accuracy and reversal patterns.';
COMMENT ON COLUMN reversal_change_log.original_parameters IS 'JSON object containing all parameter field values before changes (e.g., {"field1": 2, "field2": 0})';
COMMENT ON COLUMN reversal_change_log.changed_parameters IS 'JSON object containing only parameters that were modified (e.g., {"field1": 1})';
COMMENT ON COLUMN reversal_change_log.original_feedback IS 'JSON object containing all feedback values before changes';
COMMENT ON COLUMN reversal_change_log.changed_feedback IS 'JSON object containing only feedback that was modified';
COMMENT ON COLUMN reversal_change_log.score_change IS 'Difference between new and original score for quick analytics';

