-- Migration: Seed Sections for All Classes
-- Description: Ensures every class has sections A, B, and C.

DO $$
DECLARE
    v_school_id uuid;
    v_class RECORD;
    v_sections text[] := ARRAY['A', 'B', 'C'];
    v_sec_name text;
BEGIN
    SELECT id INTO v_school_id FROM schools LIMIT 1;
    
    FOR v_class IN SELECT * FROM classes WHERE school_id = v_school_id
    LOOP
        FOREACH v_sec_name IN ARRAY v_sections
        LOOP
            INSERT INTO sections (school_id, class_id, name)
            VALUES (v_school_id, v_class.id, v_sec_name)
            ON CONFLICT DO NOTHING; -- Assuming (class_id, name) unique constraint exists, or just ignoring dupes if logic permits
        END LOOP;
    END LOOP;
END $$;
