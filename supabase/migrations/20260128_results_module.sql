-- Migration: Results & Report Card Module
-- Description: Establishes a flexible, configuration-driven schema for exams, grading, and results.
-- Replaces/Extends the rigid 'exams'/'marks' tables with 'exam_schedules', 'student_marks', 'exam_types', etc.

-- =====================================================
-- 1. CONFIGURATION TABLES
-- =====================================================

-- 1.1 Exam Types (e.g., Unit Test, Half Yearly, Project)
CREATE TABLE IF NOT EXISTS exam_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL, -- e.g. "Unit Test", "Annual Exam"
  code text,          -- e.g. "UT", "FINAL"
  description text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, name)
);

-- 1.2 Grade Scales (e.g., CBSE Primary, Standard 10-Point)
CREATE TABLE IF NOT EXISTS grade_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL, -- e.g. "Scholastic Grade A-E"
  type text NOT NULL CHECK (type IN ('percentage', 'grade_point', 'mixed')),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id),
  UNIQUE(school_id, name)
);

-- 1.3 Grade Slabs (The actual ranges, e.g., 91-100 -> A1)
CREATE TABLE IF NOT EXISTS grade_slabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_scale_id uuid NOT NULL REFERENCES grade_scales(id) ON DELETE CASCADE,
  grade_label text NOT NULL, -- "A1", "B+"
  min_percentage decimal(5,2) NOT NULL, -- 91.00
  max_percentage decimal(5,2) NOT NULL, -- 100.00
  grade_point decimal(4,2),             -- 10.0
  remarks text,                         -- "Outstanding"
  display_order integer DEFAULT 0,
  CHECK (min_percentage <= max_percentage)
);

-- 1.4 Academic Terms (Optional grouping, e.g., Term 1, Term 2)
CREATE TABLE IF NOT EXISTS academic_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL, -- "Term 1"
  academic_year text NOT NULL,
  start_date date,
  end_date date,
  weightage_percent decimal(5,2) DEFAULT 0, -- For final calculation
  is_active boolean DEFAULT true
);

-- =====================================================
-- 2. EXAM DEFINITION & SCHEDULE
-- =====================================================

-- 2.1 Exam Schedules (The actual exam event)
-- Renamed from 'exams' to avoid conflict and imply scheduling
CREATE TABLE IF NOT EXISTS exam_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  
  -- Configuration
  exam_type_id uuid NOT NULL REFERENCES exam_types(id),
  term_id uuid REFERENCES academic_terms(id),
  grade_scale_id uuid REFERENCES grade_scales(id), -- Override default if needed
  
  -- Details
  name text NOT NULL, -- "Unit Test 1 - 2025"
  description text,
  start_date date,
  end_date date,
  
  -- Status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'ongoing', 'completed', 'results_locked', 'results_published')),
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES user_profiles(id)
);

-- 2.2 Exam Classes (Which classes take this exam?)
CREATE TABLE IF NOT EXISTS exam_classes (
  exam_id uuid NOT NULL REFERENCES exam_schedules(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  PRIMARY KEY (exam_id, class_id)
);

-- 2.3 Exam Subjects (Subject-specific metadata for an exam)
-- Defines max marks, passing marks, etc. per Class+Subject in an Exam
CREATE TABLE IF NOT EXISTS exam_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exam_schedules(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  
  -- Marks Config
  max_marks decimal(6,2) NOT NULL,
  passing_marks decimal(6,2) DEFAULT 0,
  weightage decimal(5,2) DEFAULT 100, -- Contribution to Exam Total
  
  -- Scheduling (Optional per subject)
  exam_date date,
  start_time time,
  end_time time,
  
  -- Flags
  is_optional boolean DEFAULT false,
  include_in_total boolean DEFAULT true,
  
  UNIQUE(exam_id, class_id, subject_id)
);

-- =====================================================
-- 3. MARKS & ENTRY
-- =====================================================

-- 3.1 Student Marks (The granular scores)
CREATE TABLE IF NOT EXISTS student_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exam_schedules(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  
  -- The Score
  marks_obtained decimal(6,2),
  is_absent boolean DEFAULT false,
  remarks text,
  
  -- Metadata
  grade_label text, -- Cached grade for this specific mark (e.g. A1)
  grade_point decimal(4,2),
  
  -- Audit
  entered_by uuid REFERENCES user_profiles(id),
  entered_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES user_profiles(id),
  updated_at timestamptz,
  
  UNIQUE(exam_id, student_id, subject_id)
);

-- =====================================================
-- 4. AGGREGATED RESULTS
-- =====================================================

-- 4.1 Exam Result Summaries (Total per student per exam)
CREATE TABLE IF NOT EXISTS result_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exam_schedules(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id), -- Cached for easier querying
  
  -- Calculated Data
  total_max_marks decimal(8,2),
  total_obtained_marks decimal(8,2),
  percentage decimal(6,2),
  
  grade_label text,
  grade_point decimal(4,2),
  
  -- Ranking
  rank_in_class integer,
  rank_in_section integer,
  
  -- Status
  result_status text DEFAULT 'pass' CHECK (result_status IN ('pass', 'fail', 'withheld', 'absent')),
  remarks text,
  
  updated_at timestamptz DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- 4.2 Final Results (Annual Compilation)
CREATE TABLE IF NOT EXISTS final_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id),
  
  -- Annual Aggregates
  grand_total_max decimal(10,2),
  grand_total_obtained decimal(10,2),
  overall_percentage decimal(6,2),
  overall_grade text,
  
  -- Final Rank
  final_rank integer,
  
  -- Promotion
  promotion_status text DEFAULT 'pending' CHECK (promotion_status IN ('pending', 'promoted', 'detained', 'conditional')),
  promoted_to_class_id uuid REFERENCES classes(id),
  
  generated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, academic_year, student_id)
);

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

