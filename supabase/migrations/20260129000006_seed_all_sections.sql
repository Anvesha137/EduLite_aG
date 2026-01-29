-- Migration: Seed Sections for All Classes
-- Description: Ensures every class in the Demo School has at least 'Section A' so the dropdown works.

DO $$
DECLARE
  v_school_id uuid;
  r_class RECORD;
BEGIN
  -- 1. Get Demo School ID
  SELECT id INTO v_school_id FROM schools LIMIT 1;

  IF v_school_id IS NOT NULL THEN
    -- 2. Iterate through all classes of this school
    FOR r_class IN SELECT id, grade FROM classes WHERE school_id = v_school_id LOOP
      
      -- 3. Check and Insert 'Section A' if missing
      IF NOT EXISTS (SELECT 1 FROM sections WHERE class_id = r_class.id AND name = 'A') THEN
        INSERT INTO sections (school_id, class_id, name, capacity)
        VALUES (v_school_id, r_class.id, 'A', 40);
      END IF;
      
    END LOOP;
  END IF;
END $$;
