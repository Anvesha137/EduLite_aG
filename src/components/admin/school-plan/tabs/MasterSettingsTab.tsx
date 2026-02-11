import { useState, useEffect } from 'react';
import { Plus, Edit2, Check, X } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useSchool } from '../../../../hooks/useSchool';
import { logChange } from '../../../../lib/audit';

interface AcademicYear {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
}

export function MasterSettingsTab() {
    const { schoolId } = useSchool();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState<Partial<AcademicYear>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (schoolId) {
            fetchYears();
        }
    }, [schoolId]);

    const fetchYears = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('academic_years')
            .select('*')
            .eq('school_id', schoolId)
            .order('start_date', { ascending: false });

        if (error) {
            console.error('Error fetching academic years:', error);
        } else {
            setYears(data || []);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!schoolId) return;
        if (!formData.name || !formData.start_date || !formData.end_date) {
            alert('Please fill all fields');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                school_id: schoolId,
                name: formData.name,
                start_date: formData.start_date,
                end_date: formData.end_date,
                is_active: formData.is_active || false
            };

            if (formData.id) {
                // Update
                const { error } = await supabase
                    .from('academic_years')
                    .update(payload)
                    .eq('id', formData.id);
                if (error) throw error;
                await logChange(schoolId, 'academic_year', formData.id, 'all', 'unknown', payload, `Updated Academic Year: ${payload.name}`);
            } else {
                // Create
                const { data, error } = await supabase
                    .from('academic_years')
                    .insert(payload)
                    .select()
                    .single();
                if (error) throw error;
                if (data) {
                    await logChange(schoolId, 'academic_year', data.id, 'created', null, payload, `Created Academic Year: ${payload.name}`);
                }
            }

            // Note: If is_active is true, we rely on user manually managing or a backend trigger. 
            // For now, if the user sets a new one as active, they must double check. 
            // Improvements: Auto-deactivate others via RPC if needed.

            setShowModal(false);
            setFormData({});
            fetchYears();
        } catch (error: any) {
            console.error('Error saving year:', error);
            alert('Failed to save academic year: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (year: AcademicYear) => {
        if (!schoolId) return;
        if (year.is_active) return;

        if (!confirm(`Set "${year.name}" as the ACTIVE academic year? This will deactivate the current one.`)) return;

        setLoading(true);
        try {
            // 1. Deactivate all
            await supabase
                .from('academic_years')
                .update({ is_active: false })
                .eq('school_id', schoolId);

            // 2. Activate target
            const { error } = await supabase
                .from('academic_years')
                .update({ is_active: true })
                .eq('id', year.id);

            if (error) throw error;

            await logChange(schoolId, 'academic_year', year.id, 'is_active', false, true, `Activated Academic Year: ${year.name}`);

            fetchYears();
            // Need to reload window or notify context? 
            // The context usually fetches on mount or useSchool hook handles it.
            // Ideally trigger a refresh of global state if it depends on it.
            // For now, simpler is fine.
            window.location.reload();
        } catch (error: any) {
            console.error('Error activating year:', error);
            alert('Failed to activate year: ' + error.message);
            setLoading(false);
        }
    };

    const handleDelete = async (year: AcademicYear) => {
        if (!schoolId) return;
        if (year.is_active) {
            alert('Cannot delete the active academic year.');
            return;
        }
        if (!confirm(`Delete "${year.name}"?`)) return;

        try {
            const { error } = await supabase.from('academic_years').delete().eq('id', year.id);
            if (error) throw error;
            await logChange(schoolId, 'academic_year', year.id, 'deleted', year.name, null, `Deleted Academic Year: ${year.name}`);
            fetchYears();
        } catch (error: any) {
            alert('Failed to delete: ' + error.message);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Master Settings</h3>
                    <p className="text-slate-500 text-sm">Manage Academic Years</p>
                </div>
                <button
                    onClick={() => {
                        setFormData({});
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Academic Year
                </button>
            </div>

            {loading ? (
                <div className="p-8 text-center text-slate-500">Loading settings...</div>
            ) : (
                <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b font-medium text-slate-700">
                            <tr>
                                <th className="p-4">Name</th>
                                <th className="p-4">Start Date</th>
                                <th className="p-4">End Date</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-slate-900">
                            {years.map(year => (
                                <tr key={year.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-medium">{year.name}</td>
                                    <td className="p-4 text-slate-600">{new Date(year.start_date).toLocaleDateString()}</td>
                                    <td className="p-4 text-slate-600">{new Date(year.end_date).toLocaleDateString()}</td>
                                    <td className="p-4 text-center">
                                        {year.is_active ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                <Check className="w-3 h-3" /> Active
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleToggleActive(year)}
                                                className="text-slate-400 hover:text-blue-600 text-xs font-medium border border-slate-200 px-2 py-1 rounded hover:bg-white"
                                            >
                                                Set Active
                                            </button>
                                        )}
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setFormData(year);
                                                setShowModal(true);
                                            }}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        {!year.is_active && (
                                            <button
                                                onClick={() => handleDelete(year)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {years.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                                        No academic years defined. Please create one.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4">{formData.id ? 'Edit Academic Year' : 'New Academic Year'}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Year Name</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg p-2"
                                    placeholder="e.g. 2025-2026"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded-lg p-2"
                                        value={formData.start_date || ''}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded-lg p-2"
                                        value={formData.end_date || ''}
                                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            {!formData.id && (
                                <div className="flex items-center gap-2 mt-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.is_active || false}
                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <label htmlFor="isActive" className="text-sm text-slate-700">Set as Active Academic Year</label>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Year'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
