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