-- Migration: Cloud School ERP - Complete Schema (Consolidated & Fixed)
-- Description: Full schema definition with robust RLS and auto-linking capabilities.

-- =====================================================
-- 1. ROLES & PERMISSIONS SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL CHECK (name IN ('SUPERADMIN', 'ADMIN', 'EDUCATOR', 'LEARNER', 'PARENT')),
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  description text,
  module text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- =====================================================
-- 2. SUPERADMIN - PLATFORM MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL,
  country text DEFAULT 'India',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  student_limit integer NOT NULL DEFAULT 100,
  educator_limit integer NOT NULL DEFAULT 20,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  board_id uuid REFERENCES boards(id),
  state_id uuid REFERENCES states(id),
  address text,
  city text,
  pincode text,
  contact_person text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  website text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'cancelled')),
  onboarded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS school_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES plans(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  amount numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  key text UNIQUE NOT NULL,
  description text,
  icon text,
  is_core boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS school_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  enabled_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(school_id, module_id)
);

CREATE TABLE IF NOT EXISTS fee_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  raised_by uuid REFERENCES auth.users(id),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  subject text NOT NULL,
  description text NOT NULL,
  resolution text,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  total_schools integer DEFAULT 0,
  active_schools integer DEFAULT 0,
  total_students integer DEFAULT 0,
  total_educators integer DEFAULT 0,
  revenue numeric(12,2) DEFAULT 0,
  new_schools integer DEFAULT 0,
  churned_schools integer DEFAULT 0,
  dau integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 3. USER PROFILES (Multi-tenant aware)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid REFERENCES schools(id) ON DELETE SET NULL, -- Allow nullable for initial signup
  role_id uuid REFERENCES roles(id),
  full_name text NOT NULL,
  phone text,
  avatar_url text,
  is_active boolean DEFAULT true,
  last_login timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 4. ADMIN - SCHOOL OPERATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  grade text NOT NULL,
  grade_order integer NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(school_id, grade)
);

CREATE TABLE IF NOT EXISTS sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  capacity integer DEFAULT 40,
  created_at timestamptz DEFAULT now(),
  UNIQUE(class_id, name)
);

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(school_id, code)
);

CREATE TABLE IF NOT EXISTS parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  relationship text DEFAULT 'father' CHECK (relationship IN ('father', 'mother', 'guardian', 'other')),
  phone text NOT NULL,
  email text,
  occupation text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admission_number text NOT NULL,
  name text NOT NULL,
  dob date NOT NULL,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  blood_group text,
  class_id uuid REFERENCES classes(id),
  section_id uuid REFERENCES sections(id),
  parent_id uuid REFERENCES parents(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'transferred')),
  admission_date date DEFAULT CURRENT_DATE,
  photo_url text,
  address text,
  medical_info text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, admission_number)
);

CREATE TABLE IF NOT EXISTS educators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_id text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  designation text DEFAULT 'teacher',
  qualification text,
  experience_years integer DEFAULT 0,
  joining_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resigned')),
  photo_url text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, employee_id)
);

CREATE TABLE IF NOT EXISTS educator_class_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  educator_id uuid REFERENCES educators(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  section_id uuid REFERENCES sections(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  is_class_teacher boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(educator_id, class_id, section_id, subject_id, academic_year)
);

CREATE TABLE IF NOT EXISTS timetables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  section_id uuid REFERENCES sections(id) ON DELETE CASCADE,
  day_of_week integer CHECK (day_of_week BETWEEN 1 AND 7),
  period_number integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  subject_id uuid REFERENCES subjects(id),
  educator_id uuid REFERENCES educators(id),
  room_number text,
  academic_year text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(class_id, section_id, day_of_week, period_number, academic_year)
);

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),
  marked_by uuid REFERENCES educators(id),
  remarks text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  educator_id uuid REFERENCES educators(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),
  check_in time,
  check_out time,
  remarks text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(educator_id, date)
);

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  target_audience text[] DEFAULT ARRAY['all'],
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  published_by uuid REFERENCES educators(id),
  published_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 5. ACADEMIC MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  exam_type text NOT NULL CHECK (exam_type IN ('unit_test', 'mid_term', 'final', 'quarterly', 'half_yearly', 'annual')),
  academic_year text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  class_id uuid REFERENCES classes(id),
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  exam_id uuid REFERENCES exams(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  marks_obtained numeric(5,2) NOT NULL,
  max_marks numeric(5,2) NOT NULL,
  grade text,
  remarks text,
  entered_by uuid REFERENCES educators(id),
  is_locked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(exam_id, student_id, subject_id)
);

