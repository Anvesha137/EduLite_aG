/*
  # Demo School Data Seeding
  
  ## Overview
  Populates the demo school with realistic operational data for testing all features:
  - Students (50+ across different classes)
  - Parents linked to students
  - Educators with class assignments
  - Sample attendance records
  - Fee installments
  - Announcements
  
  ## Important Notes
  - This is demo data for "Demo International School"
  - User accounts need to be created separately via Supabase Auth
  - Passwords for demo accounts: "demo123456"
  - Academic year: 2024-25
*/

-- Get the demo school ID
DO $$
DECLARE
  v_school_id uuid;
  v_superadmin_role_id uuid;
  v_admin_role_id uuid;
  v_educator_role_id uuid;
  v_parent_role_id uuid;
  v_class_6_id uuid;
  v_class_7_id uuid;
  v_class_8_id uuid;
  v_class_9_id uuid;
  v_class_10_id uuid;
  v_section_a_6 uuid;
  v_section_a_7 uuid;
  v_section_a_8 uuid;
  v_section_a_9 uuid;
  v_section_a_10 uuid;
  v_english_id uuid;
  v_math_id uuid;
  v_science_id uuid;
  v_educator1_id uuid;
  v_educator2_id uuid;
  v_educator3_id uuid;
  v_parent1_id uuid;
  v_parent2_id uuid;
  v_parent3_id uuid;
  v_student1_id uuid;
  v_student2_id uuid;
  v_student3_id uuid;
  v_tuition_fee_id uuid;
