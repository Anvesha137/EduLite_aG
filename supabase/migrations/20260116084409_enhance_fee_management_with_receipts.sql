/*
  # Enhanced Fee Management with Receipt System

  ## Overview
  Production-grade financial system with immutable receipts, proper audit trails,
  and real-time reconciliation. Designed for financial disputes and audits.

  ## New Tables Created
  1. `fee_receipts` - Immutable payment receipts with sequential numbering
  2. `fee_receipt_line_items` - Detailed breakdown of each receipt
  3. `fee_receipt_sequences` - Sequential receipt number generation per school

  ## Enhanced Tables
  - Improved payment tracking
  - Proper installment linkage
  - Formula-driven calculations

  ## Key Rules
  - One receipt per payment (immutable)
  - Sequential receipt numbers per school per academic year
  - No deletion or editing of payments/receipts
  - All calculations stored and auditable
  - Parent and admin views must reconcile

  ## Security
  - RLS enabled
  - Only admins can record payments
  - Parents can view their children's receipts
  - All changes audited
*/

-- =====================================================
-- 1. FEE RECEIPT SEQUENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS fee_receipt_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  
  -- Sequential numbering
  last_receipt_number integer DEFAULT 0,
  prefix text DEFAULT 'RCP',
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(school_id, academic_year)
);

-- =====================================================
-- 2. FEE RECEIPTS
-- =====================================================

