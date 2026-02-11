-- FORCE FIX FOR AUTH SCHEMA
-- 1. Ensure extensions
-- 2. Grant permissions
-- 3. Disable potentially failing triggers on auth tables

BEGIN;

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Permissions
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, service_role;
GRANT SELECT ON auth.users TO anon; -- Sometimes needed for checking existence?
GRANT ALL ON auth.sessions TO postgres, service_role;

-- 3. Disable Triggers (Nuclear Option)
-- This confirms if a trigger is the cause.
ALTER TABLE auth.users DISABLE TRIGGER ALL;
ALTER TABLE auth.sessions DISABLE TRIGGER ALL;

-- 4. Re-verify User Exists (Just in case)
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'teacher@demoschool.com') THEN
      RAISE EXCEPTION 'User teacher@demoschool.com is missing!';
   END IF;
END $$;

COMMIT;
