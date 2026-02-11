-- Migration: Fix Auth Trigger (Robust)
-- Description: Updates handle_new_user to be robust against missing roles or constraints, and allow user creation to proceed even if profile creation fails (logs warning).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
  v_role_name text;
BEGIN
  -- 1. Determine Role Name (from metadata or default)
  v_role_name := COALESCE(new.raw_user_meta_data->>'role', 'ADMIN');
  
  -- 2. Find Role ID
  SELECT id INTO v_role_id FROM roles WHERE name = v_role_name;
  
  -- 3. Fallback if role not found
  IF v_role_id IS NULL THEN
     SELECT id INTO v_role_id FROM roles WHERE name = 'ADMIN';
  END IF;

  -- 4. Insert Profile (Upsert)
  INSERT INTO public.user_profiles (id, full_name, avatar_url, role_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    v_role_id
  )
  ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role_id = EXCLUDED.role_id,
  updated_at = now();
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Catch all errors to prevent blocking User Creation
  -- In production, we might want to fail, but for dev/seed, we want to proceed and fix later.
  RAISE WARNING 'Profile creation failed for user %: %', new.id, SQLERRM;
  RETURN new;
END;
$$;
