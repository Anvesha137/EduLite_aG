-- Function: assign_exam_subjects
-- Redefining to definitely remove the auth check as requested.

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
    -- No authorization check here. 
    -- We assume the caller (frontend) or RLS on other tables handles permissions if needed,
    -- or we trust the authenticated user access for now as per "just make admin do it" / "no authorization".

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
