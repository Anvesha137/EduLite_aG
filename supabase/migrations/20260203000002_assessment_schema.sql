-- Assessment Configuration Module

CREATE TABLE IF NOT EXISTS grade_scales (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('scholastic', 'co-scholastic')),
    ranges jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of objects: { grade, min, max, points, description }
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE grade_scales ENABLE ROW LEVEL SECURITY;

-- Read Access: Users can see grade scales of their own school
CREATE POLICY "Enable read access for school users" ON grade_scales
    FOR SELECT TO authenticated
    USING (
        school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid())
    );

-- Insert Access: Admins/Superadmins of the school
CREATE POLICY "Enable insert for school admins" ON grade_scales
    FOR INSERT TO authenticated WITH CHECK (
        school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid())
        AND (
            EXISTS (
                SELECT 1 FROM user_profiles up
                JOIN roles r ON r.id = up.role_id
                WHERE up.id = auth.uid() AND r.name IN ('ADMIN', 'SUPERADMIN')
            )
        )
    );

-- Update Access: Admins/Superadmins
CREATE POLICY "Enable update for school admins" ON grade_scales
    FOR UPDATE TO authenticated USING (
        school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid())
        AND (
            EXISTS (
                SELECT 1 FROM user_profiles up
                JOIN roles r ON r.id = up.role_id
                WHERE up.id = auth.uid() AND r.name IN ('ADMIN', 'SUPERADMIN')
            )
        )
    );

-- Delete Access: Admins/Superadmins
CREATE POLICY "Enable delete for school admins" ON grade_scales
    FOR DELETE TO authenticated USING (
        school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid())
        AND (
            EXISTS (
                SELECT 1 FROM user_profiles up
                JOIN roles r ON r.id = up.role_id
                WHERE up.id = auth.uid() AND r.name IN ('ADMIN', 'SUPERADMIN')
            )
        )
    );
