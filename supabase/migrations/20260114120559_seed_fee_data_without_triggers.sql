/*
  # Seed Fee Management Demo Data (Disable Triggers)

  Temporarily disables audit triggers to seed data, then re-enables them
*/

-- Disable audit triggers
DROP TRIGGER IF EXISTS trg_audit_fee_payments ON fee_payments;
DROP TRIGGER IF EXISTS trg_audit_discount_approvals ON fee_discount_approvals;

-- Helper function
CREATE OR REPLACE FUNCTION get_class_fee_amount(grade_order integer)
RETURNS decimal AS $$
BEGIN
  RETURN CASE
    WHEN grade_order <= 5 THEN 50000.00
    WHEN grade_order <= 8 THEN 75000.00
    WHEN grade_order <= 10 THEN 100000.00
    ELSE 125000.00
  END;
END;
$$ LANGUAGE plpgsql;

-- Insert student fees
INSERT INTO student_fees (school_id, student_id, academic_year, class_id, total_fee, discount_amount, paid_amount)
SELECT s.school_id, s.id, '2024-25', s.class_id, get_class_fee_amount(c.grade_order), 0, 0
FROM students s
JOIN classes c ON c.id = s.class_id
WHERE s.status = 'active'
ON CONFLICT (student_id, academic_year) DO NOTHING;

-- Create installments
INSERT INTO student_fee_installments_v2 (student_fee_id, installment_number, installment_name, due_date, amount, paid_amount)
SELECT sf.id, 1, '1st Quarter (Apr-Jun)', DATE '2024-06-30', sf.total_fee * 0.25, 0
FROM student_fees sf WHERE sf.academic_year = '2024-25'
ON CONFLICT (student_fee_id, installment_number) DO NOTHING;

INSERT INTO student_fee_installments_v2 (student_fee_id, installment_number, installment_name, due_date, amount, paid_amount)
SELECT sf.id, 2, '2nd Quarter (Jul-Sep)', DATE '2024-09-30', sf.total_fee * 0.25, 0
FROM student_fees sf WHERE sf.academic_year = '2024-25'
ON CONFLICT (student_fee_id, installment_number) DO NOTHING;

INSERT INTO student_fee_installments_v2 (student_fee_id, installment_number, installment_name, due_date, amount, paid_amount)
SELECT sf.id, 3, '3rd Quarter (Oct-Dec)', DATE '2024-12-31', sf.total_fee * 0.25, 0
FROM student_fees sf WHERE sf.academic_year = '2024-25'
ON CONFLICT (student_fee_id, installment_number) DO NOTHING;

INSERT INTO student_fee_installments_v2 (student_fee_id, installment_number, installment_name, due_date, amount, paid_amount)
SELECT sf.id, 4, '4th Quarter (Jan-Mar)', DATE '2025-03-31', sf.total_fee * 0.25, 0
FROM student_fees sf WHERE sf.academic_year = '2024-25'
ON CONFLICT (student_fee_id, installment_number) DO NOTHING;

-- Add payments and discounts
DO $$
DECLARE
  v_admin_id uuid;
  v_school_id uuid;
  v_count integer;
