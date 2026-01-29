-- Function: assign_exam_subjects
-- specialized RPC to securely assign subjects to an exam, bypassing RLS restriction on plain INSERTs if needed.
-- It replaces all existing subjects for the exam with the new list (bulk replace).

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
BEGIN
    -- Authorization check removed as per user request
    -- IF NOT EXISTS (
    --     SELECT 1 FROM user_profiles
    --     WHERE user_profiles.id = auth.uid()
    --     AND user_profiles.school_id = p_school_id
    --     AND user_profiles.role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN', 'EDUCATOR'))
    -- ) THEN
    --     RAISE EXCEPTION 'Unauthorized';
    -- END IF;

    -- Delete existing subjects for this exam
    DELETE FROM public.exam_subjects WHERE exam_id = p_exam_id;

    -- Insert new subjects
    IF p_subject_ids IS NOT NULL AND array_length(p_subject_ids, 1) > 0 THEN
        FOREACH v_subject_id IN ARRAY p_subject_ids
        LOOP
            INSERT INTO public.exam_subjects (exam_id, subject_id, school_id, max_marks)
            VALUES (p_exam_id, v_subject_id, p_school_id, 100); -- Default max_marks 100
        END LOOP;
    END IF;
END;
$$;
