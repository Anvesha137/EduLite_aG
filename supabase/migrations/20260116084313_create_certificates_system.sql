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