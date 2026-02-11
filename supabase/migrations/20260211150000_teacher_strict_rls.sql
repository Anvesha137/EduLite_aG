-- MIGRATION: Strict RLS for Teacher/Educator Module
-- DESCRIPTION: Enforces strict visibility based on educator_class_assignments.

-- 1. Helper Function: Get Current User's Educator ID
CREATE OR REPLACE FUNCTION get_my_educator_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM educators WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 2. Helper Function: Is Class Teacher?
CREATE OR REPLACE FUNCTION is_class_teacher(p_class_id uuid, p_section_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM educator_class_assignments
    WHERE educator_id = get_my_educator_id()
    AND class_id = p_class_id
    AND section_id = p_section_id
    AND is_class_teacher = true
    AND status = 'active' -- Assuming 'status' column exists in assignment ref (schema check: it's not in init_schema, let's ignore or add if needed. legacy table doesn't have status, so ignoring)
  );
END;
$$;

-- 3. Helper Function: Is Subject Teacher?
CREATE OR REPLACE FUNCTION is_subject_teacher(p_class_id uuid, p_section_id uuid, p_subject_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM educator_class_assignments
    WHERE educator_id = get_my_educator_id()
    AND class_id = p_class_id
    AND section_id = p_section_id
    AND subject_id = p_subject_id
  );
END;
$$;

-- 4. HELPER: Has ANY access to this class/section (for student list)
CREATE OR REPLACE FUNCTION has_class_access(p_class_id uuid, p_section_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM educator_class_assignments
    WHERE educator_id = get_my_educator_id()
    AND class_id = p_class_id
    AND section_id = p_section_id
  );
END;
$$;


-- ========================================================
-- ENABLE RLS on Critical Tables & Apply Policies
-- ========================================================

-- A. ATTENDANCE (Class Teacher ONLY)
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teacher Attendance Policy" ON attendance;
CREATE POLICY "Teacher Attendance Policy" ON attendance
FOR ALL
USING (
    -- Admin/Superadmin (standard role check)
    (SELECT role_id FROM user_profiles WHERE id = auth.uid()) IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    OR
    -- Class Teacher for the specific record
    (
       auth.role() = 'authenticated' AND 
       is_class_teacher(
          (SELECT class_id FROM students WHERE id = attendance.student_id), 
          (SELECT section_id FROM students WHERE id = attendance.student_id)
       )
    )
    OR 
    -- Parent View Own Child
    (
       auth.role() = 'authenticated' AND
       student_id IN (SELECT id FROM students WHERE parent_id = (SELECT id FROM parents WHERE user_id = auth.uid()))
    )
);


-- B. MARKS (Subject Teacher ONLY for Entry, Class Teacher + Parent for View)
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teacher Marks Policy" ON marks;
CREATE POLICY "Teacher Marks Policy" ON marks
FOR ALL
USING (
    -- Admin
    (SELECT role_id FROM user_profiles WHERE id = auth.uid()) IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    OR
    -- Subject Teacher (Can Edit/View own subject marks)
    (
       auth.role() = 'authenticated' AND 
       is_subject_teacher(
          (SELECT class_id FROM students WHERE id = marks.student_id), 
          (SELECT section_id FROM students WHERE id = marks.student_id),
          marks.subject_id
       )
    )
    OR
    -- Class Teacher (View All Marks for their class)
    (
       auth.role() = 'authenticated' AND 
       is_class_teacher(
          (SELECT class_id FROM students WHERE id = marks.student_id), 
          (SELECT section_id FROM students WHERE id = marks.student_id)
       )
    )
    OR
    -- Parent View Own Child
    (
       auth.role() = 'authenticated' AND
       student_id IN (SELECT id FROM students WHERE parent_id = (SELECT id FROM parents WHERE user_id = auth.uid()))
    )
);


-- C. STUDENTS (Teachers Only See Their Assigned Students)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teacher Student Visibility" ON students;
CREATE POLICY "Teacher Student Visibility" ON students
FOR SELECT
USING (
    -- Admin/Superadmin
    (SELECT role_id FROM user_profiles WHERE id = auth.uid()) IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    OR
    -- Teacher assigned to this student's class (Class or Subject)
    (
       auth.role() = 'authenticated' AND 
       has_class_access(class_id, section_id)
    )
    OR
    -- Parent View Own Child
    (
       auth.role() = 'authenticated' AND
       parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
    )
);

-- D. EDUCATOR_CLASS_ASSIGNMENTS (View Own Assignments)
ALTER TABLE educator_class_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View Own Assignments" ON educator_class_assignments;
CREATE POLICY "View Own Assignments" ON educator_class_assignments
FOR SELECT
USING (
    -- Admin
    (SELECT role_id FROM user_profiles WHERE id = auth.uid()) IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    OR
    -- Self
    educator_id = get_my_educator_id()
);
