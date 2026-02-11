const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Using Anon key for login

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
    console.log('Attempting login with teacher@demoschool.com...');

    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'teacher@demoschool.com',
        password: 'password123',
    });

    if (error) {
        console.error('Login Failed!');
        console.error('Error:', error);
        console.error('Message:', error.message);
        console.error('Status:', error.status);
    } else {
        console.log('Login Successful!');
        console.log('User ID:', data.user.id);
        console.log('Role:', data.user.user_metadata.role);
    }
}

testLogin();
