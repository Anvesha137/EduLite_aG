-- Migration: Fix Exams Table Created By
-- Description: Adds missing 'created_by' column.

ALTER TABLE exams ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- No change needed to RPC as it was already trying to insert into created_by.
-- The previous error prevented the insert because the column didn't exist.
