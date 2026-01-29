-- Migration: Create Educator RPC
-- Description: Adds the missing 'create_educator' function required by the frontend.

CREATE OR REPLACE FUNCTION create_educator(
  p_school_id uuid,
  p_employee_id text,
  p_name text,
  p_phone text,
  p_email text,
  p_designation text,
  p_qualification text,
  p_experience_years integer,
  p_joining_date date,
  p_status text,
  p_address text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_educator_id uuid;
BEGIN
  INSERT INTO educators (
    school_id,
    employee_id,
    name,
    phone,
    email,
    designation,
    qualification,
    experience_years,
    joining_date,
    status,
    address
  )
  VALUES (
    p_school_id,
    p_employee_id,
    p_name,
    p_phone,
    p_email,
    p_designation,
    p_qualification,
    p_experience_years,
    p_joining_date,
    p_status,
    p_address
  )
  RETURNING id INTO v_educator_id;

  RETURN v_educator_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_educator TO authenticated;
