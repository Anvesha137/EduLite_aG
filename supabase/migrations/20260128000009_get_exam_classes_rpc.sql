-- Migration: Get Exam Classes RPC
-- Description: Helper RPC to fetch classes for a given exam, bypassing RLS.

CREATE OR REPLACE FUNCTION get_exam_classes(p_exam_id uuid)
RETURNS TABLE (
  class_id uuid,
  grade text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as class_id,
    c.grade
  FROM exam_classes ec
  JOIN classes c ON ec.class_id = c.id
  WHERE ec.exam_id = p_exam_id
  ORDER BY c.grade_order;
END;
$$;

GRANT EXECUTE ON FUNCTION get_exam_classes(uuid) TO authenticated;
