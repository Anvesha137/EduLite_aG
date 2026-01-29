-- Seeding Fix Data
-- Ensures the latest exam has at least some classes and subjects assigned
-- so the user can verify the dropdowns content directly.

DO $$
DECLARE
    v_exam_id UUID;
    v_school_id UUID;
    v_class_id UUID;
    v_subject_id UUID;
BEGIN
    -- 1. Get the most recent exam
    SELECT id, school_id INTO v_exam_id, v_school_id
    FROM public.exams
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_exam_id IS NOT NULL THEN
        -- 2. Ensure Classes are assigned
        IF NOT EXISTS (SELECT 1 FROM public.exam_classes WHERE exam_id = v_exam_id) THEN
            -- Assign first 3 classes found for this school
            FOR v_class_id IN (SELECT id FROM public.classes WHERE school_id = v_school_id ORDER BY grade_order LIMIT 3)
            LOOP
                INSERT INTO public.exam_classes (exam_id, class_id) VALUES (v_exam_id, v_class_id);
            END LOOP;
        END IF;

        -- 3. Ensure Subjects are assigned
        IF NOT EXISTS (SELECT 1 FROM public.exam_subjects WHERE exam_id = v_exam_id) THEN
            -- Assign first 3 subjects found for this school
            FOR v_subject_id IN (SELECT id FROM public.subjects WHERE school_id = v_school_id LIMIT 3)
            LOOP
                -- Handle missing school_id column possibility dynamically or just try insert without it if it fails?
                -- Since we know the schema state is tricky, let's use the safer assign_exam_subjects approach logic
                -- BUT we can't call the RPC easily from DO block if it takes arrays specifically constructed?
                -- Simpler: Try Insert with school_id, if fails catch? No, PLPGSQL checks columns.
                -- Check column existence
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_subjects' AND column_name = 'school_id') THEN
                     EXECUTE 'INSERT INTO public.exam_subjects (exam_id, subject_id, school_id, max_marks) VALUES ($1, $2, $3, 100)'
                     USING v_exam_id, v_subject_id, v_school_id;
                ELSE
                     INSERT INTO public.exam_subjects (exam_id, subject_id, max_marks)
                     VALUES (v_exam_id, v_subject_id, 100);
                END IF;
            END LOOP;
        END IF;
    END IF;
END $$;
