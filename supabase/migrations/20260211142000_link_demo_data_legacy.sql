-- LINKING DEMO DATA (Legacy Schema)
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  v_school_id uuid;
  v_teacher_id uuid;
  v_parent_id uuid;
  v_class_id uuid;
  v_section_id uuid;
  v_subject_id uuid;
  v_c_id text;
BEGIN
  -- 1. Get Context
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  IF v_school_id IS NULL THEN RAISE EXCEPTION 'No school found'; END IF;

  -- 2. Get Teacher (Priya)
  SELECT id INTO v_teacher_id FROM educators WHERE email = 'teacher@demoschool.com';
  IF v_teacher_id IS NULL THEN RAISE EXCEPTION 'Teacher Priya not found'; END IF;

  -- 3. Get Parent (Ramesh)
  SELECT id INTO v_parent_id FROM parents WHERE email = 'parent@demoschool.com';
  IF v_parent_id IS NULL THEN RAISE EXCEPTION 'Parent Ramesh not found'; END IF;

  -- 4. Get/Create Class 10
  -- Trying sort_order (new schema)
  BEGIN
    SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_id AND sort_order = 10;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback/Safety if column doesn't exist (unlikely given error)
    RAISE NOTICE 'Column check failed, assuming sort_order exists due to error';
  END;

  IF v_class_id IS NULL THEN
      -- Check if we need to insert with 'name' and 'sort_order'
      INSERT INTO classes (school_id, name, sort_order) VALUES (v_school_id, 'Class 10', 10) RETURNING id INTO v_class_id;
  END IF;

  -- 5. Get/Create Section A
  SELECT id INTO v_section_id FROM sections WHERE class_id = v_class_id AND name = 'A';
  IF v_section_id IS NULL THEN
      INSERT INTO sections (school_id, class_id, name) VALUES (v_school_id, v_class_id, 'A') RETURNING id INTO v_section_id;
  END IF;

  -- 6. Get/Create Subject Math
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_id AND name = 'Mathematics';
  IF v_subject_id IS NULL THEN
      INSERT INTO subjects (school_id, name, code) VALUES (v_school_id, 'Mathematics', 'MATH10') RETURNING id INTO v_subject_id;
  END IF;

  -- 7. Assign Teacher (Class Teacher + Subject Teacher)
  -- Note: Legacy schema uses `educator_class_assignments`
  
  -- 7a. Class Teacher Assignment
  INSERT INTO educator_class_assignments (school_id, educator_id, class_id, section_id, subject_id, academic_year, is_class_teacher)
  VALUES (v_school_id, v_teacher_id, v_class_id, v_section_id, NULL, '2025-2026', true)
  ON CONFLICT (educator_id, class_id, section_id, subject_id, academic_year) 
  DO UPDATE SET is_class_teacher = true;

  -- 7b. Subject Teacher Assignment (Maths)
  INSERT INTO educator_class_assignments (school_id, educator_id, class_id, section_id, subject_id, academic_year, is_class_teacher)
  VALUES (v_school_id, v_teacher_id, v_class_id, v_section_id, v_subject_id, '2025-2026', false)
  ON CONFLICT (educator_id, class_id, section_id, subject_id, academic_year) 
  DO NOTHING;

  -- 8. Assign Students to Parent
  -- Limit to 2 students in Class 10-A
  UPDATE students 
  SET parent_id = v_parent_id 
  WHERE id IN (
      SELECT id FROM students 
      WHERE school_id = v_school_id 
      AND class_id = v_class_id -- Ideally section A too but simplify
      LIMIT 2
  );
  
  -- Ensure those students are in Section A
  UPDATE students
  SET section_id = v_section_id
  WHERE parent_id = v_parent_id;

END $$;
