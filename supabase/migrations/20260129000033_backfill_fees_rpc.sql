-- Migration: Create Security Definer RPC for Backfilling Fees
-- Description: Creates a function that runs with admin privileges to backfill missing fee records, bypassing RLS.

CREATE OR REPLACE FUNCTION backfill_missing_fees_v2(p_school_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Critical: Runs as superuser/creator, bypassing RLS
SET search_path = public
AS $$
DECLARE
    v_student RECORD;
    v_count integer := 0;
    v_fee numeric;
    v_academic_year text := '2024-25';
    v_class_grade text;
BEGIN
    -- Loop through all active students for this school
    FOR v_student IN 
        SELECT s.id, s.class_id, s.name, c.grade 
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.school_id = p_school_id 
        AND s.status = 'active'
    LOOP
        -- Check if fee already exists
        IF NOT EXISTS (
            SELECT 1 FROM student_fees 
            WHERE student_id = v_student.id 
            AND academic_year = v_academic_year
        ) THEN
            -- Calculate Fee
            v_fee := 35000; -- Default
            IF v_student.grade IN ('11', '12') THEN v_fee := 60000;
            ELSIF v_student.grade IN ('9', '10') THEN v_fee := 50000;
            END IF;

            -- Insert Fee Record
            INSERT INTO student_fees (
                school_id,
                student_id,
                class_id,
                academic_year,
                total_fee,
                status
            ) VALUES (
                p_school_id,
                v_student.id,
                v_student.class_id,
                v_academic_year,
                v_fee,
                'unpaid'
            );
            
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'message', format('Processed school %s. Created %s missing fee records.', p_school_id, v_count),
        'count', v_count
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$;
