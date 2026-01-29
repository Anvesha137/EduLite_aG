-- Fix assign_exam_subjects RPC
-- Remove school_id from INSERT because the table definition in 0035_fix_exam_functions.sql 
-- does not include school_id, causing the RPC to fail if that schema is active.

CREATE OR REPLACE FUNCTION public.assign_exam_subjects(
    p_exam_id UUID,
    p_subject_ids UUID[],
    p_school_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_subject_id UUID;
    v_has_school_id BOOLEAN;
BEGIN
    -- Check if School ID column exists to handle hybrid schema states safely
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'exam_subjects' 
        AND column_name = 'school_id'
    ) INTO v_has_school_id;

    -- Delete existing subjects for this exam
    DELETE FROM public.exam_subjects WHERE exam_id = p_exam_id;

    -- Insert new subjects
    IF p_subject_ids IS NOT NULL AND array_length(p_subject_ids, 1) > 0 THEN
        FOREACH v_subject_id IN ARRAY p_subject_ids
        LOOP
            IF v_has_school_id THEN
                -- If column exists, insert with school_id
                -- Use dynamic SQL to avoid compile errors if column missing
                EXECUTE 'INSERT INTO public.exam_subjects (exam_id, subject_id, school_id, max_marks) VALUES ($1, $2, $3, 100)'
                USING p_exam_id, v_subject_id, p_school_id;
            ELSE
                -- If column missing, insert without school_id
                INSERT INTO public.exam_subjects (exam_id, subject_id, max_marks)
                VALUES (p_exam_id, v_subject_id, 100);
            END IF;
        END LOOP;
    END IF;
END;
$$;
