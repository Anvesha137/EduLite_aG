/*
  # Enable Anonymous Access for Demo (Core Tables Only)
  
  1. Changes
    - Add policies to allow anonymous (anon) access to core tables for demo purposes
    - This bypasses authentication requirements while maintaining RLS security structure
  
  2. Security Note
    - These policies are for DEMO purposes only
    - In production, these should be removed and proper authentication enforced
*/

DROP POLICY IF EXISTS "Anon can read Demo School" ON schools;
DROP POLICY IF EXISTS "Anon can read profiles" ON user_profiles;
DROP POLICY IF EXISTS "Anon can read students" ON students;
DROP POLICY IF EXISTS "Anon can insert students" ON students;
DROP POLICY IF EXISTS "Anon can update students" ON students;
DROP POLICY IF EXISTS "Anon can delete students" ON students;
DROP POLICY IF EXISTS "Anon can read educators" ON educators;
DROP POLICY IF EXISTS "Anon can insert educators" ON educators;
DROP POLICY IF EXISTS "Anon can update educators" ON educators;
DROP POLICY IF EXISTS "Anon can delete educators" ON educators;
DROP POLICY IF EXISTS "Anon can read classes" ON classes;
DROP POLICY IF EXISTS "Anon can read sections" ON sections;
DROP POLICY IF EXISTS "Anon can read subjects" ON subjects;
DROP POLICY IF EXISTS "Anon can read attendance" ON attendance;
DROP POLICY IF EXISTS "Anon can insert attendance" ON attendance;
DROP POLICY IF EXISTS "Anon can read exams" ON exams;
DROP POLICY IF EXISTS "Anon can insert exams" ON exams;
DROP POLICY IF EXISTS "Anon can read marks" ON marks;
DROP POLICY IF EXISTS "Anon can insert marks" ON marks;
DROP POLICY IF EXISTS "Anon can read fee_structures" ON fee_structures;
DROP POLICY IF EXISTS "Anon can read student_fees" ON student_fees;
DROP POLICY IF EXISTS "Anon can read fee_payments" ON fee_payments;
DROP POLICY IF EXISTS "Anon can insert fee_payments" ON fee_payments;
DROP POLICY IF EXISTS "Anon can read announcements" ON announcements;
DROP POLICY IF EXISTS "Anon can insert announcements" ON announcements;
DROP POLICY IF EXISTS "Anon can update announcements" ON announcements;
DROP POLICY IF EXISTS "Anon can delete announcements" ON announcements;
DROP POLICY IF EXISTS "Anon can read roles" ON roles;
DROP POLICY IF EXISTS "Anon can read boards" ON boards;
DROP POLICY IF EXISTS "Anon can read states" ON states;
DROP POLICY IF EXISTS "Anon can read parents" ON parents;
DROP POLICY IF EXISTS "Anon can read fee_heads" ON fee_heads;

CREATE POLICY "Anon can read Demo School"
  ON schools
  FOR SELECT
  TO anon
  USING (name = 'Demo International School');

CREATE POLICY "Anon can read profiles"
  ON user_profiles
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read students"
  ON students
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert students"
  ON students
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update students"
  ON students
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete students"
  ON students
  FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon can read educators"
  ON educators
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert educators"
  ON educators
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update educators"
  ON educators
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete educators"
  ON educators
  FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon can read classes"
  ON classes
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read sections"
  ON sections
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read subjects"
  ON subjects
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read attendance"
  ON attendance
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert attendance"
  ON attendance
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can read exams"
  ON exams
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert exams"
  ON exams
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can read marks"
  ON marks
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert marks"
  ON marks
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can read fee_structures"
  ON fee_structures
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read student_fees"
  ON student_fees
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read fee_payments"
  ON fee_payments
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert fee_payments"
  ON fee_payments
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can read announcements"
  ON announcements
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert announcements"
  ON announcements
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update announcements"
  ON announcements
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete announcements"
  ON announcements
  FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon can read roles"
  ON roles
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read boards"
  ON boards
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read states"
  ON states
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read parents"
  ON parents
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read fee_heads"
  ON fee_heads
  FOR SELECT
  TO anon
  USING (true);