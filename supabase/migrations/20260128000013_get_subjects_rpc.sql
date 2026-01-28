-- Migration: Get Available Subjects RPC
-- Description: Helper to fetch all subjects for a school securely, bypassing RLS.

CREATE OR REPLACE FUNCTION get_available_subjects(p_school_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  code text,
  school_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.code, s.school_id
  FROM subjects s
  WHERE s.school_id = p_school_id
  ORDER BY s.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_available_subjects(uuid) TO anon, authenticated, service_role;
