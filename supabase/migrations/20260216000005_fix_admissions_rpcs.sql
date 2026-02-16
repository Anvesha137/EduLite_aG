-- Migration: Fix Admissions RPCs (Rename grade to name)
-- Description: Updates get_admission_leads and get_admission_applications to use the correct classes.name column.

-- 1. Fix get_admission_leads
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
    c.name as applying_class_grade, -- Fixed column name
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

-- 2. Fix get_admission_applications
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
    c.name as applying_class_grade, -- Fixed column name
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
