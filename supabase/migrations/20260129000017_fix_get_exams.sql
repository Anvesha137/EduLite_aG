-- Migration: Fix Get Exams RPC
-- Description: Creates the missing RPC for fetching exam schedules with details.

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
LANGUAGE plpgsql security definer
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.start_date,
    e.end_date,
    e.status,
    COALESCE(et.name, e.exam_type, 'Unknown') as exam_type_name,
    COALESCE(et.code, e.exam_type, 'UNK') as exam_type_code,
    ARRAY_AGG(c.grade ORDER BY c.grade_order) as class_grades
  FROM exams e
  LEFT JOIN exam_types et ON et.code = e.exam_type AND et.school_id = e.school_id -- Joining by code as we stored code in previous fix
                               OR et.id::text = e.exam_type -- Fallback if ID was stored
  LEFT JOIN exam_classes ec ON ec.exam_id = e.id
  LEFT JOIN classes c ON c.id = ec.class_id
  WHERE e.school_id = p_school_id
  GROUP BY e.id, e.name, e.start_date, e.end_date, e.status, et.name, et.code;
END;
$$;

GRANT EXECUTE ON FUNCTION get_exam_schedules TO authenticated;
