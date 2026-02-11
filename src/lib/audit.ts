import { supabase } from '../lib/supabase';

/**
 * Logs a change to the definition_change_logs table.
 */
export const logChange = async (
    schoolId: string,
    entityType: 'class' | 'section' | 'subject' | 'fee_type' | 'fee_structure' | 'exam' | 'teacher_allocation' | 'academic_year',
    entityId: string,
    fieldName: string,
    oldValue: any,
    newValue: any,
    impactSummary?: string
) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('definition_change_logs').insert({
            school_id: schoolId,
            entity_type: entityType,
            entity_id: entityId,
            field_name: fieldName,
            old_value: typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue),
            new_value: typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue),
            changed_by: user.id,
            impact_summary: impactSummary
        });
    } catch (error) {
        console.error('Failed to log change:', error);
        // Don't block execution if logging fails
    }
};
