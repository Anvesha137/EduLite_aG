
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Fix for __dirname in ESM
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing environment variables');
    console.log('URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('Key:', serviceRoleKey ? 'Set' : 'Missing');
    process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function debugSubjects() {
    console.log('--- Debugging Subjects for ALL Schools ---');

    // 1. Get all schools
    const { data: schools, error: schoolsError } = await adminClient
        .from('schools')
        .select('id, name');

    if (schoolsError) {
        console.error('Error fetching schools:', schoolsError);
        return;
    }

    console.log(`Found ${schools?.length} schools.`);

    for (const school of schools || []) {
        console.log(`\nChecking school: ${school.name} (${school.id})`);

        // 2. Count subjects directly
        const { count, error: countError } = await adminClient
            .from('subjects')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', school.id);

        if (countError) {
            console.error('Error counting subjects:', countError);
        } else {
            console.log(`  - Direct Table Count: ${count}`);
        }

        // 3. Test RPC
        const { data: rpcData, error: rpcError } = await adminClient.rpc('get_available_subjects', {
            p_school_id: school.id
        });

        if (rpcError) {
            console.error('  - RPC Error:', rpcError);
        } else {
            console.log(`  - RPC Result Count: ${rpcData?.length}`);
            if (rpcData && rpcData.length > 0) {
                console.log(`    First subject: ${rpcData[0].name}`);
            }
        }
    }
}

debugSubjects();
