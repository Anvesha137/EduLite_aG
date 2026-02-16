-- Migration: Fix Fee Types Schema
-- Description: Adds missing recurring and school_id columns, fixes uniqueness constraints to be school-specific.

-- 1. Add school_id if missing
ALTER TABLE fee_types 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id) ON DELETE CASCADE;

-- 2. Add recurring column (boolean) - Frontend expects this
ALTER TABLE fee_types 
ADD COLUMN IF NOT EXISTS recurring boolean DEFAULT true;

-- 3. Ensure mandatory and refundable exist (from school_plan_module)
ALTER TABLE fee_types 
ADD COLUMN IF NOT EXISTS mandatory boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS refundable boolean DEFAULT false;

-- 4. Fix Unique Constraints
-- Global unique names/codes are bad for multi-tenancy
ALTER TABLE fee_types DROP CONSTRAINT IF EXISTS fee_types_name_key;
ALTER TABLE fee_types DROP CONSTRAINT IF EXISTS fee_types_code_key;

-- Add school-scoped unique constraints
-- Note: 'code' might be null in some cases if not provided by UI, 
-- but FeeDefinitionTab doesn't set it yet, so we make it school_id/name unique.
ALTER TABLE fee_types ADD CONSTRAINT fee_types_school_name_key UNIQUE (school_id, name);

-- 5. Enable RLS and add Policy
ALTER TABLE fee_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School Isolation Policy" ON fee_types;
CREATE POLICY "School Isolation Policy" ON fee_types
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

-- 6. Seed school_id for any existing orphaned rows 
-- (Attempting to link to the first school if null)
UPDATE fee_types SET school_id = (SELECT id FROM schools LIMIT 1) WHERE school_id IS NULL;
