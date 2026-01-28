-- Migration: Disable RLS for Exam Configs
-- Description: Disables RLS completely for exam_types, grade_scales, and grade_slabs to prevent any permission issues.

-- 1. Exam Types
ALTER TABLE exam_types DISABLE ROW LEVEL SECURITY;
GRANT ALL ON exam_types TO authenticated;
GRANT ALL ON exam_types TO service_role;

-- 2. Grade Scales
ALTER TABLE grade_scales DISABLE ROW LEVEL SECURITY;
GRANT ALL ON grade_scales TO authenticated;
GRANT ALL ON grade_scales TO service_role;

-- 3. Grade Slabs
ALTER TABLE grade_slabs DISABLE ROW LEVEL SECURITY;
GRANT ALL ON grade_slabs TO authenticated;
GRANT ALL ON grade_slabs TO service_role;
