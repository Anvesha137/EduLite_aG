-- SEED DATA FOR NO-AUTH MODE
-- Creates 4 fixed users and their related entities.

BEGIN;

-- 1. Fixed UUIDs
-- Super Admin: 00000000-0000-0000-0000-000000000001
-- School Admin: 00000000-0000-0000-0000-000000000002
-- Teacher: 00000000-0000-0000-0000-000000000003
-- Parent: 00000000-0000-0000-0000-000000000004

-- 2. Ensure Roles exist
-- (Assuming they exist from previous migrations, but safe to ignore if so)

-- 3. Create School
INSERT INTO schools (id, name, status, contact_person, phone, email)
VALUES ('10000000-0000-0000-0000-000000000001', 'Demo Public School', 'active', 'Admin User', '1234567890', 'admin@demoschool.com')
ON CONFLICT (id) DO NOTHING;

-- 4. INSERT MOCK USERS INTO auth.users (Required for FKs)
-- We must disable triggers to avoid the logic that caused the original 500 errors.
-- We use a DO block to handle this safely.

DO $$
BEGIN
  -- CLEANUP: Delete existing users with these emails to avoid unique constraint violations
  DELETE FROM auth.identities WHERE email IN ('super@edulite.com', 'admin@demoschool.com', 'teacher@demoschool.com', 'parent@demoschool.com');
  DELETE FROM auth.users WHERE email IN ('super@edulite.com', 'admin@demoschool.com', 'teacher@demoschool.com', 'parent@demoschool.com');

  -- Try to disable triggers if we have permission (might fail, but we try)
  BEGIN
    ALTER TABLE auth.users DISABLE TRIGGER ALL;
  EXCEPTION WHEN OTHERS THEN
    -- If we can't disable, we rely on the fact that we might have already neutralized the functions
    NULL;
  END;

  -- Insert Super Admin
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
  VALUES (
    '00000000-0000-0000-0000-000000000001',
    'super@edulite.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "SUPERADMIN"}',
    now(),
    now(),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert School Admin
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
  VALUES (
    '00000000-0000-0000-0000-000000000002',
    'admin@demoschool.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "ADMIN"}',
    now(),
    now(),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert Teacher
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
  VALUES (
    '00000000-0000-0000-0000-000000000003',
    'teacher@demoschool.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "EDUCATOR"}',
    now(),
    now(),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert Parent
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
  VALUES (
    '00000000-0000-0000-0000-000000000004',
    'parent@demoschool.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "PARENT"}',
    now(),
    now(),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Re-enable triggers (good practice, though we don't strictly need them for mock mode)
  BEGIN
    ALTER TABLE auth.users ENABLE TRIGGER ALL;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;


-- 5. Create User Profiles (Now FKs will work)
-- Super Admin
INSERT INTO user_profiles (id, full_name, role_id, is_active)
SELECT '00000000-0000-0000-0000-000000000001', 'Super Admin User', id, true
FROM roles WHERE name = 'SUPERADMIN'
ON CONFLICT (id) DO NOTHING;

-- School Admin
INSERT INTO user_profiles (id, school_id, full_name, role_id, is_active)
SELECT '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Principal Skinner', id, true
FROM roles WHERE name = 'ADMIN'
ON CONFLICT (id) DO NOTHING;

-- Teacher
INSERT INTO user_profiles (id, school_id, full_name, role_id, is_active)
SELECT '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Priya Teacher', id, true
FROM roles WHERE name = 'EDUCATOR'
ON CONFLICT (id) DO NOTHING;

-- Parent
INSERT INTO user_profiles (id, school_id, full_name, role_id, is_active)
SELECT '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Mr. Sharma', id, true
FROM roles WHERE name = 'PARENT'
ON CONFLICT (id) DO NOTHING;

-- 5. Educator Details
INSERT INTO educators (id, school_id, user_id, name, email, employee_id, designation, status, phone)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  'Priya Teacher',
  'teacher@demoschool.com',
  'EMP-001',
  'Senior Teacher',
  'active',
  '9876543210'
) ON CONFLICT (id) DO NOTHING;

-- 6. Classes & Sections & Subjects
-- Class 10
INSERT INTO classes (id, school_id, name, sort_order, description)
VALUES ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '10', 10, 'Tenth Grade')
ON CONFLICT (id) DO NOTHING;

-- Section A
INSERT INTO sections (id, school_id, class_id, name, capacity)
VALUES ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'A', 40)
ON CONFLICT (id) DO NOTHING;

-- Subject Math
INSERT INTO subjects (id, school_id, name, code)
VALUES ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Mathematics', 'MATH10')
ON CONFLICT (id) DO NOTHING;

-- 7. Educator Assignment
INSERT INTO educator_class_assignments (school_id, educator_id, class_id, section_id, subject_id, academic_year, is_class_teacher)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '2025-2026',
  true
) ON CONFLICT DO NOTHING;

-- 8. Parent & Student
-- Parent Entry
INSERT INTO parents (id, school_id, user_id, name, relationship, phone, email)
VALUES (
  '60000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000004',
  'Mr. Sharma',
  'father',
  '5555555555',
  'parent@demoschool.com'
) ON CONFLICT (id) DO NOTHING;

-- Student (Rahul Sharma)
INSERT INTO students (id, school_id, name, admission_number, dob, gender, class_id, section_id, parent_id, status, admission_date)
VALUES (
  '70000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Rahul Sharma',
  'ADM-2025-001',
  '2010-01-01',
  'male',
  '30000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  'active',
  '2025-04-01'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
