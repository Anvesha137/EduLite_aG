import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useSchool } from '../../../../hooks/useSchool';

interface GradeScale {
    id: string;
    name: string;
    type: 'scholastic' | 'co-scholastic';
    ranges: GradeRange[];
    is_default: boolean;
}

interface GradeRange {
    grade: string;
    min_score: number;
    max_score: number;
    points?: number;
    description?: string;
}

export function AssessmentConfigTab() {
    const { schoolId } = useSchool();
    const [gradeScales, setGradeScales] = useState<GradeScale[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentScale, setCurrentScale] = useState<GradeScale | null>(null);



    useEffect(() => {
        if (schoolId) {
            fetchScales();
        }
    }, [schoolId]);

    const fetchScales = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('grade_scales')
                .select('*')
                .eq('school_id', schoolId)
                .order('created_at');

            if (error) throw error;
            setGradeScales(data || []);
        } catch (error) {
            console.error('Error fetching grade scales:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (scale: GradeScale) => {
        setCurrentScale({ ...scale });
        setIsEditing(true);
    };

    const handleAddNew = () => {
        setCurrentScale({
            id: '',
            name: '',
            type: 'scholastic',
            is_default: false,
            ranges: [{ grade: '', min_score: 0, max_score: 100 }]
        });
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!currentScale || !schoolId) return;

        try {
            const payload = {
                name: currentScale.name,
                type: currentScale.type,
                ranges: currentScale.ranges,
                is_default: currentScale.is_default
            };

            if (currentScale.id) {
                const { error } = await supabase
                    .from('grade_scales')
                    .update(payload)
                    .eq('id', currentScale.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('grade_scales')
                    .insert([{
                        ...payload,
                        school_id: schoolId
                    }]);
                if (error) throw error;
            }

            await fetchScales();
            setIsEditing(false);
            setCurrentScale(null);
        } catch (error) {
            console.error('Error saving scale:', error);
            alert('Failed to save grade scale.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this grade scale?')) return;

        try {
            const { error } = await supabase
                .from('grade_scales')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchScales();
        } catch (error) {
            console.error('Error deleting scale:', error);
            alert('Failed to delete grade scale.');
        }
    };

    if (loading) return <div>Loading configuration...</div>;

    if (isEditing && currentScale) {
        return (
            <div className="p-6 max-w-4xl mx-auto bg-white border rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900">{currentScale.id ? 'Edit Grade Scale' : 'New Grade Scale'}</h3>
                    <button onClick={() => setIsEditing(false)}><X className="w-5 h-5 text-slate-500" /></button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Scale Name</label>
                            <input
                                type="text"
                                className="w-full border rounded p-2"
                                value={currentScale.name}
                                onChange={e => setCurrentScale({ ...currentScale, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Type</label>
                            <select
                                className="w-full border rounded p-2"
                                value={currentScale.type}
                                onChange={e => setCurrentScale({ ...currentScale, type: e.target.value as any })}
                            >
                                <option value="scholastic">Scholastic (Marks based)</option>
                                <option value="co-scholastic">Co-Scholastic (Activity based)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-medium mb-2">Grade Ranges</h4>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="p-2 text-left">Grade</th>
                                        <th className="p-2 text-left">Min %</th>
                                        <th className="p-2 text-left">Max %</th>
                                        <th className="p-2 text-left">Points</th>
                                        <th className="p-2 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentScale.ranges.map((range, idx) => (
                                        <tr key={idx} className="border-t">
                                            <td className="p-2"><input type="text" className="w-16 border rounded p-1" value={range.grade} onChange={e => {
                                                const newRanges = [...currentScale.ranges];
                                                newRanges[idx].grade = e.target.value;
                                                setCurrentScale({ ...currentScale, ranges: newRanges });
                                            }} /></td>
                                            <td className="p-2"><input type="number" className="w-16 border rounded p-1" value={range.min_score} onChange={e => {
                                                const newRanges = [...currentScale.ranges];
                                                newRanges[idx].min_score = Number(e.target.value);
                                                setCurrentScale({ ...currentScale, ranges: newRanges });
                                            }} /></td>
                                            <td className="p-2"><input type="number" className="w-16 border rounded p-1" value={range.max_score} onChange={e => {
                                                const newRanges = [...currentScale.ranges];
                                                newRanges[idx].max_score = Number(e.target.value);
                                                setCurrentScale({ ...currentScale, ranges: newRanges });
                                            }} /></td>
                                            <td className="p-2"><input type="number" className="w-16 border rounded p-1" value={range.points || 0} onChange={e => {
                                                const newRanges = [...currentScale.ranges];
                                                newRanges[idx].points = Number(e.target.value);
                                                setCurrentScale({ ...currentScale, ranges: newRanges });
                                            }} /></td>
                                            <td className="p-2 text-right">
                                                <button onClick={() => {
                                                    const newRanges = currentScale.ranges.filter((_, i) => i !== idx);
                                                    setCurrentScale({ ...currentScale, ranges: newRanges });
                                                }} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button
                                onClick={() => setCurrentScale({
                                    ...currentScale,
                                    ranges: [...currentScale.ranges, { grade: '', min_score: 0, max_score: 0 }]
                                })}
                                className="w-full py-2 text-blue-600 hover:bg-blue-50 text-sm font-medium"
                            >
                                + Add Range
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded flex items-center gap-2">
                            <Save className="w-4 h-4" /> Save Scale
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Assessment Configuration</h3>
                    <p className="text-slate-500 text-sm">Define Grade Scales and Assessment Rules</p>
                </div>
                <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    <Plus className="w-4 h-4" />
                    Add Grade Scale
                </button>
            </div>

            <div className="grid gap-6">
                {gradeScales.map((scale) => (
                    <div key={scale.id} className="bg-white border rounded-lg shadow-sm p-4">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-slate-800">{scale.name}</h4>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${scale.type === 'scholastic' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                        }`}>
                                        {scale.type}
                                    </span>
                                    {scale.is_default && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Default</span>}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{scale.ranges.length} Grades Defined</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(scale)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                                {!scale.is_default && (
                                    <button
                                        onClick={() => handleDelete(scale.id)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {scale.ranges.map((range, idx) => (
                                <div key={idx} className="bg-slate-50 border rounded px-2 py-1 flex flex-col items-center min-w-[60px]">
                                    <span className="font-bold text-slate-700">{range.grade}</span>
                                    <span className="text-[10px] text-slate-500">{range.min_score}-{range.max_score}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
