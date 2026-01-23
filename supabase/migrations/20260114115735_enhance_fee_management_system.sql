/*
  # Enhanced Fee Management System

  ## Overview
  This migration enhances the existing fee management system with:
  - Student-level fee tracking with discount support
  - Installment payment system with status tracking
  - Discount approval workflow
  - Comprehensive audit logging
  - Automatic status calculation

  ## 1. New Tables
    
    - `student_fees`
      - Tracks overall fee status per student per academic year
      - Fields: total_fee, discount_amount, net_fee, paid_amount, pending_amount, status
      - Linked to fee_structures and students
    
    - `student_fee_installments_v2`
      - Individual installment tracking per student
      - Links to student_fees and tracks payment status
      - Fields: due_date, amount, paid_amount, pending_amount, status
    
    - `fee_payments`
      - Immutable payment transaction records
      - Tracks all fee payments with audit fields
      - Links to student_fees and installments
    
    - `fee_discount_approvals`
      - Discount request and approval workflow
      - Fields: requested_amount, reason, status, reviewer info
    
    - `fee_audit_logs`
      - Comprehensive audit trail for fee operations
      - Tracks all sensitive fee-related actions

  ## 2. Security
    - Enable RLS on all new tables
    - Admin can manage all fee data
    - Parents can view their children's fee information (read-only)
    - All changes are logged in audit trail
*/

-- Student Fees (Overall tracking per student per year)
CREATE TABLE IF NOT EXISTS student_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  total_fee decimal(10,2) NOT NULL DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  discount_reason text,
  discount_approved_by uuid REFERENCES auth.users(id),
  discount_approved_at timestamptz,
  net_fee decimal(10,2) GENERATED ALWAYS AS (total_fee - discount_amount) STORED,
  paid_amount decimal(10,2) DEFAULT 0,
  pending_amount decimal(10,2) GENERATED ALWAYS AS (total_fee - discount_amount - paid_amount) STORED,
  status text DEFAULT 'unpaid' CHECK (status IN ('paid', 'partially_paid', 'unpaid', 'overdue')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, academic_year)
);

-- Student Fee Installments (Individual installment tracking)
CREATE TABLE IF NOT EXISTS student_fee_installments_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_id uuid NOT NULL REFERENCES student_fees(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  installment_name text NOT NULL,
  due_date date NOT NULL,
  amount decimal(10,2) NOT NULL,
  paid_amount decimal(10,2) DEFAULT 0,
  pending_amount decimal(10,2) GENERATED ALWAYS AS (amount - paid_amount) STORED,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partially_paid', 'overdue')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_fee_id, installment_number)
);

-- Fee Payments (Immutable transaction records)
CREATE TABLE IF NOT EXISTS fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_fee_id uuid NOT NULL REFERENCES student_fees(id) ON DELETE CASCADE,
  installment_id uuid REFERENCES student_fee_installments_v2(id) ON DELETE SET NULL,
  amount decimal(10,2) NOT NULL,
  payment_mode text NOT NULL CHECK (payment_mode IN ('cash', 'cheque', 'online', 'card', 'upi')),
  transaction_ref text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  received_by uuid REFERENCES auth.users(id),
  remarks text,
  is_cancelled boolean DEFAULT false,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id),
  cancellation_reason text,
  created_at timestamptz DEFAULT now()
);

-- Fee Discount Approvals
CREATE TABLE IF NOT EXISTS fee_discount_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_fee_id uuid NOT NULL REFERENCES student_fees(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  requested_amount decimal(10,2) NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_comments text,
  created_at timestamptz DEFAULT now()
);

