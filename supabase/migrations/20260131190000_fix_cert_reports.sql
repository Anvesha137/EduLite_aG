-- Migration: Fix Certificates and Reports
-- Description: Disables RLS on classes/sections to fix dropdowns.

-- 1. Fix Certificate Dropdowns (Disable RLS for Reference Tables)
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE sections DISABLE ROW LEVEL SECURITY;
