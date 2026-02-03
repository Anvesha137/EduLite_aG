require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const SCHOOL_ID = '00000000-0000-0000-0000-000000000000'; // Default, needs to be dynamic if used for real schools but for now using fallback/first found

async function seedHolidays() {
    console.log('Seeding holidays...');

    // 1. Get School ID (First one)
    const { data: schools } = await supabase.from('schools').select('id').limit(1);
    if (!schools || schools.length === 0) {
        console.error('No school found to seed holidays.');
        return;
    }
    const schoolId = schools[0].id;
    console.log(`Using School ID: ${schoolId}`);

    // 2. Generate Sundays for 2025
    const holidays = [];
    const year = 2025;
    const date = new Date(year, 0, 1);

    while (date.getFullYear() === year) {
        if (date.getDay() === 0) { // Sunday
            holidays.push({
                school_id: schoolId,
                name: 'Sunday',
                date: date.toISOString().split('T')[0],
                type: 'weekend',
                is_recurring: true
            });
        }
        date.setDate(date.getDate() + 1);
    }

    // 3. Add Major Festivals (Fixed Dates 2025)
    const fixedHolidays = [
        { name: 'Republic Day', date: '2025-01-26', type: 'festival' },
        { name: 'Independence Day', date: '2025-08-15', type: 'festival' },
        { name: 'Gandhi Jayanti', date: '2025-10-02', type: 'festival' },
        { name: 'Christmas', date: '2025-12-25', type: 'festival' },
        { name: 'New Year', date: '2025-01-01', type: 'festival' }
    ];

    fixedHolidays.forEach(h => {
        holidays.push({
            school_id: schoolId,
            name: h.name,
            date: h.date,
            type: h.type,
            is_recurring: true
        });
    });

    console.log(`Prepared ${holidays.length} holiday records.`);

    // 4. Upsert Holidays
    const { error } = await supabase
        .from('holidays')
        .upsert(holidays, { onConflict: 'school_id, date' });

    if (error) {
        console.error('Error seeding holidays:', error);
    } else {
        console.log('Successfully seeded holidays!');
    }
}

seedHolidays();
