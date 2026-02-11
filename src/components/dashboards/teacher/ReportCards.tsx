import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { FileText, AlertCircle, Printer } from 'lucide-react';

interface ClassOption {
    class_id: string;
    section_id: string;
    class_name: string;
    section_name: string;
}

interface StudentReportSummary {
    student_id: string;
    admission_number: string;
    name: string;
    total_marks: number;
    max_total: number;
    percentage: number;
    grade: string;
    subject_count: number;
}

export function ReportCards() {
    const { user } = useAuth();
    const [myClasses, setMyClasses] = useState<ClassOption[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [exams, setExams] = useState<any[]>([]);
    const [selectedExam, setSelectedExam] = useState<string>('');

    const [reportData, setReportData] = useState<StudentReportSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) loadInitialData();
    }, [user]);

    useEffect(() => {
        if (selectedClass && selectedExam) {
            generateReportData();
        }
    }, [selectedClass, selectedExam]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            // 1. Get Class Teacher Classes
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
                if (options.length > 0) setSelectedClass(`${options[0].class_id}-${options[0].section_id}`);
            }

            // 2. Get Exams
            const { data: profile } = await supabase.from('user_profiles').select('school_id').eq('id', user?.id).single();
            if (!profile) return;

            const { data: examsData } = await supabase
                .from('exams')
                .select('id, name')
                .eq('school_id', profile.school_id)
                .eq('is_published', true);

            if (examsData) {
                setExams(examsData);
                if (examsData.length > 0) setSelectedExam(examsData[0].id);
            }

        } catch (err) {
            console.error('Error loading initial data', err);
        } finally {
            setLoading(false);
        }
    };

    const generateReportData = async () => {
        try {
            setLoading(true);
            const [classId, sectionId] = selectedClass.split('-');

            // 1. Get Students
            const { data: students } = await supabase
                .from('students')
                .select('id, name, admission_number')
                .eq('class_id', classId)
                .eq('section_id', sectionId)
                .eq('status', 'active')
                .order('name');

            if (!students) return;

            // 2. Get All Marks for Exam
            const { data: marks } = await supabase
                .from('marks')
                .select('student_id, marks_obtained, max_marks')
                .eq('exam_id', selectedExam)
                .in('student_id', students.map(s => s.id));

            // 3. Aggregate
            const summary: StudentReportSummary[] = students.map(student => {
                const studentMarks = marks?.filter(m => m.student_id === student.id) || [];

                const total = studentMarks.reduce((sum, m) => sum + (m.marks_obtained || 0), 0);
                const maxTotal = studentMarks.reduce((sum, m) => sum + m.max_marks, 0);

                const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

                let grade = '-';
                if (maxTotal > 0) {
                    if (percentage >= 90) grade = 'A+';
                    else if (percentage >= 80) grade = 'A';
                    else if (percentage >= 70) grade = 'B';
                    else if (percentage >= 60) grade = 'C';
                    else if (percentage >= 40) grade = 'D';
                    else grade = 'F';
                }

                return {
                    student_id: student.id,
                    admission_number: student.admission_number,
                    name: student.name,
                    total_marks: total,
                    max_total: maxTotal,
                    percentage: Math.round(percentage * 10) / 10,
                    grade,
                    subject_count: studentMarks.length
                };
            });

            setReportData(summary);

        } catch (err) {
            console.error('Error generating report', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && myClasses.length === 0) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    if (myClasses.length === 0) {
        return (
            <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900">No Class Assigned</h3>
                <p className="text-slate-500">You must be a Class Teacher to generate reports.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Class</label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {myClasses.map(c => (
                                <option key={`${c.class_id}-${c.section_id}`} value={`${c.class_id}-${c.section_id}`}>
                                    {c.class_name} - {c.section_name}
                                </option>
                            ))}
                        </select>
                    </div>

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
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800">Class Performance Summary</h3>
                    <button className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                        <Printer className="w-4 h-4" />
                        Print Reports
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Student</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Subjects</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Total Marks</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Percentage</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Grade</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reportData.map((student) => (
                                <tr key={student.student_id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-slate-900">{student.name}</p>
                                        <p className="text-xs text-slate-500">Adm: {student.admission_number}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm text-slate-600">
                                        {student.subject_count}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="font-medium text-slate-900">{student.total_marks}</span>
                                        <span className="text-slate-400 text-xs"> / {student.max_total}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`font-medium ${student.percentage >= 40 ? 'text-slate-900' : 'text-red-600'}`}>
                                            {student.percentage}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${student.grade === 'F' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                            }`}>
                                            {student.grade}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50">
                                            <FileText className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {reportData.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No marks data found for this exam.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
