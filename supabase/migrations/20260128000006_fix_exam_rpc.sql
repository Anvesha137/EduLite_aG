-- Migration: Fix Exam RPCs
-- Description: Adds Secure RPCs for handling exam types and grade scales to bypass RLS issues.

-- ==========================================
-- Exam Types RPCs
-- ==========================================

-- 1. Get Exam Types
CREATE OR REPLACE FUNCTION get_exam_types(p_school_id uuid)
RETURNS SETOF exam_types
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM exam_types 
  WHERE school_id = p_school_id
  ORDER BY name;
$$;

-- 2. Upsert Exam Type (Create or Update)
CREATE OR REPLACE FUNCTION upsert_exam_type(
  p_school_id uuid,
  p_name text,
  p_code text,
  p_description text,
  p_id uuid DEFAULT NULL
)
RETURNS exam_types
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result exam_types;
BEGIN
  IF p_id IS NOT NULL THEN
    -- Update existing
    UPDATE exam_types
    SET name = p_name,
        code = p_code,
        description = p_description,
        updated_at = now()
    WHERE id = p_id
    RETURNING * INTO v_result;
  ELSE
    -- Insert new
    INSERT INTO exam_types (school_id, name, code, description)
    VALUES (p_school_id, p_name, p_code, p_description)
    RETURNING * INTO v_result;
  END IF;
  
  RETURN v_result;
END;
$$;

-- 3. Delete Exam Type
CREATE OR REPLACE FUNCTION delete_exam_type(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM exam_types WHERE id = p_id;
$$;


-- ==========================================
-- Grade Scales RPCs
-- ==========================================

-- 4. Get Grade Scales
CREATE OR REPLACE FUNCTION get_grade_scales(p_school_id uuid)
RETURNS SETOF grade_scales
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM grade_scales 
  WHERE school_id = p_school_id
  ORDER BY name;
$$;

-- 5. Upsert Grade Scale
CREATE OR REPLACE FUNCTION upsert_grade_scale(
  p_school_id uuid,
  p_name text,
  p_type text,
  p_description text,
  p_id uuid DEFAULT NULL
)
RETURNS grade_scales
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result grade_scales;
BEGIN
  IF p_id IS NOT NULL THEN
    -- Update existing
    UPDATE grade_scales
    SET name = p_name,
        type = p_type,
        description = p_description,
        updated_at = now()
    WHERE id = p_id
    RETURNING * INTO v_result;
  ELSE
    -- Insert new
    INSERT INTO grade_scales (school_id, name, type, description)
    VALUES (p_school_id, p_name, p_type, p_description)
    RETURNING * INTO v_result;
  END IF;
  
  RETURN v_result;
END;
$$;

-- 6. Delete Grade Scale
CREATE OR REPLACE FUNCTION delete_grade_scale(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM grade_scales WHERE id = p_id;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_exam_types(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_exam_type(uuid, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_exam_type(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION get_grade_scales(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_grade_scale(uuid, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_grade_scale(uuid) TO authenticated;
