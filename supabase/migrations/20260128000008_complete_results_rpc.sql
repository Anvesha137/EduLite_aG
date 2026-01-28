-- Migration: Complete Results Module RPCs (Redesign)
-- Description: Adds remaining Secure RPCs to fully bypass RLS for Marks Entry and Reports.
-- Also redefines calculation logic as SECURITY DEFINER.

-- ==========================================
-- 1. Marks Entry RPCs
-- ==========================================

-- Get inputs for the marks entry sheet (Students + Existing Marks)
CREATE OR REPLACE FUNCTION get_student_marks_for_exam(
  p_school_id uuid,
  p_exam_id uuid,
  p_class_id uuid,
  p_subject_id uuid
)
RETURNS TABLE (
  student_id uuid,
  student_name text,
  admission_number text,
  marks_obtained decimal,
  is_absent boolean,
  remarks text,
  max_marks decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject_max decimal;
BEGIN
  -- 1. Determine Max Marks for this subject in this exam
  -- Check exam_subjects first, else default to 100
  SELECT COALESCE(es.max_marks, 100) INTO v_subject_max
  FROM exam_subjects es
  WHERE es.exam_id = p_exam_id 
    AND es.class_id = p_class_id 
    AND es.subject_id = p_subject_id;
    
  IF v_subject_max IS NULL THEN 
    v_subject_max := 100;
  END IF;

  -- 2. Return Joined Data
  RETURN QUERY
  SELECT 
    s.id as student_id,
    s.name as student_name,
    s.admission_number,
    m.marks_obtained,
    COALESCE(m.is_absent, false) as is_absent,
    m.remarks,
    v_subject_max as max_marks
  FROM students s
  LEFT JOIN student_marks m ON s.id = m.student_id 
    AND m.exam_id = p_exam_id 
    AND m.subject_id = p_subject_id
  WHERE s.school_id = p_school_id
    AND s.class_id = p_class_id
    AND s.status = 'active'
  ORDER BY s.name;
END;
$$;


-- ==========================================
-- 2. Result Calculation RPCs (Redefined as SECURE)
-- ==========================================

-- Helper: Get Grade (Pure SQL, safe to keep or redefine)
CREATE OR REPLACE FUNCTION get_grade_for_percentage_secure(scale_id uuid, percent decimal)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  grade_label text;
BEGIN
  SELECT s.grade_label INTO grade_label
  FROM grade_slabs s
  WHERE s.grade_scale_id = scale_id
    AND percent >= s.min_percentage
    AND percent <= s.max_percentage
  ORDER BY s.min_percentage DESC
  LIMIT 1;
  RETURN grade_label;
END;
$$;

-- Calculate Single Result
CREATE OR REPLACE FUNCTION calculate_student_exam_result(p_exam_id uuid, p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_obtained decimal := 0;
  v_total_max decimal := 0;
  v_percentage decimal := 0;
  v_grade text := NULL;
  v_exam_record record;
BEGIN
  -- Fetch exam details including school_id and grade_scale_id
  SELECT * INTO v_exam_record FROM exam_schedules WHERE id = p_exam_id;
  
  -- Calculate Totals from student_marks
  -- Use exam_subjects to get max_marks correctly if possible, or rely on stored?
  -- For simplicity in this fix, we sum obtained. For Max:
  -- We should sum the max_marks of the subjects the student took.
  -- But usually max_marks is in exam_subjects.
  
  -- Method: Sum obtained from marks. Sum max from matching exam_subjects.
  SELECT 
    COALESCE(SUM(sm.marks_obtained), 0)
  INTO v_total_obtained
  FROM student_marks sm
  WHERE sm.exam_id = p_exam_id AND sm.student_id = p_student_id AND sm.is_absent = false;

  -- Calculate Total Max (Sum of max_marks for all subjects this class has in this exam)
  -- Assuming student belongs to a class, and that class has subjects defined in exam_subjects
  -- This is a bit complex if student class changes, but let's look up student's current class?
  -- Or simpler: just sum max_marks of subjects where we have an entry? No, that misses absentees.
  -- Better: Sum max_marks from exam_subjects for the class the student is in.
  
  SELECT COALESCE(SUM(es.max_marks), 0)
  INTO v_total_max
  FROM exam_subjects es
  JOIN students s ON s.class_id = es.class_id
  WHERE es.exam_id = p_exam_id AND s.id = p_student_id;

  -- Fallback if exam_subjects not populated: sum from marks (bad practice but failsafe)
  IF v_total_max = 0 THEN
      -- Try counting subjects * 100? Or just 0.
      v_total_max := 0; 
  END IF;
  
  -- Calc Percentage
  IF v_total_max > 0 THEN
    v_percentage := (v_total_obtained / v_total_max) * 100;
  ELSE
    v_percentage := 0;
  END IF;

  -- Get Grade
  IF v_exam_record.grade_scale_id IS NOT NULL THEN
    v_grade := get_grade_for_percentage_secure(v_exam_record.grade_scale_id, v_percentage);
  END IF;

  -- Upsert Result Summary
  INSERT INTO result_summaries (
    exam_id, student_id, 
    total_marks_obtained, total_max_marks, percentage, grade,
    updated_at
  ) VALUES (
    p_exam_id, p_student_id,
    v_total_obtained, v_total_max, v_percentage, v_grade,
    now()
  )
  ON CONFLICT (exam_id, student_id) 
  DO UPDATE SET
    total_marks_obtained = EXCLUDED.total_marks_obtained,
    total_max_marks = EXCLUDED.total_max_marks,
    percentage = EXCLUDED.percentage,
    grade = EXCLUDED.grade,
    updated_at = now();
END;
$$;

-- Bulk Process (Redefinition)
CREATE OR REPLACE FUNCTION process_exam_results(p_exam_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_rec record;
BEGIN
  -- Find all students who have marks for this exam
  FOR student_rec IN 
    SELECT DISTINCT student_id FROM student_marks WHERE exam_id = p_exam_id
  LOOP
    PERFORM calculate_student_exam_result(p_exam_id, student_rec.student_id);
  END LOOP;
END;
$$;


-- ==========================================
-- 3. Reports & Viewing RPCs
-- ==========================================

-- Get Summary for Grid
CREATE OR REPLACE FUNCTION get_exam_results_summary(
  p_school_id uuid,
  p_exam_id uuid,
  p_class_id uuid
)
RETURNS TABLE (
  student_id uuid,
  student_name text,
  admission_number text,
  total_obtained decimal,
  total_max decimal,
  percentage decimal,
  grade text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.admission_number,
    rs.total_marks_obtained,
    rs.total_max_marks,
    rs.percentage,
    rs.grade
  FROM students s
  JOIN result_summaries rs ON s.id = rs.student_id
  WHERE s.school_id = p_school_id
    AND s.class_id = p_class_id
    AND rs.exam_id = p_exam_id
  ORDER BY s.name;
END;
$$;

-- Get Full Report Card Data (Single Student)
CREATE OR REPLACE FUNCTION get_student_report_card(
  p_exam_id uuid,
  p_student_id uuid
)
RETURNS TABLE (
  -- Summary Info
  student_name text,
  admission_number text,
  exam_name text,
  total_obtained decimal,
  total_max decimal,
  percentage decimal,
  grade text,
  -- Subject Result (We'll return JSON to avoid complex join rows)
  subject_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.name as student_name,
    s.admission_number,
    e.name as exam_name,
    rs.total_marks_obtained,
    rs.total_max_marks,
    rs.percentage,
    rs.grade,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'subject_name', sub.name,
        'marks_obtained', sm.marks_obtained,
        'max_marks', COALESCE(es.max_marks, 100), -- simplified
        'is_absent', sm.is_absent,
        'remarks', sm.remarks
      ))
      FROM student_marks sm
      JOIN subjects sub ON sm.subject_id = sub.id
      LEFT JOIN exam_subjects es ON es.exam_id = p_exam_id AND es.subject_id = sub.id AND es.class_id = s.class_id
      WHERE sm.exam_id = p_exam_id AND sm.student_id = p_student_id
    ) as subject_details
  FROM students s
  JOIN exam_schedules e ON e.id = p_exam_id
  LEFT JOIN result_summaries rs ON rs.student_id = s.id AND rs.exam_id = p_exam_id
  WHERE s.id = p_student_id;
END;
$$;

-- Grant Permissions
GRANT EXECUTE ON FUNCTION get_student_marks_for_exam(uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION process_exam_results(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_student_exam_result(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_grade_for_percentage_secure(uuid, decimal) TO authenticated;
GRANT EXECUTE ON FUNCTION get_exam_results_summary(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_report_card(uuid, uuid) TO authenticated;
