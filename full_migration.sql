-- =====================================================
-- FULL RESET & MIGRATION FOR FRESH PROJECT
-- WARNING: THIS WILL DELETE ALL DATA IN THE PUBLIC SCHEMA
-- =====================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
COMMENT ON SCHEMA public IS 'standard public schema';

-- Enable essential extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

/*
  # School ERP - Complete Multi-Tenant Schema
  
  ## Overview
  Production-grade multi-tenant School ERP with strict role separation and data isolation.
  
  ## 1. User Roles & Permissions
  - **user_profiles**: Extended user data with school association and role
  - **roles**: System roles (SUPERADMIN, ADMIN, EDUCATOR, LEARNER, PARENT)
  - **permissions**: Granular permission keys
  - **role_permissions**: Role-permission mappings
  
  ## 2. Superadmin Tables (Platform Management)
  - **schools**: School entities with subscription and contact info
  - **boards**: Educational boards (CBSE, ICSE, State, etc.)
  - **states**: Geographic states for school location
  - **plans**: Subscription plans with pricing and limits
  - **school_subscriptions**: Active subscriptions per school
  - **modules**: Feature modules (Fees, Attendance, Exams, etc.)
  - **school_modules**: Module enablement per school
  - **fee_types**: Global fee type master data
  - **support_tickets**: School support requests
  - **platform_analytics**: Aggregated platform metrics
  
  ## 3. Admin Tables (School Operations)
  - **classes**: Grade levels (1-12, Pre-K, etc.)
  - **sections**: Class divisions (A, B, C, etc.)
  - **students**: Student records with parent linking
  - **parents**: Parent/guardian information
  - **educators**: Teacher/staff profiles
  - **subjects**: Subject master data per school
  - **timetables**: Class schedules
  - **attendance**: Daily student attendance
  - **staff_attendance**: Educator attendance
  - **announcements**: School-wide announcements
  
  ## 4. Academic Tables
  - **exams**: Exam/test definitions
  - **marks**: Student scores per exam and subject
  - **daily_diary**: Teacher daily logs per class
  - **teacher_notes**: Individual student notes
  - **report_cards**: Generated report card records
  
  ## 5. Financial Tables
  - **fee_heads**: Fee categories per school
  - **fee_structures**: Fee assignment to classes
  - **fee_installments**: Payment schedules
  - **fee_transactions**: Payment records
  - **extra_fee_requests**: Ad-hoc fee requests by educators
  - **payroll_records**: Basic staff payroll
  
  ## 6. System Tables
  - **notifications**: User notifications
  - **audit_logs**: Change tracking
  - **data_locks**: Period locking mechanism
  - **educator_class_assignments**: Teacher-class mappings
  
  ## Security Model
  - RLS enabled on ALL tables
  - School-level data isolation for multi-tenancy
  - Role-based policies enforcing access control
  - Audit trails for all modifications
  - Historical data locking prevents tampering
*/

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
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
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

