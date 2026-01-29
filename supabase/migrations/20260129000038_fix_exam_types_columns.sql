-- Add updated_at column to exam_types if it doesn't exist
ALTER TABLE IF EXISTS public.exam_types 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
