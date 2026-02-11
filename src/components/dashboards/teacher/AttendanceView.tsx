import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Save, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Attendance } from '../../../types/database';

interface ClassOption {
    class_id: string;
    section_id: string;
    class_name: string;
    section_name: string;
}

interface StudentAttendance {
    student_id: string;
    admission_number: string;
    name: string;
    status: Attendance['status'];
    remarks: string;
    attendance_id?: string; // Existing record ID
}

export function AttendanceView() {
    const { user } = useAuth();
    const [myClasses, setMyClasses] = useState<ClassOption[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>(''); // format: "classId-sectionId"
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [students, setStudents] = useState<StudentAttendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (user) loadClassTeacherClasses();
    }, [user]);

    useEffect(() => {
        if (selectedClass && selectedDate) {
            loadAttendanceData();
        }
    }, [selectedClass, selectedDate]);

    const loadClassTeacherClasses = async () => {
        try {
            setLoading(true);
            const { data: educator } = await supabase.from('educators').select('id').eq('user_id', user?.id).single();
            if (!educator) return;

            const { data: assignments } = await supabase
                .from('educator_class_assignments')
                .select(`
           class_id, section_id,
           class:classes(grade),
           section:sections(name)
        `)
                .eq('educator_id', educator.id)
                .eq('is_class_teacher', true)
                .eq('status', 'active');

            if (assignments) {
                const options = assignments.map((a: any) => ({
                    class_id: a.class_id,
                    section_id: a.section_id,
                    class_name: a.class.grade,
                    section_name: a.section.name
                }));
                setMyClasses(options);
                if (options.length > 0) {
                    setSelectedClass(`${options[0].class_id}-${options[0].section_id}`);
                }
            }
        } catch (err) {
            console.error('Error loading classes', err);
        } finally {
            setLoading(false);
        }
    };

    const loadAttendanceData = async () => {
        try {
            setLoading(true);
            const [classId, sectionId] = selectedClass.split('-');

            // 1. Fetch Students
            const { data: studentsData, error: stuError } = await supabase
                .from('students')
                .select('id, admission_number, name')
                .eq('class_id', classId)
                .eq('section_id', sectionId)
                .eq('status', 'active')
                .order('name');

            if (stuError) throw stuError;

            // 2. Fetch Existing Attendance
            const { data: attendanceData, error: attError } = await supabase
                .from('attendance')
                .select('*')
                .eq('date', selectedDate)
                .in('student_id', studentsData.map(s => s.id));

            if (attError) throw attError;

            // 3. Merge
            const attendanceMap = new Map(attendanceData?.map(a => [a.student_id, a]));

            const merged: StudentAttendance[] = studentsData.map(s => {
                const att = attendanceMap.get(s.id);
                return {
                    student_id: s.id,
                    admission_number: s.admission_number,
                    name: s.name,
                    status: att ? att.status : 'present', // Default to Present
                    remarks: att ? att.remarks || '' : '',
                    attendance_id: att ? att.id : undefined
                };
            });

            setStudents(merged);

        } catch (err) {
            console.error('Error loading attendance', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (studentId: string, status: Attendance['status']) => {
        setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, status } : s));
    };

    const handleRemarksChange = (studentId: string, remarks: string) => {
        setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, remarks } : s));
    };

    const saveAttendance = async () => {
        try {
            setSaving(true);
            setMessage(null);
            // const [classId, sectionId] = selectedClass.split('-'); // Unused

            // Prepare upsert data
            // We need to upsert. If we have attendance_id, update by ID?
            // Supabase helper: we can upsert on (student_id, date) if there's a unique constraint using those.
            // Usually attendance table should have UNIQUE(student_id, date).
            // Let's assume there is such constraint or we use the ID if present.

            const upsertData = students.map(s => ({
                id: s.attendance_id, // If undefined, new row (but need unique constraint for idempotency if ID missing)
                school_id: (user?.user_metadata?.school_id) || undefined, // Ideally handled by trigger or default
                student_id: s.student_id,
                date: selectedDate,
                status: s.status,
                remarks: s.remarks,
                marked_by: user?.id
            }));

            // We need school_id. 
            // Fetch school_id from educator profile or context.
            const { data: profile } = await supabase.from('user_profiles').select('school_id').eq('id', user?.id).single();
            if (!profile?.school_id) throw new Error("School context missing");

            const finalData = upsertData.map(d => ({ ...d, school_id: profile.school_id }));

            const { error } = await supabase
                .from('attendance')
                .upsert(finalData, { onConflict: 'student_id,date' });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Attendance saved successfully!' });

            // Reload to get IDs
            loadAttendanceData();

        } catch (err: any) {
            console.error('Save error', err);
            setMessage({ type: 'error', text: 'Failed to save attendance: ' + err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading && myClasses.length === 0) {
        return <div className="p-8 text-center">Loading classes...</div>;
    }

    if (myClasses.length === 0) {
        return (
            <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900">No Assigned Classes</h3>
                <p className="text-slate-500">You are not listed as a Class Teacher for any active class.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Mark Attendance</h2>
                    <p className="text-sm text-slate-500">Class Teacher Mode</p>
                </div>
                <div className="flex flex-wrap gap-4">
                    {/* Class Selector */}
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        {myClasses.map(c => (
                            <option key={`${c.class_id}-${c.section_id}`} value={`${c.class_id}-${c.section_id}`}>
                                {c.class_name} - {c.section_name}
                            </option>
                        ))}
                    </select>

                    {/* Date Picker */}
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-semibold text-slate-800">Student List</h3>
                    <div className="text-sm text-slate-500">
                        Total: {students.length} | Present: {students.filter(s => s.status === 'present').length}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reg. No</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {students.map((student) => (
                                <tr key={student.student_id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {student.admission_number}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                        {student.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex justify-center gap-1">
                                            <button
                                                onClick={() => handleStatusChange(student.student_id, 'present')}
                                                className={`p-2 rounded-lg transition-colors ${student.status === 'present' ? 'bg-green-100 text-green-700' : 'text-slate-400 hover:bg-slate-100'}`}
                                                title="Present"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange(student.student_id, 'absent')}
                                                className={`p-2 rounded-lg transition-colors ${student.status === 'absent' ? 'bg-red-100 text-red-700' : 'text-slate-400 hover:bg-slate-100'}`}
                                                title="Absent"
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange(student.student_id, 'late')}
                                                className={`p-2 rounded-lg transition-colors ${student.status === 'late' ? 'bg-amber-100 text-amber-700' : 'text-slate-400 hover:bg-slate-100'}`}
                                                title="Late"
                                            >
                                                <Clock className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange(student.student_id, 'half_day')}
                                                className={`p-2 rounded-lg transition-colors ${student.status === 'half_day' ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:bg-slate-100'}`}
                                                title="Half Day"
                                            >
                                                <span className="font-bold text-xs">HD</span>
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="text"
                                            value={student.remarks}
                                            onChange={(e) => handleRemarksChange(student.student_id, e.target.value)}
                                            placeholder="Add remark..."
                                            className="w-full px-3 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-blue-500"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end sticky bottom-6">
                <button
                    onClick={saveAttendance}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all font-medium"
                >
                    {saving ? <Clock className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {saving ? 'Saving...' : 'Save Attendance'}
                </button>
            </div>
        </div>
    );
}