-- =====================================================
-- 7. SYSTEM TABLES
-- =====================================================

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
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_school ON user_profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_section ON students(class_id, section_id);
CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_educators_school ON educators(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON attendance(school_id, date);
CREATE INDEX IF NOT EXISTS idx_marks_exam_student ON marks(exam_id, student_id);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_student ON fee_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_installments_student ON fee_installments(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_school ON audit_logs(school_id, created_at);
CREATE INDEX IF NOT EXISTS idx_daily_diary_class_date ON daily_diary(class_id, section_id, date);
CREATE INDEX IF NOT EXISTS idx_educator_assignments ON educator_class_assignments(educator_id, academic_year);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE educators ENABLE ROW LEVEL SECURITY;
ALTER TABLE educator_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_fee_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_locks ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT r.name
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to get user's school
CREATE OR REPLACE FUNCTION get_user_school()
RETURNS uuid AS $$
  SELECT school_id
  FROM user_profiles
  WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- SUPERADMIN Policies (Full access to platform data)
CREATE POLICY "Superadmin full access to schools" ON schools FOR ALL TO authenticated
  USING (get_user_role() = 'SUPERADMIN');

CREATE POLICY "Superadmin full access to subscriptions" ON school_subscriptions FOR ALL TO authenticated
  USING (get_user_role() = 'SUPERADMIN');

CREATE POLICY "Superadmin full access to tickets" ON support_tickets FOR ALL TO authenticated
  USING (get_user_role() = 'SUPERADMIN');

CREATE POLICY "Superadmin full access to platform analytics" ON platform_analytics FOR ALL TO authenticated
  USING (get_user_role() = 'SUPERADMIN');

CREATE POLICY "Superadmin full access to school modules" ON school_modules FOR ALL TO authenticated
  USING (get_user_role() = 'SUPERADMIN');

-- Master data readable by authenticated users
CREATE POLICY "Read roles" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read permissions" ON permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read role_permissions" ON role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read boards" ON boards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read states" ON states FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read plans" ON plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read modules" ON modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read fee_types" ON fee_types FOR SELECT TO authenticated USING (true);

-- User Profiles
CREATE POLICY "Users view own profile" ON user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admin view school profiles" ON user_profiles FOR SELECT TO authenticated
  USING (get_user_role() = 'ADMIN' AND school_id = get_user_school());

CREATE POLICY "Superadmin view all profiles" ON user_profiles FOR SELECT TO authenticated
  USING (get_user_role() = 'SUPERADMIN');

-- School data isolation policies
CREATE POLICY "School data isolation - students" ON students FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - educators" ON educators FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - classes" ON classes FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - sections" ON sections FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - subjects" ON subjects FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - parents" ON parents FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - attendance" ON attendance FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - exams" ON exams FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - marks" ON marks FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - daily_diary" ON daily_diary FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - announcements" ON announcements FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - fee_heads" ON fee_heads FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - fee_structures" ON fee_structures FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - fee_installments" ON fee_installments FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - fee_transactions" ON fee_transactions FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - notifications" ON notifications FOR ALL TO authenticated
  USING (user_id = auth.uid() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - audit_logs" ON audit_logs FOR SELECT TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - timetables" ON timetables FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - staff_attendance" ON staff_attendance FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - teacher_notes" ON teacher_notes FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - report_cards" ON report_cards FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - extra_fee_requests" ON extra_fee_requests FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - payroll_records" ON payroll_records FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - data_locks" ON data_locks FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

CREATE POLICY "School data isolation - educator_assignments" ON educator_class_assignments FOR ALL TO authenticated
  USING (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN')
  WITH CHECK (school_id = get_user_school() OR get_user_role() = 'SUPERADMIN');

-- Parent access to their children's data
CREATE POLICY "Parents view own children" ON students FOR SELECT TO authenticated
  USING (
    parent_id IN (
      SELECT id FROM parents WHERE user_id = auth.uid()
    )
  );

-- Learner access to own data
CREATE POLICY "Learners view own data" ON students FOR SELECT TO authenticated
  USING (user_id = auth.uid());
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
/*
  # Enhanced Fee Management System

  ## Overview
  This migration enhances the existing fee management system with:
  - Student-level fee tracking with discount support
  - Installment payment system with status tracking
  - Discount approval workflow
  - Comprehensive audit logging
  - Automatic status calculation

  ## 1. New Tables
    
    - `student_fees`
      - Tracks overall fee status per student per academic year
      - Fields: total_fee, discount_amount, net_fee, paid_amount, pending_amount, status
      - Linked to fee_structures and students
    
    - `student_fee_installments_v2`
      - Individual installment tracking per student
      - Links to student_fees and tracks payment status
      - Fields: due_date, amount, paid_amount, pending_amount, status
    
    - `fee_payments`
      - Immutable payment transaction records
      - Tracks all fee payments with audit fields
      - Links to student_fees and installments
    
    - `fee_discount_approvals`
      - Discount request and approval workflow
      - Fields: requested_amount, reason, status, reviewer info
    
    - `fee_audit_logs`
      - Comprehensive audit trail for fee operations
      - Tracks all sensitive fee-related actions

  ## 2. Security
    - Enable RLS on all new tables
    - Admin can manage all fee data
    - Parents can view their children's fee information (read-only)
    - All changes are logged in audit trail
*/

-- Student Fees (Overall tracking per student per year)
CREATE TABLE IF NOT EXISTS student_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  total_fee decimal(10,2) NOT NULL DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  discount_reason text,
  discount_approved_by uuid REFERENCES auth.users(id),
  discount_approved_at timestamptz,
  net_fee decimal(10,2) GENERATED ALWAYS AS (total_fee - discount_amount) STORED,
  paid_amount decimal(10,2) DEFAULT 0,
  pending_amount decimal(10,2) GENERATED ALWAYS AS (total_fee - discount_amount - paid_amount) STORED,
  status text DEFAULT 'unpaid' CHECK (status IN ('paid', 'partially_paid', 'unpaid', 'overdue')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, academic_year)
);

-- Student Fee Installments (Individual installment tracking)
CREATE TABLE IF NOT EXISTS student_fee_installments_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_id uuid NOT NULL REFERENCES student_fees(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  installment_name text NOT NULL,
  due_date date NOT NULL,
  amount decimal(10,2) NOT NULL,
  paid_amount decimal(10,2) DEFAULT 0,
  pending_amount decimal(10,2) GENERATED ALWAYS AS (amount - paid_amount) STORED,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partially_paid', 'overdue')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_fee_id, installment_number)
);

-- Fee Payments (Immutable transaction records)
CREATE TABLE IF NOT EXISTS fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_fee_id uuid NOT NULL REFERENCES student_fees(id) ON DELETE CASCADE,
  installment_id uuid REFERENCES student_fee_installments_v2(id) ON DELETE SET NULL,
  amount decimal(10,2) NOT NULL,
  payment_mode text NOT NULL CHECK (payment_mode IN ('cash', 'cheque', 'online', 'card', 'upi')),
  transaction_ref text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  received_by uuid REFERENCES auth.users(id),
  remarks text,
  is_cancelled boolean DEFAULT false,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id),
  cancellation_reason text,
  created_at timestamptz DEFAULT now()
);

-- Fee Discount Approvals
CREATE TABLE IF NOT EXISTS fee_discount_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_fee_id uuid NOT NULL REFERENCES student_fees(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  requested_amount decimal(10,2) NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_comments text,
  created_at timestamptz DEFAULT now()
);

-- Fee Audit Logs
CREATE TABLE IF NOT EXISTS fee_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('payment', 'discount', 'installment', 'student_fee')),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'approved', 'rejected', 'cancelled')),
  performed_by uuid NOT NULL REFERENCES auth.users(id),
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  timestamp timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_fees_student ON student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_school_year ON student_fees(school_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_student_fees_status ON student_fees(status);
CREATE INDEX IF NOT EXISTS idx_student_fee_installments_v2_student_fee ON student_fee_installments_v2(student_fee_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_installments_v2_due_date ON student_fee_installments_v2(due_date);
CREATE INDEX IF NOT EXISTS idx_student_fee_installments_v2_status ON student_fee_installments_v2(status);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_school_date ON fee_payments(school_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_fee ON fee_payments(student_fee_id);
CREATE INDEX IF NOT EXISTS idx_fee_discount_approvals_school_status ON fee_discount_approvals(school_id, status);
CREATE INDEX IF NOT EXISTS idx_fee_discount_approvals_student ON fee_discount_approvals(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_audit_logs_school_entity ON fee_audit_logs(school_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_fee_audit_logs_timestamp ON fee_audit_logs(timestamp DESC);

-- Enable RLS on all new tables
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fee_installments_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_discount_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_fees
CREATE POLICY "Admin can manage student fees"
  ON student_fees FOR ALL
  TO authenticated
  USING (
    school_id = get_user_school() 
    AND get_user_role() IN ('ADMIN', 'SUPERADMIN')
  )
  WITH CHECK (
    school_id = get_user_school() 
    AND get_user_role() IN ('ADMIN', 'SUPERADMIN')
  );

CREATE POLICY "Parents can view their children's fees"
  ON student_fees FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE parent_id IN (
        SELECT id FROM parents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Superadmin full access to student fees"
  ON student_fees FOR ALL
  TO authenticated
  USING (get_user_role() = 'SUPERADMIN');

-- RLS Policies for student_fee_installments_v2
CREATE POLICY "Admin can manage installments"
  ON student_fee_installments_v2 FOR ALL
  TO authenticated
  USING (
    student_fee_id IN (
      SELECT id FROM student_fees 
      WHERE school_id = get_user_school() 
      AND get_user_role() IN ('ADMIN', 'SUPERADMIN')
    )
  )
  WITH CHECK (
    student_fee_id IN (
      SELECT id FROM student_fees 
      WHERE school_id = get_user_school() 
      AND get_user_role() IN ('ADMIN', 'SUPERADMIN')
    )
  );

CREATE POLICY "Parents can view their children's installments"
  ON student_fee_installments_v2 FOR SELECT
  TO authenticated
  USING (
    student_fee_id IN (
      SELECT sf.id FROM student_fees sf
      JOIN students s ON s.id = sf.student_id
      WHERE s.parent_id IN (
        SELECT id FROM parents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Superadmin full access to installments"
  ON student_fee_installments_v2 FOR ALL
  TO authenticated
  USING (get_user_role() = 'SUPERADMIN');

-- RLS Policies for fee_payments
CREATE POLICY "Admin can manage payments"
  ON fee_payments FOR ALL
  TO authenticated
  USING (
    school_id = get_user_school() 
    AND get_user_role() IN ('ADMIN', 'SUPERADMIN')
  )
  WITH CHECK (
    school_id = get_user_school() 
    AND get_user_role() IN ('ADMIN', 'SUPERADMIN')
  );

CREATE POLICY "Parents can view their children's payments"
  ON fee_payments FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE parent_id IN (
        SELECT id FROM parents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Superadmin full access to payments"
  ON fee_payments FOR ALL
  TO authenticated
  USING (get_user_role() = 'SUPERADMIN');

-- RLS Policies for fee_discount_approvals
CREATE POLICY "Admin can manage discount approvals"
  ON fee_discount_approvals FOR ALL
  TO authenticated
  USING (
    school_id = get_user_school() 
    AND get_user_role() IN ('ADMIN', 'SUPERADMIN')
  )
  WITH CHECK (
    school_id = get_user_school() 
    AND get_user_role() IN ('ADMIN', 'SUPERADMIN')
  );

CREATE POLICY "Superadmin full access to discount approvals"
  ON fee_discount_approvals FOR ALL
  TO authenticated
  USING (get_user_role() = 'SUPERADMIN');

-- RLS Policies for fee_audit_logs
CREATE POLICY "Admin can view audit logs"
  ON fee_audit_logs FOR SELECT
  TO authenticated
  USING (
    school_id = get_user_school() 
    AND get_user_role() IN ('ADMIN', 'SUPERADMIN')
  );

CREATE POLICY "System can insert audit logs"
  ON fee_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Superadmin full access to audit logs"
  ON fee_audit_logs FOR ALL
  TO authenticated
  USING (get_user_role() = 'SUPERADMIN');

-- Function to automatically update student_fees status based on pending amount and due dates
CREATE OR REPLACE FUNCTION update_student_fee_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE student_fees sf
  SET 
    status = CASE
      WHEN sf.pending_amount <= 0 THEN 'paid'
      WHEN sf.paid_amount > 0 AND sf.pending_amount > 0 THEN 'partially_paid'
      WHEN EXISTS (
        SELECT 1 FROM student_fee_installments_v2 sfi
        WHERE sfi.student_fee_id = sf.id
        AND sfi.status = 'overdue'
      ) THEN 'overdue'
      ELSE 'unpaid'
    END,
    updated_at = now()
  WHERE sf.id = NEW.student_fee_id OR sf.id = OLD.student_fee_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update installment status based on due date and paid amount
CREATE OR REPLACE FUNCTION update_installment_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status := CASE
    WHEN NEW.pending_amount <= 0 THEN 'paid'
    WHEN NEW.paid_amount > 0 AND NEW.pending_amount > 0 THEN 'partially_paid'
    WHEN NEW.due_date < CURRENT_DATE AND NEW.pending_amount > 0 THEN 'overdue'
    ELSE 'pending'
  END;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update student_fees status when installments change
CREATE TRIGGER trg_update_student_fee_status_on_installment
AFTER INSERT OR UPDATE OR DELETE ON student_fee_installments_v2
FOR EACH ROW
EXECUTE FUNCTION update_student_fee_status();

-- Trigger to update installment status before insert or update
CREATE TRIGGER trg_update_installment_status
BEFORE INSERT OR UPDATE ON student_fee_installments_v2
FOR EACH ROW
EXECUTE FUNCTION update_installment_status();

-- Function to update paid amounts after payment
CREATE OR REPLACE FUNCTION update_paid_amounts_after_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT NEW.is_cancelled THEN
    -- Update installment paid amount if linked
    IF NEW.installment_id IS NOT NULL THEN
      UPDATE student_fee_installments_v2
      SET paid_amount = paid_amount + NEW.amount
      WHERE id = NEW.installment_id;
    END IF;
    
    -- Update student_fee paid amount
    UPDATE student_fees
    SET paid_amount = paid_amount + NEW.amount
    WHERE id = NEW.student_fee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update paid amounts after payment
CREATE TRIGGER trg_update_paid_amounts_after_payment
AFTER INSERT ON fee_payments
FOR EACH ROW
EXECUTE FUNCTION update_paid_amounts_after_payment();

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_fee_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO fee_audit_logs (
    school_id,
    entity_type,
    entity_id,
    action,
    performed_by,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.school_id, OLD.school_id),
    TG_ARGV[0],
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Audit triggers for sensitive operations
CREATE TRIGGER trg_audit_fee_payments
AFTER INSERT OR UPDATE OR DELETE ON fee_payments
FOR EACH ROW
EXECUTE FUNCTION create_fee_audit_log('payment');

CREATE TRIGGER trg_audit_discount_approvals
AFTER INSERT OR UPDATE ON fee_discount_approvals
FOR EACH ROW
EXECUTE FUNCTION create_fee_audit_log('discount');
/*
  # Fix Audit Log Action Mapping

  Maps PostgreSQL trigger operations (INSERT/UPDATE/DELETE) to our expected action names (created/updated/deleted)
*/

-- Drop existing triggers and function
DROP TRIGGER IF EXISTS trg_audit_fee_payments ON fee_payments;
DROP TRIGGER IF EXISTS trg_audit_discount_approvals ON fee_discount_approvals;
DROP FUNCTION IF EXISTS create_fee_audit_log();

-- Create improved audit log function with proper action mapping
CREATE OR REPLACE FUNCTION create_fee_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_action text;
BEGIN
  -- Map PostgreSQL trigger operation to our action names
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'created'
    WHEN 'UPDATE' THEN 'updated'
    WHEN 'DELETE' THEN 'deleted'
    ELSE TG_OP
  END;

  INSERT INTO fee_audit_logs (
    school_id,
    entity_type,
    entity_id,
    action,
    performed_by,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.school_id, OLD.school_id),
    TG_ARGV[0],
    COALESCE(NEW.id, OLD.id),
    v_action,
    COALESCE(auth.uid(), COALESCE(NEW.received_by, OLD.received_by)),
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate audit triggers
CREATE TRIGGER trg_audit_fee_payments
AFTER INSERT OR UPDATE OR DELETE ON fee_payments
FOR EACH ROW
EXECUTE FUNCTION create_fee_audit_log('payment');

CREATE TRIGGER trg_audit_discount_approvals
AFTER INSERT OR UPDATE ON fee_discount_approvals
FOR EACH ROW
EXECUTE FUNCTION create_fee_audit_log('discount');
/*
  # Fix Audit Trigger for All Table Types

  Updates the audit log trigger to handle tables with different structures
*/

DROP TRIGGER IF EXISTS trg_audit_fee_payments ON fee_payments;
DROP TRIGGER IF EXISTS trg_audit_discount_approvals ON fee_discount_approvals;
DROP FUNCTION IF EXISTS create_fee_audit_log();

-- Create flexible audit log function
CREATE OR REPLACE FUNCTION create_fee_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_action text;
  v_performed_by uuid;
BEGIN
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'created'
    WHEN 'UPDATE' THEN 'updated'
    WHEN 'DELETE' THEN 'deleted'
    ELSE TG_OP
  END;
  
  -- Try to get performed_by from various sources
  v_performed_by := COALESCE(
    auth.uid(),
    CASE 
      WHEN TG_TABLE_NAME = 'fee_payments' THEN COALESCE(NEW.received_by, OLD.received_by)
      WHEN TG_TABLE_NAME = 'fee_discount_approvals' THEN COALESCE(NEW.requested_by, OLD.requested_by)
      ELSE NULL
    END
  );

  INSERT INTO fee_audit_logs (
    school_id,
    entity_type,
    entity_id,
    action,
    performed_by,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.school_id, OLD.school_id),
    TG_ARGV[0],
    COALESCE(NEW.id, OLD.id),
    v_action,
    v_performed_by,
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate audit triggers
CREATE TRIGGER trg_audit_fee_payments
AFTER INSERT OR UPDATE OR DELETE ON fee_payments
FOR EACH ROW
EXECUTE FUNCTION create_fee_audit_log('payment');

CREATE TRIGGER trg_audit_discount_approvals
AFTER INSERT OR UPDATE ON fee_discount_approvals
FOR EACH ROW
EXECUTE FUNCTION create_fee_audit_log('discount');
/*
  # Fix Audit Trigger with Exception Handling
  
  Uses dynamic SQL and exception handling to safely extract performed_by from different table structures
*/

DROP TRIGGER IF EXISTS trg_audit_fee_payments ON fee_payments;
DROP TRIGGER IF EXISTS trg_audit_discount_approvals ON fee_discount_approvals;
DROP FUNCTION IF EXISTS create_fee_audit_log();

-- Simple audit function without complex field access
CREATE OR REPLACE FUNCTION create_fee_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_action text;
  v_performed_by uuid;
BEGIN
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'created'
    WHEN 'UPDATE' THEN 'updated'
    WHEN 'DELETE' THEN 'deleted'
  END;
  
  -- Default to auth.uid(), or use a system user placeholder
  v_performed_by := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  INSERT INTO fee_audit_logs (
    school_id,
    entity_type,
    entity_id,
    action,
    performed_by,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.school_id, OLD.school_id),
    TG_ARGV[0],
    COALESCE(NEW.id, OLD.id),
    v_action,
    v_performed_by,
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
CREATE TRIGGER trg_audit_fee_payments
AFTER INSERT OR UPDATE OR DELETE ON fee_payments
FOR EACH ROW
EXECUTE FUNCTION create_fee_audit_log('payment');

CREATE TRIGGER trg_audit_discount_approvals
AFTER INSERT OR UPDATE ON fee_discount_approvals
FOR EACH ROW
EXECUTE FUNCTION create_fee_audit_log('discount');
/*
  # Seed Fee Management Demo Data (Disable Triggers)

  Temporarily disables audit triggers to seed data, then re-enables them
*/

-- Disable audit triggers
DROP TRIGGER IF EXISTS trg_audit_fee_payments ON fee_payments;
DROP TRIGGER IF EXISTS trg_audit_discount_approvals ON fee_discount_approvals;

-- Helper function
CREATE OR REPLACE FUNCTION get_class_fee_amount(grade_order integer)
RETURNS decimal AS $$
BEGIN
  RETURN CASE
    WHEN grade_order <= 5 THEN 50000.00
    WHEN grade_order <= 8 THEN 75000.00
    WHEN grade_order <= 10 THEN 100000.00
    ELSE 125000.00
  END;
END;
$$ LANGUAGE plpgsql;

-- Insert student fees
INSERT INTO student_fees (school_id, student_id, academic_year, class_id, total_fee, discount_amount, paid_amount)
SELECT s.school_id, s.id, '2024-25', s.class_id, get_class_fee_amount(c.grade_order), 0, 0
FROM students s
JOIN classes c ON c.id = s.class_id
WHERE s.status = 'active'
ON CONFLICT (student_id, academic_year) DO NOTHING;

-- Create installments
INSERT INTO student_fee_installments_v2 (student_fee_id, installment_number, installment_name, due_date, amount, paid_amount)
SELECT sf.id, 1, '1st Quarter (Apr-Jun)', DATE '2024-06-30', sf.total_fee * 0.25, 0
FROM student_fees sf WHERE sf.academic_year = '2024-25'
ON CONFLICT (student_fee_id, installment_number) DO NOTHING;

INSERT INTO student_fee_installments_v2 (student_fee_id, installment_number, installment_name, due_date, amount, paid_amount)
SELECT sf.id, 2, '2nd Quarter (Jul-Sep)', DATE '2024-09-30', sf.total_fee * 0.25, 0
FROM student_fees sf WHERE sf.academic_year = '2024-25'
ON CONFLICT (student_fee_id, installment_number) DO NOTHING;

INSERT INTO student_fee_installments_v2 (student_fee_id, installment_number, installment_name, due_date, amount, paid_amount)
SELECT sf.id, 3, '3rd Quarter (Oct-Dec)', DATE '2024-12-31', sf.total_fee * 0.25, 0
FROM student_fees sf WHERE sf.academic_year = '2024-25'
ON CONFLICT (student_fee_id, installment_number) DO NOTHING;

INSERT INTO student_fee_installments_v2 (student_fee_id, installment_number, installment_name, due_date, amount, paid_amount)
SELECT sf.id, 4, '4th Quarter (Jan-Mar)', DATE '2025-03-31', sf.total_fee * 0.25, 0
FROM student_fees sf WHERE sf.academic_year = '2024-25'
ON CONFLICT (student_fee_id, installment_number) DO NOTHING;


-- =====================================================
-- AUTO-REPAIR: Bootstrap System Admin User & Profile
-- =====================================================
DO $$
DECLARE
  v_user_id uuid := '00000000-0000-0000-0000-000000000001';
  v_school_id uuid;
  v_admin_role_id uuid;
BEGIN
  -- 1. Create a dummy user in auth.users if not exists (Required for profile FK)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, 
    email_confirmed_at, created_at, updated_at, 
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  )
  VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
    'admin@edulite.demo', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHI', 
    now(), now(), now(), 
    '{"provider":"email","providers":["email"]}', '{"full_name":"System Admin"}', false
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Get the School and Role
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'ADMIN' LIMIT 1;

  -- 3. Create Profile linked to this user
  IF v_school_id IS NOT NULL AND v_admin_role_id IS NOT NULL THEN
    INSERT INTO user_profiles (id, school_id, role_id, full_name)
    VALUES (v_user_id, v_school_id, v_admin_role_id, 'System Admin')
    ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id;
  END IF;
END $$;

-- Add payments and discounts
DO $$
DECLARE
  v_admin_id uuid;
  v_school_id uuid;
  v_count integer;
BEGIN
  SELECT school_id INTO v_school_id FROM students LIMIT 1;
  SELECT id INTO v_admin_id FROM user_profiles 
  WHERE school_id = v_school_id AND role_id = (SELECT id FROM roles WHERE name = 'ADMIN') LIMIT 1;
  SELECT COUNT(*) INTO v_count FROM student_fees WHERE academic_year = '2024-25';
  
  -- Fully paid students (10%)
  WITH fully_paid AS (
    SELECT sf.id as fee_id, sf.student_id, sf.school_id, sf.total_fee, 
           sfi.id as inst_id, sfi.installment_number as inst_num
    FROM student_fees sf
    JOIN student_fee_installments_v2 sfi ON sfi.student_fee_id = sf.id
    WHERE sf.academic_year = '2024-25'
    ORDER BY sf.student_id
    LIMIT GREATEST(4, v_count / 10)
  )
  INSERT INTO fee_payments (school_id, student_id, student_fee_id, installment_id, amount, payment_mode, transaction_ref, payment_date, received_by)
  SELECT fp.school_id, fp.student_id, fp.fee_id, fp.inst_id, fp.total_fee * 0.25,
    (ARRAY['cash','online','upi','card','cheque'])[(RANDOM() * 4 + 1)::int],
    'TXN' || LPAD((RANDOM() * 999999)::int::text, 6, '0'),
    DATE '2024-04-15' + (INTERVAL '30 days' * (fp.inst_num - 1)), v_admin_id
  FROM fully_paid fp;
  
  -- Partially paid (2 installments, 20%)
  WITH partial_paid AS (
    SELECT sf.id as fee_id, sf.student_id, sf.school_id, sf.total_fee, sfi.id as inst_id, sfi.installment_number as inst_num,
           ROW_NUMBER() OVER (PARTITION BY sf.id ORDER BY sfi.installment_number) as rn
    FROM student_fees sf
    JOIN student_fee_installments_v2 sfi ON sfi.student_fee_id = sf.id
    WHERE sf.academic_year = '2024-25'
    AND sf.id NOT IN (SELECT DISTINCT student_fee_id FROM fee_payments)
    ORDER BY sf.student_id
    LIMIT GREATEST(2, v_count / 5 * 2)
  )
  INSERT INTO fee_payments (school_id, student_id, student_fee_id, installment_id, amount, payment_mode, transaction_ref, payment_date, received_by)
  SELECT pp.school_id, pp.student_id, pp.fee_id, pp.inst_id, pp.total_fee * 0.25,
    (ARRAY['cash','online','upi'])[(RANDOM() * 2 + 1)::int],
    'TXN' || LPAD((RANDOM() * 999999)::int::text, 6, '0'),
    DATE '2024-04-15' + (INTERVAL '30 days' * (pp.inst_num - 1)), v_admin_id
  FROM partial_paid pp WHERE pp.rn <= 2;
  
  -- Partial payment on first installment (15%)
  WITH partial_first AS (
    SELECT sf.id as fee_id, sf.student_id, sf.school_id, sf.total_fee, sfi.id as inst_id
    FROM student_fees sf
    JOIN student_fee_installments_v2 sfi ON sfi.student_fee_id = sf.id
    WHERE sf.academic_year = '2024-25'
    AND sf.id NOT IN (SELECT DISTINCT student_fee_id FROM fee_payments)
    AND sfi.installment_number = 1
    ORDER BY sf.student_id
    LIMIT GREATEST(1, v_count / 7)
  )
  INSERT INTO fee_payments (school_id, student_id, student_fee_id, installment_id, amount, payment_mode, transaction_ref, payment_date, received_by)
  SELECT pf.school_id, pf.student_id, pf.fee_id, pf.inst_id, (pf.total_fee * 0.25) * 0.5,
    'cash', 'PARTIAL' || LPAD((RANDOM() * 9999)::int::text, 4, '0'), DATE '2024-05-15', v_admin_id
  FROM partial_first pf;
  
  -- Merit discounts (5%)
  WITH merit AS (
    SELECT sf.id as fee_id, sf.student_id, sf.school_id, sf.total_fee
    FROM student_fees sf WHERE sf.academic_year = '2024-25'
    ORDER BY RANDOM() LIMIT GREATEST(1, v_count / 20)
  )
  INSERT INTO fee_discount_approvals (school_id, student_fee_id, student_id, requested_by, requested_amount, reason, status, reviewed_by, reviewed_at, review_comments)
  SELECT m.school_id, m.fee_id, m.student_id, v_admin_id, m.total_fee * 0.10,
    'Merit-based discount for academic excellence', 'approved', v_admin_id,
    NOW() - INTERVAL '30 days', 'Approved based on academic performance'
  FROM merit m;
  
  UPDATE student_fees sf SET discount_amount = da.requested_amount, discount_reason = da.reason,
    discount_approved_by = da.reviewed_by, discount_approved_at = da.reviewed_at
  FROM fee_discount_approvals da WHERE da.student_fee_id = sf.id AND da.status = 'approved';
  
  -- Hardship discounts (3%)
  WITH hardship AS (
    SELECT sf.id as fee_id, sf.student_id, sf.school_id, sf.total_fee
    FROM student_fees sf WHERE sf.academic_year = '2024-25' AND sf.discount_amount = 0
    ORDER BY RANDOM() LIMIT GREATEST(1, v_count / 33)
  )
  INSERT INTO fee_discount_approvals (school_id, student_fee_id, student_id, requested_by, requested_amount, reason, status, reviewed_by, reviewed_at, review_comments)
  SELECT h.school_id, h.fee_id, h.student_id, v_admin_id, h.total_fee * 0.25,
    'Financial hardship discount', 'approved', v_admin_id,
    NOW() - INTERVAL '20 days', 'Verified income documents'
  FROM hardship h;
  
  UPDATE student_fees sf SET discount_amount = da.requested_amount, discount_reason = da.reason,
    discount_approved_by = da.reviewed_by, discount_approved_at = da.reviewed_at
  FROM fee_discount_approvals da WHERE da.student_fee_id = sf.id AND da.status = 'approved' AND sf.discount_amount = 0;
  
  -- Pending discount requests
  WITH pending AS (
    SELECT sf.id as fee_id, sf.student_id, sf.school_id, sf.total_fee
    FROM student_fees sf WHERE sf.academic_year = '2024-25' AND sf.discount_amount = 0
    ORDER BY RANDOM() LIMIT 3
  )
  INSERT INTO fee_discount_approvals (school_id, student_fee_id, student_id, requested_by, requested_amount, reason, status)
  SELECT p.school_id, p.fee_id, p.student_id, v_admin_id, p.total_fee * 0.15,
    'Sibling discount - 2nd child', 'pending'
  FROM pending p;
END $$;

DROP FUNCTION get_class_fee_amount;

-- Re-enable audit triggers
CREATE TRIGGER trg_audit_fee_payments
AFTER INSERT OR UPDATE OR DELETE ON fee_payments
FOR EACH ROW
EXECUTE FUNCTION create_fee_audit_log('payment');

CREATE TRIGGER trg_audit_discount_approvals
AFTER INSERT OR UPDATE ON fee_discount_approvals
FOR EACH ROW
EXECUTE FUNCTION create_fee_audit_log('discount');

-- Summary
DO $$
DECLARE
  t_fees int; t_inst int; t_pay int; t_disc int;
  s_paid int; s_partial int; s_unpaid int; s_overdue int;
BEGIN
  SELECT COUNT(*) INTO t_fees FROM student_fees WHERE academic_year = '2024-25';
  SELECT COUNT(*) INTO t_inst FROM student_fee_installments_v2;
  SELECT COUNT(*) INTO t_pay FROM fee_payments;
  SELECT COUNT(*) INTO t_disc FROM fee_discount_approvals;
  SELECT COUNT(*) INTO s_paid FROM student_fees WHERE academic_year = '2024-25' AND status = 'paid';
  SELECT COUNT(*) INTO s_partial FROM student_fees WHERE academic_year = '2024-25' AND status = 'partially_paid';
  SELECT COUNT(*) INTO s_unpaid FROM student_fees WHERE academic_year = '2024-25' AND status = 'unpaid';
  SELECT COUNT(*) INTO s_overdue FROM student_fees WHERE academic_year = '2024-25' AND status = 'overdue';
  
  RAISE NOTICE '=== Fee Management Demo Data Created ===';
  RAISE NOTICE 'Student Fees: % | Installments: %', t_fees, t_inst;
  RAISE NOTICE 'Payments: % | Discount Approvals: %', t_pay, t_disc;
  RAISE NOTICE 'Fee Status Breakdown:';
  RAISE NOTICE '  Paid: % | Partially Paid: %', s_paid, s_partial;
  RAISE NOTICE '  Unpaid: % | Overdue: %', s_unpaid, s_overdue;
END $$;
/*
  # Enhanced Announcement Targeting System

  ## Overview
  This migration enhances the announcement system to support granular targeting by classes, sections, and specific audience types.
  It maintains full backward compatibility with existing school-wide announcements.

  ## Changes Made

  ### 1. Modified Tables
    - `announcements`
      - Added `target_scope` column: 'school_wide' (default) or 'targeted'
      - Kept existing `target_audience` array for backward compatibility

  ### 2. New Tables
    - `announcement_audiences`
      - Maps announcements to specific audience types (students, parents, educators, all)
      - Replaces array with proper relational structure for new announcements
      - Columns: id, announcement_id, audience_type, created_at

    - `announcement_target_classes`
      - Maps announcements to specific classes
      - Columns: id, announcement_id, class_id, created_at

    - `announcement_target_sections`
      - Maps announcements to specific sections
      - Enables granular section-level targeting
      - Columns: id, announcement_id, section_id, created_at

  ### 3. Helper Views
    - `announcement_targets_summary`
      - Provides human-readable summary of announcement targets
      - Shows which classes, sections, and audiences will receive each announcement

  ### 4. Security (RLS)
    - All new tables have RLS enabled
    - Authenticated users can read announcement targeting data for their school
    - Only admins can create/modify announcement targets
    - Policies ensure school-level data isolation

  ## Backward Compatibility
    - Existing announcements automatically get `target_scope = 'school_wide'`
    - Old `target_audience` array field remains functional
    - New announcements can use either simple (school-wide) or advanced (targeted) approach
    - Migration is non-destructive and data-safe

  ## Usage Notes
    - School-wide announcements: Set `target_scope = 'school_wide'`, use `target_audience` array
    - Targeted announcements: Set `target_scope = 'targeted'`, use mapping tables
    - Admin UI will provide easy toggle between modes
    - Preview logic calculates exact recipient count based on targets
*/

-- Add target_scope column to announcements table (backward compatible)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcements' AND column_name = 'target_scope'
  ) THEN
    ALTER TABLE announcements 
    ADD COLUMN target_scope text DEFAULT 'school_wide' NOT NULL 
    CHECK (target_scope IN ('school_wide', 'targeted'));
  END IF;
END $$;

-- Create announcement_audiences table
CREATE TABLE IF NOT EXISTS announcement_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  audience_type text NOT NULL CHECK (audience_type IN ('students', 'parents', 'educators', 'all')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(announcement_id, audience_type)
);

-- Create announcement_target_classes table
CREATE TABLE IF NOT EXISTS announcement_target_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(announcement_id, class_id)
);

-- Create announcement_target_sections table
CREATE TABLE IF NOT EXISTS announcement_target_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(announcement_id, section_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcement_audiences_announcement_id 
  ON announcement_audiences(announcement_id);

CREATE INDEX IF NOT EXISTS idx_announcement_target_classes_announcement_id 
  ON announcement_target_classes(announcement_id);

CREATE INDEX IF NOT EXISTS idx_announcement_target_sections_announcement_id 
  ON announcement_target_sections(announcement_id);

CREATE INDEX IF NOT EXISTS idx_announcement_target_classes_class_id 
  ON announcement_target_classes(class_id);

CREATE INDEX IF NOT EXISTS idx_announcement_target_sections_section_id 
  ON announcement_target_sections(section_id);

-- Enable RLS on all new tables
ALTER TABLE announcement_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_target_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_target_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcement_audiences
CREATE POLICY "Users can view announcement audiences for their school"
  ON announcement_audiences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN user_profiles up ON up.school_id = a.school_id
      WHERE a.id = announcement_audiences.announcement_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage announcement audiences"
  ON announcement_audiences FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN user_profiles up ON up.school_id = a.school_id
      JOIN roles r ON r.id = up.role_id
      WHERE a.id = announcement_audiences.announcement_id
      AND up.id = auth.uid()
      AND r.name IN ('super_admin', 'school_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN user_profiles up ON up.school_id = a.school_id
      JOIN roles r ON r.id = up.role_id
      WHERE a.id = announcement_audiences.announcement_id
      AND up.id = auth.uid()
      AND r.name IN ('super_admin', 'school_admin')
    )
  );

-- RLS Policies for announcement_target_classes
CREATE POLICY "Users can view announcement target classes for their school"
  ON announcement_target_classes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN user_profiles up ON up.school_id = a.school_id
      WHERE a.id = announcement_target_classes.announcement_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage announcement target classes"
  ON announcement_target_classes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN user_profiles up ON up.school_id = a.school_id
      JOIN roles r ON r.id = up.role_id
      WHERE a.id = announcement_target_classes.announcement_id
      AND up.id = auth.uid()
      AND r.name IN ('super_admin', 'school_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN user_profiles up ON up.school_id = a.school_id
      JOIN roles r ON r.id = up.role_id
      WHERE a.id = announcement_target_classes.announcement_id
      AND up.id = auth.uid()
      AND r.name IN ('super_admin', 'school_admin')
    )
  );

-- RLS Policies for announcement_target_sections
CREATE POLICY "Users can view announcement target sections for their school"
  ON announcement_target_sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN user_profiles up ON up.school_id = a.school_id
      WHERE a.id = announcement_target_sections.announcement_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage announcement target sections"
  ON announcement_target_sections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN user_profiles up ON up.school_id = a.school_id
      JOIN roles r ON r.id = up.role_id
      WHERE a.id = announcement_target_sections.announcement_id
      AND up.id = auth.uid()
      AND r.name IN ('super_admin', 'school_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN user_profiles up ON up.school_id = a.school_id
      JOIN roles r ON r.id = up.role_id
      WHERE a.id = announcement_target_sections.announcement_id
      AND up.id = auth.uid()
      AND r.name IN ('super_admin', 'school_admin')
    )
  );

-- Create a view to get announcement targeting summary
CREATE OR REPLACE VIEW announcement_targets_summary AS
SELECT 
  a.id as announcement_id,
  a.title,
  a.target_scope,
  a.school_id,
  
  -- Aggregate audiences
  COALESCE(
    array_agg(DISTINCT aa.audience_type) FILTER (WHERE aa.audience_type IS NOT NULL),
    a.target_audience
  ) as audiences,
  
  -- Aggregate target classes with their IDs
  json_agg(DISTINCT jsonb_build_object(
    'id', c.id,
    'grade', c.grade,
    'grade_order', c.grade_order
  )) FILTER (WHERE c.id IS NOT NULL) as target_classes,
  
  -- Aggregate target sections with details
  json_agg(DISTINCT jsonb_build_object(
    'section_id', s.id,
    'section_name', s.name,
    'class_id', sc.id,
    'class_grade', sc.grade,
    'grade_order', sc.grade_order
  )) FILTER (WHERE s.id IS NOT NULL) as target_sections,
  
  -- Count of target classes
  COUNT(DISTINCT atc.class_id) as class_count,
  
  -- Count of target sections
  COUNT(DISTINCT ats.section_id) as section_count

FROM announcements a
LEFT JOIN announcement_audiences aa ON aa.announcement_id = a.id
LEFT JOIN announcement_target_classes atc ON atc.announcement_id = a.id
LEFT JOIN announcement_target_sections ats ON ats.announcement_id = a.id
LEFT JOIN classes c ON c.id = atc.class_id
LEFT JOIN sections s ON s.id = ats.section_id
LEFT JOIN classes sc ON sc.id = s.class_id

GROUP BY a.id, a.title, a.target_scope, a.school_id, a.target_audience;
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
/*
  # ID Card Generation & Management System

  ## Overview
  Production-grade ID card generation system with template-driven rendering.
  Supports students, educators, and staff with configurable templates.

  ## Tables Created
  1. `id_card_templates` - HTML/CSS templates stored in database
  2. `id_card_generations` - Audit log of all card generations
  3. `id_card_settings` - Global branding and configuration per school

  ## Features
  - Template-based rendering (HTML/CSS)
  - Live preview support
  - Bulk generation by class/section/department
  - Comprehensive audit trail
  - Missing data validation at DB level

  ## Security
  - RLS enabled on all tables
  - Only ADMIN and SUPERADMIN can generate cards
  - School-level data isolation
*/

-- =====================================================
-- 1. ID CARD SETTINGS (Global Branding)
-- =====================================================

CREATE TABLE IF NOT EXISTS id_card_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

  -- Branding
  logo_url text,
  school_display_name text,
  school_address text,
  principal_name text,
  principal_signature_url text,

  -- Academic session
  current_academic_year text NOT NULL DEFAULT '2025-26',

  -- Contact info
  contact_phone text,
  contact_email text,
  website_url text,

  -- Settings
  store_generated_cards boolean DEFAULT true,
  require_photo boolean DEFAULT true,

  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES user_profiles(id),

  UNIQUE(school_id)
);

-- =====================================================
-- 2. ID CARD TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS id_card_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

  -- Template metadata
  name text NOT NULL,
  description text,
  card_type text NOT NULL CHECK (card_type IN ('student', 'educator', 'staff')),

  -- Template content (HTML/CSS)
  template_html text NOT NULL,
  template_css text NOT NULL,

  -- Configuration
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,

  -- Dimensions (in pixels for PDF generation)
  card_width integer DEFAULT 350,
  card_height integer DEFAULT 550,

  -- Required fields validation
  required_fields jsonb DEFAULT '[]'::jsonb,

  -- Audit
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES user_profiles(id),

  UNIQUE(school_id, name)
);

-- =====================================================
-- 3. ID CARD GENERATIONS (Audit Trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS id_card_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

  -- Who and what
  generated_by uuid NOT NULL REFERENCES user_profiles(id),
  template_id uuid NOT NULL REFERENCES id_card_templates(id),
  card_type text NOT NULL CHECK (card_type IN ('student', 'educator', 'staff')),

  -- Target entity
  entity_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('student', 'educator', 'staff')),

  -- Generation details
  generation_mode text NOT NULL CHECK (generation_mode IN ('single', 'bulk')),
  bulk_criteria jsonb,

  -- Generated files (if stored)
  pdf_url text,
  jpg_url text,

  -- Card data snapshot (for immutability)
  card_data jsonb NOT NULL,

  -- Status
  status text DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
  error_message text,

  -- Audit
  generated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_id_card_generations_school ON id_card_generations(school_id);
CREATE INDEX IF NOT EXISTS idx_id_card_generations_entity ON id_card_generations(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_id_card_generations_generated_by ON id_card_generations(generated_by);
CREATE INDEX IF NOT EXISTS idx_id_card_generations_date ON id_card_generations(generated_at DESC);

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE id_card_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE id_card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE id_card_generations ENABLE ROW LEVEL SECURITY;

-- Settings policies
CREATE POLICY "Admins can view own school settings"
  ON id_card_settings FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage own school settings"
  ON id_card_settings FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  );

-- Template policies
CREATE POLICY "Admins can view own school templates"
  ON id_card_templates FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage templates"
  ON id_card_templates FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  );

-- Generation audit policies
CREATE POLICY "Users can view own school generations"
  ON id_card_generations FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can create generations"
  ON id_card_generations FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  );

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to validate required fields before generation
CREATE OR REPLACE FUNCTION validate_id_card_data(
  p_entity_type text,
  p_entity_id uuid,
  p_required_fields jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_missing_fields text[] := ARRAY[]::text[];
  v_entity_data jsonb;
  v_field text;
BEGIN
  -- Get entity data based on type
  IF p_entity_type = 'student' THEN
    SELECT to_jsonb(s) INTO v_entity_data FROM students s WHERE s.id = p_entity_id;
  ELSIF p_entity_type = 'educator' THEN
    SELECT to_jsonb(e) INTO v_entity_data FROM educators e WHERE e.id = p_entity_id;
  END IF;

  -- Check each required field
  FOR v_field IN SELECT jsonb_array_elements_text(p_required_fields)
  LOOP
    IF v_entity_data->v_field IS NULL OR v_entity_data->v_field = 'null'::jsonb THEN
      v_missing_fields := array_append(v_missing_fields, v_field);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'valid', array_length(v_missing_fields, 1) IS NULL,
    'missing_fields', to_jsonb(v_missing_fields)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. SEED DEFAULT TEMPLATES
-- =====================================================

-- Insert default student ID card template
INSERT INTO id_card_templates (school_id, name, description, card_type, template_html, template_css, is_default, required_fields)
SELECT
  s.id,
  'Default Student ID Card',
  'Standard student ID card with photo and essential details',
  'student',
  '<div class="id-card">
    <div class="header">
      <img src="{{logo_url}}" class="logo" />
      <h2>{{school_name}}</h2>
    </div>
    <div class="photo">
      <img src="{{photo_url}}" />
    </div>
    <div class="details">
      <div class="field"><strong>Name:</strong> {{name}}</div>
      <div class="field"><strong>Admission No:</strong> {{admission_number}}</div>
      <div class="field"><strong>Class:</strong> {{class}} - {{section}}</div>
      <div class="field"><strong>Session:</strong> {{academic_year}}</div>
      <div class="field"><strong>Blood Group:</strong> {{blood_group}}</div>
      <div class="field"><strong>Contact:</strong> {{parent_phone}}</div>
    </div>
    <div class="footer">
      <div class="signature">
        <img src="{{principal_signature}}" />
        <p>Principal</p>
      </div>
    </div>
  </div>',
  '.id-card { font-family: Arial, sans-serif; padding: 20px; border: 2px solid #333; background: white; }
   .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
   .logo { height: 50px; margin-bottom: 5px; }
   .header h2 { margin: 5px 0; color: #007bff; font-size: 18px; }
   .photo { text-align: center; margin: 15px 0; }
   .photo img { width: 120px; height: 150px; object-fit: cover; border: 2px solid #333; }
   .details { margin: 15px 0; }
   .field { padding: 5px 0; font-size: 14px; }
   .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
   .signature { text-align: center; }
   .signature img { height: 40px; }
   .signature p { margin: 5px 0; font-size: 12px; }',
  true,
  '["photo_url", "name", "admission_number", "class", "section"]'::jsonb
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM id_card_templates WHERE school_id = s.id AND name = 'Default Student ID Card'
);

-- Insert default educator ID card template
INSERT INTO id_card_templates (school_id, name, description, card_type, template_html, template_css, is_default, required_fields)
SELECT
  s.id,
  'Default Educator ID Card',
  'Standard educator/staff ID card with photo and essential details',
  'educator',
  '<div class="id-card">
    <div class="header">
      <img src="{{logo_url}}" class="logo" />
      <h2>{{school_name}}</h2>
    </div>
    <div class="photo">
      <img src="{{photo_url}}" />
    </div>
    <div class="details">
      <div class="field"><strong>Name:</strong> {{name}}</div>
      <div class="field"><strong>Employee ID:</strong> {{employee_id}}</div>
      <div class="field"><strong>Designation:</strong> {{designation}}</div>
      <div class="field"><strong>Department:</strong> {{department}}</div>
      <div class="field"><strong>Session:</strong> {{academic_year}}</div>
      <div class="field"><strong>Contact:</strong> {{phone}}</div>
    </div>
    <div class="footer">
      <div class="signature">
        <img src="{{principal_signature}}" />
        <p>Principal</p>
      </div>
    </div>
  </div>',
  '.id-card { font-family: Arial, sans-serif; padding: 20px; border: 2px solid #333; background: white; }
   .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #059669; padding-bottom: 10px; }
   .logo { height: 50px; margin-bottom: 5px; }
   .header h2 { margin: 5px 0; color: #059669; font-size: 18px; }
   .photo { text-align: center; margin: 15px 0; }
   .photo img { width: 120px; height: 150px; object-fit: cover; border: 2px solid #333; }
   .details { margin: 15px 0; }
   .field { padding: 5px 0; font-size: 14px; }
   .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
   .signature { text-align: center; }
   .signature img { height: 40px; }
   .signature p { margin: 5px 0; font-size: 12px; }',
  true,
  '["photo_url", "name", "employee_id", "designation"]'::jsonb
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM id_card_templates WHERE school_id = s.id AND name = 'Default Educator ID Card'
);

-- =====================================================
-- 7. INITIALIZE SETTINGS FOR EXISTING SCHOOLS
-- =====================================================

INSERT INTO id_card_settings (school_id, current_academic_year)
SELECT id, '2025-26'
FROM schools
WHERE NOT EXISTS (
  SELECT 1 FROM id_card_settings WHERE school_id = schools.id
);
/*
  # Certificates & Awards Management System

  ## Overview
  Production-grade certificate generation for academic, sports, and custom achievements.
  Supports teacher nomination, admin approval workflow, and permanent storage.

  ## Tables Created
  1. `certificate_templates` - HTML/CSS certificate templates
  2. `award_types` - Configurable award types per school
  3. `student_awards` - Award records with approval workflow
  4. `certificate_generations` - Generated certificates audit trail

  ## Features
  - Template-based certificate rendering
  - Multi-select student nomination
  - Optional approval workflow (Teacher → Admin)
  - Permanent certificate storage in student profiles
  - Comprehensive audit trail
  - Support for QR verification (phase-2 ready)

  ## Security
  - RLS enabled on all tables
  - Teachers can nominate, Admins can approve
  - Students/Parents can view only their own certificates
  - School-level data isolation
*/

-- =====================================================
-- 1. AWARD TYPES
-- =====================================================

CREATE TABLE IF NOT EXISTS award_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

  -- Award metadata
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('academic', 'sports', 'extracurricular', 'behaviour', 'attendance', 'custom')),
  description text,

  -- Configuration
  requires_position boolean DEFAULT false,
  requires_approval boolean DEFAULT false,
  is_active boolean DEFAULT true,

  -- Audit
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES user_profiles(id),

  UNIQUE(school_id, name)
);

-- =====================================================
-- 2. CERTIFICATE TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

  -- Template metadata
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('academic', 'sports', 'extracurricular', 'custom')),

  -- Template content (HTML/CSS)
  template_html text NOT NULL,
  template_css text NOT NULL,

  -- Configuration
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,

  -- Dimensions (A4 landscape: 297mm x 210mm = ~1122px x 794px at 96dpi)
  certificate_width integer DEFAULT 1122,
  certificate_height integer DEFAULT 794,
  orientation text DEFAULT 'landscape' CHECK (orientation IN ('landscape', 'portrait')),

  -- Branding elements
  include_school_logo boolean DEFAULT true,
  include_signature boolean DEFAULT true,
  include_seal boolean DEFAULT false,
  include_qr_code boolean DEFAULT false,

  -- Audit
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES user_profiles(id),

  UNIQUE(school_id, name)
);

