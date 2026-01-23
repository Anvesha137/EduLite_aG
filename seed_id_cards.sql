-- SEED DATA FOR ID CARD MODULE
-- Run this in your Supabase SQL Editor

-- 1. Insert Classes
INSERT INTO classes (id, school_id, grade, grade_order) VALUES
('c0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', '9', 9),
('c0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000001', '10', 10),
('c0000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000001', '11', 11),
('c0000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000001', '12', 12)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Sections
INSERT INTO sections (id, class_id, school_id, name) VALUES
('sec00000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'A'),
('sec00000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'B'),
('sec00000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000001', 'A'),
('sec00000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000001', 'Science'),
('sec00000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000001', 'Commerce')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Students
INSERT INTO students (id, school_id, name, admission_number, class_id, section_id, status, photo_url) VALUES
('st000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'Rahul Sharma', 'A-101', 'c0000000-0000-0000-0000-000000000002', 'sec00000-0000-0000-0000-000000000003', 'active', 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=300&auto=format&fit=crop'),
('st000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000001', 'Priya Patel', 'A-102', 'c0000000-0000-0000-0000-000000000002', 'sec00000-0000-0000-0000-000000000003', 'active', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop'),
('st000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000001', 'Amit Kumar', 'A-103', 'c0000000-0000-0000-0000-000000000001', 'sec00000-0000-0000-0000-000000000001', 'active', NULL),
('st000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000001', 'Sneha Gupta', 'A-104', 'c0000000-0000-0000-0000-000000000003', 'sec00000-0000-0000-0000-000000000004', 'active', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop')
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Educators
INSERT INTO educators (id, school_id, name, employee_id, designation, status, photo_url) VALUES
('ed000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'Mr. John Doe', 'EMP-001', 'Math Teacher', 'active', 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=300&auto=format&fit=crop'),
('ed000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000001', 'Ms. Jane Smith', 'EMP-002', 'Science Teacher', 'active', 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=300&auto=format&fit=crop'),
('ed000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000001', 'Dr. Robert Wilson', 'EMP-003', 'Principal', 'active', NULL)
ON CONFLICT (id) DO NOTHING;

-- 5. Insert ID Card Settings
INSERT INTO id_card_settings (school_id, school_display_name, school_address, principal_name, current_academic_year) VALUES
('s0000000-0000-0000-0000-000000000001', 'EduLite International School', '123 Knowledge Park, Tech City', 'Dr. Robert Wilson', '2025-26')
ON CONFLICT (school_id) DO UPDATE 
SET 
  school_display_name = EXCLUDED.school_display_name,
  school_address = EXCLUDED.school_address,
  principal_name = EXCLUDED.principal_name,
  current_academic_year = EXCLUDED.current_academic_year;
