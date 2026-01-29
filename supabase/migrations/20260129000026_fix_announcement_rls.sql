-- Migration: Fix Announcement RLS
-- Description: Adds the missing School Isolation Policy to the announcements table.

-- 1. Enable RLS (idempotent)
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policy if any (to avoid conflicts)
DROP POLICY IF EXISTS "School Isolation Policy" ON announcements;

-- 3. Create the Policy
-- Allows users to select, insert, update, delete only rows where school_id matches their profile
CREATE POLICY "School Isolation Policy" ON announcements
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

-- 4. Grant access to authenticated users
GRANT ALL ON announcements TO authenticated;
