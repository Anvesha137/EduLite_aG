-- Fix RLS for Expenses Table
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view expenses" ON expenses;
DROP POLICY IF EXISTS "Admins can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Admins can update expenses" ON expenses;
DROP POLICY IF EXISTS "Admins can delete expenses" ON expenses;

-- Simplified Policy: Checks School ID and Role via user_profiles and roles tables
-- Ensure role names match exact case from DB ('SUPERADMIN', 'ADMIN')

CREATE POLICY "Admins can view expenses" ON expenses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 
            FROM user_profiles up 
            LEFT JOIN roles r ON up.role_id = r.id
            WHERE up.id = auth.uid() 
            AND up.school_id = expenses.school_id
            AND (r.name = 'ADMIN' OR r.name = 'SUPERADMIN')
        )
    );

CREATE POLICY "Admins can insert expenses" ON expenses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM user_profiles up 
            LEFT JOIN roles r ON up.role_id = r.id
            WHERE up.id = auth.uid() 
            AND up.school_id = expenses.school_id
            AND (r.name = 'ADMIN' OR r.name = 'SUPERADMIN')
        )
    );

CREATE POLICY "Admins can update expenses" ON expenses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 
            FROM user_profiles up 
            LEFT JOIN roles r ON up.role_id = r.id
            WHERE up.id = auth.uid() 
            AND up.school_id = expenses.school_id
            AND (r.name = 'ADMIN' OR r.name = 'SUPERADMIN')
        )
    );

CREATE POLICY "Admins can delete expenses" ON expenses
    FOR DELETE USING (
        EXISTS (
            SELECT 1 
            FROM user_profiles up 
            LEFT JOIN roles r ON up.role_id = r.id
            WHERE up.id = auth.uid() 
            AND up.school_id = expenses.school_id
            AND (r.name = 'ADMIN' OR r.name = 'SUPERADMIN')
        )
    );
