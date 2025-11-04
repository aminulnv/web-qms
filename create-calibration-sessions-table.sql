-- Create calibration_sessions table for QMS Calibration feature
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.calibration_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    scorecard_id UUID NOT NULL REFERENCES public.scorecards(id) ON DELETE CASCADE,
    audit_id TEXT NOT NULL, -- References the audit ID in the scorecard's audit table
    description TEXT,
    deadline TIMESTAMPTZ,
    participants JSONB DEFAULT '[]'::jsonb, -- Array of participant emails
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
    created_by TEXT NOT NULL, -- Email of the user who created the session
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calibration_sessions_scorecard_id ON public.calibration_sessions(scorecard_id);
CREATE INDEX IF NOT EXISTS idx_calibration_sessions_status ON public.calibration_sessions(status);
CREATE INDEX IF NOT EXISTS idx_calibration_sessions_created_at ON public.calibration_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calibration_sessions_created_by ON public.calibration_sessions(created_by);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calibration_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER calibration_sessions_updated_at
    BEFORE UPDATE ON public.calibration_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_calibration_sessions_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.calibration_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your security requirements)
-- Policy: Users can view all calibration sessions
CREATE POLICY "Users can view calibration sessions"
    ON public.calibration_sessions
    FOR SELECT
    USING (true);

-- Policy: Users can create calibration sessions
CREATE POLICY "Users can create calibration sessions"
    ON public.calibration_sessions
    FOR INSERT
    WITH CHECK (true);

-- Policy: Users can update calibration sessions
CREATE POLICY "Users can update calibration sessions"
    ON public.calibration_sessions
    FOR UPDATE
    USING (true);

-- Policy: Users can delete calibration sessions (optional - remove if you don't want deletion)
-- CREATE POLICY "Users can delete calibration sessions"
--     ON public.calibration_sessions
--     FOR DELETE
--     USING (true);

-- Grant necessary permissions
GRANT ALL ON public.calibration_sessions TO authenticated;
GRANT ALL ON public.calibration_sessions TO service_role;

