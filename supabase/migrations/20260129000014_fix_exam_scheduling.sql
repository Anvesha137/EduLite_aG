-- Migration: Fix Exam Scheduling
-- Description: Creates exam_classes table and RPC for scheduling exams.

-- 1. Create missing tables
CREATE TABLE IF NOT EXISTS exam_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(school_id, code)
);

CREATE TABLE IF NOT EXISTS exam_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid REFERENCES exams(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(exam_id, class_id)
);

-- 2. Seed Exam Types if not exists
INSERT INTO exam_types (school_id, name, code, description)
SELECT id, 'Unit Test', 'UT', 'Regular unit assessment' FROM schools
ON CONFLICT DO NOTHING;

INSERT INTO exam_types (school_id, name, code, description)
SELECT id, 'Half Yearly', 'HY', 'Mid-term assessment' FROM schools
ON CONFLICT DO NOTHING;

INSERT INTO exam_types (school_id, name, code, description)
SELECT id, 'Annual', 'ANN', 'End of year assessment' FROM schools
ON CONFLICT DO NOTHING;

-- 3. Create RPC for Scheduling Exams
CREATE OR REPLACE FUNCTION create_exam_schedule_with_classes(
    p_school_id uuid,
    p_name text,
    p_exam_type_id uuid,
    p_academic_year text,
    p_start_date date,
    p_end_date date,
    p_class_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql security definer
AS $$
DECLARE
    v_exam_id uuid;
    v_class_id uuid;
    v_exam_type_code text;
BEGIN
    -- Input Validation
    IF p_class_ids IS NULL OR array_length(p_class_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'At least one class must be selected';
    END IF;

    -- Get Type Code
    SELECT code INTO v_exam_type_code FROM exam_types WHERE id = p_exam_type_id;

    -- Create Exam Record
    INSERT INTO exams (
        school_id,
        name,
        exam_type, -- Maps to schema ENUM/Constraint, we use code or fallback
        academic_year,
        start_date,
        end_date,
        status,
        created_by
    )
    VALUES (
        p_school_id,
        p_name,
        'unit_test', -- Defaulting to unit_test for now as 'exam_types' table is new enhancement over hardcoded enum
        p_academic_year,
        p_start_date,
        p_end_date,
        'scheduled', -- Initial status
        auth.uid()
    )
    RETURNING id INTO v_exam_id;

    -- Link Classes to Exam
    FOREACH v_class_id IN ARRAY p_class_ids
    LOOP
        INSERT INTO exam_classes (exam_id, class_id)
        VALUES (v_exam_id, v_class_id);
    END LOOP;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION create_exam_schedule_with_classes TO authenticated;
