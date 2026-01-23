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
