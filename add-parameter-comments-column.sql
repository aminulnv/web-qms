-- Migration: Add parameter_comments column to all audit tables
-- This column stores comments from audited employees for each parameter
-- Format: JSONB with structure: { "field_key": { "comments": ["comment1", "comment2"], "commented_at": "timestamp", "commented_by": "email" } }

DO $$
DECLARE
    v_table_name TEXT;
BEGIN
    -- Loop through all audit-related tables (including fnchat_cfd and similar tables)
    -- This includes tables matching audit_% pattern and tables like fnchat_cfd, fn_chat_cfd, etc.
    -- Exclude known system/metadata tables
    FOR v_table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN (
            'scorecards', 
            'scorecard_parameters', 
            'users', 
            'audit_assignments', 
            'calibration_sessions', 
            'calibration_results',
            'reversal_change_log'
        )
        AND (
            tablename LIKE 'audit_%' 
            OR tablename LIKE 'fn%_cfd'
            OR tablename LIKE 'fnchat_cfd'
            OR tablename LIKE 'fn_chat_cfd'
            OR tablename = 'fnchat_cfd'
            OR tablename = 'fn_chat_cfd'
        )
        ORDER BY tablename
    LOOP
        -- Check if parameter_comments column already exists
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND information_schema.columns.table_name = v_table_name 
            AND column_name = 'parameter_comments'
        ) THEN
            -- Add parameter_comments column as JSONB
            EXECUTE format('ALTER TABLE %I ADD COLUMN parameter_comments JSONB DEFAULT NULL', v_table_name);
            
            RAISE NOTICE 'Added parameter_comments column to table: %', v_table_name;
        ELSE
            RAISE NOTICE 'Column parameter_comments already exists in table: %', v_table_name;
        END IF;
    END LOOP;
END $$;