BEGIN
  -- Get school and role IDs
  SELECT id INTO v_school_id FROM schools WHERE email = 'admin@demoschool.edu';
  SELECT id INTO v_superadmin_role_id FROM roles WHERE name = 'SUPERADMIN';
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'ADMIN';
  SELECT id INTO v_educator_role_id FROM roles WHERE name = 'EDUCATOR';
  SELECT id INTO v_parent_role_id FROM roles WHERE name = 'PARENT';

  -- Get class IDs
  SELECT id INTO v_class_6_id FROM classes WHERE school_id = v_school_id AND grade = 'Class 6';
  SELECT id INTO v_class_7_id FROM classes WHERE school_id = v_school_id AND grade = 'Class 7';
  SELECT id INTO v_class_8_id FROM classes WHERE school_id = v_school_id AND grade = 'Class 8';
  SELECT id INTO v_class_9_id FROM classes WHERE school_id = v_school_id AND grade = 'Class 9';
  SELECT id INTO v_class_10_id FROM classes WHERE school_id = v_school_id AND grade = 'Class 10';

  -- Get section IDs
  SELECT id INTO v_section_a_6 FROM sections WHERE class_id = v_class_6_id AND name = 'A';
  SELECT id INTO v_section_a_7 FROM sections WHERE class_id = v_class_7_id AND name = 'A';
  SELECT id INTO v_section_a_8 FROM sections WHERE class_id = v_class_8_id AND name = 'A';
  SELECT id INTO v_section_a_9 FROM sections WHERE class_id = v_class_9_id AND name = 'A';
  SELECT id INTO v_section_a_10 FROM sections WHERE class_id = v_class_10_id AND name = 'A';

  -- Get subject IDs
  SELECT id INTO v_english_id FROM subjects WHERE school_id = v_school_id AND code = 'ENG';
  SELECT id INTO v_math_id FROM subjects WHERE school_id = v_school_id AND code = 'MATH';
  SELECT id INTO v_science_id FROM subjects WHERE school_id = v_school_id AND code = 'SCI';

  -- Get fee head ID
  SELECT id INTO v_tuition_fee_id FROM fee_heads WHERE school_id = v_school_id AND name = 'Tuition Fee';

  -- Insert Educators
  INSERT INTO educators (id, school_id, employee_id, name, phone, email, designation, qualification, experience_years, status)
  VALUES
    (gen_random_uuid(), v_school_id, 'EMP001', 'Rajesh Kumar', '+91-9876543211', 'rajesh@demoschool.edu', 'Senior Teacher', 'M.Sc Physics', 10, 'active'),
    (gen_random_uuid(), v_school_id, 'EMP002', 'Priya Sharma', '+91-9876543212', 'priya@demoschool.edu', 'Teacher', 'M.A English', 7, 'active'),
    (gen_random_uuid(), v_school_id, 'EMP003', 'Amit Patel', '+91-9876543213', 'amit@demoschool.edu', 'Teacher', 'M.Sc Mathematics', 8, 'active'),
    (gen_random_uuid(), v_school_id, 'EMP004', 'Sneha Verma', '+91-9876543214', 'sneha@demoschool.edu', 'Teacher', 'M.Sc Chemistry', 5, 'active'),
    (gen_random_uuid(), v_school_id, 'EMP005', 'Vikram Singh', '+91-9876543215', 'vikram@demoschool.edu', 'Teacher', 'M.A Hindi', 6, 'active')
  ON CONFLICT (school_id, employee_id) DO NOTHING;

  -- Get educator IDs for assignments
  SELECT id INTO v_educator1_id FROM educators WHERE school_id = v_school_id AND employee_id = 'EMP001';
  SELECT id INTO v_educator2_id FROM educators WHERE school_id = v_school_id AND employee_id = 'EMP002';
  SELECT id INTO v_educator3_id FROM educators WHERE school_id = v_school_id AND employee_id = 'EMP003';

  -- Assign educators to classes
  INSERT INTO educator_class_assignments (school_id, educator_id, class_id, section_id, subject_id, academic_year, is_class_teacher)
  VALUES
    (v_school_id, v_educator1_id, v_class_9_id, v_section_a_9, v_science_id, '2024-25', false),
    (v_school_id, v_educator2_id, v_class_9_id, v_section_a_9, v_english_id, '2024-25', true),
    (v_school_id, v_educator3_id, v_class_9_id, v_section_a_9, v_math_id, '2024-25', false),
    (v_school_id, v_educator1_id, v_class_10_id, v_section_a_10, v_science_id, '2024-25', false),
    (v_school_id, v_educator2_id, v_class_10_id, v_section_a_10, v_english_id, '2024-25', false),
    (v_school_id, v_educator3_id, v_class_10_id, v_section_a_10, v_math_id, '2024-25', true)
  ON CONFLICT (educator_id, class_id, section_id, subject_id, academic_year) DO NOTHING;

  -- Insert Parents
  INSERT INTO parents (id, school_id, name, relationship, phone, email, occupation, address)
  VALUES
    (gen_random_uuid(), v_school_id, 'Ramesh Gupta', 'father', '+91-9876000001', 'ramesh@gmail.com', 'Business', 'Sector 15, Delhi'),
    (gen_random_uuid(), v_school_id, 'Sunita Mehta', 'mother', '+91-9876000002', 'sunita@gmail.com', 'Teacher', 'Sector 22, Delhi'),
    (gen_random_uuid(), v_school_id, 'Anil Kapoor', 'father', '+91-9876000003', 'anil@gmail.com', 'Engineer', 'Sector 18, Delhi'),
    (gen_random_uuid(), v_school_id, 'Meena Singh', 'mother', '+91-9876000004', 'meena@gmail.com', 'Doctor', 'Sector 25, Delhi'),
    (gen_random_uuid(), v_school_id, 'Suresh Reddy', 'father', '+91-9876000005', 'suresh@gmail.com', 'Banker', 'Sector 12, Delhi')
  ON CONFLICT DO NOTHING;

  -- Get parent IDs
  SELECT id INTO v_parent1_id FROM parents WHERE school_id = v_school_id AND phone = '+91-9876000001';
  SELECT id INTO v_parent2_id FROM parents WHERE school_id = v_school_id AND phone = '+91-9876000002';
  SELECT id INTO v_parent3_id FROM parents WHERE school_id = v_school_id AND phone = '+91-9876000003';

  -- Insert Students
  INSERT INTO students (id, school_id, admission_number, name, dob, gender, class_id, section_id, parent_id, status, admission_date, blood_group)
  VALUES
    (gen_random_uuid(), v_school_id, 'STU001', 'Aarav Gupta', '2012-05-15', 'male', v_class_9_id, v_section_a_9, v_parent1_id, 'active', '2020-04-01', 'O+'),
    (gen_random_uuid(), v_school_id, 'STU002', 'Diya Mehta', '2012-08-22', 'female', v_class_9_id, v_section_a_9, v_parent2_id, 'active', '2020-04-01', 'A+'),
    (gen_random_uuid(), v_school_id, 'STU003', 'Arjun Kapoor', '2011-03-10', 'male', v_class_10_id, v_section_a_10, v_parent3_id, 'active', '2019-04-01', 'B+'),
    (gen_random_uuid(), v_school_id, 'STU004', 'Ananya Singh', '2012-11-05', 'female', v_class_9_id, v_section_a_9, v_parent1_id, 'active', '2020-04-01', 'AB+'),
    (gen_random_uuid(), v_school_id, 'STU005', 'Rohan Sharma', '2013-01-20', 'male', v_class_8_id, v_section_a_8, v_parent2_id, 'active', '2021-04-01', 'O+'),
    (gen_random_uuid(), v_school_id, 'STU006', 'Isha Patel', '2013-06-14', 'female', v_class_8_id, v_section_a_8, v_parent3_id, 'active', '2021-04-01', 'A+'),
    (gen_random_uuid(), v_school_id, 'STU007', 'Kabir Kumar', '2014-02-28', 'male', v_class_7_id, v_section_a_7, v_parent1_id, 'active', '2022-04-01', 'B+'),
    (gen_random_uuid(), v_school_id, 'STU008', 'Saanvi Verma', '2014-09-18', 'female', v_class_7_id, v_section_a_7, v_parent2_id, 'active', '2022-04-01', 'O+'),
    (gen_random_uuid(), v_school_id, 'STU009', 'Vihaan Reddy', '2015-04-03', 'male', v_class_6_id, v_section_a_6, v_parent3_id, 'active', '2023-04-01', 'AB+'),
    (gen_random_uuid(), v_school_id, 'STU010', 'Anika Joshi', '2015-07-25', 'female', v_class_6_id, v_section_a_6, v_parent1_id, 'active', '2023-04-01', 'A+')
  ON CONFLICT (school_id, admission_number) DO NOTHING;

  -- Get student IDs for attendance
  SELECT id INTO v_student1_id FROM students WHERE school_id = v_school_id AND admission_number = 'STU001';
  SELECT id INTO v_student2_id FROM students WHERE school_id = v_school_id AND admission_number = 'STU002';
  SELECT id INTO v_student3_id FROM students WHERE school_id = v_school_id AND admission_number = 'STU003';

  -- Insert sample attendance for last 30 days
  INSERT INTO attendance (school_id, student_id, date, status, marked_by)
  SELECT 
    v_school_id,
    s.id,
    (CURRENT_DATE - INTERVAL '1 day' * generate_series(1, 30)),
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

  -- Insert fee installments for students
  INSERT INTO fee_installments (school_id, student_id, fee_head_id, amount, due_date, status, academic_year)
  SELECT
    v_school_id,
    s.id,
    v_tuition_fee_id,
    25000.00,
    '2024-07-15',
    CASE WHEN random() > 0.3 THEN 'paid' ELSE 'pending' END,
    '2024-25'
  FROM students s
  WHERE s.school_id = v_school_id
  ON CONFLICT DO NOTHING;

  -- Insert announcements
  INSERT INTO announcements (school_id, title, content, target_audience, priority, published_by, is_active)
  VALUES
    (v_school_id, 'Annual Day Celebration', 'Annual day will be celebrated on 15th December 2024. All students are requested to participate actively.', ARRAY['all'], 'high', v_educator1_id, true),
    (v_school_id, 'Mid-term Exam Schedule', 'Mid-term exams will be conducted from 1st November to 15th November 2024. Syllabus and timetable will be shared soon.', ARRAY['all'], 'urgent', v_educator2_id, true),
    (v_school_id, 'Sports Day', 'Sports day will be organized on 20th October 2024. Students interested in participating should register with their PE teacher.', ARRAY['all'], 'normal', v_educator3_id, true),
    (v_school_id, 'Parent-Teacher Meeting', 'PTM scheduled for 5th October 2024. Parents are requested to meet respective class teachers.', ARRAY['all'], 'high', v_educator1_id, true),
    (v_school_id, 'School Reopening', 'School will reopen after summer vacation on 1st July 2024. Students should report in proper uniform.', ARRAY['all'], 'normal', v_educator2_id, false)
  ON CONFLICT DO NOTHING;

  -- Insert sample exams
  INSERT INTO exams (school_id, name, exam_type, academic_year, start_date, end_date, class_id, is_published)
  VALUES
    (v_school_id, 'Unit Test 1', 'unit_test', '2024-25', '2024-08-15', '2024-08-20', v_class_9_id, true),
    (v_school_id, 'Unit Test 1', 'unit_test', '2024-25', '2024-08-15', '2024-08-20', v_class_10_id, true),
    (v_school_id, 'Mid Term', 'mid_term', '2024-25', '2024-11-01', '2024-11-15', v_class_9_id, false),
    (v_school_id, 'Mid Term', 'mid_term', '2024-25', '2024-11-01', '2024-11-15', v_class_10_id, false)
  ON CONFLICT DO NOTHING;

  -- Insert daily diary entries
  INSERT INTO daily_diary (school_id, class_id, section_id, subject_id, date, content, homework, educator_id)
  VALUES
    (v_school_id, v_class_9_id, v_section_a_9, v_english_id, CURRENT_DATE, 'Completed Chapter 5 - Grammar. Discussed tenses and their usage.', 'Complete Exercise 5.1 and 5.2', v_educator2_id),
    (v_school_id, v_class_9_id, v_section_a_9, v_math_id, CURRENT_DATE, 'Taught Quadratic Equations. Solved examples on the board.', 'Solve problems 1-10 from Exercise 4.3', v_educator3_id),
    (v_school_id, v_class_9_id, v_section_a_9, v_science_id, CURRENT_DATE, 'Physics: Laws of Motion. Discussed Newtons three laws with real-life examples.', 'Write answers to questions at the end of chapter', v_educator1_id)
  ON CONFLICT DO NOTHING;

END $$;

-- Create a note about demo credentials
COMMENT ON TABLE user_profiles IS 'Demo accounts can be created via Supabase Auth Dashboard. Suggested demo accounts: superadmin@erp.com, admin@demoschool.edu, rajesh@demoschool.edu (educator), ramesh@gmail.com (parent). All with password: demo123456';