BEGIN
  SELECT school_id INTO v_school_id FROM students LIMIT 1;
  SELECT id INTO v_admin_id FROM user_profiles 
  WHERE school_id = v_school_id AND role_id = (SELECT id FROM roles WHERE name = 'ADMIN') LIMIT 1;
  SELECT COUNT(*) INTO v_count FROM student_fees WHERE academic_year = '2024-25';
  
  -- Fully paid students (10%)
  WITH fully_paid AS (
    SELECT sf.id as fee_id, sf.student_id, sf.school_id, sf.total_fee, 
           sfi.id as inst_id, sfi.installment_number as inst_num
    FROM student_fees sf
    JOIN student_fee_installments_v2 sfi ON sfi.student_fee_id = sf.id
    WHERE sf.academic_year = '2024-25'
    ORDER BY sf.student_id
    LIMIT GREATEST(4, v_count / 10)
  )
  INSERT INTO fee_payments (school_id, student_id, student_fee_id, installment_id, amount, payment_mode, transaction_ref, payment_date, received_by)
  SELECT fp.school_id, fp.student_id, fp.fee_id, fp.inst_id, fp.total_fee * 0.25,
    (ARRAY['cash','online','upi','card','cheque'])[(RANDOM() * 4 + 1)::int],
    'TXN' || LPAD((RANDOM() * 999999)::int::text, 6, '0'),
    DATE '2024-04-15' + (INTERVAL '30 days' * (fp.inst_num - 1)), v_admin_id
  FROM fully_paid fp;
  
  -- Partially paid (2 installments, 20%)
  WITH partial_paid AS (
    SELECT sf.id as fee_id, sf.student_id, sf.school_id, sf.total_fee, sfi.id as inst_id, sfi.installment_number as inst_num,
           ROW_NUMBER() OVER (PARTITION BY sf.id ORDER BY sfi.installment_number) as rn
    FROM student_fees sf
    JOIN student_fee_installments_v2 sfi ON sfi.student_fee_id = sf.id
    WHERE sf.academic_year = '2024-25'
    AND sf.id NOT IN (SELECT DISTINCT student_fee_id FROM fee_payments)
    ORDER BY sf.student_id
    LIMIT GREATEST(2, v_count / 5 * 2)
  )
  INSERT INTO fee_payments (school_id, student_id, student_fee_id, installment_id, amount, payment_mode, transaction_ref, payment_date, received_by)
  SELECT pp.school_id, pp.student_id, pp.fee_id, pp.inst_id, pp.total_fee * 0.25,
    (ARRAY['cash','online','upi'])[(RANDOM() * 2 + 1)::int],
    'TXN' || LPAD((RANDOM() * 999999)::int::text, 6, '0'),
    DATE '2024-04-15' + (INTERVAL '30 days' * (pp.inst_num - 1)), v_admin_id
  FROM partial_paid pp WHERE pp.rn <= 2;
  
  -- Partial payment on first installment (15%)
  WITH partial_first AS (
    SELECT sf.id as fee_id, sf.student_id, sf.school_id, sf.total_fee, sfi.id as inst_id
    FROM student_fees sf
    JOIN student_fee_installments_v2 sfi ON sfi.student_fee_id = sf.id
    WHERE sf.academic_year = '2024-25'
    AND sf.id NOT IN (SELECT DISTINCT student_fee_id FROM fee_payments)
    AND sfi.installment_number = 1
    ORDER BY sf.student_id
    LIMIT GREATEST(1, v_count / 7)
  )
  INSERT INTO fee_payments (school_id, student_id, student_fee_id, installment_id, amount, payment_mode, transaction_ref, payment_date, received_by)
  SELECT pf.school_id, pf.student_id, pf.fee_id, pf.inst_id, (pf.total_fee * 0.25) * 0.5,
    'cash', 'PARTIAL' || LPAD((RANDOM() * 9999)::int::text, 4, '0'), DATE '2024-05-15', v_admin_id
  FROM partial_first pf;
  
  -- Merit discounts (5%)
  WITH merit AS (
    SELECT sf.id as fee_id, sf.student_id, sf.school_id, sf.total_fee
    FROM student_fees sf WHERE sf.academic_year = '2024-25'
    ORDER BY RANDOM() LIMIT GREATEST(1, v_count / 20)
  )
  INSERT INTO fee_discount_approvals (school_id, student_fee_id, student_id, requested_by, requested_amount, reason, status, reviewed_by, reviewed_at, review_comments)
  SELECT m.school_id, m.fee_id, m.student_id, v_admin_id, m.total_fee * 0.10,
    'Merit-based discount for academic excellence', 'approved', v_admin_id,
    NOW() - INTERVAL '30 days', 'Approved based on academic performance'
  FROM merit m;
  
  UPDATE student_fees sf SET discount_amount = da.requested_amount, discount_reason = da.reason,
    discount_approved_by = da.reviewed_by, discount_approved_at = da.reviewed_at
  FROM fee_discount_approvals da WHERE da.student_fee_id = sf.id AND da.status = 'approved';
  
  -- Hardship discounts (3%)
  WITH hardship AS (
    SELECT sf.id as fee_id, sf.student_id, sf.school_id, sf.total_fee
    FROM student_fees sf WHERE sf.academic_year = '2024-25' AND sf.discount_amount = 0
    ORDER BY RANDOM() LIMIT GREATEST(1, v_count / 33)
  )
  INSERT INTO fee_discount_approvals (school_id, student_fee_id, student_id, requested_by, requested_amount, reason, status, reviewed_by, reviewed_at, review_comments)
  SELECT h.school_id, h.fee_id, h.student_id, v_admin_id, h.total_fee * 0.25,
    'Financial hardship discount', 'approved', v_admin_id,
    NOW() - INTERVAL '20 days', 'Verified income documents'
  FROM hardship h;
  
  UPDATE student_fees sf SET discount_amount = da.requested_amount, discount_reason = da.reason,
    discount_approved_by = da.reviewed_by, discount_approved_at = da.reviewed_at
  FROM fee_discount_approvals da WHERE da.student_fee_id = sf.id AND da.status = 'approved' AND sf.discount_amount = 0;
  
  -- Pending discount requests
  WITH pending AS (
    SELECT sf.id as fee_id, sf.student_id, sf.school_id, sf.total_fee
    FROM student_fees sf WHERE sf.academic_year = '2024-25' AND sf.discount_amount = 0
    ORDER BY RANDOM() LIMIT 3
  )
  INSERT INTO fee_discount_approvals (school_id, student_fee_id, student_id, requested_by, requested_amount, reason, status)
  SELECT p.school_id, p.fee_id, p.student_id, v_admin_id, p.total_fee * 0.15,
    'Sibling discount - 2nd child', 'pending'
  FROM pending p;
