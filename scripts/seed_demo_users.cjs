
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const USERS = [
    {
        email: 'super@edulite.com',
        password: 'password123',
        role: 'SUPERADMIN',
        name: 'Super Admin',
    },
    {
        email: 'admin@demoschool.com',
        password: 'password123',
        role: 'ADMIN',
        name: 'Principal Demo',
    },
    {
        email: 'teacher@demoschool.com',
        password: 'password123',
        role: 'EDUCATOR',
        name: 'Priya Teacher',
    },
    {
        email: 'parent@demoschool.com',
        password: 'password123',
        role: 'PARENT',
        name: 'Ramesh Sharma',
    },
];

async function seedUsers() {
    console.log('Starting demo user seeding...');

    // 1. Get Roles Map
    const { data: roles, error: roleError } = await supabase.from('roles').select('id, name');
    if (roleError) {
        console.error('Error fetching roles:', roleError);
        return;
    }
    const roleMap = roles.reduce((acc, role) => ({ ...acc, [role.name]: role.id }), {});
    console.log('Roles fetched:', Object.keys(roleMap));

    // 2. Get Demo School
    const { data: schools, error: schoolError } = await supabase.from('schools').select('id, name').limit(1);
    if (schoolError || !schools.length) {
        console.error('Error fetching school (or no school exists). Run migration/seeds first.');
        return;
    }
    const schoolId = schools[0].id;
    console.log(`Using School: ${schools[0].name} (${schoolId})`);

    for (const user of USERS) {
        console.log(`\nProcessing ${user.role}: ${user.email}...`);

        // A. Check if user exists
        const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers.find(u => u.email === user.email);

        let userId;

        if (existingUser) {
            console.log(`User exists (${existingUser.id}). Updating password...`);
            const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
                password: user.password,
                user_metadata: { role: user.role, name: user.name }
            });
            if (error) {
                console.error('Failed to update user:', error);
                continue;
            }
            userId = existingUser.id;
        } else {
            console.log('Creating new user...');
            const { data, error } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true,
                user_metadata: { role: user.role, name: user.name }
            });
            if (error) {
                console.error('Failed to create user:', error);
                continue;
            }
            userId = data.user.id;
        }

        // B. Ensure Profile Exists and is correct
        // Note: Triggers might have created it, but we force update to be sure
        const { error: profileError } = await supabase.from('user_profiles').upsert({
            id: userId,
            email: user.email, // If email column exists in profiles, otherwise ignore
            role_id: roleMap[user.role],
            school_id: schoolId,
            full_name: user.name,
            is_active: true
        });

        if (profileError) {
            // Allow failure if column email doesn't exist, but try standard fields
            console.log('Profile update warning (might be triggers):', profileError.message);
        }

        // C. Special Role Handling
        if (user.role === 'EDUCATOR') {
            const { error: eduError } = await supabase.from('educators').upsert({
                school_id: schoolId,
                user_id: userId,
                email: user.email,
                name: user.name,
                employee_id: 'EMP_PRIYA',
                phone: '9900990099',
                designation: 'Class Teacher',
                status: 'active'
            }, { onConflict: 'school_id, employee_id' });

            if (eduError) console.error('Educator creation failed:', eduError);
            else console.log('Educator record ensuring...');

            // Verify/fetch exact educator ID
            const { data: teacherData } = await supabase.from('educators').select('id').eq('email', user.email).single();
            if (teacherData) {
                await assignTeacherToClass10A(supabase, schoolId, teacherData.id);
            }
        }
        else if (user.role === 'PARENT') {
            const { error: parError } = await supabase.from('parents').upsert({
                school_id: schoolId,
                user_id: userId,
                email: user.email,
                name: user.name,
                phone: '8800880088',
                relationship: 'father'
            });
            if (parError) console.error('Parent creation failed:', parError);

            // Verify/fetch exact parent ID
            const { data: parentData } = await supabase.from('parents').select('id').eq('email', user.email).single();
            if (parentData) {
                await assignChildrenToParent(supabase, schoolId, parentData.id);
            }
        }
    }
}

async function assignTeacherToClass10A(supabase, schoolId, educatorId) {
    console.log('Assigning Teacher to Class 10-A...');

    // 1. Find Class 10
    const { data: classes } = await supabase.from('classes').select('id').eq('school_id', schoolId).eq('grade_order', 10).single();
    if (!classes) { console.error('Class 10 not found'); return; }

    // 2. Find Section A
    const { data: sections } = await supabase.from('sections').select('id').eq('class_id', classes.id).eq('name', 'A').single();
    if (!sections) {
        // Create if missing
        console.log('Creating Section A for Class 10...');
        const { data: newSection } = await supabase.from('sections').insert({ school_id: schoolId, class_id: classes.id, name: 'A' }).select().single();
        if (newSection) await assignTeacher(supabase, schoolId, educatorId, classes.id, newSection.id);
    } else {
        await assignTeacher(supabase, schoolId, educatorId, classes.id, sections.id);
    }
}

async function assignTeacher(supabase, schoolId, educatorId, classId, sectionId) {
    // 3. Find Math Subject
    let subjectId;
    const { data: subjects } = await supabase.from('subjects').select('id').eq('school_id', schoolId).eq('name', 'Mathematics').single();
    if (!subjects) {
        const { data: newSub } = await supabase.from('subjects').insert({ school_id: schoolId, name: 'Mathematics', code: 'MATH10' }).select().single();
        subjectId = newSub.id;
    } else {
        subjectId = subjects.id;
    }

    // 4. Assign
    const { error } = await supabase.from('educator_class_assignments').upsert({
        school_id: schoolId,
        educator_id: educatorId,
        class_id: classId,
        section_id: sectionId,
        subject_id: subjectId,
        academic_year: '2025-2026',
        is_class_teacher: true
    }, { onConflict: 'educator_id, class_id, section_id, subject_id, academic_year' });

    if (error) console.error('Assignment failed:', error);
    else console.log('Teacher assigned to Class 10-A (Maths) successfully.');
}

async function assignChildrenToParent(supabase, schoolId, parentId) {
    console.log('Assigning Students to Parent...');
    // We will just link 2 random students to this parent
    const { data: students } = await supabase.from('students').select('id').eq('school_id', schoolId).limit(2);

    if (students && students.length > 0) {
        for (const student of students) {
            await supabase.from('students').update({ parent_id: parentId }).eq('id', student.id);
        }
        console.log(`Assigned ${students.length} students to Parent.`);
    }
}

seedUsers().catch(console.error);
