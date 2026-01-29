-- Migration: Fix Strict Filtering for Exam Classes and Subjects

-- 1. Strict Class Filtering
-- Previously, this fell back to ALL school classes if no specific class was found.
-- Now, it strictly joins exam_classes to return ONLY assigned classes.
CREATE OR REPLACE FUNCTION public.get_exam_classes(p_exam_id UUID)
RETURNS SETOF public.classes
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.*
    FROM public.classes c
    JOIN public.exam_classes ec ON ec.class_id = c.id
    WHERE ec.exam_id = p_exam_id
    ORDER BY c.grade_order;
END;
$$;

-- 2. Strict Subject Filtering
-- Previously, this fell back to ALL school subjects if no exam_subjects were found.
-- Now, it strictly returns only subjects present in exam_subjects.
CREATE OR REPLACE FUNCTION public.get_exam_subjects(p_exam_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    code TEXT,
    max_marks DECIMAL,
    passing_marks DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id, 
        s.name, 
        s.code, 
        es.max_marks, 
        es.passing_marks 
    FROM public.exam_subjects es
    JOIN public.subjects s ON s.id = es.subject_id
    WHERE es.exam_id = p_exam_id
    ORDER BY s.name;
END;
$$;
