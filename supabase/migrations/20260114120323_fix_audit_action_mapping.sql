/*
  # Fix Audit Log Action Mapping

  Maps PostgreSQL trigger operations (INSERT/UPDATE/DELETE) to our expected action names (created/updated/deleted)
*/

-- Drop existing triggers and function
DROP TRIGGER IF EXISTS trg_audit_fee_payments ON fee_payments;
DROP TRIGGER IF EXISTS trg_audit_discount_approvals ON fee_discount_approvals;
DROP FUNCTION IF EXISTS create_fee_audit_log();

-- Create improved audit log function with proper action mapping
CREATE OR REPLACE FUNCTION create_fee_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_action text;
BEGIN
  -- Map PostgreSQL trigger operation to our action names
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'created'
    WHEN 'UPDATE' THEN 'updated'
    WHEN 'DELETE' THEN 'deleted'
    ELSE TG_OP
  END;

  INSERT INTO fee_audit_logs (
    school_id,
    entity_type,
    entity_id,
    action,
    performed_by,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.school_id, OLD.school_id),
    TG_ARGV[0],
    COALESCE(NEW.id, OLD.id),
    v_action,
    COALESCE(auth.uid(), COALESCE(NEW.received_by, OLD.received_by)),
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate audit triggers
CREATE TRIGGER trg_audit_fee_payments
AFTER INSERT OR UPDATE OR DELETE ON fee_payments
FOR EACH ROW
EXECUTE FUNCTION create_fee_audit_log('payment');

CREATE TRIGGER trg_audit_discount_approvals
AFTER INSERT OR UPDATE ON fee_discount_approvals
FOR EACH ROW
EXECUTE FUNCTION create_fee_audit_log('discount');
