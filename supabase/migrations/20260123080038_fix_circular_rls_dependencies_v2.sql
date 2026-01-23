/*
  # Fix Circular RLS Dependencies (v2)
  
  1. Changes
    - Make helper functions SECURITY DEFINER to bypass RLS when querying user_profiles
    - This fixes the circular dependency issue where policies check user_profiles
  
  2. Security
    - Helper functions run with elevated privileges but only return user's own data
    - Maintains proper access control while fixing the circular dependency
*/

-- Update helper function to get user role (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT r.name
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = auth.uid()
$$;

-- Update helper function to get user school (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_school()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT school_id
  FROM user_profiles
  WHERE id = auth.uid()
$$;
