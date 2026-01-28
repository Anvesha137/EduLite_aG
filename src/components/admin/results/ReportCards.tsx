import { useState, useEffect } from 'react';
import { Calculator, Printer, Eye } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSchool } from '../../../hooks/useSchool';
import { Modal } from '../../Modal';

export function ReportCards() {
    const { schoolId } = useSchool();
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Selection
    const [exams, setExams] = useState<any[]>([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState('');

    // Data
    const [results, setResults] = useState<any[]>([]);
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    useEffect(() => {
        if (schoolId) loadExams();
    }, [schoolId]);

    useEffect(() => {
        if (selectedExamId) loadClasses(selectedExamId);
    }, [selectedExamId]);

    useEffect(() => {
        if (selectedExamId && selectedClassId) loadResults();
        else setResults([]);
    }, [selectedExamId, selectedClassId]);

    const loadExams = async () => {
        const { data } = await supabase.from('exam_schedules').select('id, name').eq('school_id', schoolId).neq('status', 'draft').order('start_date', { ascending: false });
        if (data) setExams(data);
    };

    const loadClasses = async (examId: string) => {
        const { data } = await supabase.from('exam_classes').select('class:classes(id, grade)').eq('exam_id', examId);
        if (data) setClasses(data.map((d: any) => d.class).sort((a: any, b: any) => a.grade.localeCompare(b.grade)));
    };

    const loadResults = async () => {
        setLoading(true);
        try {
            // Fetch students with their result summaries
            // We need to join students with result_summaries
            const { data: studentsData } = await supabase
                .from('students')
                .select(`
          id, name, admission_number,
          result_summaries!inner(total_marks_obtained, total_max_marks, percentage, grade)
        `)
                .eq('school_id', schoolId)
                .eq('class_id', selectedClassId)
                .eq('status', 'active')
                .eq('result_summaries.exam_id', selectedExamId)
                .order('name');

            setResults(studentsData || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleProcessResults = async () => {
        if (!confirm('This will calculate totals and grades for all students in this exam. Continue?')) return;
        setProcessing(true);
        try {
            const { error } = await supabase.rpc('process_exam_results', { p_exam_id: selectedExamId });
            if (error) throw error;
            alert('Results processed successfully!');
            loadResults();
        } catch (err: any) {
            alert('Error processing results: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    const viewReportCard = async (student: any) => {
        setLoading(true);
        // Fetch detailed subject marks for this student
        const { data: details } = await supabase
            .from('student_marks')
            .select(`
        marks_obtained, max_marks, remarks, is_absent,
        subject:subjects(name)
      `)
            .eq('exam_id', selectedExamId)
            .eq('student_id', student.id);

        setSelectedStudent({
            ...student,
            details: details || []
        });
        setLoading(false);
        setShowReportModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-4 items-end bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex-1">
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
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Class</label>
                    <select
                        className="w-full rounded-lg border-slate-300"
                        value={selectedClassId}
                        onChange={e => setSelectedClassId(e.target.value)}
                        disabled={!selectedExamId}
                    >
                        <option value="">Choose Class...</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.grade}</option>)}
                    </select>
                </div>
                <div>
                    <button
                        onClick={handleProcessResults}
                        disabled={!selectedExamId || processing}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <Calculator className="w-4 h-4" />
                        {processing ? 'Processing...' : 'Calculate Results'}
                    </button>
                </div>
            </div>

            {/* Results List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-200">
                    <h3 className="font-medium text-slate-900">Student Results</h3>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-medium">
                        <tr>
                            <th className="px-6 py-3">Student</th>
                            <th className="px-6 py-3">Total Marks</th>
                            <th className="px-6 py-3">Percentage</th>
                            <th className="px-6 py-3">Grade</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {results.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                {loading ? 'Loading...' : 'No results found. Try clicking "Calculate Results" if you have entered marks.'}
                            </td></tr>
                        ) : (
                            results.map(student => {
                                const summary = student.result_summaries[0];
                                return (
                                    <tr key={student.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{student.name}</div>
                                            <div className="text-xs text-slate-500">{student.admission_number}</div>
                                        </td>
                                        <td className="px-6 py-4">{summary?.total_marks_obtained} / {summary?.total_max_marks}</td>
                                        <td className="px-6 py-4">{Number(summary?.percentage).toFixed(2)}%</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${summary?.grade === 'F' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                {summary?.grade || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => viewReportCard(student)}
                                                className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 ml-auto"
                                            >
                                                <Eye className="w-4 h-4" /> View Report
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <ReportCardModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                student={selectedStudent}
                examName={exams.find(e => e.id === selectedExamId)?.name}
            />
        </div>
    );
}

function ReportCardModal({ isOpen, onClose, student, examName }: any) {
    if (!student) return null;

    const summary = student.result_summaries[0];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Student Report Card" size="lg">
            <div className="space-y-6" id="printable-report">
                <div className="text-center border-b pb-4">
                    <h2 className="text-xl font-bold text-slate-900">EduLite High School</h2>
                    <p className="text-slate-500">Official Report Card - {examName}</p>
                </div>

                <div className="flex justify-between text-sm">
                    <div>
                        <p className="text-slate-500">Student Name</p>
                        <p className="font-bold text-slate-900">{student.name}</p>
                    </div>
                    <div>
                        <p className="text-slate-500">Admission No</p>
                        <p className="font-bold text-slate-900">{student.admission_number}</p>
                    </div>
                    <div>
                        <p className="text-slate-500">Result Date</p>
                        <p className="font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <table className="w-full text-sm border-collapse border border-slate-200">
                    <thead className="bg-slate-100">
                        <tr>
                            <th className="border border-slate-200 px-4 py-2 text-left">Subject</th>
                            <th className="border border-slate-200 px-4 py-2 text-center">Max Marks</th>
                            <th className="border border-slate-200 px-4 py-2 text-center">Obtained</th>
                            <th className="border border-slate-200 px-4 py-2 text-left">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {student.details?.map((detail: any, idx: number) => (
                            <tr key={idx}>
                                <td className="border border-slate-200 px-4 py-2 font-medium">{detail.subject?.name}</td>
                                <td className="border border-slate-200 px-4 py-2 text-center">{detail.max_marks}</td>
                                <td className="border border-slate-200 px-4 py-2 text-center">
                                    {detail.is_absent ? <span className="text-red-600">Abs</span> : detail.marks_obtained}
                                </td>
                                <td className="border border-slate-200 px-4 py-2 text-slate-500 italic">{detail.remarks}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold">
                        <tr>
                            <td className="border border-slate-200 px-4 py-2">Total</td>
                            <td className="border border-slate-200 px-4 py-2 text-center">{summary?.total_max_marks}</td>
                            <td className="border border-slate-200 px-4 py-2 text-center">{summary?.total_marks_obtained}</td>
                            <td className="border border-slate-200 px-4 py-2">
                                {Number(summary?.percentage).toFixed(2)}% ({summary?.grade})
                            </td>
                        </tr>
                    </tfoot>
                </table>

                <div className="flex justify-between pt-8 mt-8 border-t border-slate-200">
                    <div className="text-center">
                        <div className="w-32 h-0.5 bg-slate-400 mb-2"></div>
                        <p className="text-xs text-slate-500">Class Teacher</p>
                    </div>
                    <div className="text-center">
                        <div className="w-32 h-0.5 bg-slate-400 mb-2"></div>
                        <p className="text-xs text-slate-500">Principal</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-slate-50">Close</button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Printer className="w-4 h-4" /> Print
                </button>
            </div>
        </Modal>
    );
}
