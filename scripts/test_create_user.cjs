
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const email = `test_${Date.now()}@example.com`;
    console.log('Attempting to create user:', email);

    const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: 'password123',
        email_confirm: true
    });

    if (error) {
        console.error('Error creating user:', error);
    } else {
        console.log('User created:', data.user.id);
        // Clean up
        await supabase.auth.admin.deleteUser(data.user.id);
        console.log('User deleted.');
    }
}

test();
