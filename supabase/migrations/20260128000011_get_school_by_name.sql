-- Migration: Get School By Name RPC
-- Description: Helper to fetch school ID by name, bypassing RLS.

CREATE OR REPLACE FUNCTION get_school_by_name(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM schools WHERE name = p_name LIMIT 1;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_school_by_name(text) TO anon, authenticated, service_role;
