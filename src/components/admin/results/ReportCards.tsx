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
        else { setClasses([]); setSelectedClassId(''); }
    }, [selectedExamId]);

    useEffect(() => {
        if (selectedExamId && selectedClassId) loadResults();
        else setResults([]);
    }, [selectedExamId, selectedClassId]);

    const loadExams = async () => {
        try {
            const { data, error } = await supabase.rpc('get_exam_schedules', { p_school_id: schoolId });
            if (error) throw error;
            if (data) setExams(data);
        } catch (err) {
            console.error('Error loading exams:', err);
        }
    };

    const loadClasses = async (examId: string) => {
        try {
            // Secure RPC for strict filtering
            const { data, error } = await supabase.rpc('get_exam_classes', { p_exam_id: examId });
            if (error) throw error;
            if (data) {
                // Map to match expected format: { class_id, grade }
                // The RPC returns classes table rows { id, grade, ... }
                setClasses(data.map((c: any) => ({ class_id: c.id, name: c.name })));
            }
        } catch (err) {
            console.error('Error loading classes:', err);
        }
    };

    const loadResults = async () => {
        setLoading(true);
        try {
            // Using Secure RPC to fetch summary grid
            const { data, error } = await supabase.rpc('get_exam_results_summary', {
                p_school_id: schoolId,
                p_exam_id: selectedExamId,
                p_class_id: selectedClassId
            });

            if (error) throw error;
            setResults(data || []);
        } catch (err) {
            console.error('Error loading results:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleProcessResults = async () => {
        if (!confirm('This will calculate totals and grades for all students in this exam. Continue?')) return;
        setProcessing(true);
        try {
            // Secure RPC for calculation
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

    const viewReportCard = async (studentId: string) => {
        setLoading(true);
        try {
            // Fetch detailed report card via RPC
            const { data, error } = await supabase.rpc('get_student_report_card', {
                p_exam_id: selectedExamId,
                p_student_id: studentId
            });

            if (error) throw error;

            // RPC returns an array (likely 1 row per student) containing the full JSON structure
            if (data && data.length > 0) {
                setSelectedStudent(data[0]);
                setShowReportModal(true);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to load report card.');
        } finally {
            setLoading(false);
        }
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
                        {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
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
                            results.map(student => (
                                <tr key={student.student_id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{student.student_name}</div>
                                        <div className="text-xs text-slate-500">{student.admission_number}</div>
                                    </td>
                                    <td className="px-6 py-4">{student.total_obtained || 0} / {student.total_max || 0}</td>
                                    <td className="px-6 py-4">{Number(student.percentage || 0).toFixed(2)}%</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${student.grade === 'F' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                            }`}>
                                            {student.grade || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => viewReportCard(student.student_id)}
                                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 ml-auto"
                                        >
                                            <Eye className="w-4 h-4" /> View Report
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <ReportCardModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                student={selectedStudent}
            />
        </div>
    );
}

function ReportCardModal({ isOpen, onClose, student }: any) {
    if (!student) return null;

    // Student object comes from get_student_report_card RPC
    // structure: { student_name, admission_number, exam_name, total_obtained, total_max, percentage, grade, subject_details: [...] }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Student Report Card" size="lg">
            <div className="space-y-6" id="printable-report">
                <div className="text-center border-b pb-4">
                    <h2 className="text-xl font-bold text-slate-900">EduLite High School</h2>
                    <p className="text-slate-500">Official Report Card - {student.exam_name}</p>
                </div>

                <div className="flex justify-between text-sm">
                    <div>
                        <p className="text-slate-500">Student Name</p>
                        <p className="font-bold text-slate-900">{student.student_name}</p>
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
                        {student.subject_details?.map((detail: any, idx: number) => (
                            <tr key={idx}>
                                <td className="border border-slate-200 px-4 py-2 font-medium">{detail.subject_name}</td>
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
                            <td className="border border-slate-200 px-4 py-2 text-center">{student.total_max}</td>
                            <td className="border border-slate-200 px-4 py-2 text-center">{student.total_obtained}</td>
                            <td className="border border-slate-200 px-4 py-2">
                                {Number(student.percentage).toFixed(2)}% ({student.grade})
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
