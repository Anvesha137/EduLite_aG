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