-- Migration: School Plan - Definitions Module
-- Description: Implements the Master Configuration schema for Academic Years, Structure, Assessments, and Fees.

-- =====================================================
-- 0. CORE CONTEXT TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS academic_years (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
    name text NOT NULL, -- e.g., '2025-26'
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(school_id, name)
);

-- RLS for academic_years
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School Isolation Policy" ON academic_years
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));


-- =====================================================
-- 1. ACADEMIC STRUCTURE
-- =====================================================

-- Update Classes Table
-- Rename grade to name if it hasn't been done, or handle compatibility
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'grade') THEN
        ALTER TABLE classes RENAME COLUMN grade TO name;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'grade_order') THEN
        ALTER TABLE classes RENAME COLUMN grade_order TO sort_order;
    END IF;
END $$;

ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS academic_year_id uuid REFERENCES academic_years(id),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'archived'));

-- Update Sections Table
ALTER TABLE sections
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'archived'));

-- Update Subjects Table
-- Create ENUMs for subjects (handling if they already exist)
DO $$ BEGIN
    CREATE TYPE subject_type AS ENUM ('academic', 'activity');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE grading_type AS ENUM ('marks', 'grade');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS academic_year_id uuid REFERENCES academic_years(id),
ADD COLUMN IF NOT EXISTS type subject_type DEFAULT 'academic',
ADD COLUMN IF NOT EXISTS grading_type grading_type DEFAULT 'marks',
ADD COLUMN IF NOT EXISTS include_in_report_card boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'archived'));

-- Create Class-Subject Mapping
CREATE TABLE IF NOT EXISTS class_subjects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
    class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
    subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
    applicable_from date NOT NULL DEFAULT CURRENT_DATE,
    applicable_to date,
    created_at timestamptz DEFAULT now(),
    UNIQUE(class_id, subject_id, applicable_from)
);

ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School Isolation Policy" ON class_subjects
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));


-- =====================================================
-- 2. ASSESSMENT CONFIGURATION
-- =====================================================

CREATE TABLE IF NOT EXISTS exam_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id uuid REFERENCES academic_years(id),
    name text NOT NULL, -- UT1, Half-Yearly
    weightage numeric(5,2),
    status text DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE exam_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School Isolation Policy" ON exam_types
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS exam_applicability (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
    exam_type_id uuid REFERENCES exam_types(id) ON DELETE CASCADE,
    class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
    subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(exam_type_id, class_id, subject_id)
);

ALTER TABLE exam_applicability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School Isolation Policy" ON exam_applicability
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));


-- =====================================================
-- 3. FEE DEFINITIONS
-- =====================================================

-- Update Fee Types Table
-- Adding new columns. Note: 'code' column might still be useful but we focus on new reqs.
DO $$ BEGIN
    CREATE TYPE fee_frequency AS ENUM ('one_time', 'term', 'recurring');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE fee_types
ADD COLUMN IF NOT EXISTS academic_year_id uuid REFERENCES academic_years(id),
ADD COLUMN IF NOT EXISTS frequency fee_frequency DEFAULT 'term',
ADD COLUMN IF NOT EXISTS mandatory boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS refundable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'disabled'));

-- Create Class-wise Fee Matrix
CREATE TABLE IF NOT EXISTS class_fee_structure (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
    class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
    fee_type_id uuid REFERENCES fee_types(id) ON DELETE CASCADE,
    amount numeric(10,2) NOT NULL DEFAULT 0,
    applicable_from date NOT NULL DEFAULT CURRENT_DATE,
    applicable_to date,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(class_id, fee_type_id, applicable_from)
);

ALTER TABLE class_fee_structure ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School Isolation Policy" ON class_fee_structure
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));


-- =====================================================
-- 4. CHANGE CONTROL
-- =====================================================

CREATE TABLE IF NOT EXISTS definition_change_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
    entity_type text NOT NULL, -- class, subject, fee, exam
    entity_id uuid NOT NULL,
    field_name text NOT NULL,
    old_value text,
    new_value text,
    changed_by uuid REFERENCES auth.users(id),
    changed_at timestamptz DEFAULT now(),
    impact_summary text
);

ALTER TABLE definition_change_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School Isolation Policy" ON definition_change_logs
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
-- Logs are append-only mostly, but standard RLS is fine.
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));
