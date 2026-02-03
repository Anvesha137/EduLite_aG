const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixData() {
    const admissionNo = 'ADM004';
    const academicYear = '2024-25';

    console.log(`Checking data for Admission No: ${admissionNo}`);

    // 1. Get Student
    const { data: students, error: sError } = await supabase
        .from('students')
        .select('id, name, school_id, class_id')
        .eq('admission_number', admissionNo);

    if (sError || !students.length) {
        console.error('Student error:', sError || 'Not found');
        return;
    }

    const student = students[0];
    console.log(`Student found: ${student.name} (${student.id})`);

    // 2. Check Fees
    const { data: fees } = await supabase
        .from('student_fees')
        .select('*')
        .eq('student_id', student.id)
        .eq('academic_year', academicYear);

    if (fees && fees.length > 0) {
        console.log('Student Fee record ALREADY EXISTS:', fees[0]);
        return;
    }

    console.log('MISSING student_fee record. Fetching installments to calculate...');

    // 3. Fetch Installments
    const { data: installments, error: iError } = await supabase
        .from('fee_installments')
        .select('*')
        .eq('student_id', student.id)
        .eq('academic_year', academicYear);

    if (iError || !installments) {
        console.error('Error fetching installments:', iError);
        return;
    }

    console.log(`Found ${installments.length} installments.`);

    // 4. Calculate Totals
    let totalFee = 0;
    let paidAmount = 0;

    installments.forEach(i => {
        totalFee += (i.amount || 0);
        paidAmount += (i.paid_amount || 0);
    });

    const pendingAmount = totalFee - paidAmount;
    let status = 'unpaid';
    if (paidAmount >= totalFee && totalFee > 0) status = 'paid';
    else if (paidAmount > 0) status = 'partially_paid';

    console.log(`Calculated: Total=${totalFee}, Paid=${paidAmount}, Pending=${pendingAmount}, Status=${status}`);

    // 5. Insert Record
    const newFee = {
        student_id: student.id,
        school_id: student.school_id,
        class_id: student.class_id,
        academic_year: academicYear,
        total_fee: totalFee,
        paid_amount: paidAmount,
        pending_amount: pendingAmount,
        discount_amount: 0,
        net_fee: totalFee,
        status: status
    };

    const { data: inserted, error: insertError } = await supabase
        .from('student_fees')
        .insert(newFee)
        .select();

    if (insertError) {
        console.error('Error inserting student_fees:', insertError);
    } else {
        console.log('SUCCESSLY INSERTED student_fees record:', inserted);
    }
}

fixData();