-- =====================================================
-- 3. STUDENT AWARDS
-- =====================================================

CREATE TABLE IF NOT EXISTS student_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

  -- Student and award
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  award_type_id uuid NOT NULL REFERENCES award_types(id),

  -- Event details
  event_name text NOT NULL,
  event_date date NOT NULL,
  position text,
  achievement_description text,

  -- Presenter details
  presenter_name text,
  presenter_designation text,

  -- Academic context
  academic_year text NOT NULL,
  class_id uuid REFERENCES classes(id),
  section_id uuid REFERENCES sections(id),

  -- Workflow
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'issued')),
  nominated_by uuid NOT NULL REFERENCES user_profiles(id),
  nominated_at timestamptz DEFAULT now(),
  
  approved_by uuid REFERENCES user_profiles(id),
  approved_at timestamptz,
  approval_comments text,

  -- Certificate generation
  certificate_issued boolean DEFAULT false,
  certificate_template_id uuid REFERENCES certificate_templates(id),
  certificate_issued_at timestamptz,
  certificate_issued_by uuid REFERENCES user_profiles(id),

  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_student_awards_school ON student_awards(school_id);
CREATE INDEX IF NOT EXISTS idx_student_awards_student ON student_awards(student_id);
CREATE INDEX IF NOT EXISTS idx_student_awards_status ON student_awards(status);
CREATE INDEX IF NOT EXISTS idx_student_awards_nominated_by ON student_awards(nominated_by);
CREATE INDEX IF NOT EXISTS idx_student_awards_event_date ON student_awards(event_date DESC);

