require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTable() {
    console.log('Checking for holidays table...');
    const { data, error } = await supabase.from('holidays').select('*').limit(1);
    if (error) {
        console.log('Error (likely table missing):', error.message);
    } else {
        console.log('Success! Table exists.');
    }
}

checkTable();
