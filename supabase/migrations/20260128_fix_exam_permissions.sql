-- Migration: Fix Exam Permissions
-- Description: Relaxes RLS policies for exam configuration tables to avoid "permission denied" errors.

-- 1. Exam Types
DROP POLICY IF EXISTS "School staff view configs" ON exam_types;
DROP POLICY IF EXISTS "Admins manage exam types" ON exam_types;

CREATE POLICY "Enable read access for authenticated users" ON exam_types 
  FOR SELECT TO authenticated USING (true);
  
CREATE POLICY "Enable all access for admins" ON exam_types 
  FOR ALL TO authenticated USING (
    auth.uid() IN (
        SELECT id FROM user_profiles 
        WHERE role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
);

-- 2. Grade Scales
DROP POLICY IF EXISTS "School staff view grade scales" ON grade_scales;
DROP POLICY IF EXISTS "Admins manage grade scales" ON grade_scales;

CREATE POLICY "Enable read access for authenticated users" ON grade_scales 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable all access for admins" ON grade_scales 
  FOR ALL TO authenticated USING (
    auth.uid() IN (
        SELECT id FROM user_profiles 
        WHERE role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
);

-- 3. Grade Slabs
DROP POLICY IF EXISTS "School staff view grade slabs" ON grade_slabs;
DROP POLICY IF EXISTS "Admins manage grade slabs" ON grade_slabs;

CREATE POLICY "Enable read access for authenticated users" ON grade_slabs 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable all access for admins" ON grade_slabs 
  FOR ALL TO authenticated USING (
    auth.uid() IN (
        SELECT id FROM user_profiles 
        WHERE role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
);
