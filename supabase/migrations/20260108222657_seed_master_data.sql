/*
  # Seed Master Data
  
  ## Overview
  Populates master data required for platform operation:
  - System roles
  - Permissions
  - Boards
  - States
  - Subscription plans
  - Modules
  - Fee types
  
  ## Contents
  1. System roles (SUPERADMIN, ADMIN, EDUCATOR, LEARNER, PARENT)
  2. Educational boards (CBSE, ICSE, State boards)
  3. Indian states
  4. Subscription plans with pricing tiers
  5. Feature modules
  6. Common fee types
  7. Sample demo school for testing
*/

-- =====================================================
-- 1. SYSTEM ROLES
-- =====================================================

INSERT INTO roles (name, description) VALUES
  ('SUPERADMIN', 'Platform owner with full system access'),
  ('ADMIN', 'School administrator with full school access'),
  ('EDUCATOR', 'Teacher with teaching and marking capabilities'),
  ('LEARNER', 'Student with read access to own data'),
  ('PARENT', 'Parent/guardian with read access to childrens data')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. PERMISSIONS
-- =====================================================

INSERT INTO permissions (key, description, module) VALUES
  -- Platform management
  ('platform.schools.manage', 'Manage schools on platform', 'platform'),
  ('platform.subscriptions.manage', 'Manage subscriptions', 'platform'),
  ('platform.analytics.view', 'View platform analytics', 'platform'),
  ('platform.support.manage', 'Manage support tickets', 'platform'),
  
  -- School management
  ('school.students.manage', 'Manage student records', 'school'),
  ('school.educators.manage', 'Manage educator records', 'school'),
  ('school.classes.manage', 'Manage classes and sections', 'school'),
  ('school.timetable.manage', 'Manage timetables', 'school'),
  
  -- Attendance
  ('attendance.mark', 'Mark student attendance', 'attendance'),
  ('attendance.view', 'View attendance records', 'attendance'),
  ('attendance.reports', 'Generate attendance reports', 'attendance'),
  
  -- Academics
  ('academics.exams.manage', 'Manage exams', 'academics'),
  ('academics.marks.enter', 'Enter marks', 'academics'),
  ('academics.marks.view', 'View marks', 'academics'),
  ('academics.reports.generate', 'Generate report cards', 'academics'),
  ('academics.diary.write', 'Write daily diary', 'academics'),
  
  -- Fees
  ('fees.manage', 'Manage fee structures', 'fees'),
  ('fees.collect', 'Collect fee payments', 'fees'),
  ('fees.reports', 'Generate fee reports', 'fees'),
  ('fees.view', 'View fee details', 'fees'),
  
  -- Payroll
  ('payroll.manage', 'Manage staff payroll', 'payroll'),
  ('payroll.view', 'View payroll records', 'payroll')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 3. ROLE-PERMISSION MAPPINGS
-- =====================================================

-- SUPERADMIN gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'SUPERADMIN'
ON CONFLICT DO NOTHING;

-- ADMIN gets school management permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ADMIN' AND p.key LIKE 'school.%'
   OR r.name = 'ADMIN' AND p.key LIKE 'attendance.%'
   OR r.name = 'ADMIN' AND p.key LIKE 'academics.%'
   OR r.name = 'ADMIN' AND p.key LIKE 'fees.%'
   OR r.name = 'ADMIN' AND p.key LIKE 'payroll.%'
ON CONFLICT DO NOTHING;

