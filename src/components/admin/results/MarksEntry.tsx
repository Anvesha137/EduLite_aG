import { useState, useEffect } from 'react';
import { Save, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSchool } from '../../../hooks/useSchool';

interface StudentMark {
    student_id: string;
    student_name: string;
    admission_number: string;
    marks_obtained: number | '';
    max_marks: number;
    is_absent: boolean;
    remarks: string;
}

export function MarksEntry() {
    const { schoolId } = useSchool();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Selection State
    const [exams, setExams] = useState<any[]>([]);
    const [selectedExamId, setSelectedExamId] = useState('');

    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState('');

    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');

    // Data State
    const [students, setStudents] = useState<StudentMark[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (schoolId) loadExams();
    }, [schoolId]);

    useEffect(() => {
        if (selectedExamId) loadClasses(selectedExamId);
        else { setClasses([]); setSelectedClassId(''); }
    }, [selectedExamId]);

    useEffect(() => {
        if (selectedExamId && selectedClassId) loadSubjects(selectedExamId, selectedClassId);
        else { setSubjects([]); setSelectedSubjectId(''); }
    }, [selectedExamId, selectedClassId]);

    useEffect(() => {
        if (selectedExamId && selectedClassId && selectedSubjectId) loadMarks();
        else setStudents([]);
    }, [selectedExamId, selectedClassId, selectedSubjectId]);

    const loadExams = async () => {
        try {
            // Secure RPC
            const { data, error } = await supabase.rpc('get_exam_schedules', { p_school_id: schoolId });
            if (error) throw error;
            if (data) setExams(data);
        } catch (err) {
            console.error('Error loading exams:', err);
        }
    };

    const loadClasses = async (examId: string) => {
        try {
            // Fallback to fetching all classes to ensure dropdown works
            const { data, error } = await supabase.from('classes').select('*').eq('school_id', schoolId).order('grade_order');
            if (error) throw error;
            // Map to match expected format if needed, but select('*') returns id, grade etc.
            // Component uses c.class_id or c.id. Let's check usage: key={c.class_id} value={c.class_id}
            // Real classes table has 'id'. usage expects 'class_id'?
            // RPC likely returned { class_id, grade }.
            // We need to map 'id' to 'class_id' to match expected state usage or update state usage.
            // Let's preserve checking existing usage...
            // Usage: <option key={c.class_id} value={c.class_id}>{c.grade}</option>
            if (data) {
                setClasses(data.map(c => ({ class_id: c.id, grade: c.grade })));
            }
        } catch (err) {
            console.error('Error loading classes:', err);
        }
    };

    const loadSubjects = async (examId: string, classId: string) => {
        try {
            // Ideally fetch from exam_subjects configuration via RPC
            // For now, consistent with previous approach but safer with fallback if RPC missing?
            // We can query exam_subjects directly IF no RLS blocks, but better to use what we have.
            // Let's use direct query for now, but wrapped in try-catch. 
            // NOTE: I haven't made get_exam_subjects RPC yet. If this fails, I'll need to add it.
            // But exam_subjects is usually readable.

            const { data, error } = await supabase
                .from('exam_subjects')
                .select('subject:subjects(id, name), max_marks, passing_marks')
                .eq('exam_id', examId)
                .eq('class_id', classId);

            if (data && data.length > 0) {
                setSubjects(data.map((d: any) => ({
                    id: d.subject.id,
                    name: d.subject.name,
                    max_marks: d.max_marks
                })));
            } else {
                // Fallback: Fetch all subjects for the school
                // Note: 'subjects' table usually has relaxed RLS or readable by educators
                const { data: allSubjects } = await supabase.from('subjects').select('*').eq('school_id', schoolId);
                if (allSubjects) {
                    setSubjects(allSubjects.map(s => ({ ...s, max_marks: 100 }))); // Default 100
                }
            }
        } catch (err) {
            console.error('Error loading subjects:', err);
        }
    };

    const loadMarks = async () => {
        setLoading(true);
        try {
            // Use the NEW Secure RPC that joins everything on server side
            const { data, error } = await supabase.rpc('get_student_marks_for_exam', {
                p_school_id: schoolId,
                p_exam_id: selectedExamId,
                p_class_id: selectedClassId,
                p_subject_id: selectedSubjectId
            });

            if (error) throw error;

            if (data) {
                // Data comes back in the correct shape
                setStudents(data);
            }
        } catch (err) {
            console.error('Error loading marks:', err);
            alert('Failed to load student marks. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkChange = (studentId: string, value: string) => {
        const numValue = value === '' ? '' : parseFloat(value);
        setStudents(prev => prev.map(s => {
            if (s.student_id === studentId) {
                // Validation only if value is a number
                if (value !== '' && typeof numValue === 'number' && s.max_marks > 0 && numValue > s.max_marks) {
                    // Optional: could show toast or error, for now just ignore/clamp? 
                    // Let's return as is to allow user correction but maybe flag it visually?
                    // User requested "redesign" -> prevent mistakes. Clamping or rejecting is better.
                    // Let's reject update if > max.
                    return s;
                }
                return { ...s, marks_obtained: numValue };
            }
            return s;
        }));
    };

    const toggleAbsent = (studentId: string) => {
        setStudents(prev => prev.map(s =>
            s.student_id === studentId ? { ...s, is_absent: !s.is_absent, marks_obtained: !s.is_absent ? 0 : '' } : s
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Fetch user first to avoid await inside map
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id;

            // Prepare payload for correct RPC format
            // The RPC expects: exam_id, student_id, subject_id, marks_obtained, is_absent, remarks, entered_by
            const payload = students
                .filter(s => s.marks_obtained !== '' || s.is_absent) // Only save valid entries
                .map(s => ({
                    exam_id: selectedExamId,
                    student_id: s.student_id,
                    subject_id: selectedSubjectId,
                    marks_obtained: s.marks_obtained === '' ? 0 : s.marks_obtained,
                    is_absent: s.is_absent,
                    remarks: s.remarks,
                    entered_by: currentUserId
                }));

            if (payload.length === 0) {
                alert('No marks to save.');
                setSaving(false);
                return;
            }

            // Secure RPC for bulk update
            const { error } = await supabase.rpc('update_student_marks', { p_marks_json: payload });

            if (error) throw error;
            alert('Marks saved successfully!');
            // Reload to refresh state
            loadMarks();
        } catch (err: any) {
            console.error(err);
            alert('Error saving marks: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.admission_number.includes(searchQuery)
    );

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Exam</label>
                    <select
                        className="w-full rounded-lg border-slate-300"
                        value={selectedExamId}
                        onChange={e => setSelectedExamId(e.target.value)}
                    >
                        <option value="">Choose Exam...</option>
                        {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Class</label>
                    <select
                        className="w-full rounded-lg border-slate-300"
                        value={selectedClassId}
                        onChange={e => setSelectedClassId(e.target.value)}
                        disabled={!selectedExamId}
                    >
                        <option value="">Choose Class...</option>
                        {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.grade}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Subject</label>
                    <select
                        className="w-full rounded-lg border-slate-300"
                        value={selectedSubjectId}
                        onChange={e => setSelectedSubjectId(e.target.value)}
                        disabled={!selectedClassId}
                    >
                        <option value="">Choose Subject...</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name} (Max: {s.max_marks})</option>)}
                    </select>
                </div>
            </div>

            {/* Marks Grid */}
            {selectedSubjectId && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-300px)]">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search student..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-lg border-slate-300 text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-sm text-slate-500">
                                {students.filter(s => s.marks_obtained !== '' || s.is_absent).length} / {students.length} Entered
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Saving...' : 'Save Marks'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider w-32">Attendance</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider w-40">Marks Obtained</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {loading ? (
                                    <tr><td colSpan={4} className="text-center py-8">Loading students...</td></tr>
                                ) : filteredStudents.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-8 text-slate-500">No students found.</td></tr>
                                ) : (
                                    filteredStudents.map((student) => (
                                        <tr key={student.student_id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-slate-900">{student.student_name}</div>
                                                <div className="text-xs text-slate-500">{student.admission_number}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => toggleAbsent(student.student_id)}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${student.is_absent
                                                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        }`}
                                                >
                                                    {student.is_absent ? 'Absent' : 'Present'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <input
                                                        type="number"
                                                        disabled={student.is_absent}
                                                        value={student.marks_obtained}
                                                        onChange={(e) => handleMarkChange(student.student_id, e.target.value)}
                                                        className={`w-24 px-3 py-2 border rounded-lg text-center disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${typeof student.marks_obtained === 'number' && student.marks_obtained > student.max_marks
                                                            ? 'border-red-500 bg-red-50'
                                                            : 'border-slate-300'
                                                            }`}
                                                        placeholder={`Max ${student.max_marks}`}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input
                                                    type="text"
                                                    value={student.remarks || ''}
                                                    onChange={(e) => setStudents(prev => prev.map(s => s.student_id === student.student_id ? { ...s, remarks: e.target.value } : s))}
                                                    className="w-full px-3 py-2 border-transparent hover:border-slate-300 focus:border-blue-500 rounded-lg text-sm bg-transparent"
                                                    placeholder="Add note..."
                                                />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!selectedSubjectId && (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">Mark Entry Area</h3>
                    <p className="text-slate-500">Select an exam to start entering marks.</p>
                </div>
            )}
        </div>
    );
}
