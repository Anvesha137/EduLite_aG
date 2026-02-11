-- EMERGENCY FIX FOR LOGIN
-- 1. Disable faulty triggers
-- 2. Delete and Re-create Teacher User Cleanly

BEGIN;

-- 1. Disable the trigger causing 500 errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user(); -- Optional: prevent it from running if manually called

-- 2. Delete existing teacher user to ensure clean slate
DELETE FROM auth.identities WHERE email = 'teacher@demoschool.com'; -- CASCADE should handle this, but being explicit
DELETE FROM auth.users WHERE email = 'teacher@demoschool.com';

-- 3. Create User Fresh
DO $$
DECLARE
  v_user_id uuid := uuid_generate_v4();
  v_school_id uuid;
  v_role_id uuid;
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'teacher@demoschool.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "EDUCATOR", "full_name": "Priya Teacher"}',
    now(),
    now(),
    false
  );

  -- Insert Identity
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id, -- Using user_id as identity id for simplicity/standard
    v_user_id,
    v_user_id::text,
    format('{"sub": "%s", "email": "%s"}', v_user_id, 'teacher@demoschool.com')::jsonb,
    'email',
    now(),
    now(),
    now()
  );

  -- 4. Create Profile & Educator Data
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  SELECT id INTO v_role_id FROM roles WHERE name = 'EDUCATOR';

  IF v_school_id IS NOT NULL AND v_role_id IS NOT NULL THEN
      -- Profile
      INSERT INTO public.user_profiles (id, school_id, role_id, full_name, is_active)
      VALUES (v_user_id, v_school_id, v_role_id, 'Priya Teacher', true);

      -- Educator
      INSERT INTO public.educators (school_id, user_id, email, name, employee_id, designation, status, phone)
      VALUES (v_school_id, v_user_id, 'teacher@demoschool.com', 'Priya Teacher', 'EMP-TEACHER-RESET', 'Class Teacher', 'active', '9999999999');
      
      -- Assignment (Class 10-A, Math)
      DECLARE
         v_class_id uuid;
         v_section_id uuid;
         v_subject_id uuid;
         v_educator_id uuid;
      BEGIN
         SELECT id INTO v_educator_id FROM educators WHERE user_id = v_user_id;
         SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_id AND (sort_order = 10 OR name = '10') LIMIT 1;
         
         IF v_class_id IS NOT NULL THEN
            SELECT id INTO v_section_id FROM sections WHERE class_id = v_class_id LIMIT 1;
            SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_id AND name = 'Mathematics' LIMIT 1;
            
            IF v_section_id IS NOT NULL AND v_subject_id IS NOT NULL THEN
               INSERT INTO educator_class_assignments (school_id, educator_id, class_id, section_id, subject_id, academic_year, is_class_teacher)
               VALUES (v_school_id, v_educator_id, v_class_id, v_section_id, v_subject_id, '2025-2026', true);
            END IF;
         END IF;
      END;
  END IF;

END $$;

COMMIT;
