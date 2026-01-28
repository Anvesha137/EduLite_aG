-- Migration: Seed Subjects
-- Description: Inserts default subjects for the Demo School.

DO $$
DECLARE
  v_school_id uuid;
BEGIN
  -- Get the demo school ID
  SELECT id INTO v_school_id FROM schools WHERE name = 'Demo International School';

  IF v_school_id IS NOT NULL THEN
    -- Insert default subjects
    INSERT INTO subjects (school_id, name, code, description)
    VALUES 
      (v_school_id, 'English', 'ENG', 'English Language and Literature'),
      (v_school_id, 'Mathematics', 'MATH', 'General Mathematics'),
      (v_school_id, 'Science', 'SCI', 'General Science'),
      (v_school_id, 'Social Science', 'SST', 'History, Geography, Civics'),
      (v_school_id, 'Hindi', 'HIN', 'Hindi Language'),
      (v_school_id, 'Computer Science', 'CS', 'Computer Applications')
    ON CONFLICT (school_id, code) DO NOTHING;
  END IF;
END;
$$;
