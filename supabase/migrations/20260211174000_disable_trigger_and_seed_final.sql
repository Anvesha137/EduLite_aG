-- DISABLE TRIGGER AND SEED MANUALLY (FINAL ROBUST)
-- Uses PL/pgSQL to check existence and avoid constraint errors

BEGIN;

-- 1. Disable the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DO $$
DECLARE
  v_user_id uuid;
  v_school_id uuid;
  v_role_id uuid;
  v_identity_id uuid;
BEGIN
  -- ---------------------------------------------------------
  -- 1. SETUP / FIND USER
  -- ---------------------------------------------------------
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'teacher@demoschool.com';

  IF v_user_id IS NULL THEN
    -- Create new user
    v_user_id := uuid_generate_v4();
    
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
      updated_at
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
      now()
    );
  ELSE
    -- Update existing user password to be sure
    UPDATE auth.users 
    SET encrypted_password = crypt('password123', gen_salt('bf')),
        raw_user_meta_data = '{"role": "EDUCATOR", "full_name": "Priya Teacher"}'
    WHERE id = v_user_id;
  END IF;

  -- ---------------------------------------------------------
  -- 2. HANDLE IDENTITY
  -- ---------------------------------------------------------
  -- Check if identity exists
  SELECT id INTO v_identity_id FROM auth.identities WHERE user_id = v_user_id AND provider = 'email';
  
  IF v_identity_id IS NULL THEN
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
       uuid_generate_v4(), -- Some Identity PKs are UUIDs, some text. Supabase usually uses UUID for `id` column.
       v_user_id,
       v_user_id::text,
       format('{"sub": "%s", "email": "%s"}', v_user_id, 'teacher@demoschool.com')::jsonb,
       'email',
       now(),
       now(),
       now()
     );
  END IF;

  -- ---------------------------------------------------------
  -- 3. HANDLE PROFILES (Bypass Trigger)
  -- ---------------------------------------------------------
  
  -- Get School
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  -- Get Role
  SELECT id INTO v_role_id FROM roles WHERE name = 'EDUCATOR';

  IF v_school_id IS NOT NULL AND v_role_id IS NOT NULL THEN
      -- Upsert Profile
      INSERT INTO public.user_profiles (id, school_id, role_id, full_name, is_active)
      VALUES (v_user_id, v_school_id, v_role_id, 'Priya Teacher', true)
      ON CONFLICT (id) DO UPDATE SET
        school_id = EXCLUDED.school_id,
        role_id = EXCLUDED.role_id,
        full_name = EXCLUDED.full_name,
        is_active = true;

      -- Upsert Educator
      -- Use email to match if possible, else just insert
      IF EXISTS (SELECT 1 FROM public.educators WHERE email = 'teacher@demoschool.com') THEN
         UPDATE public.educators 
         SET user_id = v_user_id, 
             school_id = v_school_id,
             status = 'active' 
         WHERE email = 'teacher@demoschool.com';
      ELSE
         INSERT INTO public.educators (school_id, user_id, email, name, employee_id, designation, status)
         VALUES (v_school_id, v_user_id, 'teacher@demoschool.com', 'Priya Teacher', 'EMP-PRIYA-FIX', 'Class Teacher', 'active');
      END IF;
      
      -- Ensure Allocation (Class 10-A, Math)
      -- Find Class 10
      DECLARE
         v_class_id uuid;
         v_section_id uuid;
         v_subject_id uuid;
      BEGIN
         SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_id AND (sort_order = 10 OR name = '10') LIMIT 1;
         
         IF v_class_id IS NOT NULL THEN
            -- Find Section
            SELECT id INTO v_section_id FROM sections WHERE class_id = v_class_id LIMIT 1;
             -- Find Subject
            SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_id AND name = 'Mathematics' LIMIT 1;
            
            IF v_section_id IS NOT NULL AND v_subject_id IS NOT NULL THEN
               INSERT INTO educator_class_assignments (school_id, educator_id, class_id, section_id, subject_id, academic_year, is_class_teacher)
               SELECT v_school_id, e.id, v_class_id, v_section_id, v_subject_id, '2025-2026', true
               FROM educators e WHERE e.user_id = v_user_id
               ON CONFLICT DO NOTHING;
            END IF;
         END IF;
      END;

  END IF;

END $$;

COMMIT;
