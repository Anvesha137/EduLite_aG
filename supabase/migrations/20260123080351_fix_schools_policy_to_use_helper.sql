/*
  # Fix Schools Policy to Use Helper Function
  
  1. Changes
    - Update schools RLS policy to use get_user_school() helper function
    - This eliminates the subquery that causes circular dependency
  
  2. Security
    - Users can only read their own school
    - Helper function bypasses RLS to prevent circular dependency
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can read own school" ON schools;

-- Recreate using helper function
CREATE POLICY "Users can read own school"
  ON schools
  FOR SELECT
  TO authenticated
  USING (id = get_user_school());
