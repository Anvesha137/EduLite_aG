const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugData() {
    console.log('--- 1. Fetching Amit Verma ---');
    const { data: educators, error: eduError } = await supabase
        .from('educators')
        .select('*')
        .ilike('name', '%Amit Verma%');

    if (eduError) {
        console.error('Error fetching educators:', eduError);
        return;
    }

    if (!educators || educators.length === 0) {
        console.log('No educator named Amit Verma found.');
        return;
    }

    const amit = educators[0];
    console.log('Found Educator:', amit.name, amit.id, amit.school_id);

    console.log('\n--- 2. Fetching Assignments for Amit ---');
    const { data: assignments, error: assignError } = await supabase
        .from('educator_class_assignments')
        .select('*')
        .eq('educator_id', amit.id);

    if (assignError) {
        console.error('Error fetching assignments:', assignError);
        return;
    }

    console.log(`Found ${assignments.length} assignments.`);
    assignments.forEach(a => {
        console.log(`- Type: ${a.is_class_teacher ? 'Class Teacher' : 'Subject'}, ClassID: ${a.class_id}, SectionID: ${a.section_id}, Year: ${a.academic_year}`);
    });

    if (assignments.length > 0) {
        const first = assignments[0];
        console.log('\n--- 3. Verifying Relations for first assignment ---');

        const { data: cls } = await supabase.from('classes').select('*').eq('id', first.class_id).single();
        console.log('Class:', cls ? cls.name : 'NULL/Missing');

        const { data: sec } = await supabase.from('sections').select('*').eq('id', first.section_id).single();
        console.log('Section:', sec ? sec.name : 'NULL/Missing');
    }
}

debugData();
