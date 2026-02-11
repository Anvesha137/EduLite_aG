const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking classes table schema...');

    const { data, error } = await supabase
        .from('classes')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching classes:', error);
    } else {
        console.log('Classes sample row:', data);
        if (data && data.length > 0) {
            console.log('Keys:', Object.keys(data[0]));
        }
    }
}

checkSchema();
