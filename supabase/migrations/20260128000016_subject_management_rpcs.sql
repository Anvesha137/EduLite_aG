-- Migration: Subject Management RPCs
-- Description: Secure RPCs for Creating, Updating, and Deleting subjects.

-- 1. Create Subject
CREATE OR REPLACE FUNCTION create_subject(
  p_school_id uuid,
  p_name text,
  p_code text,
  p_description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_subject json;
BEGIN
  INSERT INTO subjects (school_id, name, code, description)
  VALUES (p_school_id, p_name, p_code, p_description)
  RETURNING row_to_json(subjects.*) INTO v_new_subject;
  
  RETURN v_new_subject;
END;
$$;

GRANT EXECUTE ON FUNCTION create_subject(uuid, text, text, text) TO authenticated, service_role;

-- 2. Update Subject
CREATE OR REPLACE FUNCTION update_subject(
  p_id uuid,
  p_name text,
  p_code text,
  p_description text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_subject json;
BEGIN
  UPDATE subjects
  SET 
    name = p_name,
    code = p_code,
    description = p_description
  WHERE id = p_id
  RETURNING row_to_json(subjects.*) INTO v_updated_subject;
  
  RETURN v_updated_subject;
END;
$$;

GRANT EXECUTE ON FUNCTION update_subject(uuid, text, text, text) TO authenticated, service_role;

-- 3. Delete Subject
CREATE OR REPLACE FUNCTION delete_subject(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM subjects WHERE id = p_id;
  RETURN found;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_subject(uuid) TO authenticated, service_role;
