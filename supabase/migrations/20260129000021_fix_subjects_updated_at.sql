-- Migration: Fix Subjects Table
-- Description: Adds missing 'updated_at' column to subjects table.

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- No need to redefine RPC, it will start working once the column exists.
