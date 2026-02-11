const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStudents() {
    console.log('Checking students...');

    // 1. Find Priya Teacher
    const { data: educators, error: eduError } = await supabase
        .from('educators')
        .select('id, name')
        .ilike('name', '%Priya%');

    if (eduError) {
        console.error('Error finding educator:', eduError);
        return;
    }

    console.log('Educators found:', educators);

    if (educators.length === 0) return;

    const educatorId = educators[0].id;

    // 2. Get Assignments
    const { data: assignments, error: assignError } = await supabase
        .from('educator_class_assignments')
        .select('class_id, section_id, is_class_teacher, class(name), section(name)')
        .eq('educator_id', educatorId);

    if (assignError) {
        console.error('Error getting assignments:', assignError);
        return;
    }

    console.log('Assignments:', JSON.stringify(assignments, null, 2));

    // 3. Check Student Counts for these classes
    for (const assign of assignments) {
        if (!assign.class || !assign.section) continue; // handle bad data

        const { count, error: countError } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', assign.class_id)
            .eq('section_id', assign.section_id)
            .eq('status', 'active');

        if (countError) {
            console.error(`Error counting students for ${assign.class.name}-${assign.section.name}:`, countError);
        } else {
            console.log(`Class ${assign.class.name} - ${assign.section.name} (${assign.is_class_teacher ? 'Class Teacher' : 'Subject Teacher'}): ${count} students`);
        }
    }
}

checkStudents();
