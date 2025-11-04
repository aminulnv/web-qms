-- Migration: Add parameter_comments column to all audit tables
-- This column stores comments from audited employees for each parameter
-- Format: JSONB with structure: { "field_key": { "comments": ["comment1", "comment2"], "commented_at": "timestamp", "commented_by": "email" } }

DO $$
DECLARE
    table_name TEXT;
    audit_table_pattern TEXT := 'audit_%';
BEGIN
    -- Loop through all tables matching the audit pattern
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE audit_table_pattern
        ORDER BY tablename
    LOOP
        -- Check if parameter_comments column already exists
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = table_name 
            AND column_name = 'parameter_comments'
        ) THEN
            -- Add parameter_comments column as JSONB
            EXECUTE format('ALTER TABLE %I ADD COLUMN parameter_comments JSONB DEFAULT NULL', table_name);
            
            RAISE NOTICE 'Added parameter_comments column to table: %', table_name;
        ELSE
            RAISE NOTICE 'Column parameter_comments already exists in table: %', table_name;
        END IF;
    END LOOP;
END $$;

