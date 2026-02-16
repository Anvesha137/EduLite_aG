import { useState, useEffect } from 'react';
import { Plus, Edit2, Save, Trash2, X } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useSchool } from '../../../../hooks/useSchool';
import { logChange } from '../../../../lib/audit';

interface FeeType {
    id: string;
    name: string;
    description?: string;
    recurring: boolean;
    mandatory: boolean;
    refundable: boolean;
}

export function FeeDefinitionTab() {
    const { schoolId } = useSchool();
    const [loading, setLoading] = useState(false);

    // Data
    const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);

    // Edit State
    const [showModal, setShowModal] = useState(false);
    const [editingType, setEditingType] = useState<Partial<FeeType>>({});

    useEffect(() => {
        if (schoolId) {
            fetchFeeTypes();
        }
    }, [schoolId]);

    const fetchFeeTypes = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('fee_types')
                .select('*')
                .eq('school_id', schoolId)
                .order('name');
            setFeeTypes(data || []);
        } catch (error) {
            console.error('Error fetching fee types:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editingType.name || !schoolId) return;

        try {
            // Generate a simple code from name if not present
            const code = editingType.name.toUpperCase().replace(/\s+/g, '_');

            const payload = {
                school_id: schoolId,
                name: editingType.name,
                code: code, // Added code to payload
                description: editingType.description,
                recurring: editingType.recurring ?? true,
                mandatory: editingType.mandatory ?? true,
                refundable: editingType.refundable ?? false
            };

            if (editingType.id) {
                const { error } = await supabase.from('fee_types').update(payload).eq('id', editingType.id);
                if (error) throw error;

                await logChange(schoolId, 'fee_type', editingType.id, 'all', 'unknown', payload, `Updated Fee Type: ${payload.name}`);
            } else {
                const { data, error } = await supabase.from('fee_types').insert([payload]).select('id').single();
                if (error) throw error;

                if (data) {
                    await logChange(schoolId, 'fee_type', data.id, 'created', null, payload, `Created Fee Type: ${payload.name}`);
                }
            }

            setShowModal(false);
            setEditingType({});
            fetchFeeTypes();
        } catch (error: any) {
            console.error('Error saving fee type:', error);
            alert('Failed to save fee type: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!schoolId) return;
        if (!confirm('Are you sure you want to delete this Fee Type? It may be linked to fee structures.')) return;
        try {
            const typeName = feeTypes.find(t => t.id === id)?.name;
            const { error } = await supabase.from('fee_types').delete().eq('id', id);
            if (error) throw error;

            await logChange(schoolId, 'fee_type', id, 'deleted', typeName, null, `Deleted Fee Type: ${typeName}`);

            fetchFeeTypes();
        } catch (error: any) {
            console.error('Error deleting fee type:', error);
            alert('Failed to delete: ' + error.message);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Fee Types Definition</h3>
                    <p className="text-slate-500 text-sm">Define the types of fees collected (e.g. Tuition, Transport, Admission)</p>
                </div>
                <button
                    onClick={() => {
                        setEditingType({ recurring: true, mandatory: true, refundable: false });
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                    <Plus className="w-4 h-4" /> Add Fee Type
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">Loading...</div>
            ) : (
                <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b font-medium text-slate-700">
                            <tr>
                                <th className="p-4">Fee Name</th>
                                <th className="p-4">Recurring</th>
                                <th className="p-4">Mandatory</th>
                                <th className="p-4">Refundable</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {feeTypes.map(type => (
                                <tr key={type.id} className="hover:bg-slate-50">
                                    <td className="p-4">
                                        <div className="font-medium text-slate-900">{type.name}</div>
                                        {type.description && <div className="text-xs text-slate-500">{type.description}</div>}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs ${type.recurring ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {type.recurring ? 'Recurring' : 'One-time'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs ${type.mandatory ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {type.mandatory ? 'Mandatory' : 'Optional'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs ${type.refundable ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {type.refundable ? 'Yes' : 'No'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setEditingType(type);
                                                setShowModal(true);
                                            }}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(type.id)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {feeTypes.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        No fee types defined yet. Click "Add Fee Type" to start.
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
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">{editingType.id ? 'Edit Fee Type' : 'Add Fee Type'}</h3>
                            <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-500" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input
                                    className="w-full border rounded p-2"
                                    value={editingType.name || ''}
                                    onChange={e => setEditingType({ ...editingType, name: e.target.value })}
                                    placeholder="e.g. Tuition Fee"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <input
                                    className="w-full border rounded p-2"
                                    value={editingType.description || ''}
                                    onChange={e => setEditingType({ ...editingType, description: e.target.value })}
                                    placeholder="Optional description"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={editingType.recurring ?? true}
                                        onChange={e => setEditingType({ ...editingType, recurring: e.target.checked })}
                                    />
                                    <span className="text-sm">Recurring</span>
                                </label>
                                <label className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={editingType.mandatory ?? true}
                                        onChange={e => setEditingType({ ...editingType, mandatory: e.target.checked })}
                                    />
                                    <span className="text-sm">Mandatory</span>
                                </label>
                                <label className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={editingType.refundable ?? false}
                                        onChange={e => setEditingType({ ...editingType, refundable: e.target.checked })}
                                    />
                                    <span className="text-sm">Refundable</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                                <Save className="w-4 h-4" /> Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
