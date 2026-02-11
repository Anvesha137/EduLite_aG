import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useSchool } from '../../../../hooks/useSchool';
import { logChange } from '../../../../lib/audit';
import { Save, RefreshCw, Calendar, IndianRupee } from 'lucide-react';

interface FeeStructure {
    amount: number;
    due_date: string | null;
}

export function FeeMatrixTab() {
    const { schoolId } = useSchool();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [academicYearId, setAcademicYearId] = useState<string | null>(null);

    // Filter State
    const [selectedYearName, setSelectedYearName] = useState('2025-2026'); // Placeholder default, should fetch active

    // Data
    const [classes, setClasses] = useState<any[]>([]);
    const [feeTypes, setFeeTypes] = useState<any[]>([]);

    // Matrix Data: Key = classId_feeTypeId
    const [matrix, setMatrix] = useState<Record<string, FeeStructure>>({});
    const [changes, setChanges] = useState<Record<string, FeeStructure>>({});

    useEffect(() => {
        if (schoolId) {
            fetchInitialData();
        }
    }, [schoolId]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Academic Year
            // For now, assuming active year. 
            // Ideally we should have a global context for selected Academic Year in the module.
            // I'll fetch '2025-2026' or active one.
            const { data: years } = await supabase.from('academic_years').select('*').eq('school_id', schoolId).eq('is_active', true).limit(1);
            const activeYear = years?.[0];
            if (activeYear) {
                setAcademicYearId(activeYear.id);
                setSelectedYearName(activeYear.name);
            } else {
                // Fallback or error
            }

            // 2. Fetch Classes
            const { data: cls } = await supabase
                .from('classes')
                .select('id, name')
                .eq('school_id', schoolId)
                .order('sort_order');
            setClasses(cls || []);

            // 3. Fetch Fee Types
            const { data: types } = await supabase
                .from('fee_types')
                .select('*')
                .eq('school_id', schoolId)
                .order('name');
            setFeeTypes(types || []);

            // 4. Fetch Existing Structures
            // We need academic_year_id or academic_year string? 
            // The schema says `academic_year_id` in `teacher_allocations` but `fee_structures` in previous file used `academic_year` string.
            // Let's check `20260210000000_school_plan_strict.sql`.
            // CREATE TABLE IF NOT EXISTS class_fee_structure (... academic_year_id uuid ...);
            // So it uses UUID.

            if (activeYear) {
                const { data: structs } = await supabase
                    .from('class_fee_structure')
                    .select('*')
                    .eq('school_id', schoolId)
                    .eq('academic_year_id', activeYear.id);

                const map: Record<string, FeeStructure> = {};
                structs?.forEach((s: any) => {
                    map[`${s.class_id}_${s.fee_type_id}`] = {
                        amount: s.amount,
                        due_date: s.due_date
                    };
                });
                setMatrix(map);
            }

        } catch (error) {
            console.error('Error fetching fee matrix:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (classId: string, typeId: string, field: 'amount' | 'due_date', value: any) => {
        const key = `${classId}_${typeId}`;
        const current = changes[key] || matrix[key] || { amount: 0, due_date: null };

        setChanges(prev => ({
            ...prev,
            [key]: {
                ...current,
                [field]: field === 'amount' ? Number(value) : value
            }
        }));
    };

    const getValue = (classId: string, typeId: string) => {
        const key = `${classId}_${typeId}`;
        if (changes[key]) return changes[key];
        return matrix[key] || { amount: 0, due_date: null };
    };

    const handleSave = async () => {
        if (!academicYearId || !schoolId) {
            alert('Academic Year or School ID not active');
            return;
        }

        setSaving(true);
        try {
            const updates = Object.entries(changes).map(([key, val]) => {
                const [classId, typeId] = key.split('_');
                return {
                    school_id: schoolId,
                    class_id: classId,
                    fee_type_id: typeId,
                    academic_year_id: academicYearId,
                    amount: val.amount,
                    due_date: val.due_date
                };
            });

            if (updates.length === 0) return;

            const { error } = await supabase.from('class_fee_structure').upsert(updates, {
                onConflict: 'class_id,fee_type_id,academic_year_id'
            });

            if (error) throw error;

            // Log changes
            // We iterate over changes and log them.
            // Note: We don't have the explicit 'old' value here easily accessible without checking 'matrix' state.
            // 'matrix' state holds the initial values.
            for (const [key, val] of Object.entries(changes)) {
                const [classId, typeId] = key.split('_');
                const oldVal = matrix[key]; // Initial value

                // Only log if something actually changed
                if (oldVal?.amount !== val.amount || oldVal?.due_date !== val.due_date) {
                    const className = classes.find(c => c.id === classId)?.name || classId;
                    const typeName = feeTypes.find(t => t.id === typeId)?.name || typeId;

                    await logChange(
                        schoolId,
                        'fee_structure',
                        `${classId}_${typeId}`, // Entity ID composite
                        'amount/due_date',
                        oldVal || { amount: 0, due_date: null },
                        val,
                        `Fee update for ${className} - ${typeName}`
                    );
                }
            }

            alert('Fee structure updated successfully');
            setChanges({});
            fetchInitialData();
        } catch (error: any) {
            console.error('Error saving matrix:', error);
            alert('Failed to save: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (!academicYearId) return <div className="p-6 text-center text-red-500">Active Academic Year not found.</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Fee Structure Matrix ({selectedYearName})</h3>
                    <p className="text-slate-500 text-sm">Set amounts and due dates for each fee type per class</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || Object.keys(changes).length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </div>

            {loading ? (
                <div className="py-12 text-center text-slate-500">Loading matrix...</div>
            ) : (
                <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b font-medium text-slate-700">
                            <tr>
                                <th className="p-4 sticky left-0 bg-slate-50 z-10 border-r w-[200px]">Class / Fee Type</th>
                                {feeTypes.map(type => (
                                    <th key={type.id} className="p-4 min-w-[180px] text-center border-r last:border-r-0">
                                        <div className="font-bold">{type.name}</div>
                                        <div className="text-xs text-slate-500 font-normal mt-1">
                                            {type.recurring ? 'Recurring' : 'One-time'} • {type.mandatory ? 'Mandatory' : 'Optional'}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y text-slate-600">
                            {classes.map(cls => (
                                <tr key={cls.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-bold text-slate-800 sticky left-0 bg-white z-10 border-r">{cls.name}</td>
                                    {feeTypes.map(type => {
                                        const val = getValue(cls.id, type.id);
                                        const changed = `${cls.id}_${type.id}` in changes;

                                        return (
                                            <td key={type.id} className={`p-2 border-r last:border-r-0 align-top ${changed ? 'bg-yellow-50/50' : ''}`}>
                                                <div className="space-y-1">
                                                    {/* Amount Input */}
                                                    <div className="relative">
                                                        <IndianRupee className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            placeholder="0"
                                                            className={`w-full pl-7 pr-2 py-1.5 border rounded text-right font-medium focus:ring-1 focus:ring-blue-500 outline-none ${changed ? 'border-yellow-300' : 'border-slate-200'
                                                                }`}
                                                            value={val.amount || ''}
                                                            onChange={e => handleChange(cls.id, type.id, 'amount', e.target.value)}
                                                        />
                                                    </div>

                                                    {/* Due Date Input */}
                                                    {(val.amount > 0) && (
                                                        <div className="relative">
                                                            <input
                                                                type="date"
                                                                className="w-full pl-2 pr-2 py-1 text-xs border rounded text-slate-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                                                value={val.due_date || ''}
                                                                onChange={e => handleChange(cls.id, type.id, 'due_date', e.target.value)}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            {classes.length === 0 && (
                                <tr>
                                    <td colSpan={feeTypes.length + 1} className="p-8 text-center">No classes found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
