-- Migration: Seed Full ERP Data
-- Description: Creates a master seeding function and runs it for all schools to ensure the dashboard is populated.

CREATE OR REPLACE FUNCTION seed_school_data(p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_id uuid;
  v_section_id uuid;
  v_parent_id uuid;
  v_student_count integer;
  v_educator_count integer;
  v_lead_count integer;
  v_grade text;
  v_grades text[] := ARRAY['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  v_sections text[] := ARRAY['A', 'B'];
  v_sec text;
  v_i integer;
BEGIN
  -- 1. SEED CLASSES & SECTIONS
  FOREACH v_grade IN ARRAY v_grades
  LOOP
    -- Insert Class
    INSERT INTO classes (school_id, grade, grade_order, description)
    VALUES (p_school_id, v_grade, 
      CASE v_grade 
        WHEN 'Nursery' THEN -2 
        WHEN 'LKG' THEN -1 
        WHEN 'UKG' THEN 0 
        ELSE v_grade::integer 
      END, 
      'Standard Grade ' || v_grade)
    ON CONFLICT (school_id, grade) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_class_id;
    
    -- Insert Sections
    FOREACH v_sec IN ARRAY v_sections
    LOOP
      INSERT INTO sections (school_id, class_id, name, capacity)
      VALUES (p_school_id, v_class_id, v_sec, 40)
      ON CONFLICT (class_id, name) DO NOTHING;
    END LOOP;
  END LOOP;

  -- 2. SEED EDUCATORS (Ensure at least 5)
  SELECT count(*) INTO v_educator_count FROM educators WHERE school_id = p_school_id;
  
  IF v_educator_count < 5 THEN
    INSERT INTO educators (school_id, employee_id, name, phone, email, designation, qualification, status)
    VALUES 
      (p_school_id, 'EMP001', 'Amit Sharma', '9876543210', 'amit.s@example.com', 'Senior Teacher', 'M.Sc. Physics', 'active'),
      (p_school_id, 'EMP002', 'Priya Kapoor', '9876543211', 'priya.k@example.com', 'Teacher', 'B.Ed. English', 'active'),
      (p_school_id, 'EMP003', 'Rahul Verma', '9876543212', 'rahul.v@example.com', 'Sports Coach', 'B.P.Ed', 'active'),
      (p_school_id, 'EMP004', 'Sneha Gupta', '9876543213', 'sneha.g@example.com', 'Teacher', 'M.A. History', 'active'),
      (p_school_id, 'EMP005', 'Vikram Singh', '9876543214', 'vikram.s@example.com', 'Lab Assistant', 'B.Sc', 'active')
    ON CONFLICT (school_id, employee_id) DO NOTHING;
  END IF;

  -- 3. SEED STUDENTS (Ensure at least 10)
  SELECT count(*) INTO v_student_count FROM students WHERE school_id = p_school_id;
  
  IF v_student_count < 10 THEN
    -- Get a valid class and section (Class 10, Section A)
    SELECT c.id INTO v_class_id FROM classes c WHERE c.school_id = p_school_id AND c.grade = '10' LIMIT 1;
    SELECT s.id INTO v_section_id FROM sections s WHERE s.class_id = v_class_id AND s.name = 'A' LIMIT 1;

    -- Create Dummy Parents first
    INSERT INTO parents (school_id, name, relationship, phone, email, address)
    VALUES 
      (p_school_id, 'Rajesh Kumar', 'father', '9988776655', 'rajesh@example.com', '123 Main St'),
      (p_school_id, 'Anita Desai', 'mother', '9988776656', 'anita@example.com', '456 Park Ave'),
      (p_school_id, 'Suresh Reddy', 'father', '9988776657', 'suresh@example.com', '789 Lake View')
    ON CONFLICT DO NOTHING; -- No unique constraint on parent name usually, but safe to skip conflict if any unique index exists other than ID

    -- Get a parent ID
    SELECT id INTO v_parent_id FROM parents WHERE school_id = p_school_id LIMIT 1;
    
    IF v_class_id IS NOT NULL AND v_section_id IS NOT NULL AND v_parent_id IS NOT NULL THEN
       INSERT INTO students (school_id, admission_number, name, dob, gender, class_id, section_id, parent_id, status, admission_date)
       VALUES
         (p_school_id, 'ADM2026001', 'Aarav Kumar', '2010-05-15', 'male', v_class_id, v_section_id, v_parent_id, 'active', '2025-04-01'),
         (p_school_id, 'ADM2026002', 'Vivaan Reddy', '2010-08-20', 'male', v_class_id, v_section_id, v_parent_id, 'active', '2025-04-01'),
         (p_school_id, 'ADM2026003', 'Diya Sharma', '2011-01-10', 'female', v_class_id, v_section_id, v_parent_id, 'active', '2025-04-01'),
         (p_school_id, 'ADM2026004', 'Ananya Gupta', '2010-11-05', 'female', v_class_id, v_section_id, v_parent_id, 'active', '2025-04-01'),
         (p_school_id, 'ADM2026005', 'Ishaan Singh', '2010-03-30', 'male', v_class_id, v_section_id, v_parent_id, 'active', '2025-04-01')
       ON CONFLICT (school_id, admission_number) DO NOTHING;
    END IF;
  END IF;

  -- 4. SEED ADMISSION LEADS
  SELECT count(*) INTO v_lead_count FROM admission_leads WHERE school_id = p_school_id;
  
  IF v_lead_count < 5 THEN
     -- Insert Leads using the create_admission_lead function if available, OR direct insert
     -- Direct insert is safer here to avoid dependency on other RPCs existing in this transaction or not
     INSERT INTO admission_leads (school_id, lead_number, parent_name, contact_number, student_name, priority, status)
     VALUES
       (p_school_id, 'LEAD-001', 'Mr. Mehta', '9898989898', 'Rohan Mehta', 'high', 'active'),
       (p_school_id, 'LEAD-002', 'Mrs. Iyer', '9898989899', 'Kavya Iyer', 'medium', 'active'),
       (p_school_id, 'LEAD-003', 'Mr. Khan', '9898989800', 'Sameer Khan', 'medium', 'active')
     ON CONFLICT DO NOTHING; -- No unique constraint effectively on content
  END IF;

END;
$$;

GRANT EXECUTE ON FUNCTION seed_school_data(uuid) TO authenticated, service_role;

-- Execute the seeder for all schools
DO $$
DECLARE
  r_school RECORD;
BEGIN
  FOR r_school IN SELECT id FROM schools LOOP
    RAISE NOTICE 'Seeding data for school %', r_school.id;
    PERFORM seed_school_data(r_school.id);
  END LOOP;
END;
$$;
