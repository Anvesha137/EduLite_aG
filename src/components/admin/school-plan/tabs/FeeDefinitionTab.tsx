import { useState, useEffect } from 'react';
import { Plus, Edit2, Save, Trash2, ChevronDown, Check } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useSchool } from '../../../../hooks/useSchool';

interface FeeHead {
    id: string;
    name: string;
    description?: string;
    fee_type_id?: string;
    is_mandatory: boolean;
    frequency: 'one_time' | 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
}

interface FeeType {
    id: string;
    name: string;
    code: string;
}

interface ClassData {
    id: string;
    name: string;
    sort_order: number;
}

interface FeeStructure {
    id: string;
    class_id: string;
    fee_head_id: string;
    amount: number;
    academic_year: string;
}

export function FeeDefinitionTab() {
    const { schoolId } = useSchool();
    const [activeTab, setActiveTab] = useState<'heads' | 'structure'>('heads');
    const [loading, setLoading] = useState(true);

    // Data
    const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
    const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [structures, setStructures] = useState<FeeStructure[]>([]);

    // UI State - Fee Heads
    const [editingHead, setEditingHead] = useState<Partial<FeeHead> | null>(null);

    // UI State - Structure
    const [selectedYear, setSelectedYear] = useState('2024-2025');
    const [structureChanges, setStructureChanges] = useState<Record<string, number>>({}); // key: classId_headId, value: amount

    useEffect(() => {
        if (schoolId) {
            fetchData();
        }
    }, [schoolId, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Fee Types
            const { data: types } = await supabase.from('fee_types').select('*').order('name');
            setFeeTypes(types || []);

            // Fetch Heads
            const { data: heads } = await supabase
                .from('fee_heads')
                .select('*')
                .eq('school_id', schoolId)
                .order('name');
            setFeeHeads(heads || []);

            if (activeTab === 'structure') {
                // Fetch Classes
                const { data: cls } = await supabase
                    .from('classes')
                    .select('id, name, sort_order')
                    .eq('school_id', schoolId)
                    .order('sort_order');
                setClasses(cls || []);

                // Fetch Structure
                const { data: str } = await supabase
                    .from('fee_structures')
                    .select('*')
                    .eq('school_id', schoolId)
                    .eq('academic_year', selectedYear);
                setStructures(str || []);
            }
        } catch (error) {
            console.error('Error fetching fee data:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Fee Head Handlers ---

    const handleSaveHead = async () => {
        if (!editingHead || !editingHead.name) return;

        try {
            const payload = {
                name: editingHead.name,
                description: editingHead.description,
                fee_type_id: editingHead.fee_type_id,
                is_mandatory: editingHead.is_mandatory ?? true,
                frequency: editingHead.frequency || 'annual',
                school_id: schoolId
            };

            if (editingHead.id) {
                await supabase.from('fee_heads').update(payload).eq('id', editingHead.id);
            } else {
                await supabase.from('fee_heads').insert([payload]);
            }

            setEditingHead(null);
            fetchData();
        } catch (error) {
            console.error('Error saving fee head:', error);
            alert('Failed to save fee head');
        }
    };

    const handleDeleteHead = async (id: string) => {
        if (!confirm('Delete this Fee Head? This will affect all linked structures.')) return;
        try {
            await supabase.from('fee_heads').delete().eq('id', id);
            fetchData();
        } catch (error) {
            console.error('Error deleting fee head:', error);
        }
    };

    // --- Structure Handlers ---

    const handleStructureChange = (classId: string, headId: string, amount: string) => {
        setStructureChanges(prev => ({
            ...prev,
            [`${classId}_${headId}`]: Number(amount) || 0
        }));
    };

    const handleSaveStructure = async () => {
        if (Object.keys(structureChanges).length === 0) return;

        try {
            setLoading(true);
            const updates = Object.entries(structureChanges).map(([key, amount]) => {
                const [classId, headId] = key.split('_');
                return {
                    school_id: schoolId,
                    class_id: classId,
                    fee_head_id: headId,
                    amount: amount,
                    academic_year: selectedYear
                };
            });

            // Using upsert (requires unique constraint on class_id, fee_head_id, academic_year)
            const { error } = await supabase.from('fee_structures').upsert(updates, {
                onConflict: 'class_id,fee_head_id,academic_year'
            });

            if (error) throw error;

            setStructureChanges({});
            fetchData();
            alert('Fee structure updated successfully');
        } catch (error) {
            console.error('Error saving structure:', error);
            alert('Failed to update fee structure');
        } finally {
            setLoading(false);
        }
    };

    const getAmount = (classId: string, headId: string) => {
        // Check pending changes first
        const changedKey = `${classId}_${headId}`;
        if (changedKey in structureChanges) {
            return structureChanges[changedKey];
        }
        // Then check saved data
        const saved = structures.find(s => s.class_id === classId && s.fee_head_id === headId);
        return saved ? saved.amount : 0;
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Fee Definition</h3>
                    <p className="text-slate-500 text-sm">Configure Fee Heads and Class-wise Structures</p>
                </div>
                {activeTab === 'heads' && (
                    <button
                        onClick={() => setEditingHead({ name: '', is_mandatory: true, frequency: 'annual' })}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                        <Plus className="w-4 h-4" /> Add Fee Head
                    </button>
                )}
                {activeTab === 'structure' && (
                    <button
                        onClick={handleSaveStructure}
                        disabled={Object.keys(structureChanges).length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" /> Save Changes
                    </button>
                )}
            </div>

            {/* Navigation */}
            <div className="flex gap-6 border-b mb-6">
                <button
                    onClick={() => setActiveTab('heads')}
                    className={`pb-2 px-2 font-medium border-b-2 transition-colors ${activeTab === 'heads' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
                >
                    Fee Heads
                </button>
                <button
                    onClick={() => setActiveTab('structure')}
                    className={`pb-2 px-2 font-medium border-b-2 transition-colors ${activeTab === 'structure' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
                >
                    Fee Structure (Matrix)
                </button>
            </div>

            {loading && !feeHeads.length ? (
                <div className="text-center py-8">Loading...</div>
            ) : (
                <>
                    {/* Fee Heads Tab */}
                    {activeTab === 'heads' && (
                        <div className="space-y-4">
                            {editingHead && (
                                <div className="bg-slate-50 border rounded-lg p-4 mb-4">
                                    <h4 className="font-bold text-sm mb-3">{editingHead.id ? 'Edit Fee Head' : 'New Fee Head'}</h4>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <input
                                            placeholder="Fee Head Name (e.g. Tuition Fee)"
                                            className="border rounded p-2"
                                            value={editingHead.name || ''}
                                            onChange={e => setEditingHead({ ...editingHead, name: e.target.value })}
                                        />
                                        <select
                                            className="border rounded p-2"
                                            value={editingHead.fee_type_id || ''}
                                            onChange={e => setEditingHead({ ...editingHead, fee_type_id: e.target.value })}
                                        >
                                            <option value="">Select Fee Category...</option>
                                            {feeTypes.map(type => (
                                                <option key={type.id} value={type.id}>{type.name}</option>
                                            ))}
                                        </select>
                                        <input
                                            placeholder="Description (Optional)"
                                            className="col-span-2 border rounded p-2"
                                            value={editingHead.description || ''}
                                            onChange={e => setEditingHead({ ...editingHead, description: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-4 mb-4 items-end">
                                        <label className="flex items-center gap-2 text-sm mb-2">
                                            <input
                                                type="checkbox"
                                                checked={editingHead.is_mandatory}
                                                onChange={e => setEditingHead({ ...editingHead, is_mandatory: e.target.checked })}
                                            />
                                            Mandatory
                                        </label>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Frequency</label>
                                            <select
                                                className="w-full border rounded p-2 text-sm"
                                                value={editingHead.frequency || 'annual'}
                                                onChange={e => setEditingHead({ ...editingHead, frequency: e.target.value as any })}
                                            >
                                                <option value="one_time">One Time</option>
                                                <option value="monthly">Monthly</option>
                                                <option value="quarterly">Quarterly</option>
                                                <option value="half_yearly">Half Yearly</option>
                                                <option value="annual">Annual</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setEditingHead(null)} className="px-3 py-1 text-slate-600 hover:bg-white rounded">Cancel</button>
                                        <button onClick={handleSaveHead} className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white border rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 border-b font-medium text-slate-700">
                                        <tr>
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Category</th>
                                            <th className="p-3">Mandatory</th>
                                            <th className="p-3">Frequency</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {feeHeads.map(head => (
                                            <tr key={head.id} className="hover:bg-slate-50">
                                                <td className="p-3 font-medium">{head.name}</td>
                                                <td className="p-3 text-slate-500">
                                                    {feeTypes.find(t => t.id === head.fee_type_id)?.name || '-'}
                                                </td>
                                                <td className="p-3">{head.is_mandatory ? 'Yes' : 'No'}</td>
                                                <td className="p-3 capitalize">{head.frequency?.replace('_', ' ')}</td>
                                                <td className="p-3 text-right flex justify-end gap-2">
                                                    <button onClick={() => setEditingHead(head)} className="text-blue-600 p-1 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDeleteHead(head.id)} className="text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {feeHeads.length === 0 && (
                                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No fee heads defined.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Structure Matrix Tab */}
                    {activeTab === 'structure' && (
                        <div>
                            <div className="flex gap-4 mb-4 items-center">
                                <label className="text-sm font-medium">Academic Year:</label>
                                <select
                                    className="border rounded p-2 text-sm bg-white"
                                    value={selectedYear}
                                    onChange={e => setSelectedYear(e.target.value)}
                                >
                                    <option>2024-2025</option>
                                    <option>2025-2026</option>
                                </select>
                            </div>

                            <div className="overflow-x-auto border rounded-lg">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="bg-slate-50 border-b font-medium text-slate-700">
                                        <tr>
                                            <th className="p-3 sticky left-0 bg-slate-50 z-10 border-r">Class</th>
                                            {feeHeads.map(head => (
                                                <th key={head.id} className="p-3 min-w-[120px] text-center border-l">{head.name}</th>
                                            ))}
                                            <th className="p-3 text-center border-l font-bold bg-slate-100">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {classes.map(cls => (
                                            <tr key={cls.id} className="hover:bg-slate-50">
                                                <td className="p-3 font-medium sticky left-0 bg-white z-10 border-r">{cls.name}</td>
                                                {feeHeads.map(head => (
                                                    <td key={head.id} className="p-2 border-l">
                                                        <div className="relative">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                                                            <input
                                                                type="number"
                                                                className={`w-full pl-6 pr-2 py-1 border rounded text-right ${`${cls.id}_${head.id}` in structureChanges ? 'bg-yellow-50 border-yellow-300' : 'border-slate-200'
                                                                    }`}
                                                                value={getAmount(cls.id, head.id)}
                                                                onChange={(e) => handleStructureChange(cls.id, head.id, e.target.value)}
                                                                onFocus={(e) => e.target.select()}
                                                            />
                                                        </div>
                                                    </td>
                                                ))}
                                                <td className="p-3 text-right font-bold bg-slate-50 border-l text-slate-900">
                                                    ₹{feeHeads.reduce((sum, head) => sum + Number(getAmount(cls.id, head.id)), 0)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
