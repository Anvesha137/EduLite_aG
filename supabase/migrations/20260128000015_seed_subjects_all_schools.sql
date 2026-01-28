-- Migration: Seed Subjects for ALL Schools
-- Description: Iterates through all schools and inserts default subjects if they don't exist.

DO $$
DECLARE
  r_school RECORD;
BEGIN
  -- Loop through all schools
  FOR r_school IN SELECT id FROM schools LOOP
    
    -- Insert default subjects for each school
    INSERT INTO subjects (school_id, name, code, description)
    VALUES 
      (r_school.id, 'English', 'ENG', 'English Language and Literature'),
      (r_school.id, 'Mathematics', 'MATH', 'General Mathematics'),
      (r_school.id, 'Science', 'SCI', 'General Science'),
      (r_school.id, 'Social Science', 'SST', 'History, Geography, Civics'),
      (r_school.id, 'Hindi', 'HIN', 'Hindi Language'),
      (r_school.id, 'Computer Science', 'CS', 'Computer Applications')
    ON CONFLICT (school_id, code) DO NOTHING;
    
  END LOOP;
END;
$$;