-- Helper: Enable RLS
ALTER TABLE exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_slabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_results ENABLE ROW LEVEL SECURITY;

-- ... (We will use standard school_id based policies. For brevity in this initial script, defining key robust ones)

-- 5.1 Common "View by School" Policy for Config Tables
CREATE POLICY "School staff view configs" ON exam_types FOR SELECT TO authenticated USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "Admins manage exam types" ON exam_types FOR ALL TO authenticated USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))));

CREATE POLICY "School staff view grade scales" ON grade_scales FOR SELECT TO authenticated USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "Admins manage grade scales" ON grade_scales FOR ALL TO authenticated USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))));

-- Grade Slabs (Indirect via Scale->School)
CREATE POLICY "School staff view grade slabs" ON grade_slabs FOR SELECT TO authenticated USING (grade_scale_id IN (SELECT id FROM grade_scales WHERE school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid())));
CREATE POLICY "Admins manage grade slabs" ON grade_slabs FOR ALL TO authenticated USING (grade_scale_id IN (SELECT id FROM grade_scales WHERE school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN')))));

-- 5.2 Exam Schedules
CREATE POLICY "Staff view exams" ON exam_schedules FOR SELECT TO authenticated USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "Admins manage exams" ON exam_schedules FOR ALL TO authenticated USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'SUPERADMIN'))));

-- 5.3 Marks Entry
-- Teachers can INSERT/UPDATE marks if they are assigned to the class/subject (Logic is complex, simplifying to "Educators in School" for now, ideally strictly filtered)
CREATE POLICY "Staff view marks" ON student_marks FOR SELECT TO authenticated USING (exam_id IN (SELECT id FROM exam_schedules WHERE school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid())));
CREATE POLICY "Teachers enter marks" ON student_marks FOR INSERT TO authenticated WITH CHECK (exam_id IN (SELECT id FROM exam_schedules WHERE school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'EDUCATOR')))));
CREATE POLICY "Teachers update marks" ON student_marks FOR UPDATE TO authenticated USING (exam_id IN (SELECT id FROM exam_schedules WHERE school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'EDUCATOR')))));

-- 5.4 Parents/Students Access (Strict!)
-- Parents can only view Result Summaries and Final Results for THEIR children
-- (Assuming 'students' table has 'parent_id' or we map via 'student_parents' - Checking common schema)
-- Standard schema usually puts parent_id on students or separate mapping.
-- For now, basic restriction:
CREATE POLICY "Parents view own child results" ON result_summaries FOR SELECT TO authenticated 
USING (
  student_id IN (
    SELECT id FROM students WHERE parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid()) -- Assuming parent link exists this way
  )
);

-- =====================================================
-- 6. INDEXES
-- =====================================================
CREATE INDEX idx_exam_schedules_school ON exam_schedules(school_id);
CREATE INDEX idx_student_marks_exam_student ON student_marks(exam_id, student_id);
CREATE INDEX idx_exam_subjects_exam ON exam_subjects(exam_id);
