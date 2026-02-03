import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface ClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
    schoolId: string;
}

export function ClassModal({ isOpen, onClose, onSuccess, initialData, schoolId }: ClassModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        sort_order: 0,
        status: 'active'
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                sort_order: initialData.sort_order || 0,
                status: initialData.status
            });
        } else {
            setFormData({ name: '', sort_order: 0, status: 'active' });
        }
    }, [initialData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (initialData) {
                const { error } = await supabase
                    .from('classes')
                    .update({
                        name: formData.name,
                        sort_order: formData.sort_order,
                        status: formData.status
                    })
                    .eq('id', initialData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('classes')
                    .insert([{
                        school_id: schoolId,
                        name: formData.name,
                        sort_order: formData.sort_order,
                        status: formData.status,
                        grade: formData.name // Backward compatibility
                    }]);
                if (error) throw error;
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving class:', error);
            alert('Failed to save class');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">{initialData ? 'Edit Class' : 'Add New Class'}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Class Name</label>
                        <input
                            type="text"
                            required
                            className="w-full border rounded-lg p-2"
                            placeholder="e.g. Nursery, 1, 2"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
                        <input
                            type="number"
                            required
                            className="w-full border rounded-lg p-2"
                            value={formData.sort_order}
                            onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                        />
                        <p className="text-xs text-slate-500 mt-1">Used for sorting (e.g. 1 for Nursery, 13 for Class 1)</p>
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
                            {loading ? 'Saving...' : 'Save Class'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
