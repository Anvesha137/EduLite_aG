
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function inspectData() {
    console.log('--- Inspecting Data Relations ---');

    // 1. Get Schools
    const { data: schools } = await adminClient.from('schools').select('id, name');
    console.log('Schools:', schools);

    if (!schools || schools.length === 0) return;
    const schoolId = schools[0].id; // Assuming first school

    // 2. Get Classes for this school
    const { data: classes } = await adminClient.from('classes').select('id, grade, name').eq('school_id', schoolId);
    console.log(`Classes for school ${schoolId}:`, classes?.length);
    if (classes && classes.length > 0) console.log('Sample Class:', classes[0]);

    // 3. Get Active Students
    const { data: students } = await adminClient
        .from('students')
        .select('id, name, admission_number, class_id, school_id')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .limit(5); // Just check first 5

    console.log(`Active Students (Sample 5 of many):`);
    console.log(students);

    if (students && students.length > 0) {
        const student = students[0];
        console.log(`\nChecking Fee for Student: ${student.name} (${student.id})`);

        // 4. Check Fee Record
        const { data: fees, error } = await adminClient
            .from('student_fees')
            .select('*')
            .eq('student_id', student.id)
            .eq('academic_year', '2024-25');

        if (error) console.error('Error fetching fees:', error);
        console.log('Fee Records:', fees);

        // 5. Check Class ID match
        const studentClassId = student.class_id;
        const matchingClass = classes?.find(c => c.id === studentClassId);
        console.log(`Student Class ID: ${studentClassId}`);
        console.log(`Matching Class found in DB:`, matchingClass);
    }
}

inspectData();
