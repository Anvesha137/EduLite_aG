-- Migration: Disable RLS for Fee Types
-- Description: Aligns fee_types with other tables in Demo Mode (public read/write).

ALTER TABLE fee_types DISABLE ROW LEVEL SECURITY;

-- Note: We keep the policies defined in the previous migration, 
-- but they will be inactive while RLS is disabled.
