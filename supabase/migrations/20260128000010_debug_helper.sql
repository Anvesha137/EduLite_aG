-- Migration: Debug Helpers
-- Description: RPCs to inspect data state bypassing RLS.

CREATE OR REPLACE FUNCTION debug_get_schools()
RETURNS TABLE (
  id uuid,
  name text,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT s.id, s.name, s.email FROM schools s;
END;
$$;

CREATE OR REPLACE FUNCTION debug_get_user_profiles_count()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count bigint;
BEGIN
  SELECT count(*) INTO count FROM user_profiles;
  RETURN count;
END;
$$;

GRANT EXECUTE ON FUNCTION debug_get_schools() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION debug_get_user_profiles_count() TO anon, authenticated, service_role;
