-- Migration: Seed Exam Types
-- Description: Inserts default exam types if they don't exist, using the specific UUIDs the frontend expects.

DO $$
DECLARE
  v_school_id uuid;
BEGIN
  -- Get the demo school ID first
  SELECT id INTO v_school_id FROM schools WHERE name = 'Demo International School';

  IF v_school_id IS NOT NULL THEN
    -- Insert default types if not present
    INSERT INTO exam_types (id, school_id, name, code)
    VALUES 
      ('00000000-0000-0000-0000-000000000001', v_school_id, 'Unit Test', 'UT'),
      ('00000000-0000-0000-0000-000000000002', v_school_id, 'Half Yearly', 'HY'),
      ('00000000-0000-0000-0000-000000000003', v_school_id, 'Annual', 'ANN'),
      ('00000000-0000-0000-0000-000000000004', v_school_id, 'Quarterly', 'QT')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END;
$$;
