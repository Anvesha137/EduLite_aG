import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface SectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    classId: string;
    initialData?: any;
    schoolId: string;
}

export function SectionModal({ isOpen, onClose, onSuccess, classId, initialData, schoolId }: SectionModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        status: 'active'
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                status: initialData.status
            });
        } else {
            setFormData({ name: '', status: 'active' });
        }
    }, [initialData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (initialData) {
                const { error } = await supabase
                    .from('sections')
                    .update({
                        name: formData.name,
                        status: formData.status
                    })
                    .eq('id', initialData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('sections')
                    .insert([{
                        school_id: schoolId,
                        class_id: classId,
                        name: formData.name,
                        status: formData.status
                    }]);
                if (error) throw error;
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving section:', error);
            alert('Failed to save section');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">{initialData ? 'Edit Section' : 'Add Section'}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Section Name</label>
                        <input
                            type="text"
                            required
                            className="w-full border rounded-lg p-2"
                            placeholder="e.g. A, B, Rose"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    {initialData && (
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
                    )}
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
                            {loading ? 'Saving...' : 'Save Section'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
