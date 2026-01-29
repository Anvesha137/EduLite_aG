-- Migration: Fix Subject Management
-- Description: Creates the missing RPCs for updating and deleting subjects.

-- 1. Create RPC: Update Subject
CREATE OR REPLACE FUNCTION update_subject(
    p_id uuid,
    p_name text,
    p_code text,
    p_description text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql security definer
AS $$
BEGIN
    UPDATE subjects
    SET 
        name = p_name,
        code = p_code,
        description = p_description,
        updated_at = now(),
        created_at = created_at -- Ensure we don't accidentally touch this if something weird happens (standard practice)
    WHERE id = p_id;
    
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION update_subject TO authenticated;

-- 2. Create RPC: Delete Subject
CREATE OR REPLACE FUNCTION delete_subject(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql security definer
AS $$
BEGIN
    DELETE FROM subjects WHERE id = p_id;
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_subject TO authenticated;
