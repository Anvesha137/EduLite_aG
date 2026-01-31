-- Migration: Fix Auto-create Application RPC (Force Update)
-- Description: Re-applies the create_admission_lead function to remove invalid column references (email, academic_year).

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
  p_user_id uuid,
  p_assigned_counselor_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql security definer
AS $$
DECLARE
  v_lead_id uuid;
  v_stage_id uuid;
  v_lead_number text;
  v_counselor_id uuid;
  v_app_number text;
BEGIN
  -- 1. Setup Lead Data
  
  -- Get default 'Inquiry' stage
  SELECT id INTO v_stage_id FROM admission_funnel_stages 
  WHERE school_id = p_school_id ORDER BY stage_order ASC LIMIT 1;
  
  -- Generate Lead Number
  v_lead_number := 'LD-' || floor(random() * 100000)::text;

  -- Determine assigned counselor (Respect "No Counselor" if NULL)
  v_counselor_id := p_assigned_counselor_id;

  -- 2. Insert Lead
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
    v_counselor_id
  )
  RETURNING id INTO v_lead_id;

  -- 3. Auto-Create Application
  -- Generate App Number
  v_app_number := 'APP-' || p_academic_year || '-' || floor(random() * 9000 + 1000)::text;

  INSERT INTO admission_applications (
    school_id,
    lead_id,
    application_number,
    student_name,
    parent_name,
    contact_number,
    -- Removed email
    applying_class_id,
    -- Removed academic_year (not in table definition)
    status,
    decision_status,
    application_date,
    notes
  ) VALUES (
    p_school_id,
    v_lead_id,
    v_app_number,
    p_student_name,
    p_parent_name,
    p_contact_number,
    p_applying_class_id,
    'submitted',
    'pending',
    CURRENT_DATE,
    p_notes
  );

  RETURN v_lead_id;
END;
$$;
