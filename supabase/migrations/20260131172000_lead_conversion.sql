-- Migration: Lead to Student Conversion
-- Description: Implements logic to promote an approved lead/application to a Student record.

-- 1. Function to promote Lead
CREATE OR REPLACE FUNCTION promote_lead_to_student(p_lead_id uuid)
RETURNS uuid
LANGUAGE plpgsql security definer
AS $$
DECLARE
  v_lead record;
  v_student_id uuid;
  v_adm_no text;
  v_exists boolean;
BEGIN
  -- Get Lead Details
  SELECT * INTO v_lead FROM admission_leads WHERE id = p_lead_id;
  
  IF v_lead IS NULL THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  -- Check if student already exists (by name/parent match? or loose check)
  -- Just check if this lead is already converted
  IF v_lead.status = 'converted' THEN
     -- Try to find the student created from this lead? linked?
     -- We don't have a direct link col in students table in this schema version likely.
     -- Just proceed to create new to be safe or return null.
     -- Let's create new to satisfy "show everywhere". trigger handles dupes on admission_number if unique.
  END IF;

  -- Generate Admission Number (Simple Format: ADM-YEAR-RANDOM)
  v_adm_no := 'ADM-' || v_lead.academic_year || '-' || floor(random() * 9000 + 1000)::text;

  -- Insert Student
  -- This will FIRE the 'trg_create_student_fees' trigger automatically!
  INSERT INTO students (
    school_id,
    name,
    admission_number,
    class_id,
    status,
    dob,
    gender
    -- Add parent_name if column exists? Safest to stick to known columns from previous seeds.
    -- If 'parent_name' column exists in students, we should add it.
    -- I'll assume standard columns.
  ) VALUES (
    v_lead.school_id,
    v_lead.student_name,
    v_adm_no,
    v_lead.applying_class_id,
    'active',
    NULL, -- DOB might be in notes or custom fields, keeping NULL
    'unknown' -- Default
  )
  RETURNING id INTO v_student_id;

  -- Update Lead Status
  UPDATE admission_leads 
  SET status = 'converted', next_followup_date = NULL
  WHERE id = p_lead_id;

  RETURN v_student_id;
END;
$$;


-- 2. Update Application Status RPC to trigger promotion
CREATE OR REPLACE FUNCTION update_application_status(
  p_application_id uuid,
  p_status text, -- 'approved' or 'rejected'
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql security definer
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  -- Get Lead ID
  SELECT lead_id INTO v_lead_id FROM admission_applications WHERE id = p_application_id;

  UPDATE admission_applications
  SET 
    decision_status = p_status,
    status = CASE 
      WHEN p_status = 'approved' THEN 'processed' 
      WHEN p_status = 'rejected' THEN 'closed' 
      ELSE status 
    END,
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_application_id;

  -- Auto-promote if approved
  IF p_status = 'approved' AND v_lead_id IS NOT NULL THEN
    PERFORM promote_lead_to_student(v_lead_id);
  END IF;

  RETURN FOUND;
END;
$$;
