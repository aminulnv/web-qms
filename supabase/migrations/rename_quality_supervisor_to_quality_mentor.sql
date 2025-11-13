-- Migration: Rename quality_supervisor column to quality_mentor
-- This migration renames the quality_supervisor column to quality_mentor across all relevant tables

-- Rename column in users table
ALTER TABLE users 
RENAME COLUMN quality_supervisor TO quality_mentor;

-- If there are any other tables with this column, add them here
-- Example:
-- ALTER TABLE other_table 
-- RENAME COLUMN quality_supervisor TO quality_mentor;

