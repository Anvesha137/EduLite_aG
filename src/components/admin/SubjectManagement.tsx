
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../hooks/useSchool';
import { BookOpen, Plus, Edit, Trash2, Search, X } from 'lucide-react';
import { Modal } from '../Modal';

interface Subject {
    id: string;
    name: string;
    code: string;
    description?: string;
    school_id: string;
}

export function SubjectManagement() {
    const { schoolId, loading: schoolLoading } = useSchool();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [formData, setFormData] = useState({ name: '', code: '', description: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (schoolId) loadSubjects();
        else if (!schoolLoading && !schoolId) setLoading(false);
    }, [schoolId, schoolLoading]);

    const loadSubjects = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.rpc('get_available_subjects', { p_school_id: schoolId });
            if (error) throw error;
            setSubjects(data || []);
        } catch (error) {
            console.error('Error loading subjects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (subject?: Subject) => {
        if (subject) {
            setEditingSubject(subject);
            setFormData({
                name: subject.name,
                code: subject.code,
                description: subject.description || ''
            });
        } else {
            setEditingSubject(null);
            setFormData({ name: '', code: '', description: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingSubject) {
                // Update
                const { error } = await supabase.rpc('update_subject', {
                    p_id: editingSubject.id,
                    p_name: formData.name,
                    p_code: formData.code,
                    p_description: formData.description
                });
                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase.rpc('create_subject', {
                    p_school_id: schoolId,
                    p_name: formData.name,
                    p_code: formData.code,
                    p_description: formData.description
                });
                if (error) throw error;
            }
            setIsModalOpen(false);
            loadSubjects();
        } catch (error: any) {
            alert('Error saving subject: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this subject?')) return;
        try {
            const { error } = await supabase.rpc('delete_subject', { p_id: id });
            if (error) throw error;
            loadSubjects();
        } catch (error: any) {
            alert('Error deleting subject: ' + error.message);
        }
    };

    const filteredSubjects = subjects.filter(
        s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (schoolLoading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Subject Management</h2>
                    <p className="text-slate-600">Manage academic subjects for your school</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="w-4 h-4" /> Add Subject
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search subjects..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {filteredSubjects.map((subject) => (
                                <tr key={subject.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                <BookOpen className="w-4 h-4" />
                                            </div>
                                            {subject.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-mono font-medium">
                                            {subject.code}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                                        {subject.description || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenModal(subject)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(subject.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredSubjects.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        No subjects found. Add one to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingSubject ? 'Edit Subject' : 'Add Subject'}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Subject Name <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Mathematics"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Subject Code <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                            placeholder="e.g. MATH"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Description</label>
                        <textarea
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Optional description..."
                            rows={3}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            {saving ? 'Saving...' : 'Save Subject'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
