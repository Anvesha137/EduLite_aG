
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gpfycckvtjzjkksakhkm.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZnljY2t2dGp6amtrc2FraGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE2NDY1NSwiZXhwIjoyMDg0NzQwNjU1fQ.yCRWlbq3lc8GwCR_Q0XYm_DoDoopmeXirfvdbkFMXBc';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZnljY2t2dGp6amtrc2FraGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNjQ2NTUsImV4cCI6MjA4NDc0MDY1NX0.rELNVkeH9zF9kTK93QCey-biCkP3cyWMkdq4vaI30QI';

const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

async function debug() {
    console.log('--- Debugging Subjects Access ---');

    // 1. Check if ANY subjects exist (Service Role)
    console.log('\n1. Checking Total Subjects (Service Role)...');
    const { data: allSubjects, error: serviceError } = await serviceClient
        .from('subjects')
        .select('id, name, school_id')
        .limit(5);

    if (serviceError) console.error('Service Error:', serviceError);
    console.log('Subjects found (Service Role):', allSubjects);

    if (!allSubjects || allSubjects.length === 0) {
        console.log('! No subjects found in DB. Seeding is required.');
        return;
    }

    // 2. Check access as Anon User
    console.log('\n2. Checking Access as Anon User...');
    // Note: RLS usually relies on auth.uid(), so unauthenticated anon might see nothing specific 
    // unless there's a public policy. But the app uses authenticated user mostly.
    // We'll just check if basic read works.
    const { data: anonSubjects, error: anonError } = await anonClient
        .from('subjects')
        .select('id, name')
        .limit(5);

    if (anonError) console.error('Anon Error:', anonError);
    console.log('Subjects found (Anon):', anonSubjects);

    // 3. Check access as specific user (Simulate if possible, or just deduce)
    // Since we can't easily sign in as the user here without password, we infer from Anon result + RLS knowledge.
}

debug();
