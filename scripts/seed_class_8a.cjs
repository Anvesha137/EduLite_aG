const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedClass8A() {
    console.log('Seeding students for Class 8-A...');

    // 1. Get Class and Section IDs
    const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('name', '8') // Assuming name is '8' based on screenshot "8 - A"
        .single();

    if (!classData) {
        console.error('Class 8 not found', classError);
        return;
    }

    // Filter section by class_id to ensure uniqueness
    const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select('id')
        .eq('name', 'A')
        .eq('class_id', classData.id)
        .single();

    if (!sectionData) {
        console.error('Section A not found', sectionError);
        return;
    }

    console.log(`Found Class 8 (${classData.id}) and Section A (${sectionData.id})`);

    // 2. Generate Students
    const students = [
        { name: 'Aarav Patel', admission_number: 'ADM-8A-001', gender: 'Male' },
        { name: 'Diya Sharma', admission_number: 'ADM-8A-002', gender: 'Female' },
        { name: 'Ishaan Gupta', admission_number: 'ADM-8A-003', gender: 'Male' },
        { name: 'Ananya Singh', admission_number: 'ADM-8A-004', gender: 'Female' },
        { name: 'Vihaan Kumar', admission_number: 'ADM-8A-005', gender: 'Male' },
        { name: 'Aditi Verma', admission_number: 'ADM-8A-006', gender: 'Female' },
        { name: 'Rohan Mehta', admission_number: 'ADM-8A-007', gender: 'Male' },
        { name: 'Saanvi Reddy', admission_number: 'ADM-8A-008', gender: 'Female' },
        { name: 'Kabir Joshi', admission_number: 'ADM-8A-009', gender: 'Male' },
        { name: 'Zara Khan', admission_number: 'ADM-8A-010', gender: 'Female' },
    ];

    const studentsWithIds = students.map(s => ({
        ...s,
        class_id: classData.id,
        section_id: sectionData.id,
        school_id: '00000000-0000-0000-0000-000000000000', // Default school ID
        status: 'active',
        date_of_birth: '2012-01-01', // Approx 14 years old
        address: '123 School Lane'
    }));

    // 3. Insert
    const { data, error } = await supabase
        .from('students')
        .upsert(studentsWithIds, { onConflict: 'admission_number' })
        .select();

    if (error) {
        console.error('Error seeding students:', error);
    } else {
        console.log(`Successfully seeded ${data.length} students for Class 8-A.`);
    }
}

seedClass8A();
