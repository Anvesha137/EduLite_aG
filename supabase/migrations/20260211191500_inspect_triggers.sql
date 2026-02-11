-- INSPECT TRIGGERS WITH PRIVILEGE
-- Getting the list of triggers on auth.users is usually restricted.
-- We use a SECURITY DEFINER function to read it.

BEGIN;

CREATE OR REPLACE FUNCTION public.inspect_auth_triggers()
RETURNS TABLE (
    trigger_name text,
    event_manipulation text,
    action_statement text,
    action_orientation text,
    action_timing text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.trigger_name::text,
        t.event_manipulation::text,
        t.action_statement::text,
        t.action_orientation::text,
        t.action_timing::text
    FROM information_schema.triggers t
    WHERE t.event_object_schema = 'auth'
      AND t.event_object_table = 'users';
END;
$$;

COMMIT;

-- Usage: SELECT * FROM public.inspect_auth_triggers();
