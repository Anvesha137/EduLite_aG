
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gpfycckvtjzjkksakhkm.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZnljY2t2dGp6amtrc2FraGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE2NDY1NSwiZXhwIjoyMDg0NzQwNjU1fQ.yCRWlbq3lc8GwCR_Q0XYm_DoDoopmeXirfvdbkFMXBc';

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

async function debug() {
    console.log('--- Inspecting exam_types ---');

    const { data, error } = await adminClient
        .from('exam_types')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Data:', data);
        if (data && data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('Table is empty. Cannot infer columns from data.');
            // Fallback: try to insert and see failure, or just assume minimal columns
        }
    }
}

debug();
