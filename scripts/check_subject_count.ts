
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gpfycckvtjzjkksakhkm.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZnljY2t2dGp6amtrc2FraGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE2NDY1NSwiZXhwIjoyMDg0NzQwNjU1fQ.yCRWlbq3lc8GwCR_Q0XYm_DoDoopmeXirfvdbkFMXBc';

const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkSubjects() {
    console.log('--- Checking Subjects for Demo School ---');

    // 1. Get School ID
    const { data: school, error: schoolError } = await serviceClient
        .from('schools')
        .select('id')
        .eq('name', 'Demo International School')
        .single();

    if (schoolError || !school) {
        console.error('School Error:', schoolError);
        return;
    }

    const schoolId = school.id;
    console.log('School ID:', schoolId);

    // 2. Count Subjects
    const { count, error: countError } = await serviceClient
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId);

    if (countError) {
        console.error('Count Error:', countError);
    } else {
        console.log('Subject Count:', count);
    }
}

checkSubjects();
