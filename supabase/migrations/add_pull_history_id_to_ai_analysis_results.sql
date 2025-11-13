-- Migration: Add pull_history_id foreign key to ai_analysis_results
-- This links each analysis result to the pull history record that triggered it

-- Add the pull_history_id column
ALTER TABLE ai_analysis_results 
ADD COLUMN IF NOT EXISTS pull_history_id UUID REFERENCES conversation_pull_history(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN ai_analysis_results.pull_history_id IS 'Reference to the conversation_pull_history record that triggered this analysis';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_analysis_results_pull_history_id 
    ON ai_analysis_results(pull_history_id);

-- Optional: Create index for querying by pull history and interaction_id together
CREATE INDEX IF NOT EXISTS idx_ai_analysis_results_pull_history_interaction 
    ON ai_analysis_results(pull_history_id, interaction_id);


