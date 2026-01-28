-- Helper to get grade from a scale based on percentage
CREATE OR REPLACE FUNCTION get_grade_for_percentage(scale_id uuid, percent decimal)
RETURNS text
LANGUAGE plpgsql
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

-- Function to calculate and save result for a specific student in an exam
CREATE OR REPLACE FUNCTION calculate_student_exam_result(p_exam_id uuid, p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_obtained decimal := 0;
  v_total_max decimal := 0;
  v_percentage decimal := 0;
  v_grade text := NULL;
  v_exam_grade_scale_id uuid;
  v_exam_record record;
BEGIN
  -- Get Exam Details (linked grade scale)
  -- Note: exam_schedules might not have grade_scale_id directly if it's on exam_type or not stored.
  -- Let's check schema. Assuming exam_schedules has grade_scale_id or we pass it? 
  -- IF NOT, we might need to add it or fetch from config.
  -- For now, let's assume exam_schedules represents the event. 
  -- If grade_scale_id is missing, we can't calculate grade, only percentage.
  
  -- Fetch exam details
  SELECT * INTO v_exam_record FROM exam_schedules WHERE id = p_exam_id;
  
  -- Calculate Totals
  SELECT 
    COALESCE(SUM(marks_obtained), 0),
    COALESCE(SUM(max_marks), 0)
  INTO v_total_obtained, v_total_max
  FROM student_marks
  WHERE exam_id = p_exam_id AND student_id = p_student_id AND is_absent = false;
  
  -- Handle Max Marks 0 case
  IF v_total_max > 0 THEN
    v_percentage := (v_total_obtained / v_total_max) * 100;
  ELSE
    v_percentage := 0;
  END IF;

  -- Get Grade if scale exists
  IF v_exam_record.grade_scale_id IS NOT NULL THEN
    v_grade := get_grade_for_percentage(v_exam_record.grade_scale_id, v_percentage);
  END IF;

  -- Upsert into result_summaries
  INSERT INTO result_summaries (
    school_id, exam_id, student_id, 
    total_marks_obtained, total_max_marks, percentage, grade
  ) VALUES (
    v_exam_record.school_id, p_exam_id, p_student_id,
    v_total_obtained, v_total_max, v_percentage, v_grade
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

-- Bulk calculate for an exam
CREATE OR REPLACE FUNCTION process_exam_results(p_exam_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  student_rec record;
BEGIN
  FOR student_rec IN 
    SELECT DISTINCT student_id FROM student_marks WHERE exam_id = p_exam_id
  LOOP
    PERFORM calculate_student_exam_result(p_exam_id, student_rec.student_id);
  END LOOP;
END;
$$;
