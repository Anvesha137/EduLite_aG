/*
  # Fix Audit Trigger for All Table Types

  Updates the audit log trigger to handle tables with different structures
*/

DROP TRIGGER IF EXISTS trg_audit_fee_payments ON fee_payments;
DROP TRIGGER IF EXISTS trg_audit_discount_approvals ON fee_discount_approvals;
DROP FUNCTION IF EXISTS create_fee_audit_log();

-- Create flexible audit log function
CREATE OR REPLACE FUNCTION create_fee_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_action text;
  v_performed_by uuid;
BEGIN
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'created'
    WHEN 'UPDATE' THEN 'updated'
    WHEN 'DELETE' THEN 'deleted'
    ELSE TG_OP
  END;
  
  -- Try to get performed_by from various sources
  v_performed_by := COALESCE(
    auth.uid(),
    CASE 
      WHEN TG_TABLE_NAME = 'fee_payments' THEN COALESCE(NEW.received_by, OLD.received_by)
      WHEN TG_TABLE_NAME = 'fee_discount_approvals' THEN COALESCE(NEW.requested_by, OLD.requested_by)
      ELSE NULL
    END
  );

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
    v_performed_by,
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