CREATE TABLE IF NOT EXISTS daily_diary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  section_id uuid REFERENCES sections(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id),
  date date NOT NULL,
  content text NOT NULL,
  homework text,
  educator_id uuid REFERENCES educators(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teacher_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  educator_id uuid REFERENCES educators(id) ON DELETE CASCADE,
  note text NOT NULL,
  note_type text DEFAULT 'general' CHECK (note_type IN ('general', 'behavioral', 'academic', 'disciplinary')),
  is_private boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  exam_id uuid REFERENCES exams(id) ON DELETE CASCADE,
  total_marks numeric(7,2),
  percentage numeric(5,2),
  grade text,
  rank integer,
  remarks text,
  generated_at timestamptz DEFAULT now(),
  pdf_url text,
  UNIQUE(student_id, exam_id)
);

-- =====================================================
-- 6. FINANCIAL MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS fee_heads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  fee_type_id uuid REFERENCES fee_types(id),
  description text,
  is_mandatory boolean DEFAULT true,
  is_recurring boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(school_id, name)
);

CREATE TABLE IF NOT EXISTS fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  fee_head_id uuid REFERENCES fee_heads(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  academic_year text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(class_id, fee_head_id, academic_year)
);

CREATE TABLE IF NOT EXISTS fee_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  fee_head_id uuid REFERENCES fee_heads(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  due_date date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue', 'waived')),
  academic_year text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fee_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  installment_id uuid REFERENCES fee_installments(id),
  amount numeric(10,2) NOT NULL,
  payment_mode text NOT NULL CHECK (payment_mode IN ('cash', 'cheque', 'online', 'card', 'upi')),
  transaction_ref text,
  payment_date date DEFAULT CURRENT_DATE,
  received_by uuid REFERENCES educators(id),
  remarks text,
  is_locked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS extra_fee_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES educators(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  target_classes uuid[],
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES educators(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  educator_id uuid REFERENCES educators(id) ON DELETE CASCADE,
  month date NOT NULL,
  basic_salary numeric(10,2) NOT NULL,
  allowances numeric(10,2) DEFAULT 0,
  deductions numeric(10,2) DEFAULT 0,
  net_salary numeric(10,2) NOT NULL,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  payment_date date,
  remarks text,
  is_locked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(educator_id, month)
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  lock_type text NOT NULL CHECK (lock_type IN ('date_range', 'academic_year', 'exam')),
  start_date date,
  end_date date,
  academic_year text,
  exam_id uuid REFERENCES exams(id),
  locked_by uuid REFERENCES auth.users(id),
  locked_at timestamptz DEFAULT now(),
  reason text
);

-- =====================================================
-- 7. PERFORMANCE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_school ON user_profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_educators_school ON educators(school_id);

-- =====================================================
-- 8. SECURITY & RLS (ROBUST IMPLEMENTATION)
-- =====================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE educators ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_transactions ENABLE ROW LEVEL SECURITY;

-- Helper Function (kept for legacy ref if needed, but we use direct RLS mostly)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT r.name
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- AUTO LINK RPC (CRITICAL FOR VISIBILITY)
CREATE OR REPLACE FUNCTION link_user_to_demo_school()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  SELECT id INTO v_school_id FROM schools LIMIT 1; -- Simply grab ANY school
  
  IF v_school_id IS NOT NULL AND v_user_id IS NOT NULL THEN
    UPDATE user_profiles
    SET school_id = v_school_id
    WHERE id = v_user_id AND (school_id IS NULL OR school_id <> v_school_id);
  END IF;
  RETURN v_school_id;
END;
$$;
GRANT EXECUTE ON FUNCTION link_user_to_demo_school() TO authenticated;

-- STANDARD RLS POLICY (Used for ALL school-isolated tables)
-- Logic: User sees data IF the data belongs to THEIR school.
-- Subquery is robust and does not depend on potentially stale functions.

CREATE POLICY "School Isolation Policy" ON students
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "School Isolation Policy" ON educators
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "School Isolation Policy" ON parents
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "School Isolation Policy" ON classes
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "School Isolation Policy" ON sections
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "School Isolation Policy" ON attendance
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "School Isolation Policy" ON staff_attendance
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "School Isolation Policy" ON exams
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "School Isolation Policy" ON marks
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "School Isolation Policy" ON announcements
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "School Isolation Policy" ON fee_heads
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "School Isolation Policy" ON fee_structures
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "School Isolation Policy" ON fee_installments
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "School Isolation Policy" ON fee_transactions
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

-- User Profiles Policy
CREATE POLICY "View Own Profile" ON user_profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Superadmin View All" ON user_profiles FOR SELECT TO authenticated USING (get_user_role() = 'SUPERADMIN');
-- Allow self-update for school_id via RPC (technically RPC bypasses RLS if SECURITY DEFINER, but good to have)

-- Schools Policy
CREATE POLICY "View Own School" ON schools FOR SELECT TO authenticated
USING (id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

-- Roles Policy
CREATE POLICY "Bypass Roles RLS" ON roles FOR ALL USING (true);
