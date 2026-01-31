-- Migration: Fix create_admission_lead RPC
-- Description: Re-defines the RPC to ensure it exists and matches the frontend call.
-- Also removes the counselor assignment logic if p_assigned_counselor_id is NULL (optional).

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
BEGIN
  -- Get default 'Inquiry' stage (first stage)
  SELECT id INTO v_stage_id FROM admission_funnel_stages 
  WHERE school_id = p_school_id ORDER BY stage_order ASC LIMIT 1;
  
  -- Generate Lead Number (simple random or sequence)
  v_lead_number := 'LD-' || floor(random() * 100000)::text;

  -- Determine assigned counselor: 
  -- User requested "no counselor", so if p_assigned_counselor_id is NULL, we keep it NULL.
  -- Previously we fell back to p_user_id (creator), but let's respect the "no counselor" wish rigidly if passed explicitly as such.
  -- However, to be safe with existing data, if p_assigned_counselor_id IS passed, we use it.
  v_counselor_id := p_assigned_counselor_id;

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

  RETURN v_lead_id;
END;
$$;
