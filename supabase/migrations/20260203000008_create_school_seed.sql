-- Create School if none exists and Seed Assessment Data

DO $$
DECLARE
    v_school_id uuid;
BEGIN
    -- 1. Get or Create School
    SELECT id INTO v_school_id FROM schools LIMIT 1;
    
    IF v_school_id IS NULL THEN
        INSERT INTO schools (name, address, email, phone)
        VALUES ('EduLite Academy', '123 Education Lane', 'admin@edulite.com', '555-0123')
        RETURNING id INTO v_school_id;
        
        RAISE NOTICE 'Created new school with ID: %', v_school_id;
    ELSE
        RAISE NOTICE 'Using existing school ID: %', v_school_id;
    END IF;

    -- 2. Link ALL existing users to this school (Fixing orphan users)
    UPDATE user_profiles 
    SET school_id = v_school_id 
    WHERE school_id IS NULL;

    -- 3. Seed Grade Scales
    -- Scholastic Scale (A1-E)
    IF NOT EXISTS (SELECT 1 FROM grade_scales WHERE name = 'CBSE Scholastic' AND school_id = v_school_id) THEN
        INSERT INTO grade_scales (school_id, name, type, is_default, ranges)
        VALUES (
            v_school_id,
            'CBSE Scholastic',
            'scholastic',
            true,
            '[
                {"grade": "A1", "min_score": 91, "max_score": 100, "points": 10, "description": "Outstanding"},
                {"grade": "A2", "min_score": 81, "max_score": 90, "points": 9, "description": "Excellent"},
                {"grade": "B1", "min_score": 71, "max_score": 80, "points": 8, "description": "Very Good"},
                {"grade": "B2", "min_score": 61, "max_score": 70, "points": 7, "description": "Good"},
                {"grade": "C1", "min_score": 51, "max_score": 60, "points": 6, "description": "Average"},
                {"grade": "C2", "min_score": 41, "max_score": 50, "points": 5, "description": "Below Average"},
                {"grade": "D", "min_score": 33, "max_score": 40, "points": 4, "description": "Marginal"},
                {"grade": "E", "min_score": 0, "max_score": 32, "points": 0, "description": "Needs Improvement"}
            ]'::jsonb
        );
    END IF;

    -- Co-Scholastic Scale (A-C)
    IF NOT EXISTS (SELECT 1 FROM grade_scales WHERE name = 'Activity Grade' AND school_id = v_school_id) THEN
        INSERT INTO grade_scales (school_id, name, type, is_default, ranges)
        VALUES (
            v_school_id,
            'Activity Grade',
            'co-scholastic',
            false,
            '[
                {"grade": "A", "min_score": 75, "max_score": 100, "points": 3, "description": "Outstanding"},
                {"grade": "B", "min_score": 50, "max_score": 74, "points": 2, "description": "Very Good"},
                {"grade": "C", "min_score": 0, "max_score": 49, "points": 1, "description": "Fair"}
            ]'::jsonb
        );
    END IF;
END $$;
