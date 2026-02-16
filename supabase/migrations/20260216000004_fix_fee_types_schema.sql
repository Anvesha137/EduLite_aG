-- Migration: Fix Fee Types Schema
-- Description: Adds missing recurring and school_id columns, fixes uniqueness constraints to be school-specific.

-- 1. Add columns if missing
ALTER TABLE fee_types 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS recurring boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS mandatory boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS refundable boolean DEFAULT false;

-- 2. Seed school_id for any existing orphaned rows BEFORE adding constraints
-- (Attempting to link to the first school found to prevent constraint violations)
DO $$
DECLARE
    v_school_id uuid;
BEGIN
    SELECT id INTO v_school_id FROM schools LIMIT 1;
    IF v_school_id IS NOT NULL THEN
        UPDATE fee_types SET school_id = v_school_id WHERE school_id IS NULL;
    END IF;
END $$;

-- 3. Fix Unique Constraints
-- Global unique names/codes are bad for multi-tenancy
ALTER TABLE fee_types DROP CONSTRAINT IF EXISTS fee_types_name_key;
ALTER TABLE fee_types DROP CONSTRAINT IF EXISTS fee_types_code_key;

-- Add school-scoped unique constraints
ALTER TABLE fee_types ADD CONSTRAINT fee_types_school_name_key UNIQUE (school_id, name);

-- 4. Enable RLS and add Policy
ALTER TABLE fee_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School Isolation Policy" ON fee_types;
CREATE POLICY "School Isolation Policy" ON fee_types
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));
