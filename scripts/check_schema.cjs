
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    const { error } = await supabase.from('teacher_allocations').select('id').limit(1);
    if (error) {
        if (error.code === '42P01') { // undefined_table
            console.log('Table teacher_allocations DOES NOT EXIST. Using legacy schema.');
        } else {
            console.log('Error checking table:', error.message);
        }
    } else {
        console.log('Table teacher_allocations EXISTS. Using strict schema.');
    }
}

checkSchema();
