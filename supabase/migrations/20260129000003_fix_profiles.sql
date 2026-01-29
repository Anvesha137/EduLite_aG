-- Migration: Fix User Profiles
-- Description: Adds missing Auth Trigger and updates Auto-Link RPC to handle missing profiles (Upsert).

-- 1. Create Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, avatar_url, role_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    (SELECT id FROM roles WHERE name = 'ADMIN') -- Default to ADMIN for this quickstart
  );
  RETURN new;
END;
$$;

-- 2. Create Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Update Auto-Link RPC to UPSERT (Fixes existing broken users)
CREATE OR REPLACE FUNCTION link_user_to_demo_school()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
  v_user_id uuid;
  v_role_id uuid;
BEGIN
  v_user_id := auth.uid();
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  SELECT id INTO v_role_id FROM roles WHERE name = 'ADMIN';

  IF v_school_id IS NOT NULL AND v_user_id IS NOT NULL THEN
    -- Try to insert profile if missing (Upsert)
    INSERT INTO user_profiles (id, full_name, role_id, school_id)
    VALUES (
      v_user_id, 
      'Admin User', -- Default name if creating from scratch
      v_role_id,
      v_school_id
    )
    ON CONFLICT (id) DO UPDATE
    SET school_id = v_school_id
    WHERE user_profiles.school_id IS NULL OR user_profiles.school_id <> v_school_id;
  END IF;
  
  RETURN v_school_id;
END;
$$;
