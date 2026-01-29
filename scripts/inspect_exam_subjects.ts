
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gpfycckvtjzjkksakhkm.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZnljY2t2dGp6amtrc2FraGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE2NDY1NSwiZXhwIjoyMDg0NzQwNjU1fQ.yCRWlbq3lc8GwCR_Q0XYm_DoDoopmeXirfvdbkFMXBc';

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

async function inspect() {
    console.log('--- Inspecting Exams and Subjects ---');

    console.log('1. Fetching recent exams...');
    const { data: exams, error: examError } = await adminClient
        .from('exams')
        .select('id, name, school_id')
        .order('created_at', { ascending: false })
        .limit(5);

    if (examError) {
        console.error('Error fetching exams:', examError);
        return;
    }

    if (!exams || exams.length === 0) {
        console.log('No exams found.');
        return;
    }

    console.log(`Found ${exams.length} exams.`);

    for (const exam of exams) {
        console.log(`\nExam: ${exam.name} (${exam.id})`);

        // Check exam_subjects table directly
        const { data: subjectLinks, error: linkError } = await adminClient
            .from('exam_subjects')
            .select('subject_id, subjects(name)')
            .eq('exam_id', exam.id);

        if (linkError) {
            console.error('  Error fetching exam_subjects:', linkError);
        } else {
            console.log(`  Direct Table Check: Found ${subjectLinks?.length || 0} subjects linked.`);
            subjectLinks?.forEach(l => console.log(`    - ${l.subjects?.name || l.subject_id}`));
        }

        // Check RPC result
        const { data: rpcData, error: rpcError } = await adminClient
            .rpc('get_exam_subjects', { p_exam_id: exam.id });

        if (rpcError) {
            console.error('  RPC Error:', rpcError);
        } else {
            console.log(`  RPC Check: Returned ${rpcData?.length || 0} rows.`);
            rpcData?.forEach((r: any) => console.log(`    - [RPC] ${r.name}`));
        }
    }
}

inspect();
