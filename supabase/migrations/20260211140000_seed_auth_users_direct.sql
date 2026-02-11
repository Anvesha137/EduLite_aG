-- DIRECT SEEDING OF USERS (Bypassing Auth API)
-- Run this in Supabase SQL Editor

-- 1. Ensure encryption extension exists
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Seed Block
DO $$
DECLARE
  v_school_id uuid;
  v_super_id uuid := gen_random_uuid();
  v_admin_id uuid := gen_random_uuid();
  v_teacher_id uuid := gen_random_uuid();
  v_parent_id uuid := gen_random_uuid();
  v_encrypted_pw text;
  v_teacher_profile_id uuid;
  v_parent_profile_id uuid;
BEGIN
  -- Get School (First one)
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'No school found. Run initial seeds first.';
  END IF;
  
  -- Generate Hash for 'password123'
  v_encrypted_pw := extensions.crypt('password123', extensions.gen_salt('bf'));

  -- =================================================================
  -- SUPERADMIN (super@edulite.com)
  -- =================================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'super@edulite.com') THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (v_super_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'super@edulite.com', v_encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{"role":"SUPERADMIN","name":"Super Admin"}', now(), now())
    RETURNING id INTO v_super_id;
    
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_super_id, format('{"sub":"%s","email":"super@edulite.com"}', v_super_id)::jsonb, 'email', v_super_id::text, now(), now(), now());

    INSERT INTO public.user_profiles (id, full_name, role_id, school_id)
    VALUES (v_super_id, 'Super Admin', (SELECT id FROM roles WHERE name = 'SUPERADMIN'), v_school_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- =================================================================
  -- ADMIN (admin@demoschool.com)
  -- =================================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@demoschool.com') THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@demoschool.com', v_encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{"role":"ADMIN","name":"Principal Demo"}', now(), now())
    RETURNING id INTO v_admin_id;
    
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_admin_id, format('{"sub":"%s","email":"admin@demoschool.com"}', v_admin_id)::jsonb, 'email', v_admin_id::text, now(), now(), now());

    INSERT INTO public.user_profiles (id, full_name, role_id, school_id)
    VALUES (v_admin_id, 'Principal Demo', (SELECT id FROM roles WHERE name = 'ADMIN'), v_school_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- =================================================================
  -- TEACHER (teacher@demoschool.com)
  -- =================================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'teacher@demoschool.com') THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (v_teacher_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher@demoschool.com', v_encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{"role":"EDUCATOR","name":"Priya Teacher"}', now(), now())
    RETURNING id INTO v_teacher_id;
    
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_teacher_id, format('{"sub":"%s","email":"teacher@demoschool.com"}', v_teacher_id)::jsonb, 'email', v_teacher_id::text, now(), now(), now());

    INSERT INTO public.user_profiles (id, full_name, role_id, school_id)
    VALUES (v_teacher_id, 'Priya Teacher', (SELECT id FROM roles WHERE name = 'EDUCATOR'), v_school_id)
    ON CONFLICT (id) DO NOTHING;

    -- Link to Educators Table
    INSERT INTO public.educators (school_id, user_id, employee_id, name, email, designation, status, phone)
    VALUES (v_school_id, v_teacher_id, 'EMP_PRIYA', 'Priya Teacher', 'teacher@demoschool.com', 'Senior Teacher', 'active', '9900990099')
    ON CONFLICT (school_id, employee_id) DO UPDATE SET user_id = v_teacher_id
    RETURNING id INTO v_teacher_profile_id;

  ELSE
    -- If user exists, get the ID for linking
    SELECT id INTO v_teacher_id FROM auth.users WHERE email = 'teacher@demoschool.com';
    SELECT id INTO v_teacher_profile_id FROM public.educators WHERE user_id = v_teacher_id;
    IF v_teacher_profile_id IS NULL THEN
       -- Update existing educator or create
       INSERT INTO public.educators (school_id, user_id, employee_id, name, email, designation, status, phone)
       VALUES (v_school_id, v_teacher_id, 'EMP_PRIYA', 'Priya Teacher', 'teacher@demoschool.com', 'Senior Teacher', 'active', '9900990099')
       ON CONFLICT (school_id, employee_id) DO UPDATE SET user_id = v_teacher_id
       RETURNING id INTO v_teacher_profile_id;
    END IF;
  END IF;

  -- =================================================================
  -- PARENT (parent@demoschool.com)
  -- =================================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'parent@demoschool.com') THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (v_parent_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'parent@demoschool.com', v_encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{"role":"PARENT","name":"Ramesh Sharma"}', now(), now())
    RETURNING id INTO v_parent_id;
    
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_parent_id, format('{"sub":"%s","email":"parent@demoschool.com"}', v_parent_id)::jsonb, 'email', v_parent_id::text, now(), now(), now());


    INSERT INTO public.user_profiles (id, full_name, role_id, school_id)
    VALUES (v_parent_id, 'Ramesh Sharma', (SELECT id FROM roles WHERE name = 'PARENT'), v_school_id)
    ON CONFLICT (id) DO NOTHING;

    -- Link to Parents Table
    INSERT INTO public.parents (school_id, user_id, name, email, relationship, phone)
    VALUES (v_school_id, v_parent_id, 'Ramesh Sharma', 'parent@demoschool.com', 'father', '8800880088')
    ON CONFLICT (id) DO NOTHING -- UUID primary key usually, no unique on email. Let's assume insert works.
    RETURNING id INTO v_parent_profile_id;
    
  ELSE
    SELECT id INTO v_parent_id FROM auth.users WHERE email = 'parent@demoschool.com';
  END IF;

END $$;
