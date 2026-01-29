-- Add UNIQUE constraint to exam_types to support ON CONFLICT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'exam_types_school_id_name_key'
    ) THEN
        ALTER TABLE public.exam_types 
        ADD CONSTRAINT exam_types_school_id_name_key UNIQUE (school_id, name);
    END IF;
END $$;
