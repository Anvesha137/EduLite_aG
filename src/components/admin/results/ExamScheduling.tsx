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
    const { schoolId, loading: schoolLoading } = useSchool();
    const [exams, setExams] = useState<ExamSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [selectedExam, setSelectedExam] = useState<ExamSchedule | null>(null);
    const [showSubjectsModal, setShowSubjectsModal] = useState(false);

    useEffect(() => {
        if (schoolId) loadExams();
    }, [schoolId, refreshTrigger]);

    // ... (rest of loadExams and helpers)
    const loadExams = async () => {
        try {
            // Fetch exams using Secure RPC
            const { data, error } = await supabase.rpc('get_exam_schedules', { p_school_id: schoolId });

            if (error) throw error;
            const mappedExams = (data || []).map((e: any) => ({
                id: e.id,
                name: e.name,
                start_date: e.start_date,
                end_date: e.end_date,
                status: e.status,
                exam_type: { name: e.exam_type_name, code: e.exam_type_code },
                classes: e.class_grades ? e.class_grades.map((g: string) => ({ class: { grade: g } })) : []
            }));

            setExams(mappedExams);
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

    if (schoolLoading) {
        return <div className="p-8 text-center text-slate-500">Loading school details...</div>;
    }

    if (!schoolId) {
        return <div className="p-8 text-center text-red-500">Error: School ID not found.</div>;
    }

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
                                <button
                                    onClick={() => {
                                        setSelectedExam(exam);
                                        setShowSubjectsModal(true);
                                    }}
                                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1"
                                >
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
                schoolId={schoolId}
                onSave={() => setRefreshTrigger(p => p + 1)}
            />

            <ManageSubjectsModal
                isOpen={showSubjectsModal}
                onClose={() => setShowSubjectsModal(false)}
                exam={selectedExam}
                schoolId={schoolId}
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

        // Handle Exam Types with Fallback
        if (typesRes.data && typesRes.data.length > 0) {
            setTypes(typesRes.data);
        } else {
            // Fallback for empty data or error
            setTypes([
                { id: '00000000-0000-0000-0000-000000000001', name: 'Unit Test', code: 'UT', school_id: schoolId },
                { id: '00000000-0000-0000-0000-000000000002', name: 'Half Yearly', code: 'HY', school_id: schoolId },
                { id: '00000000-0000-0000-0000-000000000003', name: 'Annual', code: 'ANN', school_id: schoolId },
                { id: '00000000-0000-0000-0000-000000000004', name: 'Quarterly', code: 'QT', school_id: schoolId }
            ]);
        }

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
            // Atomic RPC call for Exam + Classes
            const { error } = await supabase.rpc('create_exam_schedule_with_classes', {
                p_school_id: schoolId,
                p_name: form.name,
                p_exam_type_id: form.exam_type_id,
                p_academic_year: form.academic_year,
                p_start_date: form.start_date,
                p_end_date: form.end_date,
                p_class_ids: form.selectedClassIds
            });

            if (error) throw error;

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
                                {types.length === 0 && (
                                    <p className="text-xs text-red-500 mt-1">
                                        No Exam Types found. <span className="underline cursor-pointer" onClick={onClose}>Go to Configuration</span> to add them.
                                    </p>
                                )}
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

function ManageSubjectsModal({ isOpen, onClose, exam, schoolId }: any) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);



    useEffect(() => {
        if (isOpen && exam) {
            loadSubjects();
        }
    }, [isOpen, exam]);

    const loadSubjects = async () => {
        setLoading(true);
        try {
            // 1. Get all subjects for the school using Secure RPC
            const { data: allSubjects, error: subjectsError } = await supabase.rpc('get_available_subjects', {
                p_school_id: schoolId
            });

            if (subjectsError) throw subjectsError;

            // 2. Get existing exam subjects
            const { data: existing, error: existingError } = await supabase
                .from('exam_subjects')
                .select('subject_id')
                .eq('exam_id', exam.id);

            if (existingError) throw existingError;

            setSubjects(allSubjects || []);
            setSelectedSubjects(existing?.map(e => e.subject_id) || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSubject = (id: string) => {
        setSelectedSubjects(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Delete all existing
            await supabase.from('exam_subjects').delete().eq('exam_id', exam.id);

            // Insert new
            if (selectedSubjects.length > 0) {
                const { error } = await supabase.from('exam_subjects').insert(
                    selectedSubjects.map(sid => ({
                        exam_id: exam.id,
                        subject_id: sid,
                        school_id: schoolId,
                        max_marks: 100 // Default, can be editable later
                    }))
                );
                if (error) throw error;
            }
            alert('Subjects updated successfully!');
            onClose();
        } catch (err: any) {
            alert('Error saving subjects: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Manage Subjects: ${exam?.name}`} size="lg">
            <div className="space-y-6">
                <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
                    Select the subjects applicable for this exam. These will appear in the Marks Entry screen.
                </div>

                {loading ? (
                    <div className="text-center py-8">Loading subjects...</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                        {subjects.map(sub => (
                            <div
                                key={sub.id}
                                onClick={() => toggleSubject(sub.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedSubjects.includes(sub.id)
                                    ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                                    : 'border-slate-200 hover:border-blue-400'
                                    }`}
                            >
                                <div className="font-semibold">{sub.name}</div>
                                <div className="text-xs text-slate-500">{sub.code}</div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        {saving ? 'Saving...' : 'Save Subjects'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
