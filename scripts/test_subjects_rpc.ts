
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gpfycckvtjzjkksakhkm.supabase.co';
// Using the Service Role Key verified from .env
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZnljY2t2dGp6amtrc2FraGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE2NDY1NSwiZXhwIjoyMDg0NzQwNjU1fQ.yCRWlbq3lc8GwCR_Q0XYm_DoDoopmeXirfvdbkFMXBc';

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

async function debug() {
    console.log('--- Testing get_available_subjects RPC ---');

    // 1. Get School ID via RPC (secure) to match frontend logic
    console.log('Fetching School ID...');
    const { data: schoolId, error: schoolError } = await adminClient.rpc('get_school_by_name', {
        p_name: 'Demo International School'
    });

    if (schoolError) {
        console.error('Error fetching school:', schoolError);
        return;
    }

    if (!schoolId) {
        console.error('No school found with name "Demo International School"');
        return;
    }

    console.log('School ID:', schoolId);

    // 2. Call the new RPC
    console.log(`Calling get_available_subjects for school ${schoolId}...`);
    const { data: subjects, error: rpcError } = await adminClient.rpc('get_available_subjects', {
        p_school_id: schoolId
    });

    if (rpcError) {
        console.error('RPC Error:', rpcError);
    } else {
        console.log('RPC Result:', subjects);
        console.log(`Count: ${subjects?.length || 0}`);
    }
}

debug();
