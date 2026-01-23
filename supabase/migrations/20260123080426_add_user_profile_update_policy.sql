/*
  # Add User Profile Update Policy
  
  1. Changes
    - Allow users to update their own profile (for last_login updates)
  
  2. Security
    - Users can only update their own profile
    - Prevents users from modifying other users' data
*/

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
