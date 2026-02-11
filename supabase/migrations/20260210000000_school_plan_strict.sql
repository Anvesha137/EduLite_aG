-- STRICT School Plan Schema Migration
-- Defines strict teacher rules, safe class deletion, and fee structure updates.

-- =====================================================
-- 1. CLEANUP & PREP
-- =====================================================

-- Drop duplicate constraint on subjects if exists
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_school_id_code_key;
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_code_key; -- Just in case

-- Update Fee Types: Remove amount if it exists (moving to matrix)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_types' AND column_name = 'amount') THEN
        ALTER TABLE fee_types DROP COLUMN amount;
    END IF;
END $$;

-- =====================================================
-- 2. TEACHER ALLOCATIONS (STRICT MATRIX)
-- =====================================================

-- Replaces old educator_class_assignments
DROP TABLE IF EXISTS educator_class_assignments CASCADE;
DROP TABLE IF EXISTS teacher_allocations CASCADE;

CREATE TABLE IF NOT EXISTS teacher_allocations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id uuid REFERENCES educators(id) ON DELETE CASCADE,
    class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
    section_id uuid REFERENCES sections(id) ON DELETE CASCADE,
    subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE, -- NULL for Class Teacher
    is_class_teacher boolean DEFAULT false,
    academic_year_id uuid REFERENCES academic_years(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),

    -- Constraints
    -- 1. Minimal requirement: Must have class, section, teacher, year
    CONSTRAINT ta_req_fields CHECK (class_id IS NOT NULL AND section_id IS NOT NULL AND teacher_id IS NOT NULL AND academic_year_id IS NOT NULL),
    
    -- 2. Role Separation: Cannot be both Class Teacher AND Subject Teacher in the same row
    -- (We use separate rows for clarity)
    CONSTRAINT ta_role_sep CHECK (
        (is_class_teacher = true AND subject_id IS NULL) OR 
        (is_class_teacher = false AND subject_id IS NOT NULL)
    ),

    -- 3. One Subject Teacher per Subject/Class/Section/Year
    CONSTRAINT ta_one_sub_teacher UNIQUE (class_id, section_id, subject_id, academic_year_id)
);

-- Index for "One Class Teacher per Class/Section/Year"
CREATE UNIQUE INDEX IF NOT EXISTS idx_ta_one_class_teacher 
ON teacher_allocations (class_id, section_id, academic_year_id) 
WHERE is_class_teacher = true;

-- RLS
ALTER TABLE teacher_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School Isolation Policy" ON teacher_allocations
USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

-- =====================================================
-- 3. STRICT LOGIC TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION trg_check_teacher_constraints() RETURNS TRIGGER AS $$
BEGIN
    -- Rule: A teacher can teach only ONE subject globally in an academic year
    -- If this is a subject assignment (subject_id is not null)
    IF NEW.subject_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM teacher_allocations
            WHERE teacher_id = NEW.teacher_id
            AND academic_year_id = NEW.academic_year_id
            AND subject_id IS NOT NULL 
            AND subject_id <> NEW.subject_id
            AND id <> NEW.id -- Exclude self on update
        ) THEN
            RAISE EXCEPTION 'Teacher is already assigned to a different subject. A teacher can teach only ONE subject.';
        END IF;
    END IF;

    -- Verify Class Teacher count (redundant with partial index but good for specific error msg)
    IF NEW.is_class_teacher THEN
        IF EXISTS (
            SELECT 1 FROM teacher_allocations
            WHERE class_id = NEW.class_id 
            AND section_id = NEW.section_id 
            AND academic_year_id = NEW.academic_year_id
            AND is_class_teacher = true
            AND id <> NEW.id
        ) THEN
            RAISE EXCEPTION 'This section already has a Class Teacher assigned.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_teacher_allocations_check ON teacher_allocations;
CREATE TRIGGER trg_teacher_allocations_check
BEFORE INSERT OR UPDATE ON teacher_allocations
FOR EACH ROW EXECUTE FUNCTION trg_check_teacher_constraints();

-- =====================================================
-- 4. FEE MATRIX UPDATES
-- =====================================================

-- Ensure class_fee_structure has due_date
ALTER TABLE class_fee_structure 
ADD COLUMN IF NOT EXISTS due_date date;

-- =====================================================
-- 5. SAFE DELETE LOGIC
-- =====================================================

CREATE OR REPLACE FUNCTION check_class_safe_delete(p_class_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_deps text[] := ARRAY[]::text[];
    v_count integer;
BEGIN
    -- 1. Sections
    SELECT count(*) INTO v_count FROM sections WHERE class_id = p_class_id;
    IF v_count > 0 THEN v_deps := array_append(v_deps, 'Sections (' || v_count || ')'); END IF;

    -- 2. Students (Check via sections or direct class link if applicable)
    -- Assuming students links to classes directly or via sections. Schema says 'class_id' exists in students.
    SELECT count(*) INTO v_count FROM students WHERE class_id = p_class_id;
    IF v_count > 0 THEN v_deps := array_append(v_deps, 'Students (' || v_count || ')'); END IF;

    -- 3. Teacher Allocations
    SELECT count(*) INTO v_count FROM teacher_allocations WHERE class_id = p_class_id;
    IF v_count > 0 THEN v_deps := array_append(v_deps, 'Teacher Maps (' || v_count || ')'); END IF;

    -- 4. Fee Structures
    SELECT count(*) INTO v_count FROM class_fee_structure WHERE class_id = p_class_id;
    IF v_count > 0 THEN v_deps := array_append(v_deps, 'Fee Structures (' || v_count || ')'); END IF;

    -- 5. Exams/Results (if any)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exam_applicability') THEN
        SELECT count(*) INTO v_count FROM exam_applicability WHERE class_id = p_class_id;
        IF v_count > 0 THEN v_deps := array_append(v_deps, 'Exams (' || v_count || ')'); END IF;
    END IF;

    IF array_length(v_deps, 1) > 0 THEN
        RETURN jsonb_build_object('safe', false, 'dependencies', v_deps);
    ELSE
        RETURN jsonb_build_object('safe', true, 'dependencies', '[]');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