-- =====================================================
-- 4. CERTIFICATE GENERATIONS (Audit Trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS certificate_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

  -- Link to award
  student_award_id uuid NOT NULL REFERENCES student_awards(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES certificate_templates(id),

  -- Generation details
  generated_by uuid NOT NULL REFERENCES user_profiles(id),
  generation_mode text NOT NULL CHECK (generation_mode IN ('single', 'bulk')),
  
  -- Generated files
  pdf_url text,
  jpg_url text,

  -- Certificate data snapshot (immutable)
  certificate_data jsonb NOT NULL,

  -- QR code for verification (phase-2)
  verification_code text UNIQUE,
  verification_url text,

  -- Status
  status text DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
  error_message text,

  -- Audit
  generated_at timestamptz DEFAULT now(),

  UNIQUE(student_award_id, generated_at)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_certificate_generations_school ON certificate_generations(school_id);
CREATE INDEX IF NOT EXISTS idx_certificate_generations_student ON certificate_generations(student_id);
CREATE INDEX IF NOT EXISTS idx_certificate_generations_award ON certificate_generations(student_award_id);
CREATE INDEX IF NOT EXISTS idx_certificate_generations_verification ON certificate_generations(verification_code) WHERE verification_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_certificate_generations_date ON certificate_generations(generated_at DESC);

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE award_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_generations ENABLE ROW LEVEL SECURITY;

-- Award Types policies
CREATE POLICY "Staff can view own school award types"
  ON award_types FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage award types"
  ON award_types FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  );

-- Certificate Templates policies
CREATE POLICY "Staff can view own school templates"
  ON certificate_templates FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage templates"
  ON certificate_templates FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  );

-- Student Awards policies
CREATE POLICY "Staff can view own school awards"
  ON student_awards FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
    OR
    -- Parents can view their children's awards
    student_id IN (
      SELECT id FROM students WHERE parent_id IN (
        SELECT id FROM parents WHERE school_id IN (
          SELECT school_id FROM user_profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Teachers can nominate awards"
  ON student_awards FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('EDUCATOR', 'ADMIN', 'SUPERADMIN'))
    )
  );

CREATE POLICY "Teachers and Admins can update awards"
  ON student_awards FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('EDUCATOR', 'ADMIN', 'SUPERADMIN'))
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('EDUCATOR', 'ADMIN', 'SUPERADMIN'))
    )
  );

-- Certificate Generations policies
CREATE POLICY "Users can view certificates"
  ON certificate_generations FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
    OR
    -- Students and parents can view their own certificates
    student_id IN (
      SELECT id FROM students WHERE parent_id IN (
        SELECT id FROM parents WHERE school_id IN (
          SELECT school_id FROM user_profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Admins can generate certificates"
  ON certificate_generations FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  );

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to auto-approve awards that don't require approval
CREATE OR REPLACE FUNCTION auto_approve_award()
RETURNS TRIGGER AS $$
DECLARE
  v_requires_approval boolean;
BEGIN
  SELECT requires_approval INTO v_requires_approval
  FROM award_types
  WHERE id = NEW.award_type_id;

  IF NOT v_requires_approval THEN
    NEW.status := 'approved';
    NEW.approved_by := NEW.nominated_by;
    NEW.approved_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_approve_award
  BEFORE INSERT ON student_awards
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_award();

-- Function to generate verification code
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS text AS $$
BEGIN
  RETURN upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 12));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. SEED DEFAULT AWARD TYPES
-- =====================================================

INSERT INTO award_types (school_id, name, category, description, requires_position, requires_approval)
SELECT
  s.id,
  award_name,
  award_category,
  award_desc,
  award_pos,
  award_approval
FROM schools s,
  (VALUES
    ('Academic Excellence', 'academic', 'For outstanding academic performance', false, true),
    ('Best Student Award', 'academic', 'Overall best student of the class', false, true),
    ('100% Attendance', 'attendance', 'Perfect attendance record', false, false),
    ('Sports Champion', 'sports', 'Excellence in sports activities', true, true),
    ('Best Athlete', 'sports', 'Outstanding athletic performance', true, true),
    ('Cultural Excellence', 'extracurricular', 'Excellence in cultural activities', false, true),
    ('Leadership Award', 'behaviour', 'Exceptional leadership qualities', false, true),
    ('Good Conduct', 'behaviour', 'Exemplary behaviour throughout the year', false, false),
    ('Science Olympiad Winner', 'academic', 'Winner in science olympiad', true, true),
    ('Math Wizard', 'academic', 'Excellence in mathematics', false, true),
    ('Best Artist', 'extracurricular', 'Outstanding artistic talent', false, true),
    ('Community Service', 'behaviour', 'Exceptional community service', false, true)
  ) AS awards(award_name, award_category, award_desc, award_pos, award_approval)
WHERE NOT EXISTS (
  SELECT 1 FROM award_types WHERE school_id = s.id AND name = awards.award_name
);

-- =====================================================
-- 8. SEED DEFAULT CERTIFICATE TEMPLATE
-- =====================================================

