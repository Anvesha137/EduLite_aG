-- Generic Audit Log Trigger Function
CREATE OR REPLACE FUNCTION log_audit_change()
RETURNS TRIGGER AS $$
DECLARE
    v_school_id uuid;
    v_user_id uuid;
    v_old_data jsonb;
    v_new_data jsonb;
BEGIN
    -- Determine School ID and User ID
    -- Attempt to get school_id from record, fallback to auth.uid() lookup
    IF (TG_OP = 'DELETE') THEN
        v_old_data = to_jsonb(OLD);
        v_school_id := OLD.school_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_old_data = to_jsonb(OLD);
        v_new_data = to_jsonb(NEW);
        v_school_id := NEW.school_id;
    ELSIF (TG_OP = 'INSERT') THEN
        v_new_data = to_jsonb(NEW);
        v_school_id := NEW.school_id;
    END IF;

    v_user_id := auth.uid();

    -- Insert into audit_logs
    INSERT INTO audit_logs (
        school_id,
        user_id,
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        created_at
    ) VALUES (
        v_school_id,
        v_user_id,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        v_old_data,
        v_new_data,
        now()
    );

    RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
    -- Fail safe: don't block main operation if logging fails
    RAISE WARNING 'Audit logging failed: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Triggers to School Plan Tables

DROP TRIGGER IF EXISTS audit_classes ON classes;
CREATE TRIGGER audit_classes
AFTER INSERT OR UPDATE OR DELETE ON classes
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

DROP TRIGGER IF EXISTS audit_sections ON sections;
CREATE TRIGGER audit_sections
AFTER INSERT OR UPDATE OR DELETE ON sections
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

DROP TRIGGER IF EXISTS audit_subjects ON subjects;
CREATE TRIGGER audit_subjects
AFTER INSERT OR UPDATE OR DELETE ON subjects
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

DROP TRIGGER IF EXISTS audit_grade_scales ON grade_scales;
CREATE TRIGGER audit_grade_scales
AFTER INSERT OR UPDATE OR DELETE ON grade_scales
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

DROP TRIGGER IF EXISTS audit_fee_heads ON fee_heads;
CREATE TRIGGER audit_fee_heads
AFTER INSERT OR UPDATE OR DELETE ON fee_heads
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

DROP TRIGGER IF EXISTS audit_fee_structures ON fee_structures;
CREATE TRIGGER audit_fee_structures
AFTER INSERT OR UPDATE OR DELETE ON fee_structures
FOR EACH ROW EXECUTE FUNCTION log_audit_change();
