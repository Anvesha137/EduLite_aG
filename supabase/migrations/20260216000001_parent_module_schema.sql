-- Parent Module Schema & Seed
-- Description: Creates parents, parent_profiles, and parent_children_map tables.
-- Also seeds a mock parent linked to the demo account.

BEGIN;

-- 1. Parents Table
CREATE TABLE IF NOT EXISTS public.parents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Link to Auth.Users (or Mock ID)
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT, -- Optional for mock, kept for structure
    primary_email TEXT,
    primary_mobile TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Parent Profiles Table
CREATE TABLE IF NOT EXISTS public.parent_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE UNIQUE,
    father_name TEXT,
    mother_name TEXT,
    occupation_father TEXT,
    occupation_mother TEXT,
    annual_income TEXT,
    alternate_mobile TEXT,
    alternate_email TEXT,
    current_address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    profile_completion_percentage INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Parent Children Map (1 Child -> 1 Parent Account)
CREATE TABLE IF NOT EXISTS public.parent_children_map (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    UNIQUE(student_id), -- Ensures 1 child -> 1 parent account
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Audit/Sync Function for Updated At
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_parents_updated_at BEFORE UPDATE ON public.parents FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_parent_profiles_updated_at BEFORE UPDATE ON public.parent_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 5. Seed Data for Mock Parent
DO $$
DECLARE
    v_school_id UUID;
    v_parent_id UUID;
    v_student_id UUID;
    v_mock_user_id UUID := '00000000-0000-0000-0000-000000000004'; -- From AuthContext.tsx
BEGIN
    SELECT id INTO v_school_id FROM schools LIMIT 1;
    
    -- Pick a demo student
    SELECT id INTO v_student_id FROM students WHERE school_id = v_school_id LIMIT 1;

    IF v_school_id IS NOT NULL AND v_student_id IS NOT NULL THEN
        -- Insert Parent
        INSERT INTO public.parents (school_id, user_id, username, primary_email, primary_mobile)
        VALUES (v_school_id, v_mock_user_id, 'demoparent', 'parent@demoschool.com', '9876543210')
        ON CONFLICT (username) DO UPDATE SET user_id = EXCLUDED.user_id
        RETURNING id INTO v_parent_id;

        -- Insert Profile
        INSERT INTO public.parent_profiles (parent_id, father_name, mother_name, occupation_father, current_address, city, pincode, profile_completion_percentage)
        VALUES (v_parent_id, 'John Doe', 'Jane Doe', 'Engineer', '123 School Street', 'New Delhi', '110001', 85)
        ON CONFLICT (parent_id) DO NOTHING;

        -- Map Child
        INSERT INTO public.parent_children_map (parent_id, student_id)
        VALUES (v_parent_id, v_student_id)
        ON CONFLICT (student_id) DO NOTHING;
    END IF;
END $$;

COMMIT;
