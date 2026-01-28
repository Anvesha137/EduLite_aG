-- Migration: Secure Creation RPCs
-- Description: Adds secure RPCs for Students and Educators, and hardens Admission Leads creation.

-- [1] Create Student RPC
CREATE OR REPLACE FUNCTION create_student(
  p_school_id uuid,
  p_admission_number text,
  p_name text,
  p_dob date,
  p_gender text,
  p_class_id uuid DEFAULT NULL,
  p_section_id uuid DEFAULT NULL,
  p_parent_id uuid DEFAULT NULL,
  p_blood_group text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_admission_date date DEFAULT CURRENT_DATE,
  p_status text DEFAULT 'active'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_student json;
BEGIN
  INSERT INTO students (
    school_id, admission_number, name, dob, gender,
    class_id, section_id, parent_id, blood_group,
    address, admission_date, status
  )
  VALUES (
    p_school_id, p_admission_number, p_name, p_dob, p_gender,
    p_class_id, p_section_id, p_parent_id, p_blood_group,
    p_address, p_admission_date, p_status
  )
  RETURNING row_to_json(students.*) INTO v_new_student;
  
  RETURN v_new_student;
END;
$$;

GRANT EXECUTE ON FUNCTION create_student(uuid, text, text, date, text, uuid, uuid, uuid, text, text, date, text) TO authenticated, service_role;


-- [2] Create Educator RPC
CREATE OR REPLACE FUNCTION create_educator(
  p_school_id uuid,
  p_employee_id text,
  p_name text,
  p_phone text,
  p_email text DEFAULT NULL,
  p_designation text DEFAULT 'teacher',
  p_qualification text DEFAULT NULL,
  p_experience_years integer DEFAULT 0,
  p_joining_date date DEFAULT CURRENT_DATE,
  p_status text DEFAULT 'active',
  p_address text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_educator json;
BEGIN
  INSERT INTO educators (
    school_id, employee_id, name, phone, email,
    designation, qualification, experience_years,
    joining_date, status, address
  )
  VALUES (
    p_school_id, p_employee_id, p_name, p_phone, p_email,
    p_designation, p_qualification, p_experience_years,
    p_joining_date, p_status, p_address
  )
  RETURNING row_to_json(educators.*) INTO v_new_educator;
  
  RETURN v_new_educator;
END;
$$;

GRANT EXECUTE ON FUNCTION create_educator(uuid, text, text, text, text, text, text, integer, date, text, text) TO authenticated, service_role;


-- [3] Hardened Create Admission Lead RPC (Update)
CREATE OR REPLACE FUNCTION create_admission_lead(
  p_school_id uuid,
  p_parent_name text,
  p_contact_number text,
  p_lead_source_id uuid, -- Can be passed as NULL
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
  v_actual_source_id uuid;
BEGIN
  -- Generate Lead Number
  v_lead_number := 'LEAD-' || to_char(now(), 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 4);
  
  -- Get first funnel stage
  SELECT id INTO v_first_stage_id FROM admission_funnel_stages 
  WHERE school_id = p_school_id ORDER BY stage_order ASC LIMIT 1;
  
  -- Handle Missing Source ID: Default to first available source if NULL passed
  v_actual_source_id := p_lead_source_id;
  IF v_actual_source_id IS NULL THEN
    SELECT id INTO v_actual_source_id FROM admission_lead_sources 
    WHERE school_id = p_school_id ORDER BY name LIMIT 1;
    -- If still null (no sources), create one dynamically? No, that's unsafe. 
    -- Assuming seed data exists or handled.
  END IF;

  INSERT INTO admission_leads (
    school_id, lead_number, parent_name, contact_number, lead_source_id, 
    applying_class_id, academic_year, student_name, priority, notes, 
    current_stage_id, created_by, status
  )
  VALUES (
    p_school_id, v_lead_number, p_parent_name, p_contact_number, v_actual_source_id,
    p_applying_class_id, p_academic_year, p_student_name, p_priority, p_notes,
    v_first_stage_id, p_user_id, 'active'
  )
  RETURNING id INTO v_new_lead_id;
  
  SELECT row_to_json(al.*) INTO v_result FROM admission_leads al WHERE id = v_new_lead_id;
  RETURN v_result;
END;
$$;
