-- Migration: Fee Installments and Payment Distribution
-- Description: Standardizes 3-installment structure and implements waterfall payment logic.

-- 1. Get or Create Common Tuition Head ID (Helper function)
CREATE OR REPLACE FUNCTION get_or_create_tuition_head(p_school_id uuid)
RETURNS uuid AS $$
DECLARE
  v_head_id uuid;
BEGIN
  SELECT id INTO v_head_id FROM fee_heads WHERE school_id = p_school_id AND name = 'Tuition Fee' LIMIT 1;
  
  IF v_head_id IS NULL THEN
    INSERT INTO fee_heads (school_id, name, amount, is_mandatory)
    VALUES (p_school_id, 'Tuition Fee', 0, true)
    RETURNING id INTO v_head_id;
  END IF;
  
  RETURN v_head_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Add paid_amount to Fee Installments if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_installments' AND column_name = 'paid_amount') THEN
    ALTER TABLE fee_installments ADD COLUMN paid_amount numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- 3. Update Student Creation Trigger to Create Installments
CREATE OR REPLACE FUNCTION handle_new_student_fee_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_academic_year text := '2024-25';
  v_total_fee numeric(10,2) := 0;
  v_head_id uuid;
  v_inst_1 numeric(10,2);
  v_inst_2 numeric(10,2);
  v_inst_3 numeric(10,2);
  v_student_fee_id uuid;
BEGIN
  -- A. Determine Total Fee (Mock Logic or from Fee Structures)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_fee
  FROM fee_structures
  WHERE class_id = NEW.class_id AND academic_year = v_academic_year;

  IF v_total_fee = 0 THEN
     IF (SELECT grade FROM classes WHERE id = NEW.class_id) IN ('11', '12') THEN
       v_total_fee := 60000;
     ELSIF (SELECT grade FROM classes WHERE id = NEW.class_id) IN ('9', '10') THEN
       v_total_fee := 50000;
     ELSE
       v_total_fee := 35000;
     END IF;
  END IF;

  -- B. Insert Master Record (student_fees)
  INSERT INTO student_fees (
    school_id, student_id, class_id, academic_year, total_fee, status
  ) VALUES (
    NEW.school_id, NEW.id, NEW.class_id, v_academic_year, v_total_fee, 'unpaid'
  )
  ON CONFLICT (student_id, academic_year) DO UPDATE SET total_fee = EXCLUDED.total_fee
  RETURNING id INTO v_student_fee_id;

  -- C. Create 3 Installments (40% - 30% - 30%)
  v_head_id := get_or_create_tuition_head(NEW.school_id);
  v_inst_1 := ROUND(v_total_fee * 0.40, 2);
  v_inst_2 := ROUND(v_total_fee * 0.30, 2);
  v_inst_3 := v_total_fee - v_inst_1 - v_inst_2; -- Ensure sum matches exact total

  -- Cleanup existing auto-generated installments for this student/year to avoid dupes if re-run
  DELETE FROM fee_installments WHERE student_id = NEW.id AND academic_year = v_academic_year;

  INSERT INTO fee_installments (school_id, student_id, fee_head_id, amount, due_date, status, academic_year) VALUES
  (NEW.school_id, NEW.id, v_head_id, v_inst_1, CURRENT_DATE, 'pending', v_academic_year), -- Installment 1 (Now)
  (NEW.school_id, NEW.id, v_head_id, v_inst_2, CURRENT_DATE + INTERVAL '90 days', 'pending', v_academic_year), -- Installment 2 (+3 Months)
  (NEW.school_id, NEW.id, v_head_id, v_inst_3, CURRENT_DATE + INTERVAL '180 days', 'pending', v_academic_year); -- Installment 3 (+6 Months)

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 4. Payment Distribution Waterfall Trigger
CREATE OR REPLACE FUNCTION distribute_payment_to_installments()
RETURNS TRIGGER AS $$
DECLARE
  v_remaining_amount numeric(10,2);
  r_inst record;
  v_allocation numeric(10,2);
  v_student_id uuid;
