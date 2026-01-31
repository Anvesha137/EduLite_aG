-- Migration: Add COUNSELOR role and seed counselor users
-- Description: Updates roles check constraint, cleans up invalid data, and inserts 'COUNSELOR' role

-- 1. Drop existing constraint
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_check;

-- 2. Clean up any invalid data that would violate the new constraint
-- (Reassign users to ADMIN role, then remove invalid roles)
DO $$
DECLARE
  v_admin_role_id uuid;
  r record;
BEGIN
  -- Get Admin Role ID
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'ADMIN';

  -- If we found ADMIN role, proceed to cleanup
  IF v_admin_role_id IS NOT NULL THEN
    -- Loop through any roles that are NOT in our allowed list
    FOR r IN 
      SELECT id, name FROM roles 
      WHERE name NOT IN ('SUPERADMIN', 'ADMIN', 'EDUCATOR', 'LEARNER', 'PARENT', 'COUNSELOR')
    LOOP
      RAISE NOTICE 'Cleaning up invalid role: %', r.name;
      
      -- Reassign users from this role to ADMIN
      UPDATE user_profiles SET role_id = v_admin_role_id WHERE role_id = r.id;
      
      -- Delete the invalid role (Cascade should handle permissions, or we delete manually if needed)
      DELETE FROM roles WHERE id = r.id;
    END LOOP;
  END IF;
END $$;

-- 3. Add Updated Constraint
-- Now that data is clean, adding the constraint should succeed
ALTER TABLE roles ADD CONSTRAINT roles_name_check 
  CHECK (name IN ('SUPERADMIN', 'ADMIN', 'EDUCATOR', 'LEARNER', 'PARENT', 'COUNSELOR'));

-- 4. Insert COUNSELOR role if not exists
INSERT INTO roles (name, description)
SELECT 'COUNSELOR', 'Admission Counselor'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'COUNSELOR');

-- 5. Seed Mock Counselors
DO $$
DECLARE
  v_school_id uuid;
  v_counselor_role_id uuid;
  v_user1_id uuid := gen_random_uuid();
  v_user2_id uuid := gen_random_uuid();
BEGIN
  -- Get School ID (assuming single school for demo)
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  
  -- Get Role IDs
  SELECT id INTO v_counselor_role_id FROM roles WHERE name = 'COUNSELOR';

  -- Create Mock Auth Users 
  BEGIN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
    VALUES 
      (v_user1_id, 'counselor1@demo.com', 'password123', now()),
      (v_user2_id, 'counselor2@demo.com', 'password123', now())
    ON CONFLICT (id) DO NOTHING;
      
    -- Create User Profiles for them
    INSERT INTO user_profiles (id, school_id, role_id, full_name, is_active)
    VALUES
      (v_user1_id, v_school_id, v_counselor_role_id, 'Amit Counselor', true),
      (v_user2_id, v_school_id, v_counselor_role_id, 'Priya Counselor', true)
    ON CONFLICT (id) DO NOTHING;
      
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not insert into auth.users. Skipping mock auth user creation. %', SQLERRM;
  END;

END $$;
