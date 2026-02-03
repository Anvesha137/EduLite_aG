const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugExpenses() {
    console.log('--- Debugging Expenses ---');

    // 1. Sign In
    // Using a known admin credentials. If this fails, we need to find the user.
    const email = 'admin@edulite.com';
    const password = 'password123'; // Try 'password123' (common seed default)

    console.log(`Logging in as ${email}...`);
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) {
        console.error('Login failed:', authError.message);
        return;
    }
    console.log('Logged in as:', user.id);

    // 2. Fetch User Profile to verify Role
    const { data: profile, error: profError } = await supabase.from('user_profiles').select('*, roles(name)').eq('id', user.id).single();
    if (profError) {
        console.error('Profile fetch failed:', profError);
        return;
    }
    console.log('User Profile found:', profile);

    // 3. Try Insert
    console.log('Attempting Insert...');
    const { data: ins, error: insError } = await supabase.from('expenses').insert([{
        school_id: profile.school_id,
        title: 'Debug Expense Test',
        category: 'Other',
        amount: 100,
        date: new Date().toISOString().split('T')[0]
    }]).select();

    if (insError) console.error('Insert Error:', insError);
    else console.log('Insert Success:', ins);

    // 4. Try Select
    console.log('Attempting Select...');
    const { data: list, error: selError } = await supabase.from('expenses').select('*');
    if (selError) console.error('Select Error:', selError);
    else console.log('Expenses List:', list);
}

debugExpenses();
