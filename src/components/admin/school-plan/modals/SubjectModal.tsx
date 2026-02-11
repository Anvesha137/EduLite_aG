import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface SubjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
    schoolId: string;
}

export function SubjectModal({ isOpen, onClose, onSuccess, initialData, schoolId }: SubjectModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        type: 'academic',
        grading_type: 'marks',
        include_in_report_card: true,
        status: 'active'
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                code: initialData.code || '',
                type: initialData.type || 'academic',
                grading_type: initialData.grading_type || 'marks',
                include_in_report_card: initialData.include_in_report_card ?? true,
                status: initialData.status || 'active'
            });
        } else {
            setFormData({
                name: '',
                code: '',
                type: 'academic',
                grading_type: 'marks',
                include_in_report_card: true,
                status: 'active'
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                name: formData.name,
                code: formData.code.toUpperCase(),
                type: formData.type,
                grading_type: formData.grading_type,
                include_in_report_card: formData.include_in_report_card,
                status: formData.status
            };

            if (initialData) {
                const { error } = await supabase
                    .from('subjects')
                    .update(payload)
                    .eq('id', initialData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('subjects')
                    .insert([{
                        ...payload,
                        school_id: schoolId
                    }]);
                if (error) throw error;
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving subject:', error);
            alert('Failed to save subject: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">{initialData ? 'Edit Subject/Activity' : 'Add Subject/Activity'}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <input
                                type="text"
                                required
                                className="w-full border rounded-lg p-2"
                                placeholder="e.g. Mathematics, Swimming"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                            <input
                                type="text"
                                required
                                className="w-full border rounded-lg p-2 uppercase"
                                placeholder="e.g. MATH, SWIM"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                            <select
                                className="w-full border rounded-lg p-2"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="academic">Academic Subject</option>
                                <option value="activity">Activity / Co-curricular</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Grading Type</label>
                            <select
                                className="w-full border rounded-lg p-2"
                                value={formData.grading_type}
                                onChange={(e) => setFormData({ ...formData, grading_type: e.target.value })}
                            >
                                <option value="marks">Marks Based</option>
                                <option value="grade">Grade Based (A/B/C)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                            <select
                                className="w-full border rounded-lg p-2"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="active">Active</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="include_in_report"
                            checked={formData.include_in_report_card}
                            onChange={(e) => setFormData({ ...formData, include_in_report_card: e.target.checked })}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="include_in_report" className="text-sm text-slate-700">
                            Include in Report Card
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Subject'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
