-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES schools(id) NOT NULL,
    title text NOT NULL,
    category text NOT NULL CHECK (category IN ('Maintenance', 'Salary', 'Events', 'Utilities', 'Supplies', 'Other')),
    amount decimal(10,2) NOT NULL,
    date date NOT NULL DEFAULT CURRENT_DATE,
    payment_method text DEFAULT 'Cash',
    paid_to text,
    description text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policies

-- VIEW: All users in the same school can view expenses (or restrict to Admin?)
-- Let's restrict to Admin for now as it's sensitive data.
CREATE POLICY "Admins can view expenses" ON expenses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 
            FROM user_profiles up 
            JOIN roles r ON up.role_id = r.id
            WHERE up.id = auth.uid() 
            AND up.school_id = expenses.school_id
            AND r.name IN ('ADMIN', 'SUPERADMIN')
        )
    );

CREATE POLICY "Admins can insert expenses" ON expenses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM user_profiles up 
            JOIN roles r ON up.role_id = r.id
            WHERE up.id = auth.uid() 
            AND up.school_id = expenses.school_id
            AND r.name IN ('ADMIN', 'SUPERADMIN')
        )
    );

CREATE POLICY "Admins can update expenses" ON expenses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 
            FROM user_profiles up 
            JOIN roles r ON up.role_id = r.id
            WHERE up.id = auth.uid() 
            AND up.school_id = expenses.school_id
            AND r.name IN ('ADMIN', 'SUPERADMIN')
        )
    );

CREATE POLICY "Admins can delete expenses" ON expenses
    FOR DELETE USING (
        EXISTS (
            SELECT 1 
            FROM user_profiles up 
            JOIN roles r ON up.role_id = r.id
            WHERE up.id = auth.uid() 
            AND up.school_id = expenses.school_id
            AND r.name IN ('ADMIN', 'SUPERADMIN')
        )
    );

-- Add Audit Trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_change') THEN
        DROP TRIGGER IF EXISTS audit_expenses ON expenses;
        CREATE TRIGGER audit_expenses
        AFTER INSERT OR UPDATE OR DELETE ON expenses
        FOR EACH ROW EXECUTE FUNCTION log_audit_change();
    END IF;
END $$;
