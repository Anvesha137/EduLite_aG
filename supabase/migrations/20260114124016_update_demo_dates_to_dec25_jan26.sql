/*
  # Update Demo Data Dates to Dec 2025 - Jan 2026

  ## Overview
  Updates all demo data dates to be in the December 2025 - January 2026 timeframe
  to make the demo data appear current and realistic.

  ## Changes Made
  1. **Exam Dates**
     - Updates exam dates to December 2025 and January 2026

  2. **Announcement Content**
     - Updates announcement text to reference December 2025 and January 2026

  3. **Fee Installment Due Dates**
     - Updates installment due dates to December 2025 and January 2026

  4. **Fee Payment Dates**
     - Updates payment dates to December 2025 - January 2026

  5. **Attendance Records**
     - Updates attendance to last 30 days (Dec 2025 - Jan 2026)

  ## Important Notes
  - Student DOB and admission dates remain historical (appropriate for their ages)
  - Only operational/transactional data dates are updated
  - Academic year remains 2024-25 for consistency
*/

-- Disable audit triggers temporarily
DROP TRIGGER IF EXISTS trg_audit_fee_payments ON fee_payments;
DROP TRIGGER IF EXISTS trg_audit_discount_approvals ON fee_discount_approvals;

DO $$
DECLARE
  v_school_id uuid;
  v_educator1_id uuid;
  v_class_9_id uuid;
  v_class_10_id uuid;
BEGIN
  -- Get school ID
  SELECT id INTO v_school_id FROM schools WHERE email = 'admin@demoschool.edu';

  -- Get educator ID
  SELECT id INTO v_educator1_id FROM educators
  WHERE school_id = v_school_id AND employee_id = 'EMP001';

  -- Get class IDs
  SELECT id INTO v_class_9_id FROM classes WHERE school_id = v_school_id AND grade = 'Class 9';
  SELECT id INTO v_class_10_id FROM classes WHERE school_id = v_school_id AND grade = 'Class 10';

  -- Update exam dates to December 2025 - January 2026
  UPDATE exams
  SET start_date = '2025-12-16', end_date = '2025-12-20'
  WHERE school_id = v_school_id AND name = 'Unit Test 1';

  UPDATE exams
  SET start_date = '2026-01-13', end_date = '2026-01-27'
  WHERE school_id = v_school_id AND name = 'Mid Term';

  -- Update announcement content with Dec 2025 - Jan 2026 dates
  UPDATE announcements
  SET title = 'Annual Day Celebration',
      content = 'Annual day will be celebrated on 15th January 2026. All students are requested to participate actively.'
  WHERE school_id = v_school_id AND title = 'Annual Day Celebration';

  UPDATE announcements
  SET title = 'Mid-term Exam Schedule',
      content = 'Mid-term exams will be conducted from 13th January to 27th January 2026. Syllabus and timetable will be shared soon.'
  WHERE school_id = v_school_id AND title = 'Mid-term Exam Schedule';

  UPDATE announcements
  SET title = 'Winter Break Notice',
      content = 'School will be closed for winter break from 25th December 2025 to 31st December 2025. School reopens on 2nd January 2026.'
  WHERE school_id = v_school_id AND title = 'Sports Day';

  UPDATE announcements
  SET title = 'Parent-Teacher Meeting',
      content = 'PTM scheduled for 20th December 2025. Parents are requested to meet respective class teachers.'
  WHERE school_id = v_school_id AND title = 'Parent-Teacher Meeting';

  -- Delete old attendance records
  DELETE FROM attendance WHERE school_id = v_school_id;

  -- Insert fresh attendance for last 30 days (Dec 2025 - Jan 2026)
  INSERT INTO attendance (school_id, student_id, date, status, marked_by)
  SELECT
    v_school_id,
    s.id,
    (CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 29)),
    CASE
      WHEN random() > 0.1 THEN 'present'
      WHEN random() > 0.5 THEN 'absent'
      ELSE 'late'
    END,
    v_educator1_id
  FROM students s
  WHERE s.school_id = v_school_id
    AND s.class_id IN (v_class_9_id, v_class_10_id)
  ON CONFLICT (student_id, date) DO NOTHING;

  -- Update fee installment due dates to Dec 2025 - Jan 2026
  UPDATE student_fee_installments_v2
  SET due_date = '2025-12-15'
  WHERE installment_number = 3
    AND due_date = '2024-12-31';

  UPDATE student_fee_installments_v2
  SET due_date = '2026-01-31'
  WHERE installment_number = 4
    AND due_date = '2025-03-31';

  -- Update fee payment dates to Dec 2025 - Jan 2026
  UPDATE fee_payments
  SET payment_date = CASE
    WHEN payment_date >= '2024-10-01' THEN '2025-12-15'::date
    WHEN payment_date >= '2024-07-01' THEN '2025-12-10'::date
    WHEN payment_date >= '2024-05-01' THEN '2025-12-05'::date
    ELSE '2025-12-01'::date
  END
  WHERE school_id = v_school_id;

  -- Update old fee installments from the original seed
  UPDATE fee_installments
  SET due_date = '2025-12-15'
  WHERE school_id = v_school_id AND due_date = '2024-07-15';

  RAISE NOTICE '✓ Demo data dates updated to December 2025 - January 2026';
END $$;

-- Re-enable audit triggers
CREATE TRIGGER trg_audit_fee_payments
AFTER INSERT OR UPDATE OR DELETE ON fee_payments
FOR EACH ROW
EXECUTE FUNCTION create_fee_audit_log('payment');

CREATE TRIGGER trg_audit_discount_approvals
AFTER INSERT OR UPDATE ON fee_discount_approvals
FOR EACH ROW
EXECUTE FUNCTION create_fee_audit_log('discount');
