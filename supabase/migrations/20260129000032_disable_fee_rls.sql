-- Migration: Disable RLS on student_fees for debugging
-- Description: Temporarily disables RLS to rule out permission issues.

ALTER TABLE student_fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE fee_discount_approvals DISABLE ROW LEVEL SECURITY;
