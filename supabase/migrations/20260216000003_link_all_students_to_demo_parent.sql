-- Link All Students to Demo Parent
-- Description: Ensures the demo parent (0000...0004) is linked to ALL students in the first school.
-- This fulfills the user request for "access of all".

DO $$
DECLARE
    v_school_id UUID;
    v_parent_id UUID;
    v_mock_user_id UUID := '00000000-0000-0000-0000-000000000004';
BEGIN
    -- 1. Get the first school
    SELECT id INTO v_school_id FROM public.schools LIMIT 1;
    
    -- 2. Ensure parent record exists for mock user
    INSERT INTO public.parents (school_id, user_id, username, primary_email, primary_mobile)
    VALUES (v_school_id, v_mock_user_id, 'demoparent', 'parent@demoschool.com', '9876543210')
    ON CONFLICT (username) DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING id INTO v_parent_id;

    -- 3. Ensure profile exists
    INSERT INTO public.parent_profiles (parent_id, father_name, mother_name, occupation_father, current_address, city, pincode, profile_completion_percentage)
    VALUES (v_parent_id, 'Demo Parent', 'Mock Parent', 'Software Engineer', 'EduLite Campus, Tech Park', 'Silicon Valley', '94043', 95)
    ON CONFLICT (parent_id) DO NOTHING;

    -- 4. Link ALL students to this parent
    -- Note: We ignore students already linked to other parents to avoid unique constraint violations
    -- Actually, the unique constraint is on student_id, so one student can have only one parent account.
    -- If a student is already linked, we skip them.
    INSERT INTO public.parent_children_map (parent_id, student_id)
    SELECT v_parent_id, id 
    FROM public.students 
    WHERE school_id = v_school_id
    ON CONFLICT (student_id) DO NOTHING;

    RAISE NOTICE 'Linked all students to Parent ID: %', v_parent_id;
END $$;
