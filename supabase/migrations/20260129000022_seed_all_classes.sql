-- Migration: Seed All Classes
-- Description: Seeds the classes table with Nursery, LKG, UKG, and Grades 1-12.

DO $$
DECLARE
    v_school_id uuid;
    i integer;
BEGIN
    SELECT id INTO v_school_id FROM schools LIMIT 1;
    
    IF v_school_id IS NOT NULL THEN
        -- Insert Nursery, KG
        INSERT INTO classes (school_id, grade, grade_order) VALUES 
        (v_school_id, 'Nursery', 0),
        (v_school_id, 'LKG', 1),
        (v_school_id, 'UKG', 2)
        ON CONFLICT (school_id, grade) DO NOTHING;
        
        -- Insert 1 to 12
        FOR i IN 1..12 LOOP
            INSERT INTO classes (school_id, grade, grade_order) VALUES 
            (v_school_id, i::text, i + 2)
            ON CONFLICT (school_id, grade) DO NOTHING;
        END LOOP;
    END IF;
END $$;
