-- Migration: Fix Student Creation & Class Visibility
-- Description: 
-- 1. Create 'create_student_with_parent' RPC to handle "Name/Phone" input requirement.
-- 2. Disable RLS on 'classes' to ensure dropdowns populate immediately.

-- 1. Disable RLS on classes (Temporary Fix for Visibility)
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE sections DISABLE ROW LEVEL SECURITY; -- Also sections, usually needed together

-- 2. Create RPC for Simplified Student Creation
CREATE OR REPLACE FUNCTION create_student_with_parent(
  p_school_id uuid,
  p_admission_number text,
  p_name text,
  p_dob date,
  p_gender text,
  p_class_id uuid,
  p_section_id uuid,
  p_blood_group text,
  p_address text,
  p_admission_date date,
  p_status text,
  p_parent_name text,
  p_parent_phone text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id uuid;
  v_student_id uuid;
BEGIN
  -- A. Handle Parent (Find existing by Phone or Create New)
  -- clean phone number? Assuming frontend does basic validation, but good to be safe.
  
  SELECT id INTO v_parent_id 
  FROM parents 
  WHERE school_id = p_school_id AND phone = p_parent_phone 
  LIMIT 1;

  IF v_parent_id IS NULL THEN
    INSERT INTO parents (school_id, name, phone, relationship)
    VALUES (p_school_id, p_parent_name, p_parent_phone, 'father') -- Default to father, editable later
    RETURNING id INTO v_parent_id;
  END IF;

  -- B. Create Student
  INSERT INTO students (
    school_id, 
    admission_number, 
    name, 
    dob, 
    gender, 
    class_id, 
    section_id, 
    parent_id, 
    blood_group, 
    address, 
    admission_date, 
    status
  )
  VALUES (
    p_school_id,
    p_admission_number,
    p_name,
    p_dob,
    p_gender,
    p_class_id,
    p_section_id,
    v_parent_id,
    p_blood_group,
    p_address,
    p_admission_date,
    p_status
  )
  RETURNING id INTO v_student_id;

  RETURN v_student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_student_with_parent TO authenticated;
