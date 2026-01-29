-- Migration: Create Admissions Module Schema
-- Description: Adds tables and RPCs for Leads, Funnels, and Applications.

-- 1. TABLES
CREATE TABLE IF NOT EXISTS admission_lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text DEFAULT 'other',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admission_funnel_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  stage_order integer NOT NULL,
  stage_category text, -- 'open', 'closed_won', 'closed_lost'
  color_code text DEFAULT '#3b82f6',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admission_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  lead_number text, -- Auto-generated usually
  student_name text,
  parent_name text NOT NULL,
  contact_number text,
  contact_email text,
  applying_class_id uuid REFERENCES classes(id),
  lead_source_id uuid REFERENCES admission_lead_sources(id),
  current_stage_id uuid REFERENCES admission_funnel_stages(id),
  priority text DEFAULT 'medium',
  status text DEFAULT 'active', -- active, converted, lost
  assigned_counselor_id uuid REFERENCES auth.users(id),
  notes text,
  academic_year text,
  next_followup_date date,
  last_contacted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admission_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  application_number text NOT NULL,
  lead_id uuid REFERENCES admission_leads(id),
  student_name text NOT NULL,
  parent_name text,
  contact_number text,
  applying_class_id uuid REFERENCES classes(id),
  application_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'submitted',
  decision_status text DEFAULT 'pending', -- pending, approved, rejected, waitlisted
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admission_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES admission_leads(id) ON DELETE CASCADE,
  counselor_id uuid REFERENCES auth.users(id),
  visit_date date DEFAULT CURRENT_DATE,
  visit_time time,
  visit_type text, -- phone, in_person
  duration_minutes integer,
  people_met text,
  outcome text,
  interest_level text,
  followup_required boolean DEFAULT false,
  next_followup_date date,
  discussion_points text,
  concerns_raised text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 2. DISABLE RLS FOR IMMEDIATE VISIBILITY
ALTER TABLE admission_lead_sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE admission_funnel_stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE admission_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE admission_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE admission_visits DISABLE ROW LEVEL SECURITY;

-- 3. RPCs required by Frontend

-- RPC: Get admission leads with joined data
CREATE OR REPLACE FUNCTION get_admission_leads(p_school_id uuid)
RETURNS TABLE (
  id uuid,
  lead_number text,
  student_name text,
  parent_name text,
  contact_number text,
  contact_email text,
  applying_class_grade text,
  current_stage_id uuid,
  current_stage_name text,
  current_stage_color text,
  lead_source_id uuid,
  lead_source_name text,
  status text,
  priority text,
  next_followup_date date,
  created_at timestamptz
)
LANGUAGE plpgsql security definer
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.lead_number,
    l.student_name,
    l.parent_name,
    l.contact_number,
    l.contact_email,
    c.grade as applying_class_grade,
    fs.id as current_stage_id,
    fs.name as current_stage_name,
    fs.color_code as current_stage_color,
    ls.id as lead_source_id,
    ls.name as lead_source_name,
    l.status,
    l.priority,
    l.next_followup_date,
    l.created_at
  FROM admission_leads l
  LEFT JOIN classes c ON l.applying_class_id = c.id
  LEFT JOIN admission_funnel_stages fs ON l.current_stage_id = fs.id
  LEFT JOIN admission_lead_sources ls ON l.lead_source_id = ls.id
  WHERE l.school_id = p_school_id
  ORDER BY l.created_at DESC;
END;
$$;

-- RPC: Get applications with joined data
CREATE OR REPLACE FUNCTION get_admission_applications(p_school_id uuid)
RETURNS TABLE (
  id uuid,
  application_number text,
  lead_number text,
  student_name text,
  parent_name text,
  contact_number text,
  applying_class_grade text,
  status text,
  decision_status text,
  application_date date
)
LANGUAGE plpgsql security definer
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.application_number,
    l.lead_number,
    a.student_name,
    a.parent_name,
    a.contact_number,
    c.grade as applying_class_grade,
    a.status,
    a.decision_status,
    a.application_date
  FROM admission_applications a
  LEFT JOIN admission_leads l ON a.lead_id = l.id
  LEFT JOIN classes c ON a.applying_class_id = c.id
  WHERE a.school_id = p_school_id
  ORDER BY a.application_date DESC;
END;
$$;

-- RPC: Create Admission Lead
CREATE OR REPLACE FUNCTION create_admission_lead(
  p_school_id uuid,
  p_parent_name text,
  p_contact_number text,
  p_lead_source_id uuid,
  p_applying_class_id uuid,
  p_academic_year text,
  p_student_name text,
  p_priority text,
  p_notes text,
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql security definer
AS $$
DECLARE
  v_lead_id uuid;
  v_stage_id uuid;
  v_lead_number text;
BEGIN
  -- Get default 'Inquiry' stage (first stage)
  SELECT id INTO v_stage_id FROM admission_funnel_stages 
  WHERE school_id = p_school_id ORDER BY stage_order ASC LIMIT 1;
  
  -- Generate Lead Number (simple random or sequence)
  v_lead_number := 'LD-' || floor(random() * 100000)::text;

  INSERT INTO admission_leads (
    school_id,
    lead_number,
    parent_name,
    contact_number,
    lead_source_id,
    applying_class_id,
    academic_year,
    student_name,
    priority,
    notes,
    current_stage_id,
    assigned_counselor_id
  ) VALUES (
    p_school_id,
    v_lead_number,
    p_parent_name,
    p_contact_number,
    p_lead_source_id,
    p_applying_class_id,
    p_academic_year,
    p_student_name,
    p_priority,
    p_notes,
    v_stage_id,
    p_user_id
  )
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$;

-- RPC: Validate Referral (Stub for now)
CREATE OR REPLACE FUNCTION validate_referral_code(p_code text, p_type text, p_school_id uuid)
RETURNS json
LANGUAGE plpgsql security definer
AS $$
BEGIN
  -- Always return valid for demo
  RETURN json_build_object('valid', true, 'message', 'Valid referral code');
END;
$$;