-- EDUCATOR gets teaching permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'EDUCATOR' AND p.key IN (
  'attendance.mark', 'attendance.view',
  'academics.marks.enter', 'academics.marks.view',
  'academics.diary.write'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. EDUCATIONAL BOARDS
-- =====================================================

INSERT INTO boards (name, code, description) VALUES
  ('Central Board of Secondary Education', 'CBSE', 'National level board affiliated to central government'),
  ('Indian Certificate of Secondary Education', 'ICSE', 'National level board for Anglo-Indian education'),
  ('Council for the Indian School Certificate Examinations', 'CISCE', 'Private board conducting ICSE and ISC'),
  ('National Institute of Open Schooling', 'NIOS', 'Open schooling system'),
  ('International Baccalaureate', 'IB', 'International education program'),
  ('Cambridge International', 'CAMBRIDGE', 'British international examinations'),
  ('State Board', 'STATE', 'State government education board')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 5. INDIAN STATES
-- =====================================================

INSERT INTO states (name, code, country) VALUES
  ('Andhra Pradesh', 'AP', 'India'),
  ('Arunachal Pradesh', 'AR', 'India'),
  ('Assam', 'AS', 'India'),
  ('Bihar', 'BR', 'India'),
  ('Chhattisgarh', 'CG', 'India'),
  ('Goa', 'GA', 'India'),
  ('Gujarat', 'GJ', 'India'),
  ('Haryana', 'HR', 'India'),
  ('Himachal Pradesh', 'HP', 'India'),
  ('Jharkhand', 'JH', 'India'),
  ('Karnataka', 'KA', 'India'),
  ('Kerala', 'KL', 'India'),
  ('Madhya Pradesh', 'MP', 'India'),
  ('Maharashtra', 'MH', 'India'),
  ('Manipur', 'MN', 'India'),
  ('Meghalaya', 'ML', 'India'),
  ('Mizoram', 'MZ', 'India'),
  ('Nagaland', 'NL', 'India'),
  ('Odisha', 'OR', 'India'),
  ('Punjab', 'PB', 'India'),
  ('Rajasthan', 'RJ', 'India'),
  ('Sikkim', 'SK', 'India'),
  ('Tamil Nadu', 'TN', 'India'),
  ('Telangana', 'TS', 'India'),
  ('Tripura', 'TR', 'India'),
  ('Uttar Pradesh', 'UP', 'India'),
  ('Uttarakhand', 'UK', 'India'),
  ('West Bengal', 'WB', 'India'),
  ('Delhi', 'DL', 'India')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 6. SUBSCRIPTION PLANS
-- =====================================================

INSERT INTO plans (name, description, price, student_limit, educator_limit, features, is_active) VALUES
  (
    'Starter',
    'Perfect for small schools getting started',
    4999.00,
    100,
    10,
    '["Student Management", "Attendance", "Basic Reports", "Announcements"]'::jsonb,
    true
  ),
  (
    'Professional',
    'Comprehensive solution for growing schools',
    9999.00,
    300,
    30,
    '["All Starter Features", "Fee Management", "Exam Management", "Timetable", "Daily Diary", "Advanced Reports"]'::jsonb,
    true
  ),
  (
    'Enterprise',
    'Complete ERP for large institutions',
    19999.00,
    1000,
    100,
    '["All Professional Features", "Payroll Management", "Library Management", "Transport Management", "Hostel Management", "Priority Support", "Custom Integrations"]'::jsonb,
    true
  ),
  (
    'Ultimate',
    'Unlimited access for mega institutions',
    49999.00,
    10000,
    500,
    '["All Enterprise Features", "Multi-Campus Support", "Advanced Analytics", "API Access", "Dedicated Account Manager", "Custom Development"]'::jsonb,
    true
  )
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 7. FEATURE MODULES
-- =====================================================

INSERT INTO modules (name, key, description, icon, is_core) VALUES
  ('Student Management', 'students', 'Manage student records, admissions, and profiles', 'users', true),
  ('Attendance', 'attendance', 'Track daily student and staff attendance', 'calendar-check', true),
  ('Academics', 'academics', 'Manage exams, marks, and report cards', 'book-open', true),
  ('Timetable', 'timetable', 'Create and manage class schedules', 'calendar', false),
  ('Fee Management', 'fees', 'Handle fee collection and financial records', 'dollar-sign', false),
  ('Daily Diary', 'diary', 'Teacher daily logs and homework tracking', 'notebook', false),
  ('Announcements', 'announcements', 'School-wide communication system', 'megaphone', true),
  ('Reports', 'reports', 'Generate comprehensive reports and analytics', 'bar-chart', true),
  ('Payroll', 'payroll', 'Staff salary and payroll management', 'wallet', false),
  ('Library', 'library', 'Library book management and tracking', 'library', false),
  ('Transport', 'transport', 'School transport and route management', 'bus', false),
  ('Hostel', 'hostel', 'Hostel and accommodation management', 'home', false)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 8. FEE TYPES
-- =====================================================

INSERT INTO fee_types (name, code, description) VALUES
  ('Tuition Fee', 'TUITION', 'Regular tuition charges'),
  ('Admission Fee', 'ADMISSION', 'One-time admission fee'),
  ('Development Fee', 'DEVELOPMENT', 'Infrastructure development charges'),
  ('Exam Fee', 'EXAM', 'Examination charges'),
  ('Sports Fee', 'SPORTS', 'Sports and physical education fee'),
  ('Library Fee', 'LIBRARY', 'Library membership and book charges'),
  ('Lab Fee', 'LAB', 'Laboratory and practical charges'),
  ('Transport Fee', 'TRANSPORT', 'School bus transportation charges'),
  ('Hostel Fee', 'HOSTEL', 'Hostel accommodation charges'),
  ('Computer Fee', 'COMPUTER', 'Computer lab and IT infrastructure'),
  ('Activity Fee', 'ACTIVITY', 'Extra-curricular activities'),
  ('Uniform Fee', 'UNIFORM', 'School uniform charges'),
  ('Books Fee', 'BOOKS', 'Textbooks and study material'),
  ('Caution Deposit', 'DEPOSIT', 'Refundable security deposit'),
  ('Miscellaneous', 'MISC', 'Other miscellaneous charges')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 9. DEMO SCHOOL
-- =====================================================

-- Insert a demo school
INSERT INTO schools (
  name, 
  board_id, 
  state_id, 
  address, 
  city, 
  pincode,
  contact_person, 
  phone, 
  email, 
  status,
  onboarded_at
)
SELECT
  'Demo International School',
  (SELECT id FROM boards WHERE code = 'CBSE' LIMIT 1),
  (SELECT id FROM states WHERE code = 'DL' LIMIT 1),
  '123 Education Avenue, Sector 15',
  'New Delhi',
  '110001',
  'Principal Sharma',
  '+91-9876543210',
  'admin@demoschool.edu',
  'active',
  now()
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE email = 'admin@demoschool.edu');

