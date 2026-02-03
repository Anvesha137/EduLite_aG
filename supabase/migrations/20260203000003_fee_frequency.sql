-- Add frequency to fee_heads
ALTER TABLE fee_heads 
ADD COLUMN frequency text CHECK (frequency IN ('one_time', 'monthly', 'quarterly', 'half_yearly', 'annual')) DEFAULT 'annual';

-- Migrate existing data (assuming is_recurring=false means one_time, true means annual/monthly - defaulting to annual)
UPDATE fee_heads SET frequency = 'one_time' WHERE is_recurring = false;
UPDATE fee_heads SET frequency = 'annual' WHERE is_recurring = true;

-- Drop old column
ALTER TABLE fee_heads DROP COLUMN is_recurring;
