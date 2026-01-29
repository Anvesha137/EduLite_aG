-- Migration: Disable RLS for Educators
-- Description: Unblocks data visibility for Educator Management module.

ALTER TABLE educators DISABLE ROW LEVEL SECURITY;
