const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTriggers() {
    console.log('Calling inspect_auth_triggers()...');

    const { data, error } = await supabase.rpc('inspect_auth_triggers');

    if (error) {
        console.error('RPC Error:', error);
    } else {
        console.log('Found Triggers:', data);

        // Check if there are any that look suspicious
        if (data && data.length > 0) {
            console.log('\nPotential Culprits:');
            data.forEach(t => console.log(`- ${t.trigger_name} (Event: ${t.event_manipulation})`));
        } else {
            console.log('No triggers found on auth.users? That is unexpected if login fails.');
        }
    }
}

checkTriggers();
