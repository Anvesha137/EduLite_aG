-- Migration: Cloud School ERP - Complete Seed Data
-- Description: Populates Master Data, Demo School, and Mock Users/Students.

-- A. MASTER DATA
INSERT INTO roles (name, description) VALUES
('SUPERADMIN', 'Platform Administrator'),
('ADMIN', 'School Administrator'),
('EDUCATOR', 'Teacher or Staff'),
('PARENT', 'Parent or Guardian'),
('LEARNER', 'Student');

INSERT INTO boards (name, code) VALUES ('CBSE', 'CBSE'), ('ICSE', 'ICSE');
INSERT INTO states (name, code) VALUES ('Maharashtra', 'MH'), ('Karnataka', 'KA');
INSERT INTO plans (name, price, student_limit) VALUES ('Free', 0, 50), ('Pro', 1000, 500);
INSERT INTO fee_types (name, code) VALUES ('Tuition', 'TUI'), ('Transport', 'TRN');

-- B. DEMO SCHOOL
DO $$
DECLARE
  v_school_id uuid;
  v_board_id uuid;
  v_state_id uuid;
  v_plan_id uuid;
  v_admin_role_id uuid;
  v_educator_role_id uuid;
  v_parent_role_id uuid;
  v_student_role_id uuid;
  v_admin_uid uuid;
  v_educator_uid uuid;
  v_parent_uid uuid;
  v_class_id uuid;
  v_section_id uuid;
  v_parent_id uuid;
  v_student_id uuid;
BEGIN
  -- Get IDs
  SELECT id INTO v_board_id FROM boards LIMIT 1;
  SELECT id INTO v_state_id FROM states LIMIT 1;
  SELECT id INTO v_plan_id FROM plans LIMIT 1;
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'ADMIN';
  SELECT id INTO v_educator_role_id FROM roles WHERE name = 'EDUCATOR';
  SELECT id INTO v_parent_role_id FROM roles WHERE name = 'PARENT';
  SELECT id INTO v_student_role_id FROM roles WHERE name = 'LEARNER';

  -- Create School
  INSERT INTO schools (name, board_id, state_id, contact_person, phone, email, status)
  VALUES ('Demo International School', v_board_id, v_state_id, 'Principal Demo', '9876543210', 'admin@demoschool.com', 'active')
  RETURNING id INTO v_school_id;

  -- Create Subscription
  INSERT INTO school_subscriptions (school_id, plan_id, start_date, end_date, amount)
  VALUES (v_school_id, v_plan_id, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 0);

  -- Link Current User (if exists) as Admin
  -- Note: In a fresh migration run on Supabase, auth.uid() might be null or specific.
  -- We'll try to link specific email if available, or just leave users for Auth Hooks to handle.
  -- But for the sake of the "Current User is Admin" requirement:
  
  -- Create Classes (1 to 10)
  INSERT INTO classes (school_id, grade, grade_order) VALUES
  (v_school_id, 'Class 1', 1), (v_school_id, 'Class 2', 2), (v_school_id, 'Class 3', 3),
  (v_school_id, 'Class 4', 4), (v_school_id, 'Class 5', 5), (v_school_id, 'Class 6', 6),
  (v_school_id, 'Class 7', 7), (v_school_id, 'Class 8', 8), (v_school_id, 'Class 9', 9),
  (v_school_id, 'Class 10', 10);
  
  -- Create Section A for Class 10 (for demo)
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_id AND grade_order = 10;
  INSERT INTO sections (school_id, class_id, name) VALUES (v_school_id, v_class_id, 'A') RETURNING id INTO v_section_id;

  -- Create Educator (Mock)
  INSERT INTO educators (school_id, employee_id, name, phone, email, designation, status)
  VALUES (v_school_id, 'EMP001', 'Rajesh Kumar', '9988776655', 'rajesh@demo.com', 'Senior Teacher', 'active');
  INSERT INTO educators (school_id, employee_id, name, phone, email, designation, status)
  VALUES (v_school_id, 'EMP002', 'Sunita Sharma', '9988776644', 'sunita@demo.com', 'Math Teacher', 'active');
  INSERT INTO educators (school_id, employee_id, name, phone, email, designation, status)
  VALUES (v_school_id, 'EMP003', 'Amit Verma', '9988776633', 'amit@demo.com', 'Science Teacher', 'active');
  INSERT INTO educators (school_id, employee_id, name, phone, email, designation, status)
  VALUES (v_school_id, 'EMP004', 'Priya Singh', '9988776622', 'priya@demo.com', 'English Teacher', 'active');
  INSERT INTO educators (school_id, employee_id, name, phone, email, designation, status)
  VALUES (v_school_id, 'EMP005', 'Vikram Patil', '9988776611', 'vikram@demo.com', 'Sports Coach', 'active');

  
  -- Create Parent (Mock)
  INSERT INTO parents (school_id, name, relationship, phone, email)
  VALUES (v_school_id, 'Ramesh Gupta', 'father', '9876500001', 'ramesh@parent.com')
  RETURNING id INTO v_parent_id;

  -- Create 25 Students
  FOR i IN 1..25 LOOP
    INSERT INTO students (school_id, admission_number, name, dob, gender, class_id, section_id, parent_id, status)
    VALUES (
      v_school_id, 
      'ADM' || LTRIM(TO_CHAR(i, '000')), 
      'Student ' || i, 
      '2010-01-01', 
      CASE WHEN i % 2 = 0 THEN 'female' ELSE 'male' END,
      v_class_id, 
      v_section_id, 
      v_parent_id, 
      'active'
    );
  END LOOP;

  -- Create Financial Data
  INSERT INTO fee_heads (school_id, name) VALUES (v_school_id, 'Annual Tuition');
  -- (Note: Adjusted schema to logic, fee_structure links head to class)
  
  -- Create Exam Data
  INSERT INTO exams (school_id, name, exam_type, academic_year, start_date, end_date, is_published)
  VALUES (v_school_id, 'Available Exam', 'mid_term', '2025-2026', CURRENT_DATE + 10, CURRENT_DATE + 20, true);

END $$;