-- Create subscription for demo school
INSERT INTO school_subscriptions (
  school_id,
  plan_id,
  start_date,
  end_date,
  status,
  payment_status,
  amount
)
SELECT
  s.id,
  p.id,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  'active',
  'paid',
  p.price
FROM schools s, plans p
WHERE s.email = 'admin@demoschool.edu' AND p.name = 'Professional'
  AND NOT EXISTS (
    SELECT 1 FROM school_subscriptions ss WHERE ss.school_id = s.id
  );

-- Enable modules for demo school
INSERT INTO school_modules (school_id, module_id, enabled)
SELECT s.id, m.id, true
FROM schools s, modules m
WHERE s.email = 'admin@demoschool.edu'
  AND m.key IN ('students', 'attendance', 'academics', 'timetable', 'fees', 'diary', 'announcements', 'reports')
ON CONFLICT (school_id, module_id) DO UPDATE SET enabled = true;

-- =====================================================
-- 10. DEMO SCHOOL DATA
-- =====================================================

-- Classes for demo school
INSERT INTO classes (school_id, grade, grade_order, description)
SELECT s.id, grade_name, grade_num, grade_desc
FROM schools s,
  (VALUES
    ('Pre-KG', 0, 'Pre-Kindergarten'),
    ('LKG', 1, 'Lower Kindergarten'),
    ('UKG', 2, 'Upper Kindergarten'),
    ('Class 1', 3, 'First Standard'),
    ('Class 2', 4, 'Second Standard'),
    ('Class 3', 5, 'Third Standard'),
    ('Class 4', 6, 'Fourth Standard'),
    ('Class 5', 7, 'Fifth Standard'),
    ('Class 6', 8, 'Sixth Standard'),
    ('Class 7', 9, 'Seventh Standard'),
    ('Class 8', 10, 'Eighth Standard'),
    ('Class 9', 11, 'Ninth Standard'),
    ('Class 10', 12, 'Tenth Standard'),
    ('Class 11', 13, 'Eleventh Standard'),
    ('Class 12', 14, 'Twelfth Standard')
  ) AS grades(grade_name, grade_num, grade_desc)