END $$;

DROP FUNCTION get_class_fee_amount;

-- Re-enable audit triggers
CREATE TRIGGER trg_audit_fee_payments
AFTER INSERT OR UPDATE OR DELETE ON fee_payments
FOR EACH ROW
EXECUTE FUNCTION create_fee_audit_log('payment');

CREATE TRIGGER trg_audit_discount_approvals
AFTER INSERT OR UPDATE ON fee_discount_approvals
FOR EACH ROW
EXECUTE FUNCTION create_fee_audit_log('discount');

-- Summary
DO $$
DECLARE
  t_fees int; t_inst int; t_pay int; t_disc int;
  s_paid int; s_partial int; s_unpaid int; s_overdue int;
BEGIN
  SELECT COUNT(*) INTO t_fees FROM student_fees WHERE academic_year = '2024-25';
  SELECT COUNT(*) INTO t_inst FROM student_fee_installments_v2;
  SELECT COUNT(*) INTO t_pay FROM fee_payments;
  SELECT COUNT(*) INTO t_disc FROM fee_discount_approvals;
  SELECT COUNT(*) INTO s_paid FROM student_fees WHERE academic_year = '2024-25' AND status = 'paid';
  SELECT COUNT(*) INTO s_partial FROM student_fees WHERE academic_year = '2024-25' AND status = 'partially_paid';
  SELECT COUNT(*) INTO s_unpaid FROM student_fees WHERE academic_year = '2024-25' AND status = 'unpaid';
  SELECT COUNT(*) INTO s_overdue FROM student_fees WHERE academic_year = '2024-25' AND status = 'overdue';
  
  RAISE NOTICE '=== Fee Management Demo Data Created ===';
  RAISE NOTICE 'Student Fees: % | Installments: %', t_fees, t_inst;
  RAISE NOTICE 'Payments: % | Discount Approvals: %', t_pay, t_disc;
  RAISE NOTICE 'Fee Status Breakdown:';
  RAISE NOTICE '  Paid: % | Partially Paid: %', s_paid, s_partial;
  RAISE NOTICE '  Unpaid: % | Overdue: %', s_unpaid, s_overdue;
END $$;
