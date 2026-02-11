-- DISABLE RLS FOR NO-AUTH MODE
-- This script disables Row Level Security on all tables in the public schema.
-- This allows the frontend to read/write data without a valid Supabase Auth session.

BEGIN;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
    END LOOP;
END $$;

COMMIT;
