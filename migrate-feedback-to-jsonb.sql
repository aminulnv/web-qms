-- Migration: Convert feedback columns from TEXT to JSONB
-- This migration updates all feedback columns in audit tables to support multiple feedback entries
-- Run this SQL in your Supabase SQL Editor

-- Function to migrate feedback columns for all audit tables
CREATE OR REPLACE FUNCTION migrate_feedback_columns_to_jsonb()
RETURNS void AS $$
DECLARE
    table_record RECORD;
    column_record RECORD;
    feedback_value TEXT;
    feedback_json JSONB;
BEGIN
    -- Loop through all tables in the public schema that have feedback columns
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('scorecards', 'scorecard_parameters', 'users', 'audit_assignments', 'calibration_sessions', 'calibration_results')
    LOOP
        -- Check if this table has any feedback columns
        FOR column_record IN
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = table_record.table_name
            AND column_name LIKE 'feedback_%'
            AND data_type = 'text'
        LOOP
            RAISE NOTICE 'Migrating column % in table %', column_record.column_name, table_record.table_name;
            
            -- Step 1: Add new JSONB column (temporary)
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I_temp JSONB', 
                table_record.table_name, column_record.column_name);
            
            -- Step 2: Migrate existing data from TEXT to JSONB
            -- Convert existing text values to JSON array format
            EXECUTE format('
                UPDATE %I 
                SET %I_temp = CASE 
                    WHEN %I IS NULL OR %I = '''' THEN NULL
                    WHEN %I::text ~ ''^\[.*\]$'' THEN %I::jsonb
                    ELSE jsonb_build_array(%I)
                END
            ', 
                table_record.table_name,
                column_record.column_name,
                column_record.column_name,
                column_record.column_name,
                column_record.column_name,
                column_record.column_name,
                column_record.column_name,
                column_record.column_name
            );
            
            -- Step 3: Drop old TEXT column
            EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS %I', 
                table_record.table_name, column_record.column_name);
            
            -- Step 4: Rename temp column to original name
            EXECUTE format('ALTER TABLE %I RENAME COLUMN %I_temp TO %I', 
                table_record.table_name, column_record.column_name, column_record.column_name);
            
            RAISE NOTICE 'Successfully migrated column % in table %', column_record.column_name, table_record.table_name;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Migration completed successfully';
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_feedback_columns_to_jsonb();

-- Clean up the function if desired (optional)
-- DROP FUNCTION IF EXISTS migrate_feedback_columns_to_jsonb();

-- Note: For new audit tables created after this migration, the create_audit_table RPC 
-- should be updated to create feedback columns as JSONB instead of TEXT.
-- This migration handles existing tables only.

