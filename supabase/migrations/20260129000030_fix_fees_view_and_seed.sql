-- Migration: Create Student Fees View and Seed Data
-- Description: Creates the missing 'student_fees' view and seeds sample data to align Fee Management and Reports.

-- 1. Create View 'student_fees'
-- Aggregates total fees, paid amount, pending amount per student
CREATE OR REPLACE VIEW student_fees_view AS
SELECT 
    s.id,
    s.id as student_id,
    s.school_id,
    s.class_id,
    s.admission_number,
    '2024-25' as academic_year,
    -- Calculate totals from installments
    COALESCE(SUM(fi.amount), 0) as total_fee,
    0 as discount_amount, -- Placeholder for now
    COALESCE(SUM(fi.amount), 0) as net_fee,
    -- Calculate paid from transactions
    COALESCE((
        SELECT SUM(ft.amount)
        FROM fee_transactions ft
        WHERE ft.student_id = s.id
    ), 0) as paid_amount,
    -- Pending
    COALESCE(SUM(fi.amount), 0) - COALESCE((
        SELECT SUM(ft.amount)
        FROM fee_transactions ft
        WHERE ft.student_id = s.id
    ), 0) as pending_amount,
    -- Status
    CASE 
        WHEN COALESCE(SUM(fi.amount), 0) = 0 THEN 'no_fee'
        WHEN COALESCE((SELECT SUM(ft.amount) FROM fee_transactions ft WHERE ft.student_id = s.id), 0) >= COALESCE(SUM(fi.amount), 0) THEN 'paid'
        WHEN COALESCE((SELECT SUM(ft.amount) FROM fee_transactions ft WHERE ft.student_id = s.id), 0) > 0 THEN 'partial'
        ELSE 'pending'
    END as status
FROM students s
LEFT JOIN fee_installments fi ON s.id = fi.student_id
WHERE s.status = 'active'
GROUP BY s.id, s.school_id, s.class_id, s.admission_number;


-- 1b. Ensure fee_heads table and column exists (safe idempotent block)
DO $$
BEGIN
    -- Create table if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_heads') THEN
        CREATE TABLE fee_heads (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
            name text NOT NULL,
            amount numeric(10,2) DEFAULT 0,
            created_at timestamptz DEFAULT now(),
            UNIQUE(school_id, name)
        );
    ELSE
        -- If table exists, ensure amount column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_heads' AND column_name = 'amount') THEN
            ALTER TABLE fee_heads ADD COLUMN amount numeric(10,2) DEFAULT 0;
        END IF;
    END IF;
END $$;

-- 2. Seed Data (Rahul, Priya, Amit, Sneha as seen in screenshot)
-- We need to find or create these students first, then add installments/transactions.
DO $$
DECLARE
    v_school_id uuid;
    v_class_10 uuid;
    v_class_11 uuid;
    v_class_9 uuid;
    v_sec_a uuid;
    v_sec_b uuid;
    v_sec_c uuid;
    v_rahul uuid;
    v_priya uuid;
    v_amit uuid;
    v_sneha uuid;
    v_head_tuition uuid;
BEGIN
    SELECT id INTO v_school_id FROM schools LIMIT 1;
    
    -- Get Classes
    SELECT id INTO v_class_10 FROM classes WHERE grade = '10' AND school_id = v_school_id LIMIT 1;
    SELECT id INTO v_class_11 FROM classes WHERE grade = '11' AND school_id = v_school_id LIMIT 1;
    SELECT id INTO v_class_9 FROM classes WHERE grade = '9' AND school_id = v_school_id LIMIT 1;
    
    -- Get/Create Fee Head
    INSERT INTO fee_heads (school_id, name, amount) VALUES (v_school_id, 'Tuition Fee', 50000) 
    ON CONFLICT (school_id, name) DO UPDATE SET amount = EXCLUDED.amount
    RETURNING id INTO v_head_tuition;

    -- Create Sample Students if not exist
    -- Rahul (10-A)
    INSERT INTO students (school_id, name, admission_number, class_id, status, dob, gender)
    VALUES (v_school_id, 'Rahul Sharma', 'ADM-2024-001', v_class_10, 'active', '2010-01-01', 'male')
    ON CONFLICT (school_id, admission_number) DO UPDATE SET class_id = v_class_10
    RETURNING id INTO v_rahul;
    
    -- Priya (10-A)
    INSERT INTO students (school_id, name, admission_number, class_id, status, dob, gender)
    VALUES (v_school_id, 'Priya Patel', 'ADM-2024-002', v_class_10, 'active', '2010-01-01', 'female')
    ON CONFLICT (school_id, admission_number) DO UPDATE SET class_id = v_class_10
    RETURNING id INTO v_priya;
    
    -- Amit (11-B)
    INSERT INTO students (school_id, name, admission_number, class_id, status, dob, gender)
    VALUES (v_school_id, 'Amit Kumar', 'ADM-2024-005', v_class_11, 'active', '2009-01-01', 'male')
    ON CONFLICT (school_id, admission_number) DO UPDATE SET class_id = v_class_11
    RETURNING id INTO v_amit;
    
    -- Sneha (9-C)
    INSERT INTO students (school_id, name, admission_number, class_id, status, dob, gender)
    VALUES (v_school_id, 'Sneha Gupta', 'ADM-2024-010', v_class_9, 'active', '2011-01-01', 'female')
    ON CONFLICT (school_id, admission_number) DO UPDATE SET class_id = v_class_9
    RETURNING id INTO v_sneha;

    -- Add Installments (Total Fees)
    INSERT INTO fee_installments (school_id, student_id, fee_head_id, amount, due_date, academic_year) VALUES
    (v_school_id, v_rahul, v_head_tuition, 50000, CURRENT_DATE, '2024-25'),
    (v_school_id, v_priya, v_head_tuition, 50000, CURRENT_DATE, '2024-25'),
    (v_school_id, v_amit, v_head_tuition, 60000, CURRENT_DATE, '2024-25'),
    (v_school_id, v_sneha, v_head_tuition, 45000, CURRENT_DATE, '2024-25');

    -- Add Transactions (Payments)
    -- Rahul Paid 45000
    INSERT INTO fee_transactions (school_id, student_id, amount, payment_date, payment_mode) VALUES
    (v_school_id, v_rahul, 45000, CURRENT_DATE, 'online');
    
    -- Priya Paid 25000
    INSERT INTO fee_transactions (school_id, student_id, amount, payment_date, payment_mode) VALUES
    (v_school_id, v_priya, 25000, CURRENT_DATE, 'cash');
    
    -- Amit Paid 10000
    INSERT INTO fee_transactions (school_id, student_id, amount, payment_date, payment_mode) VALUES
    (v_school_id, v_amit, 10000, CURRENT_DATE, 'upi');
    
    -- Sneha Paid 0 (No transaction)

END $$;
