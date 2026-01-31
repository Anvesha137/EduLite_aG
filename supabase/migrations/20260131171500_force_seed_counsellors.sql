-- Migration: Force Seed Counselors
-- Description: Adds 5 mock counselors to ensure the dropdown is populated.

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Set search path to ensure gen_salt is found
SET search_path = public, extensions;

DO $$
DECLARE
  v_school_id uuid;
  v_role_id uuid;
  v_user_id uuid;
BEGIN
  -- Get School ID
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  
  -- Get Counselor Role ID
  SELECT id INTO v_role_id FROM roles WHERE name = 'COUNSELOR';
  
  -- Ensure Role Exists
  IF v_role_id IS NULL THEN
     INSERT INTO roles (name, description) VALUES ('COUNSELOR', 'Admission Counselor') RETURNING id INTO v_role_id;
  END IF;

  -- 1. Counselor Anjali
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'anjali@demo.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (gen_random_uuid(), 'anjali@demo.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
    RETURNING id INTO v_user_id;

    INSERT INTO public.user_profiles (id, full_name, role_id, school_id, is_active)
    VALUES (v_user_id, 'Anjali Sharma', v_role_id, v_school_id, true);
  END IF;

  -- 2. Counselor Ravi
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ravi@demo.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (gen_random_uuid(), 'ravi@demo.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
    RETURNING id INTO v_user_id;

    INSERT INTO public.user_profiles (id, full_name, role_id, school_id, is_active)
    VALUES (v_user_id, 'Ravi Kumar', v_role_id, v_school_id, true);
  END IF;

  -- 3. Counselor Sneha
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sneha@demo.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (gen_random_uuid(), 'sneha@demo.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
    RETURNING id INTO v_user_id;

    INSERT INTO public.user_profiles (id, full_name, role_id, school_id, is_active)
    VALUES (v_user_id, 'Sneha Patel', v_role_id, v_school_id, true);
  END IF;

  -- 4. Counselor Amit
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'amit@demo.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (gen_random_uuid(), 'amit@demo.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
    RETURNING id INTO v_user_id;

    INSERT INTO public.user_profiles (id, full_name, role_id, school_id, is_active)
    VALUES (v_user_id, 'Amit Verma', v_role_id, v_school_id, true);
  END IF;

  -- 5. Counselor Priya
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'priya@demo.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (gen_random_uuid(), 'priya@demo.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
    RETURNING id INTO v_user_id;

    INSERT INTO public.user_profiles (id, full_name, role_id, school_id, is_active)
    VALUES (v_user_id, 'Priya Singh', v_role_id, v_school_id, true);
  END IF;

END $$;