BEGIN
  v_remaining_amount := NEW.amount;
  
  -- Get Student ID from student_fee_id
  SELECT student_id INTO v_student_id FROM student_fees WHERE id = NEW.student_fee_id;

  -- Update Master Record first (Total Paid)
  UPDATE student_fees
  SET 
    paid_amount = paid_amount + NEW.amount,
    updated_at = now(),
    status = CASE 
      WHEN (paid_amount + NEW.amount) >= (total_fee - discount_amount) THEN 'paid'
      ELSE 'partially_paid'
    END
  WHERE id = NEW.student_fee_id;

  -- Loop through unpaid installments ordered by due date
  FOR r_inst IN 
    SELECT * FROM fee_installments 
    WHERE student_id = v_student_id 
    AND status != 'paid'
    ORDER BY due_date ASC
  LOOP
    EXIT WHEN v_remaining_amount <= 0;

    -- Calculate how much student still owes for this installment
    v_allocation := LEAST(v_remaining_amount, (r_inst.amount - COALESCE(r_inst.paid_amount, 0)));
    
    IF v_allocation > 0 THEN
      -- Update installment
      UPDATE fee_installments 
      SET 
        paid_amount = COALESCE(paid_amount, 0) + v_allocation,
        status = CASE 
          WHEN (COALESCE(paid_amount, 0) + v_allocation) >= amount THEN 'paid'
          ELSE 'partial'
        END
      WHERE id = r_inst.id;
      
      v_remaining_amount := v_remaining_amount - v_allocation;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 5. Re-create triggers
DROP TRIGGER IF EXISTS trg_update_fee_payment ON fee_payments;
CREATE TRIGGER trg_distribute_payment
AFTER INSERT ON fee_payments
FOR EACH ROW
EXECUTE FUNCTION distribute_payment_to_installments();


-- 6. Backfill for existing students
DO $$
DECLARE
  r record;
  v_academic_year text := '2024-25';
  v_total_fee numeric(10,2);
  v_head_id uuid;
  v_inst_1 numeric(10,2);
  v_inst_2 numeric(10,2);
  v_inst_3 numeric(10,2);
BEGIN
  FOR r IN SELECT * FROM students WHERE status = 'active' LOOP
      
      -- Calc Total Logic
      IF (SELECT grade FROM classes WHERE id = r.class_id) IN ('11', '12') THEN
         v_total_fee := 60000;
      ELSIF (SELECT grade FROM classes WHERE id = r.class_id) IN ('9', '10') THEN
         v_total_fee := 50000;
      ELSE
         v_total_fee := 35000;
      END IF;

      -- Update Master Record (student_fees)
      -- NOTE: We don't overwrite if it exists and has varied data potentially, 
      -- but for this migration to standard structure we assume we align it.
      INSERT INTO student_fees (
        school_id, student_id, class_id, academic_year, total_fee, status
      ) VALUES (
        r.school_id, r.id, r.class_id, v_academic_year, v_total_fee, 'unpaid'
      )
      ON CONFLICT (student_id, academic_year) DO UPDATE SET total_fee = EXCLUDED.total_fee;

      -- Create 3 Installments
      v_head_id := get_or_create_tuition_head(r.school_id);
      v_inst_1 := ROUND(v_total_fee * 0.40, 2);
      v_inst_2 := ROUND(v_total_fee * 0.30, 2);
      v_inst_3 := v_total_fee - v_inst_1 - v_inst_2;

      -- Wipe old installments to be fresh (aggressive approach for clean state)
      DELETE FROM fee_installments WHERE student_id = r.id AND academic_year = v_academic_year;

      INSERT INTO fee_installments (school_id, student_id, fee_head_id, amount, due_date, status, academic_year) VALUES
      (r.school_id, r.id, v_head_id, v_inst_1, CURRENT_DATE, 'pending', v_academic_year),
      (r.school_id, r.id, v_head_id, v_inst_2, CURRENT_DATE + INTERVAL '90 days', 'pending', v_academic_year),
      (r.school_id, r.id, v_head_id, v_inst_3, CURRENT_DATE + INTERVAL '180 days', 'pending', v_academic_year);

  END LOOP;
END $$;
