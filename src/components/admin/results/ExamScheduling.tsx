import { useState, useEffect } from 'react';
import { Plus, Calendar, Users, ArrowRight, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSchool } from '../../../hooks/useSchool';
import { Modal } from '../../Modal';
import { Class } from '../../../types/database';

interface ExamSchedule {
    id: string;
    name: string;
    exam_type: { name: string; code: string };
    start_date: string;
    end_date: string;
    status: string;
    classes?: { class: { grade: string } }[];
}

export function ExamScheduling() {
    const { schoolId } = useSchool();
    const [exams, setExams] = useState<ExamSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        if (schoolId) loadExams();
    }, [schoolId, refreshTrigger]);

    const loadExams = async () => {
        try {
            // Fetch exams with related info
            const { data, error } = await supabase
                .from('exam_schedules')
                .select(`
          *,
          exam_type:exam_types(name, code),
          classes:exam_classes(class:classes(grade))
        `)
                .eq('school_id', schoolId)
                .order('start_date', { ascending: false });

            if (error) throw error;
            setExams(data || []);
        } catch (err) {
            console.error('Error loading exams:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published': return 'bg-green-100 text-green-700';
            case 'ongoing': return 'bg-blue-100 text-blue-700';
            case 'completed': return 'bg-slate-100 text-slate-700';
            default: return 'bg-amber-100 text-amber-700'; // draft
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-slate-900">Scheduled Exams</h3>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Schedule Exam
                </button>
            </div>

            <div className="grid gap-4">
                {exams.map(exam => (
                    <div key={exam.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h4 className="text-lg font-bold text-slate-900">{exam.name}</h4>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(exam.status)}`}>
                                        {exam.status.toUpperCase()}
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                        {exam.exam_type?.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-600 mt-2">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {new Date(exam.start_date).toLocaleDateString()} - {new Date(exam.end_date).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Users className="w-4 h-4" />
                                        {exam.classes?.map(c => c.class.grade).join(', ') || 'No classes assigned'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1">
                                    Manage Subjects <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {exams.length === 0 && !loading && (
                    <div className="text-center py-12 text-slate-500">
                        No exams scheduled. Click "Schedule Exam" to create one.
                    </div>
                )}
            </div>

            <ScheduleExamModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                schoolId={schoolId!}
                onSave={() => setRefreshTrigger(p => p + 1)}
            />
        </div>
    );
}

function ScheduleExamModal({ isOpen, onClose, schoolId, onSave }: any) {
    const [step, setStep] = useState(1);
    const [types, setTypes] = useState<any[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [form, setForm] = useState({
        name: '',
        exam_type_id: '',
        academic_year: '2025-26', // dynamic in real app
        start_date: '',
        end_date: '',
        selectedClassIds: [] as string[]
    });

    useEffect(() => {
        if (isOpen) {
            loadDependencies();
            setStep(1);
            setForm(prev => ({ ...prev, selectedClassIds: [] }));
        }
    }, [isOpen]);

    const loadDependencies = async () => {
        const [typesRes, classesRes] = await Promise.all([
            supabase.from('exam_types').select('*').eq('school_id', schoolId),
            supabase.from('classes').select('*').eq('school_id', schoolId).order('grade_order')
        ]);
        if (typesRes.data) setTypes(typesRes.data);
        if (classesRes.data) setClasses(classesRes.data);
    };

    const toggleClass = (id: string) => {
        setForm(prev => ({
            ...prev,
            selectedClassIds: prev.selectedClassIds.includes(id)
                ? prev.selectedClassIds.filter(c => c !== id)
                : [...prev.selectedClassIds, id]
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // 1. Create Exam Schedule
            const { data: examData, error: examError } = await supabase.from('exam_schedules').insert({
                school_id: schoolId,
                name: form.name,
                exam_type_id: form.exam_type_id,
                academic_year: form.academic_year,
                start_date: form.start_date,
                end_date: form.end_date,
                status: 'draft'
            }).select().single();

            if (examError) throw examError;

            // 2. Link Classes
            if (form.selectedClassIds.length > 0) {
                const classLinks = form.selectedClassIds.map(classId => ({
                    exam_id: examData.id,
                    class_id: classId
                }));
                const { error: linkError } = await supabase.from('exam_classes').insert(classLinks);
                if (linkError) throw linkError;
            }

            onSave();
            onClose();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Schedule New Exam" size="lg">
            <div className="space-y-6">
                {/* Progress Stepper */}
                <div className="flex items-center justify-center space-x-4 mb-6">
                    <div className={`h-2 flex-1 rounded ${step >= 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
                    <div className={`h-2 flex-1 rounded ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
                </div>

                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Exam Name</label>
                            <input
                                type="text"
                                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Term 1 Assessment"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Exam Type</label>
                                <select
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                                    value={form.exam_type_id}
                                    onChange={e => setForm({ ...form, exam_type_id: e.target.value })}
                                >
                                    <option value="">Select Type</option>
                                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Academic Year</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                                    value={form.academic_year}
                                    onChange={e => setForm({ ...form, academic_year: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Start Date</label>
                                <input
                                    type="date"
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                                    value={form.start_date}
                                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">End Date</label>
                                <input
                                    type="date"
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                                    value={form.end_date}
                                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <h4 className="font-medium text-slate-900">Select Participating Classes</h4>
                        <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                            {classes.map(cls => (
                                <div
                                    key={cls.id}
                                    onClick={() => toggleClass(cls.id)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-colors text-center ${form.selectedClassIds.includes(cls.id)
                                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                                            : 'border-slate-200 hover:border-blue-400'
                                        }`}
                                >
                                    <span className="font-bold">{cls.grade}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-between pt-4 border-t border-slate-100">
                    {step > 1 ? (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700"
                        >
                            Back
                        </button>
                    ) : <div></div>}

                    {step < 2 ? (
                        <button
                            onClick={() => {
                                if (!form.name || !form.exam_type_id || !form.start_date) return alert('Please fill required fields');
                                setStep(step + 1);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            Next <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                        >
                            {loading ? 'Creating...' : 'Create Schedule'} <CheckCircle className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
