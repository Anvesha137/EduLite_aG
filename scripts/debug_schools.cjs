const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchools() {
    const { data: schools, error } = await supabase.from('schools').select('*');
    if (error) console.error(error);
    else console.log('Schools:', schools);
}
checkSchools();
