import { useState, useEffect } from 'react';
import { X, Save, Search, Check } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface ClassSubjectsModalProps {
    isOpen: boolean;
    onClose: () => void;
    classId: string;
    className: string;
    schoolId: string;
}

interface SubjectItem {
    id: string;
    name: string;
    code: string;
    type: string;
    is_selected: boolean;
}

export function ClassSubjectsModal({ isOpen, onClose, classId, className, schoolId }: ClassSubjectsModalProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [subjects, setSubjects] = useState<SubjectItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen && classId && schoolId) {
            fetchData();
        }
    }, [isOpen, classId, schoolId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch all active subjects (or all non-archived)
            // We fetch ALL subjects now to ensure they appear even if status is missing/null
            const { data: allSubjects, error: subError } = await supabase
                .from('subjects')
                .select('id, name, code, type, status')
                .eq('school_id', schoolId)
                .order('name');

            if (subError) throw subError;

            // 2. Fetch existing mappings for this class
            const { data: mappings, error: mapError } = await supabase
                .from('class_subjects')
                .select('subject_id')
                .eq('class_id', classId)
                .eq('school_id', schoolId);

            if (mapError) throw mapError;

            const mappedIds = new Set(mappings?.map(m => m.subject_id));

            // 3. Merge
            const merged = (allSubjects || []).map(sub => ({
                ...sub,
                is_selected: mappedIds.has(sub.id)
            }));

            setSubjects(merged);
        } catch (error) {
            console.error('Error fetching class subjects:', error);
            alert('Failed to load subjects');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (id: string) => {
        setSubjects(prev => prev.map(s =>
            s.id === id ? { ...s, is_selected: !s.is_selected } : s
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const selectedIds = subjects.filter(s => s.is_selected).map(s => s.id);

            // We'll use a transaction logic: Delete all for this class, then insert new
            // But Supabase doesn't support transactions in client explicitly easily without RPC
            // So we'll use a smart delete-insert or just insert-on-conflict if we had ID
            // Simple approach: Delete all for class, Insert new. Safe enough for this config.

            // 1. Delete existing
            const { error: delError } = await supabase
                .from('class_subjects')
                .delete()
                .eq('class_id', classId)
                .eq('school_id', schoolId);

            if (delError) throw delError;

            // 2. Insert new
            if (selectedIds.length > 0) {
                const toInsert = selectedIds.map(subject_id => ({
                    school_id: schoolId,
                    class_id: classId,
                    subject_id: subject_id,
                    applicable_from: new Date().toISOString().split('T')[0] // Today
                }));

                const { error: insError } = await supabase
                    .from('class_subjects')
                    .insert(toInsert);

                if (insError) throw insError;
            }

            alert('Subjects updated successfully!');
            onClose();
        } catch (error) {
            console.error('Error saving mappings:', error);
            alert('Failed to save mappings');
        } finally {
            setSaving(false);
        }
    };

    const filteredSubjects = subjects.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl p-6 h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-bold">Manage Subjects for {className}</h3>
                        <p className="text-sm text-slate-500">Select subjects applicable to this class</p>
                    </div>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
                </div>

                <div className="mb-4 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search subjects..."
                        className="w-full pl-9 pr-4 py-2 border rounded-lg"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto border rounded-lg p-2">
                    {loading ? (
                        <div className="p-4 text-center">Loading subjects...</div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {filteredSubjects.map(sub => (
                                <div
                                    key={sub.id}
                                    onClick={() => handleToggle(sub.id)}
                                    className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${sub.is_selected
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'hover:bg-slate-50 border-slate-200'
                                        }`}
                                >
                                    <div>
                                        <div className="font-medium text-slate-900">{sub.name}</div>
                                        <div className="text-xs text-slate-500 flex gap-2">
                                            <span>{sub.code}</span>
                                            <span className="capitalize px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{sub.type}</span>
                                        </div>
                                    </div>
                                    {sub.is_selected && <Check className="w-5 h-5 text-blue-600" />}
                                </div>
                            ))}
                            {filteredSubjects.length === 0 && (
                                <div className="col-span-2 text-center p-4 text-slate-500">No subjects found.</div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Mappings</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