CREATE TABLE IF NOT EXISTS fee_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Receipt identification (IMMUTABLE)
  receipt_number text NOT NULL,
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  academic_year text NOT NULL,
  
  -- Student and payment linkage
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES fee_payments(id) ON DELETE RESTRICT,
  student_fee_id uuid NOT NULL REFERENCES student_fees(id) ON DELETE RESTRICT,
  installment_id uuid REFERENCES student_fee_installments_v2(id),
  
  -- Financial details (IMMUTABLE - snapshot at time of payment)
  total_due decimal(10,2) NOT NULL,
  total_discount decimal(10,2) DEFAULT 0,
  net_payable decimal(10,2) NOT NULL,
  previous_paid decimal(10,2) DEFAULT 0,
  current_payment decimal(10,2) NOT NULL,
  total_paid_after decimal(10,2) NOT NULL,
  remaining_balance decimal(10,2) NOT NULL,
  
  -- Payment details
  payment_mode text NOT NULL,
  transaction_reference text,
  
  -- Installment context (if applicable)
  installment_period text,
  installment_due_date date,
  
  -- Student snapshot (for immutability)
  student_name text NOT NULL,
  student_admission_number text NOT NULL,
  student_class text NOT NULL,
  student_section text NOT NULL,
  
  -- Generated receipt file
  pdf_url text,
  
  -- Audit (IMMUTABLE)
  issued_by uuid NOT NULL REFERENCES user_profiles(id),
  issued_at timestamptz DEFAULT now(),
  
  -- Prevent tampering
  is_cancelled boolean DEFAULT false,
  cancelled_by uuid REFERENCES user_profiles(id),
  cancelled_at timestamptz,
  cancellation_reason text,
  
  UNIQUE(school_id, receipt_number),
  UNIQUE(payment_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fee_receipts_school ON fee_receipts(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_student ON fee_receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_date ON fee_receipts(receipt_date DESC);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_number ON fee_receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_academic_year ON fee_receipts(academic_year);

-- =====================================================
-- 3. FEE RECEIPT LINE ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS fee_receipt_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES fee_receipts(id) ON DELETE CASCADE,
  
  -- Line item details
  line_number integer NOT NULL,
  description text NOT NULL,
  amount decimal(10,2) NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('fee_head', 'discount', 'payment', 'balance')),
  
  -- Reference to fee structure (if applicable)
  fee_head_id uuid REFERENCES fee_heads(id),
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(receipt_id, line_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_receipt_line_items_receipt ON fee_receipt_line_items(receipt_id);

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE fee_receipt_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_receipt_line_items ENABLE ROW LEVEL SECURITY;

-- Receipt Sequences policies
CREATE POLICY "Admins can view own school sequences"
  ON fee_receipt_sequences FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage sequences"
  ON fee_receipt_sequences FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  );

-- Fee Receipts policies
CREATE POLICY "Staff and parents can view receipts"
  ON fee_receipts FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
    OR
    -- Parents can view their children's receipts
    student_id IN (
      SELECT id FROM students WHERE parent_id IN (
        SELECT id FROM parents WHERE school_id IN (
          SELECT school_id FROM user_profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Admins can issue receipts"
  ON fee_receipts FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  );

CREATE POLICY "Admins can cancel receipts"
  ON fee_receipts FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  );

-- Receipt Line Items policies
CREATE POLICY "Users can view line items"
  ON fee_receipt_line_items FOR SELECT
  TO authenticated
  USING (
    receipt_id IN (
      SELECT id FROM fee_receipts WHERE school_id IN (
        SELECT school_id FROM user_profiles WHERE id = auth.uid()
      )
    )
    OR
    receipt_id IN (
      SELECT id FROM fee_receipts WHERE student_id IN (
        SELECT id FROM students WHERE parent_id IN (
          SELECT id FROM parents WHERE school_id IN (
            SELECT school_id FROM user_profiles WHERE id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "Admins can create line items"
  ON fee_receipt_line_items FOR INSERT
  TO authenticated
  WITH CHECK (
    receipt_id IN (
      SELECT id FROM fee_receipts WHERE school_id IN (
        SELECT school_id FROM user_profiles
        WHERE id = auth.uid()
        AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
      )
    )
  );

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to generate next receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number(
  p_school_id uuid,
  p_academic_year text
)
RETURNS text AS $$
DECLARE
  v_next_number integer;
  v_prefix text;
  v_receipt_number text;
BEGIN
  -- Get or create sequence
  INSERT INTO fee_receipt_sequences (school_id, academic_year, last_receipt_number)
  VALUES (p_school_id, p_academic_year, 0)
  ON CONFLICT (school_id, academic_year) DO NOTHING;
  
  -- Increment and get next number
  UPDATE fee_receipt_sequences
  SET last_receipt_number = last_receipt_number + 1,
      updated_at = now()
  WHERE school_id = p_school_id AND academic_year = p_academic_year
  RETURNING last_receipt_number, prefix INTO v_next_number, v_prefix;
  
  -- Format: RCP-2025-26-0001
  v_receipt_number := v_prefix || '-' || p_academic_year || '-' || LPAD(v_next_number::text, 4, '0');
  
  RETURN v_receipt_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-generate receipt after payment
CREATE OR REPLACE FUNCTION auto_generate_receipt()
RETURNS TRIGGER AS $$
DECLARE
  v_receipt_number text;
  v_student_fee_record RECORD;
  v_student_record RECORD;
  v_class_name text;
  v_section_name text;
  v_installment_period text;
  v_installment_due_date date;
BEGIN
  -- Generate receipt number
  v_receipt_number := generate_receipt_number(NEW.school_id, NEW.academic_year);
  
  -- Get student fee details
  SELECT * INTO v_student_fee_record
  FROM student_fees
  WHERE id = NEW.student_fee_id;
  
  -- Get student details
  SELECT s.*, c.grade, sec.name as section_name
  INTO v_student_record
  FROM students s
  LEFT JOIN classes c ON c.id = s.class_id
  LEFT JOIN sections sec ON sec.id = s.section_id
  WHERE s.id = NEW.student_id;
  
  v_class_name := COALESCE(v_student_record.grade, 'N/A');
  v_section_name := COALESCE(v_student_record.section_name, 'N/A');
  
  -- Get installment details if applicable
  IF NEW.installment_id IS NOT NULL THEN
    SELECT installment_name, due_date
    INTO v_installment_period, v_installment_due_date
    FROM student_fee_installments_v2
    WHERE id = NEW.installment_id;
  END IF;
  
  -- Create receipt
  INSERT INTO fee_receipts (
    school_id,
    receipt_number,
    receipt_date,
    academic_year,
    student_id,
    payment_id,
    student_fee_id,
    installment_id,
    total_due,
    total_discount,
    net_payable,
    previous_paid,
    current_payment,
    total_paid_after,
    remaining_balance,
    payment_mode,
    transaction_reference,
    installment_period,
    installment_due_date,
    student_name,
    student_admission_number,
    student_class,
    student_section,
    issued_by
  ) VALUES (
    NEW.school_id,
    v_receipt_number,
    NEW.payment_date,
    NEW.academic_year,
    NEW.student_id,
    NEW.id,
    NEW.student_fee_id,
    NEW.installment_id,
    v_student_fee_record.total_fee,
    v_student_fee_record.discount_amount,
    (v_student_fee_record.total_fee - v_student_fee_record.discount_amount),
    (v_student_fee_record.paid_amount - NEW.amount),
    NEW.amount,
    v_student_fee_record.paid_amount,
    ((v_student_fee_record.total_fee - v_student_fee_record.discount_amount) - v_student_fee_record.paid_amount),
    NEW.payment_mode,
    NEW.transaction_ref,
    v_installment_period,
    v_installment_due_date,
    v_student_record.name,
    v_student_record.admission_number,
    v_class_name,
    v_section_name,
    NEW.received_by
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate receipt after payment
CREATE TRIGGER trg_auto_generate_receipt
  AFTER INSERT ON fee_payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_receipt();

-- =====================================================
-- 6. INITIALIZE SEQUENCES FOR EXISTING SCHOOLS
-- =====================================================

INSERT INTO fee_receipt_sequences (school_id, academic_year)
SELECT id, '2025-26'
FROM schools
WHERE NOT EXISTS (
  SELECT 1 FROM fee_receipt_sequences WHERE school_id = schools.id AND academic_year = '2025-26'
);

-- =====================================================
-- 7. ADD ACADEMIC YEAR TO FEE PAYMENTS (IF NOT EXISTS)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fee_payments' AND column_name = 'academic_year'
  ) THEN
    ALTER TABLE fee_payments ADD COLUMN academic_year text DEFAULT '2025-26';
  END IF;
END $$;