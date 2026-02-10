const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAssessment() {
    console.log('--- Debugging Assessment Config ---');

    console.log('1. Checking Grade Scales (Public/Anon check)...');
    // This might fail if RLS is strict and Anon isn't allowed to read. 
    // But my policy allowed "authenticated" users. Script is "anon".
    // I need to use SERVICE_ROLE key or simulate login if I want to really see.
    // However, I can check if *any* data exists if I had service key. 
    // Since I don't see service key in .env usually, I'll try anon login with admin credentials again.

    const email = 'admin@edulite.com';
    const password = 'password123';

    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) {
        console.log('Login failed (expected if email login disabled):', authError.message);
        // Fallback: Just try to select. If empty or error, we know.
    } else {
        console.log('Logged in as:', user.id);
    }

    const { data: scales, error: scaleError } = await supabase.from('grade_scales').select('*');
    if (scaleError) console.error('Error fetching scales:', scaleError);
    else console.log('Grade Scales found:', scales.length, scales.map(s => s.name));

    if (scales && scales.length === 0) {
        console.log('No scales found. Seeding might have failed or School ID mismatch.');
    }
}

debugAssessment();
