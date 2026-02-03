const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function linkTransactions() {
    const admissionNo = 'ADM004';

    // 1. Get Student
    const { data: students } = await supabase.from('students').select('id').eq('admission_number', admissionNo);
    const studentId = students[0].id;

    // 2. Get Installments
    const { data: installments } = await supabase
        .from('fee_installments')
        .select('*')
        .eq('student_id', studentId)
        .order('due_date');

    if (!installments) {
        console.error('No installments found');
        return;
    }

    console.log('Installments:', installments);

    // 3. Get Payments (Orphans)
    const { data: fee } = await supabase.from('student_fees').select('id').eq('student_id', studentId).single();

    const { data: payments } = await supabase
        .from('fee_payments')
        .select('*')
        .eq('student_fee_id', fee.id)
        .is('installment_id', null);

    console.log(`Found ${payments.length} orphan payments.`);

    // 4. Link them
    // Simple logic:
    // - If amount matches exactly, link.
    // - Else, link to first unpaid or partially paid installment?
    // Since we know the mock setup:
    // 20000 -> Inst 1
    // Others -> Inst 2 or 3

    for (const pay of payments) {
        let targetInstId = null;

        if (pay.amount === 20000) {
            // Find Installment 1
            const inst1 = installments.find(i => i.amount === 20000 || (i.installment_name && i.installment_name.includes('1')));
            if (inst1) targetInstId = inst1.id;
        } else {
            // Assume Installment 2 (15000) or 3
            // Let's just pick Installment 2 for the randoms
            const inst2 = installments.find(i => i.amount === 15000 || (i.installment_name && i.installment_name.includes('2')));
            if (inst2) targetInstId = inst2.id;
        }

        if (targetInstId) {
            console.log(`Linking payment ${pay.amount} to Installment ${targetInstId}`);
            await supabase
                .from('fee_payments')
                .update({ installment_id: targetInstId })
                .eq('id', pay.id);
        }
    }
    console.log('Done linking.');
}

linkTransactions();
