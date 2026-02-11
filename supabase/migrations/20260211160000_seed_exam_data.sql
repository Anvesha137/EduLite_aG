-- SEED DEMO EXAM
-- Run this to allow Marks Entry testing

DO $$
DECLARE
  v_school_id uuid;
  v_class_id uuid;
  v_session_id uuid;
BEGIN
  -- Get School
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  
  -- Get Class 10
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_id AND sort_order = 10 LIMIT 1;
  IF v_class_id IS NULL THEN
     -- Try legacy
     SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_id AND grade_order = 10 LIMIT 1;
  END IF;

  -- Create Academic Year if needed (simple)
  INSERT INTO academic_years (school_id, name, start_date, end_date, is_active)
  VALUES (v_school_id, '2025-2026', '2025-04-01', '2026-03-31', true)
  ON CONFLICT (school_id, name) DO NOTHING;

  -- Create Exam
  INSERT INTO exams (school_id, name, exam_type, academic_year, start_date, end_date, class_id, is_published)
  VALUES (
    v_school_id, 
    'Unit Test 1', 
    'unit_test', 
    '2025-2026', 
    CURRENT_DATE, 
    CURRENT_DATE + 7, 
    v_class_id, 
    true
  )
  ON CONFLICT DO NOTHING; -- No unique constraint usually on name/class, but safe for demo script

END $$;
