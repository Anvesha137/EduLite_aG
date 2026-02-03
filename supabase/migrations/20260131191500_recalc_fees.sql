-- Migration: Recalculate Student Fees Paid Amount
-- Description: Fixes data inconsistency where student_fees.paid_amount might be 0 despite payments existing.

DO $$
BEGIN
  -- 1. Update paid_amount in student_fees from actual fee_payments
  UPDATE student_fees sf
  SET paid_amount = COALESCE((
    SELECT SUM(fp.amount)
    FROM fee_payments fp
    WHERE fp.student_fee_id = sf.id
  ), 0);

  -- 2. Update status based on the new paid_amount
  UPDATE student_fees
  SET status = CASE 
      WHEN paid_amount >= (total_fee - COALESCE(discount_amount, 0)) THEN 'paid'
      WHEN paid_amount > 0 THEN 'partially_paid'
      ELSE 'unpaid'
    END;
    
END $$;
