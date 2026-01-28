-- Migration: Admissions Module RPCs
-- Description: Secure RPCs for Admissions Management (Leads, Applications, Visits).

-- 1. Get Admission Leads (with joins)
CREATE OR REPLACE FUNCTION get_admission_leads(p_school_id uuid)
RETURNS TABLE (
  id uuid,
  lead_number text,
  student_name text,
  parent_name text,
  contact_number text,
  contact_email text,
  applying_class_grade text,
  current_stage_name text,
  current_stage_color text,
  lead_source_name text,
  status text,
  priority text,
  created_at timestamptz,
  next_followup_date date,
  current_stage_id uuid,
  lead_source_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    s.name as current_stage_name,
    s.color_code as current_stage_color,
    src.name as lead_source_name,
    l.status,
    l.priority,
    l.created_at,
    l.next_followup_date,
    l.current_stage_id,
    l.lead_source_id
  FROM admission_leads l
  LEFT JOIN classes c ON l.applying_class_id = c.id
  LEFT JOIN admission_funnel_stages s ON l.current_stage_id = s.id
  LEFT JOIN admission_lead_sources src ON l.lead_source_id = src.id
  WHERE l.school_id = p_school_id
  ORDER BY l.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admission_leads(uuid) TO authenticated, service_role;

-- 2. Create Admission Lead
CREATE OR REPLACE FUNCTION create_admission_lead(
  p_school_id uuid,
  p_parent_name text,
  p_contact_number text,
  p_lead_source_id uuid,
  p_applying_class_id uuid,
  p_academic_year text,
  p_student_name text DEFAULT NULL,
  p_priority text DEFAULT 'medium',
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_number text;
  v_first_stage_id uuid;
  v_new_lead_id uuid;
  v_result json;
BEGIN
  -- Generate Lead Number (Simplistic logic for now, can be improved)
  v_lead_number := 'LEAD-' || to_char(now(), 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 4);
  
  -- Get first funnel stage
  SELECT id INTO v_first_stage_id FROM admission_funnel_stages 
  WHERE school_id = p_school_id ORDER BY stage_order ASC LIMIT 1;
  
  INSERT INTO admission_leads (
    school_id, lead_number, parent_name, contact_number, lead_source_id, 
    applying_class_id, academic_year, student_name, priority, notes, 
    current_stage_id, created_by, status
  )
  VALUES (
    p_school_id, v_lead_number, p_parent_name, p_contact_number, p_lead_source_id,
    p_applying_class_id, p_academic_year, p_student_name, p_priority, p_notes,
    v_first_stage_id, p_user_id, 'active'
  )
  RETURNING id INTO v_new_lead_id;
  
  SELECT row_to_json(al.*) INTO v_result FROM admission_leads al WHERE id = v_new_lead_id;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_admission_lead(uuid, text, text, uuid, uuid, text, text, text, text, uuid) TO authenticated, service_role;

-- 3. Get Applications
CREATE OR REPLACE FUNCTION get_admission_applications(p_school_id uuid)
RETURNS TABLE (
  id uuid,
  application_number text,
  student_name text,
  parent_name text,
  contact_number text,
  applying_class_grade text,
  status text,
  decision_status text,
  application_date timestamptz,
  lead_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.application_number,
    a.student_name,
    a.parent_name,
    a.contact_number,
    c.grade as applying_class_grade,
    a.status,
    a.decision_status,
    a.application_date,
    l.lead_number
  FROM admission_applications a
  LEFT JOIN classes c ON a.applying_class_id = c.id
  LEFT JOIN admission_leads l ON a.lead_id = l.id
  WHERE a.school_id = p_school_id
  ORDER BY a.application_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admission_applications(uuid) TO authenticated, service_role;
