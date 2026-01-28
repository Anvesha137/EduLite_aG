-- Migration: Fix Exam Schedule & Marks RPCs
-- Description: Adds Secure RPCs for Exam Scheduling and Marks Entry to bypass RLS.

-- ==========================================
-- Exam Schedule RPCs
-- ==========================================

-- 1. Get Exam Schedules
CREATE OR REPLACE FUNCTION get_exam_schedules(p_school_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  start_date date,
  end_date date,
  status text,
  exam_type_name text,
  exam_type_code text,
  class_grades text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    es.id,
    es.name,
    es.start_date,
    es.end_date,
    es.status,
    et.name as exam_type_name,
    et.code as exam_type_code,
    ARRAY_AGG(c.grade ORDER BY c.grade_order) as class_grades
  FROM exam_schedules es
  JOIN exam_types et ON es.exam_type_id = et.id
  LEFT JOIN exam_classes ec ON es.id = ec.exam_id
  LEFT JOIN classes c ON ec.class_id = c.id
  WHERE es.school_id = p_school_id
  GROUP BY es.id, es.name, es.start_date, es.end_date, es.status, et.name, et.code
  ORDER BY es.start_date DESC;
END;
$$;

-- 2. Create Exam Schedule with Classes (Atomic)
CREATE OR REPLACE FUNCTION create_exam_schedule_with_classes(
  p_school_id uuid,
  p_name text,
  p_exam_type_id uuid,
  p_academic_year text,
  p_start_date date,
  p_end_date date,
  p_class_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam_id uuid;
  v_class_id uuid;
BEGIN
  -- Insert Exam
  INSERT INTO exam_schedules (
    school_id, name, exam_type_id, academic_year, start_date, end_date, status
  ) VALUES (
    p_school_id, p_name, p_exam_type_id, p_academic_year, p_start_date, p_end_date, 'draft'
  )
  RETURNING id INTO v_exam_id;

  -- Insert Classes
  IF p_class_ids IS NOT NULL THEN
    FOREACH v_class_id IN ARRAY p_class_ids
    LOOP
      INSERT INTO exam_classes (exam_id, class_id)
      VALUES (v_exam_id, v_class_id);
    END LOOP;
  END IF;

  RETURN v_exam_id;
END;
$$;

-- 3. Delete Exam Schedule
CREATE OR REPLACE FUNCTION delete_exam_schedule(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM exam_schedules WHERE id = p_id;
$$;


-- ==========================================
-- Marks Entry RPCs
-- ==========================================

-- 4. Update Student Marks (Bulk)
CREATE OR REPLACE FUNCTION update_student_marks(
  p_marks_json jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mark_record jsonb;
BEGIN
  -- Expected JSON structure: array of objects with keys: 
  -- exam_id, student_id, subject_id, marks_obtained, is_absent, remarks, entered_by
  
  FOR v_mark_record IN SELECT * FROM jsonb_array_elements(p_marks_json)
  LOOP
    INSERT INTO student_marks (
      exam_id,
      student_id,
      subject_id,
      marks_obtained,
      is_absent,
      remarks,
      entered_by,
      updated_at
    ) VALUES (
      (v_mark_record->>'exam_id')::uuid,
      (v_mark_record->>'student_id')::uuid,
      (v_mark_record->>'subject_id')::uuid,
      (v_mark_record->>'marks_obtained')::numeric,
      COALESCE((v_mark_record->>'is_absent')::boolean, false),
      v_mark_record->>'remarks',
      (v_mark_record->>'entered_by')::uuid,
      now()
    )
    ON CONFLICT (exam_id, student_id, subject_id)
    DO UPDATE SET
      marks_obtained = EXCLUDED.marks_obtained,
      is_absent = EXCLUDED.is_absent,
      remarks = EXCLUDED.remarks,
      updated_by = EXCLUDED.entered_by,
      updated_at = now();
  END LOOP;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_exam_schedules(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_exam_schedule_with_classes(uuid, text, uuid, text, date, date, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_exam_schedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_student_marks(jsonb) TO authenticated;
