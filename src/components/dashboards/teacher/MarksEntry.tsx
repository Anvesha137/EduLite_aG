import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';

interface ExamOption {
    id: string;
    name: string;
}

interface SubjectOption {
    id: string;
    name: string;
    code: string;
    class_id: string;
    section_id: string;
    class_name: string;
    section_name: string;
}

interface StudentMark {
    student_id: string;
    admission_number: string;
    name: string;
    marks_obtained: number | '';
    max_marks: number;
    remarks: string;
    mark_id?: string;
}

export function MarksEntry({ educatorId }: { educatorId: string | null }) {
    const { user } = useAuth();
    const [exams, setExams] = useState<ExamOption[]>([]);
    const [selectedExam, setSelectedExam] = useState<string>('');

    const [mySubjects, setMySubjects] = useState<SubjectOption[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>(''); // format: "subjectId-classId-sectionId"

    const [students, setStudents] = useState<StudentMark[]>([]);
    const [maxMarks, setMaxMarks] = useState<number>(100);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (user && educatorId) {
            loadInitialData(educatorId);
        }
    }, [user, educatorId]);

    useEffect(() => {
        if (selectedExam && selectedSubject) {
            loadMarksData();
        }
    }, [selectedExam, selectedSubject]);

    const loadInitialData = async (id: string) => {
        try {
            setLoading(true);

            // 1. Fetch Exams (Active Academic Year)
            // Ideally filtering by school_id.
            const { data: profile } = await supabase.from('user_profiles').select('school_id').eq('id', user?.id).single();
            if (!profile) return;
            const schoolId = profile.school_id;

            const { data: examsData } = await supabase
                .from('exams')
                .select('id, name')
                .eq('school_id', schoolId)
                .eq('is_published', true); // Only published exams?

            if (examsData) {
                setExams(examsData);
                if (examsData.length > 0) setSelectedExam(examsData[0].id);
            }

            // 2. Fetch My Subjects (As Subject Teacher) using passed ID
            const { data: assignments } = await supabase
                .from('educator_class_assignments')
                .select(`
           class_id, section_id, subject_id,
           class:classes(name),
           section:sections(name),
           subject:subjects(id, name, code)
        `)
                .eq('educator_id', id)
                // .eq('status', 'active')
                .not('subject_id', 'is', null);

            if (assignments) {
                const options = assignments
                    .filter((a: any) => a.class && a.section && a.subject)
                    .map((a: any) => ({
                        id: a.subject.id,
                        name: a.subject.name,
                        code: a.subject.code,
                        class_id: a.class_id,
                        section_id: a.section_id,
                        class_name: a.class.name,
                        section_name: a.section.name
                    }));
                setMySubjects(options);
                if (options.length > 0) {
                    setSelectedSubject(`${options[0].id}-${options[0].class_id}-${options[0].section_id}`);
                }
            }



        } catch (err) {
            console.error('Error loading initial data', err);
        } finally {
            setLoading(false);
        }
    };

    const loadMarksData = async () => {
        if (!selectedExam || !selectedSubject) return;

        try {
            setLoading(true);
            const [subjectId, classId, sectionId] = selectedSubject.split('-');

            // 1. Fetch Students
            const { data: studentsData, error: stuError } = await supabase
                .from('students')
                .select('id, admission_number, name')
                .eq('class_id', classId)
                .eq('section_id', sectionId)
                .eq('status', 'active')
                .order('name');

            if (stuError) throw stuError;

            // 2. Fetch Existing Marks
            const { data: marksData, error: marksError } = await supabase
                .from('marks')
                .select('*')
                .eq('exam_id', selectedExam)
                .eq('subject_id', subjectId)
                .in('student_id', studentsData.map(s => s.id));

            if (marksError) throw marksError;

            // 3. Merge
            const marksMap = new Map(marksData?.map(m => [m.student_id, m]));

            const merged: StudentMark[] = studentsData.map(s => {
                const mark = marksMap.get(s.id);
                return {
                    student_id: s.id,
                    admission_number: s.admission_number,
                    name: s.name,
                    marks_obtained: mark ? mark.marks_obtained : '',
                    max_marks: mark ? mark.max_marks : 100, // Default 100
                    remarks: mark ? mark.remarks || '' : '',
                    mark_id: mark ? mark.id : undefined
                };
            });

            setStudents(merged);
            // Update max marks input if data exists (assuming uniform max marks)
            if (marksData && marksData.length > 0) {
                setMaxMarks(marksData[0].max_marks);
            }

        } catch (err) {
            console.error('Error loading marks', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkChange = (studentId: string, val: string) => {
        // Allow empty or number
        if (val === '') {
            setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, marks_obtained: '' } : s));
            return;
        }
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0 && num <= maxMarks) {
            setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, marks_obtained: num } : s));
        }
    };

    const saveMarks = async () => {
        try {
            setSaving(true);
            setMessage(null);
            const [subjectId] = selectedSubject.split('-');

            const { data: profile } = await supabase.from('user_profiles').select('school_id').eq('id', user?.id).single();
            const schoolId = profile?.school_id;
            if (!schoolId) throw new Error("School ID not found");

            const upsertData = students
                .filter(s => s.marks_obtained !== '') // Only save entered marks
                .map(s => ({
                    id: s.mark_id,
                    school_id: schoolId,
                    exam_id: selectedExam,
                    subject_id: subjectId,
                    student_id: s.student_id,
                    marks_obtained: s.marks_obtained,
                    max_marks: maxMarks,
                    remarks: s.remarks,
                    entered_by: user?.id
                }));

            if (upsertData.length === 0) {
                setMessage({ type: 'error', text: 'No marks entered to save.' });
                setSaving(false);
                return;
            }

            const { error } = await supabase
                .from('marks')
                .upsert(upsertData, { onConflict: 'exam_id,student_id,subject_id' });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Marks saved successfully!' });
            loadMarksData();

        } catch (err: any) {
            console.error('Save marks error', err);
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading && exams.length === 0) {
        return <div className="p-8 text-center">Loading data...</div>;
    }

    if (mySubjects.length === 0) {
        return (
            <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900">No Subjects Assigned</h3>
                <p className="text-slate-500">You are not assigned as a Subject Teacher for any active class.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Exam</label>
                        <select
                            value={selectedExam}
                            onChange={(e) => setSelectedExam(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>

                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Class & Subject</label>
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {mySubjects.map(s => (
                                <option key={`${s.id}-${s.class_id}-${s.section_id}`} value={`${s.id}-${s.class_id}-${s.section_id}`}>
                                    {s.class_name} - {s.section_name} : {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="w-32">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Max Marks</label>
                        <input
                            type="number"
                            value={maxMarks}
                            onChange={(e) => setMaxMarks(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            {/* Marks Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800">Student Marks</h3>
                    <span className="text-sm text-slate-500">Total Students: {students.length}</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Details</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Marks Obtained</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {students.map((student) => {
                                const marks = student.marks_obtained;
                                const percentage = marks !== '' ? (Number(marks) / maxMarks) * 100 : 0;

                                return (
                                    <tr key={student.student_id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-slate-900">{student.name}</p>
                                            <p className="text-xs text-slate-500">Adm: {student.admission_number}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="number"
                                                value={student.marks_obtained}
                                                onChange={(e) => handleMarkChange(student.student_id, e.target.value)}
                                                className="w-24 px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 font-medium"
                                                placeholder="0"
                                                max={maxMarks}
                                            />
                                            <span className="text-slate-400 ml-2">/ {maxMarks}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {student.marks_obtained !== '' ? (
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${percentage >= 40 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {percentage >= 40 ? 'Pass' : 'Fail'}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="text"
                                                value={student.remarks}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setStudents(prev => prev.map(s => s.student_id === student.student_id ? { ...s, remarks: val } : s));
                                                }}
                                                placeholder="Optional"
                                                className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end sticky bottom-6">
                <button
                    onClick={saveMarks}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl shadow-lg hover:bg-violet-700 disabled:opacity-50 transition-all font-medium"
                >
                    {saving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Save className="w-5 h-5" />}
                    {saving ? 'Saving...' : 'Save Marks'}
                </button>
            </div>
        </div>
    );
}
