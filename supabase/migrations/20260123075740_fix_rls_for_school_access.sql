/*
  # Fix RLS policies for school access
  
  1. Changes
    - Add policy to allow users to read their own school data
    - This fixes the circular dependency when fetching user profiles
  
  2. Security
    - Users can only read the school they belong to
    - Maintains proper access control
*/

-- Drop existing policy if it exists
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own school" ON schools;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Allow users to read their own school
CREATE POLICY "Users can read own school"
  ON schools
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT school_id 
      FROM user_profiles 
      WHERE user_profiles.id = auth.uid()
    )
  );
