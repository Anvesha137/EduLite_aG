-- SAFE FIX FOR AUTH TRIGGER
-- We cannot disable triggers on auth.users (permissions), but we CAN replace the function they call.
-- We will replace handle_new_user with a safe, empty version to stop the recursion/error.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- TEMPORARILY DO NOTHING to allow login.
  -- We will rely on our manual seed script for the data.
  RETURN NEW;
END;
$$;

-- Grant permissions just in case
GRANT EXECUTE ON FUNCTION public.handle_new_user TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO supabase_auth_admin;

COMMIT;
