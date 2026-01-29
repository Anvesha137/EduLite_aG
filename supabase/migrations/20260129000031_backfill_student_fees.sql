-- Migration: Backfill missing student fees
-- Description: Inserts missing student_fees records for active students who don't have them for 2024-25.

DO $$
DECLARE
  v_student RECORD;
  v_fee numeric;
  v_count integer := 0;
BEGIN
  -- Iterate over students who are active and DO NOT have a student_fees record for '2024-25'
  FOR v_student IN 
    SELECT s.* 
    FROM students s 
    LEFT JOIN student_fees sf ON s.id = sf.student_id AND sf.academic_year = '2024-25'
    WHERE s.status = 'active' AND sf.id IS NULL
  LOOP
    -- Calculate fee based on class grade (if class exists)
    v_fee := 35000; -- Default
    
    IF v_student.class_id IS NOT NULL THEN
       -- Need to select into a variable to handle potential nulls if class not found
       -- Using a subquery in assignment
       v_fee := (
         SELECT CASE 
            WHEN grade IN ('11', '12') THEN 60000
            WHEN grade IN ('9', '10') THEN 50000
            ELSE 35000
         END
         FROM classes 
         WHERE id = v_student.class_id
       );
       
       IF v_fee IS NULL THEN v_fee := 35000; END IF;
    END IF;

    INSERT INTO student_fees (
        school_id, 
        student_id, 
        class_id, 
        academic_year, 
        total_fee, 
        status
    ) VALUES (
        v_student.school_id,
        v_student.id,
        v_student.class_id,
        '2024-25',
        v_fee,
        'unpaid'
    );
    
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Backfilled fees for % students', v_count;
END $$;
