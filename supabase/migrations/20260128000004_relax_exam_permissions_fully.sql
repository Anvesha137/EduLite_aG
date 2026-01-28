-- Migration: Relax Exam Permissions Fully
-- Description: Removes strict role-based policies and allows full access to authenticated users for exam configs.

-- 1. Exam Types
DROP POLICY IF EXISTS "School staff view configs" ON exam_types;
DROP POLICY IF EXISTS "Admins manage exam types" ON exam_types;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON exam_types;
DROP POLICY IF EXISTS "Enable all access for admins" ON exam_types;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON exam_types;

CREATE POLICY "Enable all access for authenticated users" ON exam_types 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Grade Scales
DROP POLICY IF EXISTS "School staff view grade scales" ON grade_scales;
DROP POLICY IF EXISTS "Admins manage grade scales" ON grade_scales;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON grade_scales;
DROP POLICY IF EXISTS "Enable all access for admins" ON grade_scales;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON grade_scales;

CREATE POLICY "Enable all access for authenticated users" ON grade_scales 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Grade Slabs
DROP POLICY IF EXISTS "School staff view grade slabs" ON grade_slabs;
DROP POLICY IF EXISTS "Admins manage grade slabs" ON grade_slabs;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON grade_slabs;
DROP POLICY IF EXISTS "Enable all access for admins" ON grade_slabs;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON grade_slabs;

CREATE POLICY "Enable all access for authenticated users" ON grade_slabs 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
