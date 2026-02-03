const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function backfillTransactions() {
    console.log('Starting backfill of missing fee transactions...');

    // 1. Get all installments that have been paid (fully or partially)
    const { data: paidInstallments, error: instError } = await supabase
        .from('fee_installments')
        .select('*')
        .gt('paid_amount', 0);

    if (instError) {
        console.error('Error fetching installments:', instError);
        return;
    }

    console.log(`Found ${paidInstallments.length} installments with payments.`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const installment of paidInstallments) {
        // 2. Check if a transaction already exists for this installment
        // We check purely by reference or by loose math for now.
        // If no payment exists linked to this installment, we create one.
        const { data: existingPayments, error: payError } = await supabase
            .from('fee_payments')
            .select('id')
            .eq('installment_id', installment.id);

        if (payError) {
            console.error('Error checking payments:', payError);
            continue;
        }

        if (existingPayments && existingPayments.length > 0) {
            skippedCount++;
            continue;
        }

        // 3. Create a backfilled transaction
        // We assume the payment date is the updated_at date or today if null, 
        // and the amount is the paid_amount in the installment.
        const paymentDate = installment.updated_at ? installment.updated_at.split('T')[0] : new Date().toISOString().split('T')[0];

        // We need the student_fee_id. Installment table usually has it.
        // If not, we need to fetch it or finding it via student_id+year.
        // Checking schema: fee_installments typically has student_fee_id or student_id.
        // Based on previous code: fee_installments has student_id.
        // but fee_payments needs student_fee_id.
        // Let's first try to find the student_fee_id for this student/year.

        let studentFeeId = installment.student_fee_id;

        if (!studentFeeId) {
            // Fallback: fetch student_fee_id
            const { data: sfData } = await supabase
                .from('student_fees')
                .select('id')
                .eq('student_id', installment.student_id)
                .eq('academic_year', installment.academic_year)
                .single();

            if (sfData) studentFeeId = sfData.id;
        }

        if (!studentFeeId) {
            console.log(`Could not find student_fee_id for installment ${installment.id}`);
            continue;
        }

        const { error: insertError } = await supabase
            .from('fee_payments')
            .insert({
                school_id: installment.school_id || '00000000-0000-0000-0000-000000000000', // Fallback or need to fetch
                student_fee_id: studentFeeId,
                installment_id: installment.id,
                amount: installment.paid_amount,
                payment_mode: 'cash', // Default to cash for backfill
                transaction_ref: `BACKFILL-${Math.floor(Math.random() * 10000)}`,
                payment_date: paymentDate,
                remarks: 'System Backfill for Legacy Payment'
            });

        if (insertError) {
            console.error(`Failed to insert payment for installment ${installment.id}:`, insertError);
        } else {
            createdCount++;
            process.stdout.write('.');
        }
    }

    console.log('\nBackfill Complete.');
    console.log(`Created: ${createdCount}`);
    console.log(`Skipped (Already Exists): ${skippedCount}`);
}

backfillTransactions().catch(console.error);