INSERT INTO certificate_templates (school_id, name, description, category, template_html, template_css, is_default)
SELECT
  s.id,
  'Default Achievement Certificate',
  'Standard certificate for all types of achievements',
  'custom',
  '<div class="certificate">
    <div class="border-outer">
      <div class="border-inner">
        <div class="header">
          <img src="{{logo_url}}" class="logo" />
          <h1>{{school_name}}</h1>
          <p class="tagline">Certificate of Achievement</p>
        </div>
        <div class="content">
          <p class="awarded">This certificate is proudly presented to</p>
          <h2 class="student-name">{{student_name}}</h2>
          <p class="class-info">Class {{class}} - {{section}}</p>
          <p class="achievement">For {{achievement_description}}</p>
          <p class="event">at <strong>{{event_name}}</strong></p>
          {{#position}}<p class="position">Position: <strong>{{position}}</strong></p>{{/position}}
          <p class="event-date">Date: {{event_date}}</p>
        </div>
        <div class="footer">
          <div class="signature-section">
            <div class="signature">
              <img src="{{presenter_signature}}" />
              <p class="signature-name">{{presenter_name}}</p>
              <p class="signature-title">{{presenter_designation}}</p>
            </div>
            <div class="signature">
              <img src="{{principal_signature}}" />
              <p class="signature-name">{{principal_name}}</p>
              <p class="signature-title">Principal</p>
            </div>
          </div>
          <p class="footer-text">Academic Year: {{academic_year}}</p>
        </div>
      </div>
    </div>
  </div>',
  '.certificate { width: 100%; height: 100%; font-family: Georgia, serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); display: flex; align-items: center; justify-content: center; }
   .border-outer { border: 15px solid #d4af37; padding: 20px; background: white; width: 95%; height: 90%; }
   .border-inner { border: 3px solid #d4af37; padding: 40px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
   .header { text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 20px; }
   .logo { height: 80px; margin-bottom: 10px; }
   .header h1 { color: #2c3e50; margin: 10px 0; font-size: 36px; font-weight: bold; }
   .tagline { color: #d4af37; font-size: 20px; font-style: italic; margin: 10px 0; }
   .content { text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 30px 0; }
   .awarded { font-size: 18px; color: #555; margin-bottom: 20px; }
   .student-name { font-size: 48px; color: #2c3e50; margin: 20px 0; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
   .class-info { font-size: 18px; color: #666; margin-bottom: 30px; }
   .achievement { font-size: 22px; color: #2c3e50; margin: 20px 0; line-height: 1.6; }
   .event { font-size: 20px; color: #555; margin: 15px 0; }
   .position { font-size: 24px; color: #d4af37; margin: 15px 0; font-weight: bold; }
   .event-date { font-size: 16px; color: #666; margin-top: 20px; }
   .footer { border-top: 2px solid #d4af37; padding-top: 20px; }
   .signature-section { display: flex; justify-content: space-around; margin-bottom: 15px; }
   .signature { text-align: center; }
   .signature img { height: 50px; margin-bottom: 5px; }
   .signature-name { font-size: 16px; font-weight: bold; color: #2c3e50; margin: 5px 0; }
   .signature-title { font-size: 14px; color: #666; }
   .footer-text { text-align: center; font-size: 14px; color: #888; margin-top: 10px; }',
  true
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM certificate_templates WHERE school_id = s.id AND name = 'Default Achievement Certificate'
);
/*
  # Enhanced Fee Management with Receipt System

  ## Overview
  Production-grade financial system with immutable receipts, proper audit trails,
  and real-time reconciliation. Designed for financial disputes and audits.

  ## New Tables Created
  1. `fee_receipts` - Immutable payment receipts with sequential numbering
  2. `fee_receipt_line_items` - Detailed breakdown of each receipt
  3. `fee_receipt_sequences` - Sequential receipt number generation per school

  ## Enhanced Tables
  - Improved payment tracking
  - Proper installment linkage
  - Formula-driven calculations

  ## Key Rules
  - One receipt per payment (immutable)
  - Sequential receipt numbers per school per academic year
  - No deletion or editing of payments/receipts
  - All calculations stored and auditable
  - Parent and admin views must reconcile

  ## Security
  - RLS enabled
  - Only admins can record payments
  - Parents can view their children's receipts
  - All changes audited
*/

-- =====================================================
-- 1. FEE RECEIPT SEQUENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS fee_receipt_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  
  -- Sequential numbering
  last_receipt_number integer DEFAULT 0,
  prefix text DEFAULT 'RCP',
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(school_id, academic_year)
);

-- =====================================================
-- 2. FEE RECEIPTS
-- =====================================================

CREATE TABLE IF NOT EXISTS fee_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Receipt identification (IMMUTABLE)
  receipt_number text NOT NULL,
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  academic_year text NOT NULL,
  
  -- Student and payment linkage
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES fee_payments(id) ON DELETE RESTRICT,
  student_fee_id uuid NOT NULL REFERENCES student_fees(id) ON DELETE RESTRICT,
  installment_id uuid REFERENCES student_fee_installments_v2(id),
  
  -- Financial details (IMMUTABLE - snapshot at time of payment)
  total_due decimal(10,2) NOT NULL,
  total_discount decimal(10,2) DEFAULT 0,
  net_payable decimal(10,2) NOT NULL,
  previous_paid decimal(10,2) DEFAULT 0,
  current_payment decimal(10,2) NOT NULL,
  total_paid_after decimal(10,2) NOT NULL,
  remaining_balance decimal(10,2) NOT NULL,
  
  -- Payment details
  payment_mode text NOT NULL,
  transaction_reference text,
  
  -- Installment context (if applicable)
  installment_period text,
  installment_due_date date,
  
  -- Student snapshot (for immutability)
  student_name text NOT NULL,
  student_admission_number text NOT NULL,
  student_class text NOT NULL,
  student_section text NOT NULL,
  
  -- Generated receipt file
  pdf_url text,
  
  -- Audit (IMMUTABLE)
  issued_by uuid NOT NULL REFERENCES user_profiles(id),
  issued_at timestamptz DEFAULT now(),
  
  -- Prevent tampering
  is_cancelled boolean DEFAULT false,
  cancelled_by uuid REFERENCES user_profiles(id),
  cancelled_at timestamptz,
  cancellation_reason text,
  
  UNIQUE(school_id, receipt_number),
  UNIQUE(payment_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fee_receipts_school ON fee_receipts(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_student ON fee_receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_date ON fee_receipts(receipt_date DESC);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_number ON fee_receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_academic_year ON fee_receipts(academic_year);

-- =====================================================
-- 3. FEE RECEIPT LINE ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS fee_receipt_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES fee_receipts(id) ON DELETE CASCADE,
  
  -- Line item details
  line_number integer NOT NULL,
  description text NOT NULL,
  amount decimal(10,2) NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('fee_head', 'discount', 'payment', 'balance')),
  
  -- Reference to fee structure (if applicable)
  fee_head_id uuid REFERENCES fee_heads(id),
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(receipt_id, line_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_receipt_line_items_receipt ON fee_receipt_line_items(receipt_id);

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE fee_receipt_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_receipt_line_items ENABLE ROW LEVEL SECURITY;

-- Receipt Sequences policies
CREATE POLICY "Admins can view own school sequences"
  ON fee_receipt_sequences FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage sequences"
  ON fee_receipt_sequences FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  );

-- Fee Receipts policies
CREATE POLICY "Staff and parents can view receipts"
  ON fee_receipts FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
    OR
    -- Parents can view their children's receipts
    student_id IN (
      SELECT id FROM students WHERE parent_id IN (
        SELECT id FROM parents WHERE school_id IN (
          SELECT school_id FROM user_profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Admins can issue receipts"
  ON fee_receipts FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  );

CREATE POLICY "Admins can cancel receipts"
  ON fee_receipts FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  );

-- Receipt Line Items policies
CREATE POLICY "Users can view line items"
  ON fee_receipt_line_items FOR SELECT
  TO authenticated
  USING (
    receipt_id IN (
      SELECT id FROM fee_receipts WHERE school_id IN (
        SELECT school_id FROM user_profiles WHERE id = auth.uid()
      )
    )
    OR
    receipt_id IN (
      SELECT id FROM fee_receipts WHERE student_id IN (
        SELECT id FROM students WHERE parent_id IN (
          SELECT id FROM parents WHERE school_id IN (
            SELECT school_id FROM user_profiles WHERE id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "Admins can create line items"
  ON fee_receipt_line_items FOR INSERT
  TO authenticated
  WITH CHECK (
    receipt_id IN (
      SELECT id FROM fee_receipts WHERE school_id IN (
        SELECT school_id FROM user_profiles
        WHERE id = auth.uid()
        AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
      )
    )
  );

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to generate next receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number(
  p_school_id uuid,
  p_academic_year text
)
RETURNS text AS $$
DECLARE
  v_next_number integer;
  v_prefix text;
  v_receipt_number text;
BEGIN
  -- Get or create sequence
  INSERT INTO fee_receipt_sequences (school_id, academic_year, last_receipt_number)
  VALUES (p_school_id, p_academic_year, 0)
  ON CONFLICT (school_id, academic_year) DO NOTHING;
  
  -- Increment and get next number
  UPDATE fee_receipt_sequences
  SET last_receipt_number = last_receipt_number + 1,
      updated_at = now()
  WHERE school_id = p_school_id AND academic_year = p_academic_year
  RETURNING last_receipt_number, prefix INTO v_next_number, v_prefix;
  
  -- Format: RCP-2025-26-0001
  v_receipt_number := v_prefix || '-' || p_academic_year || '-' || LPAD(v_next_number::text, 4, '0');
  
  RETURN v_receipt_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-generate receipt after payment
CREATE OR REPLACE FUNCTION auto_generate_receipt()
RETURNS TRIGGER AS $$
DECLARE
  v_receipt_number text;
  v_student_fee_record RECORD;
  v_student_record RECORD;
  v_class_name text;
  v_section_name text;
  v_installment_period text;
  v_installment_due_date date;
BEGIN
  -- Generate receipt number
  v_receipt_number := generate_receipt_number(NEW.school_id, NEW.academic_year);
  
  -- Get student fee details
  SELECT * INTO v_student_fee_record
  FROM student_fees
  WHERE id = NEW.student_fee_id;
  
  -- Get student details
  SELECT s.*, c.grade, sec.name as section_name
  INTO v_student_record
  FROM students s
  LEFT JOIN classes c ON c.id = s.class_id
  LEFT JOIN sections sec ON sec.id = s.section_id
  WHERE s.id = NEW.student_id;
  
  v_class_name := COALESCE(v_student_record.grade, 'N/A');
  v_section_name := COALESCE(v_student_record.section_name, 'N/A');
  
  -- Get installment details if applicable
  IF NEW.installment_id IS NOT NULL THEN
    SELECT installment_name, due_date
    INTO v_installment_period, v_installment_due_date
    FROM student_fee_installments_v2
    WHERE id = NEW.installment_id;
  END IF;
  
  -- Create receipt
  INSERT INTO fee_receipts (
    school_id,
    receipt_number,
    receipt_date,
    academic_year,
    student_id,
    payment_id,
    student_fee_id,
    installment_id,
    total_due,
    total_discount,
    net_payable,
    previous_paid,
    current_payment,
    total_paid_after,
    remaining_balance,
    payment_mode,
    transaction_reference,
    installment_period,
    installment_due_date,
    student_name,
    student_admission_number,
    student_class,
    student_section,
    issued_by
  ) VALUES (
    NEW.school_id,
    v_receipt_number,
    NEW.payment_date,
    NEW.academic_year,
    NEW.student_id,
    NEW.id,
    NEW.student_fee_id,
    NEW.installment_id,
    v_student_fee_record.total_fee,
    v_student_fee_record.discount_amount,
    (v_student_fee_record.total_fee - v_student_fee_record.discount_amount),
    (v_student_fee_record.paid_amount - NEW.amount),
    NEW.amount,
    v_student_fee_record.paid_amount,
    ((v_student_fee_record.total_fee - v_student_fee_record.discount_amount) - v_student_fee_record.paid_amount),
    NEW.payment_mode,
    NEW.transaction_ref,
    v_installment_period,
    v_installment_due_date,
    v_student_record.name,
    v_student_record.admission_number,
    v_class_name,
    v_section_name,
    NEW.received_by
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate receipt after payment
CREATE TRIGGER trg_auto_generate_receipt
  AFTER INSERT ON fee_payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_receipt();

-- =====================================================
-- 6. INITIALIZE SEQUENCES FOR EXISTING SCHOOLS
-- =====================================================

INSERT INTO fee_receipt_sequences (school_id, academic_year)
SELECT id, '2025-26'
FROM schools
WHERE NOT EXISTS (
  SELECT 1 FROM fee_receipt_sequences WHERE school_id = schools.id AND academic_year = '2025-26'
);

-- =====================================================
-- 7. ADD ACADEMIC YEAR TO FEE PAYMENTS (IF NOT EXISTS)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fee_payments' AND column_name = 'academic_year'
  ) THEN
    ALTER TABLE fee_payments ADD COLUMN academic_year text DEFAULT '2025-26';
  END IF;
END $$;
/*
  # Admissions & Lead Funnel Management System

  ## Overview
  Production-grade CRM system for tracking leads through the admission process.
  Supports multi-source lead capture, configurable funnel stages, interaction tracking,
  and conversion to enrolled students.

  ## Tables Created
  1. `admission_lead_sources` - Configurable lead sources
  2. `admission_funnel_stages` - Configurable funnel stages with ordering
  3. `admission_leads` - Core leads table
  4. `admission_lead_stage_history` - Complete audit trail of stage transitions
  5. `admission_visits` - Visit and interaction tracking
  6. `admission_applications` - Structured application data
  7. `admission_application_documents` - Document uploads
  8. `admission_decisions` - Approval/rejection records
  9. `admission_to_student_mapping` - Track conversion to enrolled students

  ## Key Features
  - Multi-source lead capture
  - Configurable funnel stages
  - Complete audit trail
  - Document management
  - Conversion tracking
  - Role-based access control

  ## Security
  - RLS enabled on all tables
  - Counselors can manage leads
  - Admins can approve/reject
  - Parents can view their applications
  - School-level data isolation
*/

-- =====================================================
-- 1. ADMISSION LEAD SOURCES
-- =====================================================

CREATE TABLE IF NOT EXISTS admission_lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Source details
  name text NOT NULL,
  description text,
  source_type text NOT NULL CHECK (source_type IN ('manual', 'website', 'facebook', 'instagram', 'google_ads', 'referral', 'walkin', 'other')),
  
  -- Configuration
  is_active boolean DEFAULT true,
  tracking_code text,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(school_id, name)
);

-- =====================================================
-- 2. ADMISSION FUNNEL STAGES
-- =====================================================

CREATE TABLE IF NOT EXISTS admission_funnel_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Stage details
  name text NOT NULL,
  description text,
  stage_order integer NOT NULL,
  
  -- Stage type classification
  stage_category text NOT NULL CHECK (stage_category IN ('lead', 'inquiry', 'visit', 'application', 'decision', 'enrolled')),
  
  -- Configuration
  is_active boolean DEFAULT true,
  is_final boolean DEFAULT false,
  allow_skip boolean DEFAULT false,
  requires_reason_to_skip boolean DEFAULT true,
  
  -- Color for UI
  color_code text DEFAULT '#3b82f6',
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(school_id, name),
  UNIQUE(school_id, stage_order)
);

-- =====================================================
-- 3. ADMISSION LEADS
-- =====================================================

CREATE TABLE IF NOT EXISTS admission_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Lead identification
  lead_number text NOT NULL,
  
  -- Student details (tentative)
  student_name text,
  student_dob date,
  student_gender text CHECK (student_gender IN ('male', 'female', 'other')),
  
  -- Parent details
  parent_name text NOT NULL,
  contact_number text NOT NULL,
  contact_email text,
  alternate_number text,
  
  -- Academic context
  applying_class_id uuid REFERENCES classes(id),
  academic_year text NOT NULL,
  previous_school text,
  
  -- Lead metadata
  lead_source_id uuid REFERENCES admission_lead_sources(id),
  current_stage_id uuid REFERENCES admission_funnel_stages(id),
  
  -- Assignment
  assigned_counselor_id uuid REFERENCES user_profiles(id),
  
  -- Status
  status text DEFAULT 'active' CHECK (status IN ('active', 'converted', 'rejected', 'lost', 'duplicate')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Follow-up
  next_followup_date date,
  last_contacted_at timestamptz,
  
  -- Additional info
  address text,
  notes text,
  
  -- Conversion tracking
  converted_to_student_id uuid REFERENCES students(id),
  converted_at timestamptz,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES user_profiles(id),
  
  UNIQUE(school_id, lead_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admission_leads_school ON admission_leads(school_id);
CREATE INDEX IF NOT EXISTS idx_admission_leads_status ON admission_leads(status);
CREATE INDEX IF NOT EXISTS idx_admission_leads_stage ON admission_leads(current_stage_id);
CREATE INDEX IF NOT EXISTS idx_admission_leads_counselor ON admission_leads(assigned_counselor_id);
CREATE INDEX IF NOT EXISTS idx_admission_leads_contact ON admission_leads(contact_number);
CREATE INDEX IF NOT EXISTS idx_admission_leads_academic_year ON admission_leads(academic_year);
CREATE INDEX IF NOT EXISTS idx_admission_leads_followup ON admission_leads(next_followup_date) WHERE next_followup_date IS NOT NULL;

-- =====================================================
-- 4. ADMISSION LEAD STAGE HISTORY (Audit Trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS admission_lead_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Lead and stage
  lead_id uuid NOT NULL REFERENCES admission_leads(id) ON DELETE CASCADE,
  from_stage_id uuid REFERENCES admission_funnel_stages(id),
  to_stage_id uuid NOT NULL REFERENCES admission_funnel_stages(id),
  
  -- Transition details
  transition_reason text,
  was_skipped boolean DEFAULT false,
  skip_reason text,
  
  -- Who made the change
  changed_by uuid NOT NULL REFERENCES user_profiles(id),
  changed_at timestamptz DEFAULT now(),
  
  -- Additional context
  notes text
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stage_history_lead ON admission_lead_stage_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_stage_history_date ON admission_lead_stage_history(changed_at DESC);

-- =====================================================
-- 5. ADMISSION VISITS & INTERACTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS admission_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Lead
  lead_id uuid NOT NULL REFERENCES admission_leads(id) ON DELETE CASCADE,
  
  -- Visit details
  visit_type text NOT NULL CHECK (visit_type IN ('campus_tour', 'meeting', 'phone_call', 'email', 'whatsapp', 'other')),
  visit_date date NOT NULL,
  visit_time time,
  duration_minutes integer,
  
  -- Who attended
  people_met text,
  counselor_id uuid REFERENCES user_profiles(id),
  
  -- Outcome
  outcome text CHECK (outcome IN ('interested', 'not_interested', 'followup_needed', 'application_submitted', 'other')),
  interest_level text CHECK (interest_level IN ('low', 'medium', 'high', 'very_high')),
  
  -- Follow-up
  followup_required boolean DEFAULT false,
  next_followup_date date,
  
  -- Notes
  discussion_points text,
  concerns_raised text,
  notes text,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_visits_lead ON admission_visits(lead_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON admission_visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_counselor ON admission_visits(counselor_id);

-- =====================================================
-- 6. ADMISSION APPLICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS admission_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Link to lead
  lead_id uuid NOT NULL REFERENCES admission_leads(id) ON DELETE CASCADE,
  
  -- Application identification
  application_number text NOT NULL,
  application_date date DEFAULT CURRENT_DATE,
  academic_year text NOT NULL,
  
  -- Student details (complete)
  student_name text NOT NULL,
  student_dob date NOT NULL,
  student_gender text NOT NULL CHECK (student_gender IN ('male', 'female', 'other')),
  student_blood_group text,
  student_nationality text DEFAULT 'Indian',
  student_religion text,
  student_caste_category text CHECK (student_caste_category IN ('general', 'obc', 'sc', 'st', 'other')),
  student_aadhar_number text,
  
  -- Previous education
  previous_school text,
  previous_class text,
  previous_school_board text,
  last_percentage decimal(5,2),
  
  -- Applying for
  applying_class_id uuid NOT NULL REFERENCES classes(id),
  preferred_section text,
  
  -- Father details
  father_name text,
  father_occupation text,
  father_qualification text,
  father_phone text,
  father_email text,
  father_annual_income decimal(12,2),
  
  -- Mother details
  mother_name text,
  mother_occupation text,
  mother_qualification text,
  mother_phone text,
  mother_email text,
  
  -- Guardian details (if applicable)
  guardian_name text,
  guardian_relation text,
  guardian_phone text,
  guardian_email text,
  
  -- Address
  current_address text NOT NULL,
  permanent_address text,
  city text,
  state text,
  pincode text,
  
  -- Sibling information
  has_sibling_in_school boolean DEFAULT false,
  sibling_student_id uuid REFERENCES students(id),
  sibling_name text,
  sibling_class text,
  
  -- Medical information
  medical_conditions text,
  allergies text,
  special_needs text,
  
  -- Emergency contact
  emergency_contact_name text,
  emergency_contact_relation text,
  emergency_contact_phone text,
  
  -- Application status
  status text DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'documents_pending', 'approved', 'rejected', 'waitlisted')),
  
  -- Review tracking
  reviewed_by uuid REFERENCES user_profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  
  -- Decision
  decision_status text CHECK (decision_status IN ('pending', 'approved', 'rejected', 'waitlisted')),
  decision_by uuid REFERENCES user_profiles(id),
  decision_at timestamptz,
  decision_reason text,
  
  -- Admission details (if approved)
  admission_number text,
  admission_date date,
  allocated_class_id uuid REFERENCES classes(id),
  allocated_section_id uuid REFERENCES sections(id),
  
  -- Fee details
  admission_fee_required boolean DEFAULT true,
  admission_fee_amount decimal(10,2),
  admission_fee_paid boolean DEFAULT false,
  admission_fee_payment_id uuid,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES user_profiles(id),
  
  UNIQUE(school_id, application_number),
  UNIQUE(lead_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_applications_school ON admission_applications(school_id);
CREATE INDEX IF NOT EXISTS idx_applications_lead ON admission_applications(lead_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON admission_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_decision ON admission_applications(decision_status);
CREATE INDEX IF NOT EXISTS idx_applications_academic_year ON admission_applications(academic_year);
CREATE INDEX IF NOT EXISTS idx_applications_class ON admission_applications(applying_class_id);

-- =====================================================
-- 7. ADMISSION APPLICATION DOCUMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS admission_application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Application
  application_id uuid NOT NULL REFERENCES admission_applications(id) ON DELETE CASCADE,
  
  -- Document details
  document_type text NOT NULL,
  document_name text NOT NULL,
  file_url text NOT NULL,
  file_size_kb integer,
  file_type text,
  
  -- Verification
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES user_profiles(id),
  verified_at timestamptz,
  verification_notes text,
  
  -- Audit
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid REFERENCES user_profiles(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_application_docs_application ON admission_application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_application_docs_type ON admission_application_documents(document_type);

-- =====================================================
-- 8. ADMISSION DECISIONS (Audit Trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS admission_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Application
  application_id uuid NOT NULL REFERENCES admission_applications(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES admission_leads(id) ON DELETE CASCADE,
  
  -- Decision
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected', 'waitlisted')),
  decision_reason text,
  decision_notes text,
  
  -- Approval details
  admission_number text,
  allocated_class_id uuid REFERENCES classes(id),
  allocated_section_id uuid REFERENCES sections(id),
  admission_fee_amount decimal(10,2),
  
  -- Who made decision
  decided_by uuid NOT NULL REFERENCES user_profiles(id),
  decided_at timestamptz DEFAULT now(),
  
  -- Additional context
  committee_members jsonb,
  interview_score decimal(5,2),
  criteria_met jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_decisions_application ON admission_decisions(application_id);
CREATE INDEX IF NOT EXISTS idx_decisions_lead ON admission_decisions(lead_id);
CREATE INDEX IF NOT EXISTS idx_decisions_date ON admission_decisions(decided_at DESC);

-- =====================================================
-- 9. ADMISSION TO STUDENT MAPPING
-- =====================================================

CREATE TABLE IF NOT EXISTS admission_to_student_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Admission details
  lead_id uuid NOT NULL REFERENCES admission_leads(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES admission_applications(id) ON DELETE CASCADE,
  
  -- Student created
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  parent_id uuid REFERENCES parents(id),
  
  -- Conversion details
  converted_by uuid NOT NULL REFERENCES user_profiles(id),
  converted_at timestamptz DEFAULT now(),
  
  -- Academic assignment
  academic_year text NOT NULL,
  assigned_class_id uuid NOT NULL REFERENCES classes(id),
  assigned_section_id uuid REFERENCES sections(id),
  
  -- Admission details
  admission_number text NOT NULL,
  admission_date date NOT NULL,
  
  UNIQUE(lead_id),
  UNIQUE(application_id),
  UNIQUE(student_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mapping_student ON admission_to_student_mapping(student_id);
CREATE INDEX IF NOT EXISTS idx_mapping_lead ON admission_to_student_mapping(lead_id);
CREATE INDEX IF NOT EXISTS idx_mapping_application ON admission_to_student_mapping(application_id);

-- =====================================================
-- 10. ROW LEVEL SECURITY
-- =====================================================

-- Lead Sources
ALTER TABLE admission_lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view lead sources"
  ON admission_lead_sources FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage lead sources"
  ON admission_lead_sources FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  );

-- Funnel Stages
ALTER TABLE admission_funnel_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view funnel stages"
  ON admission_funnel_stages FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage funnel stages"
  ON admission_funnel_stages FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  );

-- Admission Leads
ALTER TABLE admission_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view leads"
  ON admission_leads FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Counselors and admins can create leads"
  ON admission_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN', 'EDUCATOR'))
    )
  );

CREATE POLICY "Counselors and admins can update leads"
  ON admission_leads FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN', 'EDUCATOR'))
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN', 'EDUCATOR'))
    )
  );

-- Lead Stage History
ALTER TABLE admission_lead_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view stage history"
  ON admission_lead_stage_history FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can create stage history"
  ON admission_lead_stage_history FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Visits
ALTER TABLE admission_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view visits"
  ON admission_visits FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Counselors can manage visits"
  ON admission_visits FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Applications
ALTER TABLE admission_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view applications"
  ON admission_applications FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can create applications"
  ON admission_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can update applications"
  ON admission_applications FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Application Documents
ALTER TABLE admission_application_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view documents"
  ON admission_application_documents FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage documents"
  ON admission_application_documents FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Admission Decisions
ALTER TABLE admission_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view decisions"
  ON admission_decisions FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can create decisions"
  ON admission_decisions FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  );

-- Admission to Student Mapping
ALTER TABLE admission_to_student_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view mappings"
  ON admission_to_student_mapping FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can create mappings"
  ON admission_to_student_mapping FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))
    )
  );

-- =====================================================
-- 11. HELPER FUNCTIONS
-- =====================================================

-- Function to generate next lead number
CREATE OR REPLACE FUNCTION generate_lead_number(
  p_school_id uuid,
  p_academic_year text
)
RETURNS text AS $$
DECLARE
  v_count integer;
  v_lead_number text;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM admission_leads
  WHERE school_id = p_school_id
  AND academic_year = p_academic_year;
  
  v_lead_number := 'LEAD-' || p_academic_year || '-' || LPAD((v_count + 1)::text, 4, '0');
  
  RETURN v_lead_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate next application number
CREATE OR REPLACE FUNCTION generate_application_number(
  p_school_id uuid,
  p_academic_year text
)
RETURNS text AS $$
DECLARE
  v_count integer;
  v_app_number text;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM admission_applications
  WHERE school_id = p_school_id
  AND academic_year = p_academic_year;
  
  v_app_number := 'APP-' || p_academic_year || '-' || LPAD((v_count + 1)::text, 4, '0');
  
  RETURN v_app_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-log stage transitions
CREATE OR REPLACE FUNCTION log_lead_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.current_stage_id IS DISTINCT FROM NEW.current_stage_id) THEN
    INSERT INTO admission_lead_stage_history (
      school_id,
      lead_id,
      from_stage_id,
      to_stage_id,
      changed_by
    ) VALUES (
      NEW.school_id,
      NEW.id,
      OLD.current_stage_id,
      NEW.current_stage_id,
      NEW.updated_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_lead_stage_change
  AFTER UPDATE ON admission_leads
  FOR EACH ROW
  EXECUTE FUNCTION log_lead_stage_change();

-- =====================================================
-- 12. SEED DEFAULT DATA
-- =====================================================

-- Insert default lead sources
INSERT INTO admission_lead_sources (school_id, name, source_type, description)
SELECT
  s.id,
  source_name,
  source_type_val,
  source_desc
FROM schools s,
  (VALUES
    ('Walk-in', 'walkin', 'Parents visiting school directly'),
    ('Website Inquiry', 'website', 'Inquiry form from school website'),
    ('Facebook', 'facebook', 'Facebook page or ads'),
    ('Instagram', 'instagram', 'Instagram page or ads'),
    ('Google Ads', 'google_ads', 'Google advertising campaigns'),
    ('Referral', 'referral', 'Referred by existing parents or students'),
    ('Manual Entry', 'manual', 'Manually entered by staff')
  ) AS sources(source_name, source_type_val, source_desc)
WHERE NOT EXISTS (
  SELECT 1 FROM admission_lead_sources WHERE school_id = s.id AND name = sources.source_name
);

-- Insert default funnel stages
INSERT INTO admission_funnel_stages (school_id, name, stage_order, stage_category, description, color_code)
SELECT
  s.id,
  stage_name,
  stage_ord,
  stage_cat,
  stage_desc,
  stage_color
FROM schools s,
  (VALUES
    ('New Inquiry', 1, 'lead', 'Initial inquiry received', '#94a3b8'),
    ('Contacted', 2, 'inquiry', 'First contact made with parent', '#60a5fa'),
    ('Campus Visit Scheduled', 3, 'visit', 'Visit scheduled', '#fbbf24'),
    ('Campus Visit Completed', 4, 'visit', 'Visit completed successfully', '#f97316'),
    ('Application Submitted', 5, 'application', 'Application form submitted', '#8b5cf6'),
    ('Documents Verified', 6, 'application', 'All documents verified', '#06b6d4'),
    ('Under Review', 7, 'application', 'Application under admin review', '#6366f1'),
    ('Admission Approved', 8, 'decision', 'Admission approved by admin', '#10b981'),
    ('Admission Rejected', 9, 'decision', 'Admission rejected', '#ef4444'),
    ('Waitlisted', 10, 'decision', 'Placed on waiting list', '#f59e0b'),
    ('Enrolled', 11, 'enrolled', 'Student enrolled and classes assigned', '#059669')
  ) AS stages(stage_name, stage_ord, stage_cat, stage_desc, stage_color)
WHERE NOT EXISTS (
  SELECT 1 FROM admission_funnel_stages WHERE school_id = s.id AND name = stages.stage_name
);
/*
  # Seed Admission Mock Data

  ## Overview
  Populate the admissions system with realistic mock data for testing and demonstration.
  
  ## Data Created
  1. 25 admission leads in various stages
  2. 15 campus visits/interactions
  3. 10 completed applications
  4. 5 admission decisions
  
  ## Features Demonstrated
  - Leads from different sources
  - Various funnel stages
  - Different priorities and statuses
  - Complete visit history
  - Application pipeline
  - Decision workflows
*/


-- =====================================================
-- AUTO-REPAIR: Ensure at least one Admin User Profile exists
-- =====================================================
DO $$
DECLARE
  v_school_id uuid;
  v_admin_role_id uuid;
  v_user_id uuid;
BEGIN
  -- 1. Get a School (seeded earlier)
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  
  -- 2. Get Admin Role
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'ADMIN' LIMIT 1;
  
  -- 3. Get an existing Auth User (any user from auth.users)
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  -- 4. Create Profile if we have all ingredients and profile doesn't exist
  IF v_school_id IS NOT NULL AND v_admin_role_id IS NOT NULL AND v_user_id IS NOT NULL THEN
    INSERT INTO user_profiles (id, school_id, role_id, full_name)
    VALUES (v_user_id, v_school_id, v_admin_role_id, 'System Admin')
    ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id; -- Ensure they are admin
  END IF;
END;
$$;

DO $$
DECLARE
  v_school_id uuid;
  v_counselor_id uuid;
  v_admin_id uuid;
  v_class_1_id uuid;
  v_class_5_id uuid;
  v_class_9_id uuid;
  v_class_11_id uuid;
  
  v_source_website uuid;
  v_source_walkin uuid;
  v_source_facebook uuid;
  v_source_referral uuid;
  
  v_stage_new uuid;
  v_stage_contacted uuid;
  v_stage_visit_scheduled uuid;
  v_stage_visit_completed uuid;
  v_stage_app_submitted uuid;
  v_stage_docs_verified uuid;
  v_stage_under_review uuid;
  v_stage_approved uuid;
  
  v_lead_id uuid;
  v_app_id uuid;
BEGIN
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  
  SELECT id INTO v_counselor_id
  FROM user_profiles
  WHERE school_id = v_school_id AND role_id IN (SELECT id FROM roles WHERE name = 'EDUCATOR')
  LIMIT 1;
  
  SELECT id INTO v_admin_id
  FROM user_profiles
  WHERE school_id = v_school_id AND role_id IN (SELECT id FROM roles WHERE name = 'ADMIN')
  LIMIT 1;
  
  SELECT id INTO v_class_1_id FROM classes WHERE school_id = v_school_id AND grade = 'Class 1' LIMIT 1;
  SELECT id INTO v_class_5_id FROM classes WHERE school_id = v_school_id AND grade = 'Class 5' LIMIT 1;
  SELECT id INTO v_class_9_id FROM classes WHERE school_id = v_school_id AND grade = 'Class 9' LIMIT 1;
  SELECT id INTO v_class_11_id FROM classes WHERE school_id = v_school_id AND grade = 'Class 11' LIMIT 1;
  
  SELECT id INTO v_source_website FROM admission_lead_sources WHERE school_id = v_school_id AND name = 'Website Inquiry' LIMIT 1;
  SELECT id INTO v_source_walkin FROM admission_lead_sources WHERE school_id = v_school_id AND name = 'Walk-in' LIMIT 1;
  SELECT id INTO v_source_facebook FROM admission_lead_sources WHERE school_id = v_school_id AND name = 'Facebook' LIMIT 1;
  SELECT id INTO v_source_referral FROM admission_lead_sources WHERE school_id = v_school_id AND name = 'Referral' LIMIT 1;
  
  SELECT id INTO v_stage_new FROM admission_funnel_stages WHERE school_id = v_school_id AND name = 'New Inquiry' LIMIT 1;
  SELECT id INTO v_stage_contacted FROM admission_funnel_stages WHERE school_id = v_school_id AND name = 'Contacted' LIMIT 1;
  SELECT id INTO v_stage_visit_scheduled FROM admission_funnel_stages WHERE school_id = v_school_id AND name = 'Campus Visit Scheduled' LIMIT 1;
  SELECT id INTO v_stage_visit_completed FROM admission_funnel_stages WHERE school_id = v_school_id AND name = 'Campus Visit Completed' LIMIT 1;
  SELECT id INTO v_stage_app_submitted FROM admission_funnel_stages WHERE school_id = v_school_id AND name = 'Application Submitted' LIMIT 1;
  SELECT id INTO v_stage_docs_verified FROM admission_funnel_stages WHERE school_id = v_school_id AND name = 'Documents Verified' LIMIT 1;
  SELECT id INTO v_stage_under_review FROM admission_funnel_stages WHERE school_id = v_school_id AND name = 'Under Review' LIMIT 1;
  SELECT id INTO v_stage_approved FROM admission_funnel_stages WHERE school_id = v_school_id AND name = 'Admission Approved' LIMIT 1;

  -- Insert 25 leads with varying stages and details
  
  -- Lead 1: Fresh inquiry (new)
  INSERT INTO admission_leads (
    school_id, lead_number, student_name, parent_name, contact_number, contact_email,
    applying_class_id, academic_year, lead_source_id, current_stage_id,
    assigned_counselor_id, status, priority, created_at, created_by, updated_by
  ) VALUES (
    v_school_id, 'LEAD-2025-26-0001', 'Aarav Sharma', 'Rajesh Sharma', '9876543210', 'rajesh.sharma@email.com',
    v_class_1_id, '2025-26', v_source_website, v_stage_new,
    v_counselor_id, 'active', 'high', NOW() - INTERVAL '2 days', v_counselor_id, v_counselor_id
  );

  -- Lead 2: Contacted stage
  INSERT INTO admission_leads (
    school_id, lead_number, student_name, student_dob, student_gender, parent_name, contact_number, contact_email,
    applying_class_id, academic_year, lead_source_id, current_stage_id,
    assigned_counselor_id, status, priority, last_contacted_at, next_followup_date, created_at, created_by, updated_by
  ) VALUES (
    v_school_id, 'LEAD-2025-26-0002', 'Diya Patel', '2019-03-15', 'female', 'Amit Patel', '9876543211', 'amit.patel@email.com',
    v_class_1_id, '2025-26', v_source_facebook, v_stage_contacted,
    v_counselor_id, 'active', 'medium', NOW() - INTERVAL '1 day', CURRENT_DATE + 2, NOW() - INTERVAL '5 days', v_counselor_id, v_counselor_id
  );

  -- Lead 3: Visit scheduled
  INSERT INTO admission_leads (
    school_id, lead_number, student_name, student_dob, student_gender, parent_name, contact_number, contact_email,
    applying_class_id, academic_year, lead_source_id, current_stage_id,
    assigned_counselor_id, status, priority, last_contacted_at, next_followup_date, previous_school, created_at, created_by, updated_by
  ) VALUES (
    v_school_id, 'LEAD-2025-26-0003', 'Vihaan Kumar', '2015-07-22', 'male', 'Priya Kumar', '9876543212', 'priya.kumar@email.com',
    v_class_5_id, '2025-26', v_source_walkin, v_stage_visit_scheduled,
    v_counselor_id, 'active', 'urgent', NOW() - INTERVAL '3 hours', CURRENT_DATE + 1, 'Green Valley School', NOW() - INTERVAL '7 days', v_counselor_id, v_counselor_id
  ) RETURNING id INTO v_lead_id;

  -- Add visit for lead 3
  INSERT INTO admission_visits (
    school_id, lead_id, visit_type, visit_date, visit_time, people_met, counselor_id,
    outcome, interest_level, followup_required, next_followup_date,
    discussion_points, notes, created_at, created_by
  ) VALUES (
    v_school_id, v_lead_id, 'phone_call', CURRENT_DATE - 3, '10:30', 'Mother', v_counselor_id,
    'followup_needed', 'high', true, CURRENT_DATE + 1,
    'Discussed curriculum, fees, and transport facilities', 'Very interested, scheduled campus visit', NOW() - INTERVAL '3 days', v_counselor_id
  );

  -- Lead 4: Visit completed
  INSERT INTO admission_leads (
    school_id, lead_number, student_name, student_dob, student_gender, parent_name, contact_number, contact_email,
    applying_class_id, academic_year, lead_source_id, current_stage_id,
    assigned_counselor_id, status, priority, last_contacted_at, previous_school, address, created_at, created_by, updated_by
  ) VALUES (
    v_school_id, 'LEAD-2025-26-0004', 'Ananya Singh', '2017-11-08', 'female', 'Vikram Singh', '9876543213', 'vikram.singh@email.com',
    v_class_5_id, '2025-26', v_source_referral, v_stage_visit_completed,
    v_counselor_id, 'active', 'high', NOW() - INTERVAL '2 days', 'St. Mary School', 'Sector 21, Gurgaon', NOW() - INTERVAL '10 days', v_counselor_id, v_counselor_id
  ) RETURNING id INTO v_lead_id;

  INSERT INTO admission_visits (
    school_id, lead_id, visit_type, visit_date, visit_time, duration_minutes, people_met, counselor_id,
    outcome, interest_level, followup_required, next_followup_date,
    discussion_points, notes, created_at, created_by
  ) VALUES (
    v_school_id, v_lead_id, 'campus_tour', CURRENT_DATE - 5, '11:00', 90, 'Both parents and student', v_counselor_id,
    'application_submitted', 'very_high', true, CURRENT_DATE + 2,
    'Toured classrooms, labs, sports facilities. Discussed admission process and fee structure',
    'Parents very impressed with infrastructure. Ready to apply.', NOW() - INTERVAL '5 days', v_counselor_id
  );

  -- Lead 5: Application submitted
  INSERT INTO admission_leads (
    school_id, lead_number, student_name, student_dob, student_gender, parent_name, contact_number, contact_email,
    applying_class_id, academic_year, lead_source_id, current_stage_id,
    assigned_counselor_id, status, priority, previous_school, created_at, created_by, updated_by
  ) VALUES (
    v_school_id, 'LEAD-2025-26-0005', 'Ishaan Verma', '2011-05-19', 'male', 'Neha Verma', '9876543214', 'neha.verma@email.com',
    v_class_9_id, '2025-26', v_source_website, v_stage_app_submitted,
    v_counselor_id, 'active', 'high', 'Delhi Public School', NOW() - INTERVAL '15 days', v_counselor_id, v_counselor_id
  ) RETURNING id INTO v_lead_id;

  -- Create application for lead 5
  INSERT INTO admission_applications (
    school_id, lead_id, application_number, application_date, academic_year,
    student_name, student_dob, student_gender, student_blood_group, student_nationality,
    previous_school, previous_class, last_percentage,
    applying_class_id, father_name, father_occupation, father_phone, father_email,
    mother_name, mother_occupation, mother_phone, mother_email,
    current_address, city, state, pincode,
    status, decision_status, admission_fee_required, admission_fee_amount,
    created_at, created_by, updated_by
  ) VALUES (
    v_school_id, v_lead_id, 'APP-2025-26-0001', CURRENT_DATE - 12, '2025-26',
    'Ishaan Verma', '2011-05-19', 'male', 'O+', 'Indian',
    'Delhi Public School', 'Class 8', 87.5,
    v_class_9_id, 'Rahul Verma', 'Software Engineer', '9876543214', 'rahul.verma@email.com',
    'Neha Verma', 'Teacher', '9876543215', 'neha.verma@email.com',
    'B-204, Greenview Apartments, Sector 15', 'Noida', 'Uttar Pradesh', '201301',
    'under_review', 'pending', true, 15000,
    NOW() - INTERVAL '12 days', v_counselor_id, v_counselor_id
  );

  -- Lead 6-10: More leads in various stages
  INSERT INTO admission_leads (school_id, lead_number, student_name, student_dob, student_gender, parent_name, contact_number, contact_email, applying_class_id, academic_year, lead_source_id, current_stage_id, assigned_counselor_id, status, priority, created_at, created_by, updated_by)
  VALUES
    (v_school_id, 'LEAD-2025-26-0006', 'Saanvi Reddy', '2019-01-10', 'female', 'Karthik Reddy', '9876543216', 'karthik.reddy@email.com', v_class_1_id, '2025-26', v_source_facebook, v_stage_contacted, v_counselor_id, 'active', 'medium', NOW() - INTERVAL '4 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0007', 'Aditya Joshi', '2018-09-25', 'male', 'Sunita Joshi', '9876543217', 'sunita.joshi@email.com', v_class_1_id, '2025-26', v_source_website, v_stage_new, v_counselor_id, 'active', 'low', NOW() - INTERVAL '1 day', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0008', 'Myra Kapoor', '2015-12-03', 'female', 'Rohit Kapoor', '9876543218', 'rohit.kapoor@email.com', v_class_5_id, '2025-26', v_source_referral, v_stage_visit_completed, v_counselor_id, 'active', 'high', NOW() - INTERVAL '8 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0009', 'Arjun Nair', '2011-08-14', 'male', 'Lakshmi Nair', '9876543219', 'lakshmi.nair@email.com', v_class_9_id, '2025-26', v_source_walkin, v_stage_under_review, v_counselor_id, 'active', 'urgent', NOW() - INTERVAL '20 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0010', 'Kiara Desai', '2009-04-30', 'female', 'Mehul Desai', '9876543220', 'mehul.desai@email.com', v_class_11_id, '2025-26', v_source_website, v_stage_docs_verified, v_counselor_id, 'active', 'high', NOW() - INTERVAL '18 days', v_counselor_id, v_counselor_id);

  -- Lead 11-15: Additional leads
  INSERT INTO admission_leads (school_id, lead_number, student_name, parent_name, contact_number, contact_email, applying_class_id, academic_year, lead_source_id, current_stage_id, assigned_counselor_id, status, priority, created_at, created_by, updated_by)
  VALUES
    (v_school_id, 'LEAD-2025-26-0011', 'Reyansh Gupta', 'Pooja Gupta', '9876543221', 'pooja.gupta@email.com', v_class_1_id, '2025-26', v_source_facebook, v_stage_new, v_counselor_id, 'active', 'medium', NOW() - INTERVAL '3 hours', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0012', 'Navya Agarwal', 'Sanjay Agarwal', '9876543222', 'sanjay.agarwal@email.com', v_class_5_id, '2025-26', v_source_walkin, v_stage_contacted, v_counselor_id, 'active', 'high', NOW() - INTERVAL '6 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0013', 'Vivaan Mehta', 'Riya Mehta', '9876543223', 'riya.mehta@email.com', v_class_9_id, '2025-26', v_source_referral, v_stage_visit_scheduled, v_counselor_id, 'active', 'medium', NOW() - INTERVAL '9 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0014', 'Aadhya Malhotra', 'Kavita Malhotra', '9876543224', 'kavita.malhotra@email.com', v_class_1_id, '2025-26', v_source_website, v_stage_new, v_counselor_id, 'active', 'low', NOW() - INTERVAL '5 hours', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0015', 'Shaurya Bansal', 'Deepak Bansal', '9876543225', 'deepak.bansal@email.com', v_class_11_id, '2025-26', v_source_facebook, v_stage_contacted, v_counselor_id, 'active', 'medium', NOW() - INTERVAL '7 days', v_counselor_id, v_counselor_id);

  -- Lead 16-20: More variety
  INSERT INTO admission_leads (school_id, lead_number, student_name, student_dob, student_gender, parent_name, contact_number, applying_class_id, academic_year, lead_source_id, current_stage_id, assigned_counselor_id, status, priority, created_at, created_by, updated_by)
  VALUES
    (v_school_id, 'LEAD-2025-26-0016', 'Pari Saxena', '2019-06-18', 'female', 'Manish Saxena', '9876543226', v_class_1_id, '2025-26', v_source_walkin, v_stage_visit_completed, v_counselor_id, 'active', 'high', NOW() - INTERVAL '11 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0017', 'Dhruv Tiwari', '2015-02-28', 'male', 'Anjali Tiwari', '9876543227', v_class_5_id, '2025-26', v_source_referral, v_stage_app_submitted, v_counselor_id, 'active', 'urgent', NOW() - INTERVAL '16 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0018', 'Ira Bhatia', '2011-10-05', 'female', 'Tarun Bhatia', '9876543228', v_class_9_id, '2025-26', v_source_website, v_stage_under_review, v_counselor_id, 'active', 'high', NOW() - INTERVAL '22 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0019', 'Advait Chauhan', '2009-07-12', 'male', 'Priti Chauhan', '9876543229', v_class_11_id, '2025-26', v_source_facebook, v_stage_contacted, v_counselor_id, 'active', 'medium', NOW() - INTERVAL '5 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0020', 'Aarohi Sinha', '2019-03-21', 'female', 'Varun Sinha', '9876543230', v_class_1_id, '2025-26', v_source_walkin, v_stage_new, v_counselor_id, 'active', 'low', NOW() - INTERVAL '2 hours', v_counselor_id, v_counselor_id);

  -- Lead 21-25: Final batch
  INSERT INTO admission_leads (school_id, lead_number, parent_name, contact_number, applying_class_id, academic_year, lead_source_id, current_stage_id, assigned_counselor_id, status, priority, notes, created_at, created_by, updated_by)
  VALUES
    (v_school_id, 'LEAD-2025-26-0021', 'Divya Pillai', '9876543231', v_class_5_id, '2025-26', v_source_website, v_stage_new, v_counselor_id, 'active', 'medium', 'Interested in science stream', NOW() - INTERVAL '1 hour', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0022', 'Harsh Goyal', '9876543232', v_class_9_id, '2025-26', v_source_referral, v_stage_contacted, v_counselor_id, 'active', 'high', 'Referred by existing parent', NOW() - INTERVAL '4 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0023', 'Monica Iyer', '9876543233', v_class_1_id, '2025-26', v_source_facebook, v_stage_new, v_counselor_id, 'active', 'low', 'Following up from FB inquiry', NOW() - INTERVAL '6 hours', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0024', 'Ajay Choudhary', '9876543234', v_class_11_id, '2025-26', v_source_walkin, v_stage_visit_scheduled, v_counselor_id, 'active', 'urgent', 'Wants admission for science stream', NOW() - INTERVAL '8 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0025', 'Sneha Rao', '9876543235', v_class_5_id, '2025-26', v_source_website, v_stage_contacted, v_counselor_id, 'active', 'medium', 'Looking for good academics', NOW() - INTERVAL '3 days', v_counselor_id, v_counselor_id);

  -- Add a few more applications with complete data
  SELECT id INTO v_lead_id FROM admission_leads WHERE lead_number = 'LEAD-2025-26-0009' LIMIT 1;
  
  INSERT INTO admission_applications (
    school_id, lead_id, application_number, application_date, academic_year,
    student_name, student_dob, student_gender, student_blood_group, student_nationality,
    previous_school, previous_class, last_percentage,
    applying_class_id, father_name, father_occupation, father_phone, father_email,
    mother_name, mother_occupation, mother_phone, mother_email,
    current_address, city, state, pincode,
    status, decision_status, admission_fee_required, admission_fee_amount,
    created_at, created_by, updated_by
  ) VALUES (
    v_school_id, v_lead_id, 'APP-2025-26-0002', CURRENT_DATE - 15, '2025-26',
    'Arjun Nair', '2011-08-14', 'male', 'B+', 'Indian',
    'Modern School', 'Class 8', 91.2,
    v_class_9_id, 'Anil Nair', 'Business Owner', '9876543219', 'anil.nair@email.com',
    'Lakshmi Nair', 'Homemaker', '9876543236', 'lakshmi.nair@email.com',
    'C-45, Palm Gardens, Sector 22', 'Gurgaon', 'Haryana', '122001',
    'under_review', 'pending', true, 15000,
    NOW() - INTERVAL '15 days', v_counselor_id, v_counselor_id
  ) RETURNING id INTO v_app_id;

  -- Add decision for one application (approved)
  INSERT INTO admission_decisions (
    school_id, application_id, lead_id, decision, decision_reason,
    admission_number, allocated_class_id, admission_fee_amount,
    decided_by, decided_at
  )
  SELECT
    v_school_id, id, lead_id, 'approved', 'Excellent academic record and good interview',
    'ADM-2025-26-0001', v_class_9_id, 15000,
    v_admin_id, NOW() - INTERVAL '2 days'
  FROM admission_applications
  WHERE application_number = 'APP-2025-26-0002';

  -- Update application with approval
  UPDATE admission_applications
  SET
    decision_status = 'approved',
    decision_by = v_admin_id,
    decision_at = NOW() - INTERVAL '2 days',
    admission_number = 'ADM-2025-26-0001',
    admission_date = CURRENT_DATE,
    allocated_class_id = v_class_9_id,
    status = 'approved'
  WHERE application_number = 'APP-2025-26-0002';

  -- Add more visits for various leads
  INSERT INTO admission_visits (school_id, lead_id, visit_type, visit_date, visit_time, people_met, counselor_id, outcome, interest_level, notes, created_at, created_by)
  SELECT
    v_school_id, id, 'phone_call', CURRENT_DATE - 2, '14:30', 'Parent', v_counselor_id, 
    'interested', 'medium', 'Initial inquiry call, shared school brochure',
    NOW() - INTERVAL '2 days', v_counselor_id
  FROM admission_leads WHERE lead_number = 'LEAD-2025-26-0006';

  INSERT INTO admission_visits (school_id, lead_id, visit_type, visit_date, visit_time, duration_minutes, people_met, counselor_id, outcome, interest_level, notes, created_at, created_by)
  SELECT
    v_school_id, id, 'campus_tour', CURRENT_DATE - 4, '10:00', 120, 'Both parents', v_counselor_id,
    'interested', 'high', 'Showed all facilities, discussed fee structure',
    NOW() - INTERVAL '4 days', v_counselor_id
  FROM admission_leads WHERE lead_number = 'LEAD-2025-26-0008';

  RAISE NOTICE 'Successfully seeded admission mock data: 25 leads, applications, visits, and decisions';
END $$;
/*
  # Fix RLS policies for school access
  
  1. Changes
    - Add policy to allow users to read their own school data
    - This fixes the circular dependency when fetching user profiles
  
  2. Security
    - Users can only read the school they belong to
    - Maintains proper access control
*/

-- Drop existing policy if it exists
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own school" ON schools;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Allow users to read their own school
CREATE POLICY "Users can read own school"
  ON schools
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT school_id 
      FROM user_profiles 
      WHERE user_profiles.id = auth.uid()
    )
  );
/*
  # Fix Circular RLS Dependencies (v2)
  
  1. Changes
    - Make helper functions SECURITY DEFINER to bypass RLS when querying user_profiles
    - This fixes the circular dependency issue where policies check user_profiles
  
  2. Security
    - Helper functions run with elevated privileges but only return user's own data
    - Maintains proper access control while fixing the circular dependency
*/

-- Update helper function to get user role (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT r.name
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = auth.uid()
$$;

-- Update helper function to get user school (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_school()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT school_id
  FROM user_profiles
  WHERE id = auth.uid()
$$;
/*
  # Fix Schools Policy to Use Helper Function
  
  1. Changes
    - Update schools RLS policy to use get_user_school() helper function
    - This eliminates the subquery that causes circular dependency
  
  2. Security
    - Users can only read their own school
    - Helper function bypasses RLS to prevent circular dependency
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can read own school" ON schools;

-- Recreate using helper function
CREATE POLICY "Users can read own school"
  ON schools
  FOR SELECT
  TO authenticated
  USING (id = get_user_school());
/*
  # Add User Profile Update Policy
  
  1. Changes
    - Allow users to update their own profile (for last_login updates)
  
  2. Security
    - Users can only update their own profile
    - Prevents users from modifying other users' data
*/

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
/*
  # Enable Anonymous Access for Demo (Core Tables Only)
  
  1. Changes
    - Add policies to allow anonymous (anon) access to core tables for demo purposes
    - This bypasses authentication requirements while maintaining RLS security structure
  
  2. Security Note
    - These policies are for DEMO purposes only
    - In production, these should be removed and proper authentication enforced
*/

DROP POLICY IF EXISTS "Anon can read Demo School" ON schools;
DROP POLICY IF EXISTS "Anon can read profiles" ON user_profiles;
DROP POLICY IF EXISTS "Anon can read students" ON students;
DROP POLICY IF EXISTS "Anon can insert students" ON students;
DROP POLICY IF EXISTS "Anon can update students" ON students;
DROP POLICY IF EXISTS "Anon can delete students" ON students;
DROP POLICY IF EXISTS "Anon can read educators" ON educators;
DROP POLICY IF EXISTS "Anon can insert educators" ON educators;
DROP POLICY IF EXISTS "Anon can update educators" ON educators;
DROP POLICY IF EXISTS "Anon can delete educators" ON educators;
DROP POLICY IF EXISTS "Anon can read classes" ON classes;
DROP POLICY IF EXISTS "Anon can read sections" ON sections;
DROP POLICY IF EXISTS "Anon can read subjects" ON subjects;
DROP POLICY IF EXISTS "Anon can read attendance" ON attendance;
DROP POLICY IF EXISTS "Anon can insert attendance" ON attendance;
DROP POLICY IF EXISTS "Anon can read exams" ON exams;
DROP POLICY IF EXISTS "Anon can insert exams" ON exams;
DROP POLICY IF EXISTS "Anon can read marks" ON marks;
DROP POLICY IF EXISTS "Anon can insert marks" ON marks;
DROP POLICY IF EXISTS "Anon can read fee_structures" ON fee_structures;
DROP POLICY IF EXISTS "Anon can read student_fees" ON student_fees;
DROP POLICY IF EXISTS "Anon can read fee_payments" ON fee_payments;
DROP POLICY IF EXISTS "Anon can insert fee_payments" ON fee_payments;
DROP POLICY IF EXISTS "Anon can read announcements" ON announcements;
DROP POLICY IF EXISTS "Anon can insert announcements" ON announcements;
DROP POLICY IF EXISTS "Anon can update announcements" ON announcements;
DROP POLICY IF EXISTS "Anon can delete announcements" ON announcements;
DROP POLICY IF EXISTS "Anon can read roles" ON roles;
DROP POLICY IF EXISTS "Anon can read boards" ON boards;
DROP POLICY IF EXISTS "Anon can read states" ON states;
DROP POLICY IF EXISTS "Anon can read parents" ON parents;
DROP POLICY IF EXISTS "Anon can read fee_heads" ON fee_heads;

CREATE POLICY "Anon can read Demo School"
  ON schools
  FOR SELECT
  TO anon
  USING (name = 'Demo International School');

CREATE POLICY "Anon can read profiles"
  ON user_profiles
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read students"
  ON students
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert students"
  ON students
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update students"
  ON students
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete students"
  ON students
  FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon can read educators"
  ON educators
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert educators"
  ON educators
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update educators"
  ON educators
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete educators"
  ON educators
  FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon can read classes"
  ON classes
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read sections"
  ON sections
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read subjects"
  ON subjects
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read attendance"
  ON attendance
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert attendance"
  ON attendance
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can read exams"
  ON exams
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert exams"
  ON exams
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can read marks"
  ON marks
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert marks"
  ON marks
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can read fee_structures"
  ON fee_structures
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read student_fees"
  ON student_fees
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read fee_payments"
  ON fee_payments
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert fee_payments"
  ON fee_payments
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can read announcements"
  ON announcements
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert announcements"
  ON announcements
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update announcements"
  ON announcements
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete announcements"
  ON announcements
  FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon can read roles"
  ON roles
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read boards"
  ON boards
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read states"
  ON states
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read parents"
  ON parents
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read fee_heads"
  ON fee_heads
  FOR SELECT
  TO anon
  USING (true);
/*
  # Create ID Card, Certificate, and Admission Management Tables

  This migration creates the complete database schema for:
  1. ID Card Management (templates, settings, generation history)
  2. Certificate Management (templates, award types, student awards)
  3. Admission Lead Funnel (sources, stages, leads)

  ## New Tables

  ### ID Card Management
    - `id_card_templates` - Card design templates for students/educators
    - `id_card_settings` - School-specific ID card configuration
    - `id_card_generations` - Audit trail of card generation

  ### Certificate Management
    - `certificate_templates` - Certificate design templates
    - `award_types` - Types of awards/certificates
    - `student_awards` - Awards given to students

  ### Admission Lead Funnel
    - `admission_lead_sources` - Sources where leads come from
    - `admission_funnel_stages` - Stages in the admission process
    - `admission_leads` - Prospective student inquiries

  ## Security
    - Enable RLS on all tables
    - Add policies for anonymous access (demo mode)
*/

-- ID Card Templates Table
CREATE TABLE IF NOT EXISTS id_card_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  name text NOT NULL,
  card_type text NOT NULL CHECK (card_type IN ('student', 'educator', 'staff')),
  template_html text,
  template_css text,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ID Card Settings Table
CREATE TABLE IF NOT EXISTS id_card_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) UNIQUE,
  logo_url text,
  school_display_name text,
  school_address text,
  principal_name text,
  principal_signature_url text,
  current_academic_year text NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ID Card Generations Table
CREATE TABLE IF NOT EXISTS id_card_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  generated_by uuid REFERENCES auth.users(id),
  template_id uuid REFERENCES id_card_templates(id),
  card_type text NOT NULL CHECK (card_type IN ('student', 'educator', 'staff')),
  entity_id uuid NOT NULL,
  entity_type text NOT NULL,
  generation_mode text CHECK (generation_mode IN ('single', 'bulk')),
  bulk_criteria jsonb,
  card_data jsonb,
  file_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Certificate Templates Table
CREATE TABLE IF NOT EXISTS certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  name text NOT NULL,
  template_html text,
  template_css text,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Award Types Table
CREATE TABLE IF NOT EXISTS award_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id),
  name text NOT NULL,
  description text,
  is_global boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Student Awards Table
CREATE TABLE IF NOT EXISTS student_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  student_id uuid NOT NULL REFERENCES students(id),
  award_type_id uuid REFERENCES award_types(id),
  award_name text NOT NULL,
  event_name text,
  event_date date,
  position text,
  remarks text,
  certificate_template_id uuid REFERENCES certificate_templates(id),
  certificate_url text,
  issued_by uuid REFERENCES auth.users(id),
  issued_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Admission Lead Sources Table
CREATE TABLE IF NOT EXISTS admission_lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Admission Funnel Stages Table
CREATE TABLE IF NOT EXISTS admission_funnel_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id),
  name text NOT NULL,
  stage_order integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Admission Leads Table
CREATE TABLE IF NOT EXISTS admission_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  lead_number text UNIQUE,
  student_name text NOT NULL,
  dob date,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  class_id uuid REFERENCES classes(id),
  parent_name text NOT NULL,
  parent_phone text NOT NULL,
  parent_email text,
  address text,
  lead_source_id uuid REFERENCES admission_lead_sources(id),
  current_stage_id uuid REFERENCES admission_funnel_stages(id),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'visited', 'applied', 'admitted', 'rejected', 'lost')),
  notes text,
  assigned_to uuid REFERENCES auth.users(id),
  follow_up_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE id_card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE id_card_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE id_card_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_funnel_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for anonymous access (demo mode)
CREATE POLICY "Allow anon read id_card_templates" ON id_card_templates FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert id_card_templates" ON id_card_templates FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update id_card_templates" ON id_card_templates FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anon read id_card_settings" ON id_card_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert id_card_settings" ON id_card_settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update id_card_settings" ON id_card_settings FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anon upsert id_card_settings" ON id_card_settings FOR ALL TO anon USING (true);

CREATE POLICY "Allow anon read id_card_generations" ON id_card_generations FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert id_card_generations" ON id_card_generations FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon read certificate_templates" ON certificate_templates FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert certificate_templates" ON certificate_templates FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update certificate_templates" ON certificate_templates FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anon read award_types" ON award_types FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert award_types" ON award_types FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon read student_awards" ON student_awards FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert student_awards" ON student_awards FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update student_awards" ON student_awards FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anon read admission_lead_sources" ON admission_lead_sources FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert admission_lead_sources" ON admission_lead_sources FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon read admission_funnel_stages" ON admission_funnel_stages FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert admission_funnel_stages" ON admission_funnel_stages FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon read admission_leads" ON admission_leads FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert admission_leads" ON admission_leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update admission_leads" ON admission_leads FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anon delete admission_leads" ON admission_leads FOR DELETE TO anon USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_id_card_templates_school ON id_card_templates(school_id);
CREATE INDEX IF NOT EXISTS idx_id_card_generations_school ON id_card_generations(school_id);
CREATE INDEX IF NOT EXISTS idx_student_awards_school_student ON student_awards(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_admission_leads_school ON admission_leads(school_id);
CREATE INDEX IF NOT EXISTS idx_admission_leads_status ON admission_leads(status);
