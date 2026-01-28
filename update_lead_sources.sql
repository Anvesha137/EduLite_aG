-- Migration: Update Lead Sources and Add Referral Logic
-- Description: Adds referral columns, strict validation function, and updates lead source options.

-- 1. Add referral columns to admission_leads
ALTER TABLE admission_leads 
ADD COLUMN IF NOT EXISTS referral_code text,
ADD COLUMN IF NOT EXISTS referral_type text CHECK (referral_type IN ('student', 'staff', 'other'));

-- 2. Create Validation Function
CREATE OR REPLACE FUNCTION validate_referral_code(
  p_code text,
  p_type text,
  p_school_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_valid boolean := false;
  v_name text;
  v_details text;
BEGIN
  IF p_type = 'student' THEN
    SELECT true, name, 'Class: ' || (SELECT grade FROM classes WHERE id = c.id)
    INTO v_valid, v_name, v_details
    FROM students s
    LEFT JOIN classes c ON c.id = s.class_id
    WHERE s.admission_number = p_code 
    AND s.school_id = p_school_id 
    AND s.status = 'active';
    
  ELSIF p_type = 'staff' THEN
    SELECT true, name, designation
    INTO v_valid, v_name, v_details
    FROM educators
    WHERE employee_id = p_code 
    AND school_id = p_school_id
    AND status = 'active';
    
  ELSE
    RETURN jsonb_build_object('valid', false, 'message', 'Invalid referral type');
  END IF;

  IF v_valid THEN
    RETURN jsonb_build_object(
      'valid', true, 
      'name', v_name, 
      'details', v_details
    );
  ELSE
    RETURN jsonb_build_object(
      'valid', false, 
      'message', 'Invalid or inactive ' || p_type || ' code'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update Lead Sources
-- First, deactivate old sources if needed (optional, skipping to avoid data loss on existing leads)
-- We will insert/upsert the new required sources

DO $$
DECLARE
  v_school_id uuid;
BEGIN
  -- Apply for all schools (or loop if multiple)
  FOR v_school_id IN SELECT id FROM schools LOOP
    
    -- Walk-in
    INSERT INTO admission_lead_sources (school_id, name, source_type, description)
    VALUES (v_school_id, 'Walk-in Entry', 'walkin', 'Parents visiting school directly')
    ON CONFLICT DO NOTHING; -- Assuming name constraint exists, else simplistic insert

    -- Social Media
    INSERT INTO admission_lead_sources (school_id, name, source_type, description)
    VALUES (v_school_id, 'Social Media', 'facebook', 'Facebook, Instagram, or other social platforms')
    ON CONFLICT DO NOTHING;

    -- Tie-up School
    INSERT INTO admission_lead_sources (school_id, name, source_type, description)
    VALUES (v_school_id, 'Tie-up School', 'referral', 'Referral from partner schools')
    ON CONFLICT DO NOTHING;

    -- Student/Staff Referral
    INSERT INTO admission_lead_sources (school_id, name, source_type, description)
    VALUES (v_school_id, 'Student/Staff Referral', 'referral', 'Internal referral requiring validation')
    ON CONFLICT DO NOTHING;

    -- Others
    INSERT INTO admission_lead_sources (school_id, name, source_type, description)
    VALUES (v_school_id, 'Others', 'other', 'Other sources')
    ON CONFLICT DO NOTHING;

  END LOOP;
END $$;
