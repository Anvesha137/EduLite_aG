-- Migration: Fix Exams Table Structure
-- Description: Adds missing 'status' column and relaxes exam_type constraint.

-- 1. Add status column
ALTER TABLE exams ADD COLUMN IF NOT EXISTS status text DEFAULT 'scheduled';

-- 2. Drop the restrictive CHECK constraint on exam_type if it exists
-- We want to allow values from our new exam_types table (codes like UT, HY etc)
DO $$
BEGIN
  ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_exam_type_check;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3. Re-apply the RPC (just to be safe and clean)
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
    
    -- Fallback code if not found
    IF v_exam_type_code IS NULL THEN
        v_exam_type_code := 'UT'; 
    END IF;

    -- Create Exam Record
    INSERT INTO exams (
        school_id,
        name,
        exam_type,
        academic_year,
        start_date,
        end_date,
        status,
        created_by
    )
    VALUES (
        p_school_id,
        p_name,
        v_exam_type_code, -- Use the code (UT, HY, etc.)
        p_academic_year,
        p_start_date,
        p_end_date,
        'scheduled',
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
