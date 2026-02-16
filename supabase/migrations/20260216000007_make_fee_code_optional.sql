-- Migration: Make Fee Type Code Optional
-- Description: Removes the NOT NULL constraint from the code column because the frontend does not currently provide it.

ALTER TABLE fee_types ALTER COLUMN code DROP NOT NULL;
