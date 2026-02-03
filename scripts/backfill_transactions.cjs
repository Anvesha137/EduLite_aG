const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function backfillTransactions() {
    console.log('Starting transaction backfill...');

    // 1. Fetch all student fees with paid amount > 0
    const { data: fees, error: feesError } = await supabase
        .from('student_fees')
        .select('*')
        .gt('paid_amount', 0);

    if (feesError) {
        console.error('Error fetching fees:', feesError);
        return;
    }

    console.log(`Found ${fees.length} fee records with payments.`);

    let createdCount = 0;

    for (const fee of fees) {
        // 2. Fetch existing payments
        const { data: payments, error: payError } = await supabase
            .from('fee_payments')
            .select('amount')
            .eq('student_fee_id', fee.id);

        if (payError) {
            console.error(`Error fetching payments for fee ${fee.id}:`, payError);
            continue;
        }

        const totalRecorded = payments.reduce((sum, p) => sum + p.amount, 0);
        const missingAmount = fee.paid_amount - totalRecorded;

        // Tolerance of 1.0 to account for float math
        if (missingAmount > 1.0) {
            console.log(`Fee ${fee.id}: Paid ${fee.paid_amount}, Recorded ${totalRecorded}, Missing ${missingAmount}`);

            // 3. Insert backfill payment
            const { error: insertError } = await supabase
                .from('fee_payments')
                .insert({
                    school_id: fee.school_id,
                    student_fee_id: fee.id,
                    amount: missingAmount,
                    payment_date: new Date().toISOString().split('T')[0], // Today
                    payment_mode: 'cash',
                    transaction_ref: `BACKFILL-${Math.floor(Math.random() * 10000)}`,
                    remarks: 'System backfilled missing transaction history',
                    // installment_id is left null as it's a generic backfill
                });

            if (insertError) {
                console.error('Error inserting payment:', insertError);
            } else {
                console.log('  -> Created backfill transaction.');
                createdCount++;
            }
        }
    }

    console.log(`Backfill complete. Created ${createdCount} transaction records.`);
}

backfillTransactions();
