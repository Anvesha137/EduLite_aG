-- Migration: Add Triggers for New Student Data Synchronization
-- Description: Automatically creates fee records when a student is created.

-- Function to handle new student insertion
CREATE OR REPLACE FUNCTION handle_new_student_fee_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_academic_year text := '2024-25'; -- Default/Current academic year
  v_total_fee numeric(10,2) := 0;
  v_fee_struct record;
BEGIN
  -- 1. Calculate Total Fee based on Class Fee Structure
  -- If fee structures exist, sum them up.
  SELECT COALESCE(SUM(amount), 0) INTO v_total_fee
  FROM fee_structures
  WHERE class_id = NEW.class_id AND academic_year = v_academic_year;

  -- Fallback if no structure found (Use the logic from seed)
  IF v_total_fee = 0 THEN
     IF (SELECT grade FROM classes WHERE id = NEW.class_id) IN ('11', '12') THEN
       v_total_fee := 60000;
     ELSIF (SELECT grade FROM classes WHERE id = NEW.class_id) IN ('9', '10') THEN
       v_total_fee := 50000;
     ELSE
       v_total_fee := 35000;
     END IF;
  END IF;

  -- 2. Insert into student_fees table
  INSERT INTO student_fees (
    school_id,
    student_id,
    class_id,
    academic_year,
    total_fee,
    status
  ) VALUES (
    NEW.school_id,
    NEW.id,
    NEW.class_id,
    v_academic_year,
    v_total_fee,
    'unpaid'
  )
  ON CONFLICT (student_id, academic_year) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Trigger on students table
DROP TRIGGER IF EXISTS trg_create_student_fees ON students;

CREATE TRIGGER trg_create_student_fees
AFTER INSERT ON students
FOR EACH ROW
EXECUTE FUNCTION handle_new_student_fee_creation();


-- Backfill for existing students who might check this now
-- (Safe to run thanks to ON CONFLICT DO NOTHING)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM students WHERE status = 'active' LOOP
    -- Trigger logic manual execution for backfill
    INSERT INTO student_fees (
        school_id, student_id, class_id, academic_year, total_fee, status
    ) 
    SELECT 
        r.school_id, 
        r.id, 
        r.class_id, 
        '2024-25',
        CASE 
            WHEN (SELECT grade FROM classes WHERE id = r.class_id) IN ('11', '12') THEN 60000
            WHEN (SELECT grade FROM classes WHERE id = r.class_id) IN ('9', '10') THEN 50000
            ELSE 35000
        END,
        'unpaid'
    WHERE NOT EXISTS (SELECT 1 FROM student_fees WHERE student_id = r.id AND academic_year = '2024-25');
  END LOOP;
END $$;
