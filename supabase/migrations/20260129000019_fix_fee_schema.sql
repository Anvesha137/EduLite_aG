-- Migration: Fix Fee Management Schema
-- Description: Creates tables required by FeeManagement.tsx (student_fees, fee_payments, fee_discount_approvals) and seeds data.

-- 1. Create student_fees table
CREATE TABLE IF NOT EXISTS student_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id),
  academic_year text NOT NULL,
  total_fee numeric(10,2) NOT NULL DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  net_fee numeric(10,2) GENERATED ALWAYS AS (total_fee - discount_amount) STORED,
  paid_amount numeric(10,2) DEFAULT 0,
  pending_amount numeric(10,2) GENERATED ALWAYS AS (total_fee - discount_amount - paid_amount) STORED,
  status text DEFAULT 'unpaid' CHECK (status IN ('paid', 'partially_paid', 'unpaid', 'overdue')),
  discount_reason text,
  discount_approved_by uuid REFERENCES auth.users(id),
  discount_approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, academic_year)
);

ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School Isolation Policy" ON student_fees
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));


-- 2. Create fee_payments table
CREATE TABLE IF NOT EXISTS fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  student_fee_id uuid REFERENCES student_fees(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  payment_mode text NOT NULL CHECK (payment_mode IN ('cash', 'cheque', 'online', 'card', 'upi')),
  transaction_ref text,
  remarks text,
  paid_by uuid REFERENCES auth.users(id),
  payment_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School Isolation Policy" ON fee_payments
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));


-- 3. Create fee_discount_approvals table
CREATE TABLE IF NOT EXISTS fee_discount_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  student_fee_id uuid REFERENCES student_fees(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id),
  requested_by uuid REFERENCES auth.users(id),
  requested_amount numeric(10,2) NOT NULL,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_comments text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fee_discount_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School Isolation Policy" ON fee_discount_approvals
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));


-- 4. Trigger to update paid_amount in student_fees
CREATE OR REPLACE FUNCTION update_fee_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE student_fees
  SET 
    paid_amount = paid_amount + NEW.amount,
    updated_at = now(),
    status = CASE 
      WHEN (paid_amount + NEW.amount) >= (total_fee - discount_amount) THEN 'paid'
      ELSE 'partially_paid'
    END
  WHERE id = NEW.student_fee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_fee_payment
AFTER INSERT ON fee_payments
FOR EACH ROW
EXECUTE FUNCTION update_fee_payment_status();


-- 5. Seed Student Fees for existing students
DO $$
DECLARE
  v_student RECORD;
  v_fee numeric;
BEGIN
  FOR v_student IN SELECT * FROM students WHERE status = 'active'
  LOOP
    -- Assign random fee structure based on class (mock logic)
    IF v_student.class_id IS NOT NULL THEN
        v_fee := CASE 
            WHEN (SELECT grade FROM classes WHERE id = v_student.class_id) IN ('11', '12') THEN 60000
            WHEN (SELECT grade FROM classes WHERE id = v_student.class_id) IN ('9', '10') THEN 50000
            ELSE 35000
        END;

        INSERT INTO student_fees (
            school_id, 
            student_id, 
            class_id, 
            academic_year, 
            total_fee, 
            status
        ) VALUES (
            v_student.school_id, -- assumed from first school found logic if null, but students has school_id
            v_student.id,
            v_student.class_id,
            '2024-25',
            v_fee,
            'unpaid'
        )
        ON CONFLICT (student_id, academic_year) DO NOTHING;
    END IF;
  END LOOP;
END $$;
