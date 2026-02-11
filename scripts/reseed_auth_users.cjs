const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function reseedUsers() {
    console.log('Reseeding users via Admin API...');

    const users = [
        {
            email: 'super@edulite.com',
            password: 'password123',
            role: 'SUPERADMIN',
            full_name: 'Super Admin',
            school_id: null
        },
        {
            email: 'teacher@demoschool.com',
            password: 'password123',
            role: 'EDUCATOR',
            full_name: 'Priya Teacher',
            school_id: '' // Will be fetched
        }
        // Add others if needed, focusing on Teacher for now
    ];

    try {
        // 1. Get School ID
        const { data: schoolData, error: schoolError } = await supabase
            .from('schools')
            .select('id')
            .limit(1)
            .single();

        if (schoolError) throw schoolError;
        const schoolId = schoolData.id;
        console.log('Using School ID:', schoolId);

        // 2. Delete existing users (to clean up the bad SQL insert)
        // Be careful: this might fail if they don't exist in a way calling deleteUser expects?
        // Or we can just try creating and ignore error if exists?
        // Better to create a unique email to test first?
        // Let's try to delete 'teacher@demoschool.com' first.

        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;

        const teacherUser = existingUsers.users.find(u => u.email === 'teacher@demoschool.com');
        if (teacherUser) {
            console.log('Deleting existing teacher user:', teacherUser.id);
            const { error: delError } = await supabase.auth.admin.deleteUser(teacherUser.id);
            if (delError) console.error('Error deleting user:', delError);
            else console.log('Deleted successfully.');
        }

        // 3. Create User
        for (const u of users) {
            if (u.role !== 'SUPERADMIN') u.school_id = schoolId;

            console.log(`Creating ${u.email}...`);
            const { data, error } = await supabase.auth.admin.createUser({
                email: u.email,
                password: u.password,
                email_confirm: true,
                user_metadata: {
                    role: u.role,
                    school_id: u.school_id,
                    full_name: u.full_name
                }
            });

            if (error) {
                console.error(`Error creating ${u.email}:`, error.message);
            } else {
                console.log(`Created ${u.email} with ID: ${data.user.id}`);

                // Link to user_profiles is handled by trigger usually.
                // But since trigger might be broken, let's upsert profile manually here just in case.
                const { error: profileError } = await supabase.from('user_profiles').upsert({
                    id: data.user.id,
                    role_id: (await getRoleId(u.role)),
                    school_id: u.school_id,
                    full_name: u.full_name,
                    is_active: true
                });

                if (profileError) console.error('Profile upsert error:', profileError);

                // If Educator, ensure record in educators table
                if (u.role === 'EDUCATOR') {
                    const { error: eduError } = await supabase.from('educators').upsert({
                        school_id: u.school_id,
                        user_id: data.user.id,
                        email: u.email,
                        name: u.full_name,
                        employee_id: 'EMP-001-' + Date.now(),
                        designation: 'Teacher',
                        joining_date: new Date().toISOString()
                    }, { onConflict: 'email' });
                    if (eduError) console.error('Educator upsert error:', eduError);
                }
            }
        }

    } catch (err) {
        console.error('Reseed error:', err);
    }
}

async function getRoleId(roleName) {
    const { data } = await supabase.from('roles').select('id').eq('name', roleName).single();
    return data?.id;
}

reseedUsers();