WHERE s.email = 'admin@demoschool.edu'
ON CONFLICT (school_id, grade) DO NOTHING;

-- Sections for each class
INSERT INTO sections (school_id, class_id, name, capacity)
SELECT c.school_id, c.id, section_name, 40
FROM classes c,
  (VALUES ('A'), ('B'), ('C')) AS sects(section_name)
WHERE c.school_id = (SELECT id FROM schools WHERE email = 'admin@demoschool.edu')
  AND c.grade NOT IN ('Pre-KG', 'LKG', 'UKG')
ON CONFLICT (class_id, name) DO NOTHING;

-- Single section for kindergarten
INSERT INTO sections (school_id, class_id, name, capacity)
SELECT c.school_id, c.id, 'A', 30
FROM classes c
WHERE c.school_id = (SELECT id FROM schools WHERE email = 'admin@demoschool.edu')
  AND c.grade IN ('Pre-KG', 'LKG', 'UKG')
ON CONFLICT (class_id, name) DO NOTHING;

-- Subjects for demo school
INSERT INTO subjects (school_id, name, code, description)
SELECT s.id, subj_name, subj_code, subj_desc
FROM schools s,
  (VALUES
    ('English', 'ENG', 'English Language and Literature'),
    ('Hindi', 'HIN', 'Hindi Language'),
    ('Mathematics', 'MATH', 'Mathematics'),
    ('Science', 'SCI', 'General Science'),
    ('Social Studies', 'SST', 'Social Science and History'),
    ('Physics', 'PHY', 'Physics'),
    ('Chemistry', 'CHEM', 'Chemistry'),
    ('Biology', 'BIO', 'Biology'),
    ('Computer Science', 'CS', 'Computer Science'),
    ('Physical Education', 'PE', 'Physical Education'),
    ('Art & Craft', 'ART', 'Art and Craft'),
    ('Music', 'MUS', 'Music')
  ) AS subjects(subj_name, subj_code, subj_desc)
WHERE s.email = 'admin@demoschool.edu'
ON CONFLICT (school_id, code) DO NOTHING;

-- Fee heads for demo school
INSERT INTO fee_heads (school_id, name, fee_type_id, description, is_mandatory, is_recurring)
SELECT 
  s.id,
  ft.name,
  ft.id,
  ft.description,
  CASE WHEN ft.code IN ('TUITION', 'EXAM') THEN true ELSE false END,
  CASE WHEN ft.code IN ('TUITION', 'TRANSPORT', 'HOSTEL') THEN true ELSE false END
FROM schools s, fee_types ft
WHERE s.email = 'admin@demoschool.edu'
  AND ft.code IN ('TUITION', 'ADMISSION', 'EXAM', 'SPORTS', 'LIBRARY', 'LAB', 'TRANSPORT', 'COMPUTER')
ON CONFLICT (school_id, name) DO NOTHING;

-- Fee structures for demo school
INSERT INTO fee_structures (school_id, class_id, fee_head_id, amount, academic_year)
SELECT 
  c.school_id,
  c.id,
  fh.id,
  CASE 
    WHEN c.grade_order <= 2 THEN 15000.00
    WHEN c.grade_order <= 5 THEN 20000.00
    WHEN c.grade_order <= 10 THEN 25000.00
    ELSE 35000.00
  END,
  '2024-25'
FROM classes c, fee_heads fh
WHERE c.school_id = (SELECT id FROM schools WHERE email = 'admin@demoschool.edu')
  AND fh.school_id = c.school_id
  AND fh.name = 'Tuition Fee'
ON CONFLICT (class_id, fee_head_id, academic_year) DO NOTHING;
