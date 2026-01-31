-- Migration: Update create_admission_lead RPC and add helper for fetching counselors
-- Description: Updates the function to accept p_assigned_counselor_id and adds get_available_counsellors

-- 1. Create Helper RPC to get list of counselors (users with role COUNSELOR or ADMIN/SUPERADMIN)
CREATE OR REPLACE FUNCTION get_available_counsellors(p_school_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  role text
)
LANGUAGE plpgsql security definer
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    COALESCE(up.full_name, u.email) as full_name,
    u.email::text, -- Cast to text to match return type
    r.name::text as role
  FROM user_profiles up
  JOIN auth.users u ON up.id = u.id
  JOIN roles r ON up.role_id = r.id
  WHERE up.school_id = p_school_id 
  AND (r.name = 'COUNSELOR' OR r.name = 'ADMIN' OR r.name = 'SUPERADMIN')
  AND up.is_active = true
  ORDER BY up.full_name;
END;
$$;

-- 2. Update create_admission_lead to accept assigned counselor
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

  -- Determine assigned counselor: prefer passed value, fallback to creator if no passed value
  v_counselor_id := COALESCE(p_assigned_counselor_id, p_user_id);

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
