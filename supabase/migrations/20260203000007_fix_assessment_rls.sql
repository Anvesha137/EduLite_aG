-- Fix RLS for grade_scales
ALTER TABLE grade_scales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for school admins" ON grade_scales;
DROP POLICY IF EXISTS "Enable update for school admins" ON grade_scales;
DROP POLICY IF EXISTS "Enable delete for school admins" ON grade_scales;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON grade_scales;

-- Re-create correct policies
CREATE POLICY "Enable read access for authenticated users" ON grade_scales
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND school_id = grade_scales.school_id
        )
    );

CREATE POLICY "Enable insert for school admins" ON grade_scales
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM user_profiles up
            LEFT JOIN roles r ON up.role_id = r.id
            WHERE up.id = auth.uid()
            AND up.school_id = grade_scales.school_id
            AND (r.name = 'ADMIN' OR r.name = 'SUPERADMIN')
        )
    );

CREATE POLICY "Enable update for school admins" ON grade_scales
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 
            FROM user_profiles up
            LEFT JOIN roles r ON up.role_id = r.id
            WHERE up.id = auth.uid()
            AND up.school_id = grade_scales.school_id
            AND (r.name = 'ADMIN' OR r.name = 'SUPERADMIN')
        )
    );

CREATE POLICY "Enable delete for school admins" ON grade_scales
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 
            FROM user_profiles up
            LEFT JOIN roles r ON up.role_id = r.id
            WHERE up.id = auth.uid()
            AND up.school_id = grade_scales.school_id
            AND (r.name = 'ADMIN' OR r.name = 'SUPERADMIN')
        )
    );

-- Seed Mock Data (Insert if not exists)
DO $$
DECLARE
    v_school_id uuid;
BEGIN
    -- Get the first school ID found
    SELECT id INTO v_school_id FROM schools LIMIT 1;

    IF v_school_id IS NOT NULL THEN
        -- Scholastic Scale (A1-E2)
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
    END IF;
END $$;
