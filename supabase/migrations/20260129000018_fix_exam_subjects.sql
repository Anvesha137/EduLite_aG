-- Migration: Fix Exam Subjects
-- Description: Creates exam_subjects table and related RPCs for subject management.

-- 1. Create exam_subjects table if not exists
CREATE TABLE IF NOT EXISTS exam_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  exam_id uuid REFERENCES exams(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  max_marks numeric(5,2) DEFAULT 100,
  min_pass_marks numeric(5,2) DEFAULT 33,
  created_at timestamptz DEFAULT now(),
  UNIQUE(exam_id, subject_id)
);

ALTER TABLE exam_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School Isolation Policy" ON exam_subjects
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

-- 2. Create RPC: Create Subject
CREATE OR REPLACE FUNCTION create_subject(
    p_school_id uuid,
    p_name text,
    p_code text,
    p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql security definer
AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO subjects (school_id, name, code, description)
    VALUES (p_school_id, p_name, p_code, p_description)
    ON CONFLICT (school_id, code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_subject TO authenticated;

-- 3. Create RPC: Get Available Subjects
CREATE OR REPLACE FUNCTION get_available_subjects(p_school_id uuid)
RETURNS TABLE (
    id uuid,
    name text,
    code text,
    description text
)
LANGUAGE plpgsql security definer
AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.name, s.code, s.description
    FROM subjects s
    WHERE s.school_id = p_school_id
    ORDER BY s.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_available_subjects TO authenticated;

-- 4. Seed Default Subjects (Generic)
DO $$
DECLARE
    v_school_id uuid;
BEGIN
    SELECT id INTO v_school_id FROM schools LIMIT 1;
    
    IF v_school_id IS NOT NULL THEN
        PERFORM create_subject(v_school_id, 'Mathematics', 'MATH', 'Core Math');
        PERFORM create_subject(v_school_id, 'Science', 'SCI', 'General Science');
        PERFORM create_subject(v_school_id, 'English', 'ENG', 'English Language');
        PERFORM create_subject(v_school_id, 'Social Studies', 'SST', 'History & Civics');
        PERFORM create_subject(v_school_id, 'Hindi', 'HIN', 'Second Language');
        PERFORM create_subject(v_school_id, 'Computer Science', 'CS', 'IT & Computers');
    END IF;
END $$;
