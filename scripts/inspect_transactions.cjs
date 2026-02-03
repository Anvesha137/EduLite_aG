const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    const admissionNo = 'ADM004';

    // 1. Get Student
    const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('admission_number', admissionNo);

    const studentId = students[0].id;

    // 2. Get Student Fee
    const { data: fees } = await supabase
        .from('student_fees')
        .select('id, paid_amount')
        .eq('student_id', studentId);

    const fee = fees[0];
    console.log('Fee Record:', fee);

    // 3. Get Payments
    const { data: payments, error } = await supabase
        .from('fee_payments')
        .select('*')
        .eq('student_fee_id', fee.id);

    if (error) console.error(error);
    console.log(`Found ${payments.length} payments:`);
    console.log(payments);
}

inspect();
