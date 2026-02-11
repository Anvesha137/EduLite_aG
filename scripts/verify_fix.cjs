const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verifyFix() {
    console.log('Verifying key function definitions...');

    // We need a way to check function source. 
    // We can try to create a temp RPC to read pg_proc.

    const { error } = await supabase.rpc('create_verification_helper');
    if (error && !error.message.includes('already exists')) {
        console.log('Creating helper failed (might already exist or permission issue):', error.message);
    }

    const { data, error: rpcError } = await supabase.rpc('get_function_source', { func_name: 'handle_counsellor_invite_acceptance' });

    if (rpcError) {
        console.error('RPC Error (function might not exist or helper missing):', rpcError.message);

        // Fallback: just try to fetch user
        const { data: u, error: uErr } = await supabase.auth.admin.getUserById('teacher@demoschool.com');
        // This won't work because we don't know the ID? 
        // actually listUsers
        const { data: list } = await supabase.auth.admin.listUsers();
        const teacher = list.users.find(u => u.email === 'teacher@demoschool.com');
        if (teacher) console.log('Teacher user exists in Auth:', teacher.id);
        else console.log('Teacher user MISSING in Auth.');

        return;
    }

    console.log('Function Source Preview:');
    console.log(data);
}

verifyFix();