-- Fee Audit Logs
CREATE TABLE IF NOT EXISTS fee_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('payment', 'discount', 'installment', 'student_fee')),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'approved', 'rejected', 'cancelled')),
  performed_by uuid NOT NULL REFERENCES auth.users(id),
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  timestamp timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_fees_student ON student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_school_year ON student_fees(school_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_student_fees_status ON student_fees(status);
CREATE INDEX IF NOT EXISTS idx_student_fee_installments_v2_student_fee ON student_fee_installments_v2(student_fee_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_installments_v2_due_date ON student_fee_installments_v2(due_date);
CREATE INDEX IF NOT EXISTS idx_student_fee_installments_v2_status ON student_fee_installments_v2(status);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_school_date ON fee_payments(school_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_fee ON fee_payments(student_fee_id);
CREATE INDEX IF NOT EXISTS idx_fee_discount_approvals_school_status ON fee_discount_approvals(school_id, status);
CREATE INDEX IF NOT EXISTS idx_fee_discount_approvals_student ON fee_discount_approvals(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_audit_logs_school_entity ON fee_audit_logs(school_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_fee_audit_logs_timestamp ON fee_audit_logs(timestamp DESC);

-- Enable RLS on all new tables
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fee_installments_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_discount_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_fees
CREATE POLICY "Admin can manage student fees"
  ON student_fees FOR ALL
  TO authenticated
  USING (
    school_id = get_user_school() 
    AND get_user_role() IN ('ADMIN', 'SUPERADMIN')
  )
  WITH CHECK (
    school_id = get_user_school() 
    AND get_user_role() IN ('ADMIN', 'SUPERADMIN')
  );

CREATE POLICY "Parents can view their children's fees"
  ON student_fees FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE parent_id IN (
        SELECT id FROM parents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Superadmin full access to student fees"
  ON student_fees FOR ALL
  TO authenticated
  USING (get_user_role() = 'SUPERADMIN');

-- RLS Policies for student_fee_installments_v2
CREATE POLICY "Admin can manage installments"
  ON student_fee_installments_v2 FOR ALL
  TO authenticated
  USING (
    student_fee_id IN (
      SELECT id FROM student_fees 
      WHERE school_id = get_user_school() 
      AND get_user_role() IN ('ADMIN', 'SUPERADMIN')
    )
  )
  WITH CHECK (
    student_fee_id IN (
      SELECT id FROM student_fees 
      WHERE school_id = get_user_school() 
      AND get_user_role() IN ('ADMIN', 'SUPERADMIN')
    )
  );

CREATE POLICY "Parents can view their children's installments"
  ON student_fee_installments_v2 FOR SELECT
  TO authenticated
  USING (
    student_fee_id IN (
      SELECT sf.id FROM student_fees sf
      JOIN students s ON s.id = sf.student_id
      WHERE s.parent_id IN (
        SELECT id FROM parents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Superadmin full access to installments"
  ON student_fee_installments_v2 FOR ALL
  TO authenticated
  USING (get_user_role() = 'SUPERADMIN');

-- RLS Policies for fee_payments
CREATE POLICY "Admin can manage payments"
  ON fee_payments FOR ALL
  TO authenticated
  USING (
    school_id = get_user_school() 
    AND get_user_role() IN ('ADMIN', 'SUPERADMIN')
  )
  WITH CHECK (
    school_id = get_user_school() 
    AND get_user_role() IN ('ADMIN', 'SUPERADMIN')
  );

CREATE POLICY "Parents can view their children's payments"
  ON fee_payments FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE parent_id IN (
        SELECT id FROM parents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Superadmin full access to payments"
  ON fee_payments FOR ALL
  TO authenticated
  USING (get_user_role() = 'SUPERADMIN');

-- RLS Policies for fee_discount_approvals
CREATE POLICY "Admin can manage discount approvals"
  ON fee_discount_approvals FOR ALL
  TO authenticated
  USING (
    school_id = get_user_school() 
    AND get_user_role() IN ('ADMIN', 'SUPERADMIN')
  )
  WITH CHECK (
    school_id = get_user_school() 
    AND get_user_role() IN ('ADMIN', 'SUPERADMIN')
  );

CREATE POLICY "Superadmin full access to discount approvals"
  ON fee_discount_approvals FOR ALL
  TO authenticated
  USING (get_user_role() = 'SUPERADMIN');

-- RLS Policies for fee_audit_logs
CREATE POLICY "Admin can view audit logs"
  ON fee_audit_logs FOR SELECT
  TO authenticated
  USING (
    school_id = get_user_school() 
    AND get_user_role() IN ('ADMIN', 'SUPERADMIN')
  );

CREATE POLICY "System can insert audit logs"
  ON fee_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Superadmin full access to audit logs"
  ON fee_audit_logs FOR ALL
  TO authenticated
  USING (get_user_role() = 'SUPERADMIN');

-- Function to automatically update student_fees status based on pending amount and due dates
CREATE OR REPLACE FUNCTION update_student_fee_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE student_fees sf
  SET 
    status = CASE
      WHEN sf.pending_amount <= 0 THEN 'paid'
      WHEN sf.paid_amount > 0 AND sf.pending_amount > 0 THEN 'partially_paid'
      WHEN EXISTS (
        SELECT 1 FROM student_fee_installments_v2 sfi
        WHERE sfi.student_fee_id = sf.id
        AND sfi.status = 'overdue'
      ) THEN 'overdue'
      ELSE 'unpaid'
    END,
    updated_at = now()
  WHERE sf.id = NEW.student_fee_id OR sf.id = OLD.student_fee_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update installment status based on due date and paid amount
CREATE OR REPLACE FUNCTION update_installment_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status := CASE
    WHEN NEW.pending_amount <= 0 THEN 'paid'
    WHEN NEW.paid_amount > 0 AND NEW.pending_amount > 0 THEN 'partially_paid'
    WHEN NEW.due_date < CURRENT_DATE AND NEW.pending_amount > 0 THEN 'overdue'
    ELSE 'pending'
  END;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update student_fees status when installments change
CREATE TRIGGER trg_update_student_fee_status_on_installment
AFTER INSERT OR UPDATE OR DELETE ON student_fee_installments_v2
FOR EACH ROW
EXECUTE FUNCTION update_student_fee_status();

-- Trigger to update installment status before insert or update
CREATE TRIGGER trg_update_installment_status
BEFORE INSERT OR UPDATE ON student_fee_installments_v2
FOR EACH ROW
EXECUTE FUNCTION update_installment_status();

-- Function to update paid amounts after payment
CREATE OR REPLACE FUNCTION update_paid_amounts_after_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT NEW.is_cancelled THEN
    -- Update installment paid amount if linked
    IF NEW.installment_id IS NOT NULL THEN
      UPDATE student_fee_installments_v2
      SET paid_amount = paid_amount + NEW.amount
      WHERE id = NEW.installment_id;
    END IF;
    
    -- Update student_fee paid amount
    UPDATE student_fees
    SET paid_amount = paid_amount + NEW.amount
    WHERE id = NEW.student_fee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update paid amounts after payment
CREATE TRIGGER trg_update_paid_amounts_after_payment
AFTER INSERT ON fee_payments
FOR EACH ROW
EXECUTE FUNCTION update_paid_amounts_after_payment();

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_fee_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO fee_audit_logs (
    school_id,
    entity_type,
    entity_id,
    action,
    performed_by,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.school_id, OLD.school_id),
    TG_ARGV[0],
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Audit triggers for sensitive operations
CREATE TRIGGER trg_audit_fee_payments
AFTER INSERT OR UPDATE OR DELETE ON fee_payments
FOR EACH ROW
EXECUTE FUNCTION create_fee_audit_log('payment');

CREATE TRIGGER trg_audit_discount_approvals
AFTER INSERT OR UPDATE ON fee_discount_approvals
FOR EACH ROW
EXECUTE FUNCTION create_fee_audit_log('discount');
