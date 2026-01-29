-- Migration: Application Actions
-- Description: RPC to handle application approval/rejection.

CREATE OR REPLACE FUNCTION update_application_status(
  p_application_id uuid,
  p_status text, -- 'approved' or 'rejected'
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql security definer
AS $$
BEGIN
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

  -- If approved, we might strictly want to auto-create a student (optional future step)
  -- For now, just updating status is enough to reflect in UI.

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION update_application_status TO authenticated;
