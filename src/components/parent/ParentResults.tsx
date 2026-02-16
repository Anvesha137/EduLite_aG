import { useState, useEffect } from 'react';
import { BookOpen, Award, FileDown, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useParent } from '../../contexts/ParentContext';
import { supabase } from '../../lib/supabase';

export function ParentResults() {
    const { selectedStudent } = useParent();
    const [exams, setExams] = useState<any[]>([]);
    const [selectedExam, setSelectedExam] = useState<any | null>(null);
    const [marks, setMarks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (selectedStudent) {
            loadExams();
        }
    }, [selectedStudent]);

    useEffect(() => {
        if (selectedExam) {
            loadMarks();
        }
    }, [selectedExam]);

    const loadExams = async () => {
        try {
            setLoading(true);
            const { data } = await supabase
                .from('exams')
                .select('*')
                .eq('is_published', true)
                .order('start_date', { ascending: false });

            setExams(data || []);
            if (data && data.length > 0) {
                setSelectedExam(data[0]);
            }
        } catch (error) {
            console.error('Error loading exams:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMarks = async () => {
        try {
            const { data } = await supabase
                .from('marks')
                .select('*, subject:subjects(name)')
                .eq('exam_id', selectedExam.id)
                .eq('student_id', selectedStudent.id);

            setMarks(data || []);
        } catch (error) {
            console.error('Error loading marks:', error);
        }
    };

    if (loading) {
        return <div className="animate-pulse space-y-6">
            <div className="h-20 bg-slate-200 rounded-3xl" />
            <div className="h-96 bg-slate-200 rounded-3xl" />
        </div>;
    }

    if (exams.length === 0) {
        return (
            <div className="bg-white rounded-[2.5rem] p-12 text-center border border-slate-100 shadow-xl">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Results Published</h3>
                <p className="text-slate-500">Academic results have not been published for this child yet.</p>
            </div>
        );
    }

    const totalObtained = marks.reduce((sum, m) => sum + (m.marks_obtained || 0), 0);
    const totalMax = marks.reduce((sum, m) => sum + (m.max_marks || 0), 0);
    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '0';

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex bg-white p-2 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                    {exams.map((exam) => (
                        <button
                            key={exam.id}
                            onClick={() => setSelectedExam(exam)}
                            className={`px-6 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${selectedExam?.id === exam.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                    : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            {exam.name}
                        </button>
                    ))}
                </div>

                <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                    <FileDown className="w-5 h-5" />
                    Download Report Card
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Subject</th>
                                    <th className="px-8 py-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Marks</th>
                                    <th className="px-8 py-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Max</th>
                                    <th className="px-8 py-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Grade</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {marks.map((mark) => (
                                    <tr key={mark.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-6 font-bold text-slate-900">{mark.subject?.name}</td>
                                        <td className="px-8 py-6 text-center font-black text-blue-600">{mark.marks_obtained}</td>
                                        <td className="px-8 py-6 text-center text-slate-400 font-medium">{mark.max_marks}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center">
                                                <span className={`w-10 h-10 flex border-2 border-white items-center justify-center rounded-xl font-black shadow-sm ${mark.marks_obtained / mark.max_marks >= 0.8 ? 'bg-emerald-500 text-white' :
                                                        mark.marks_obtained / mark.max_marks >= 0.5 ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                                                    }`}>
                                                    {mark.grade || 'B+'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {marks.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic">Marks not entered for this exam.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">Overall Score</p>
                        <h4 className="text-6xl font-black mb-1">{percentage}%</h4>
                        <p className="text-sm font-bold opacity-90 mb-6">Excellent Performance!</p>

                        <div className="space-y-4 pt-6 border-t border-white/10">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold opacity-70">Total Obtained</span>
                                <span className="font-bold">{totalObtained} / {totalMax}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold opacity-70">Class Rank</span>
                                <span className="font-bold">#04</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl space-y-4">
                        <h5 className="font-black text-slate-900 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            Insights
                        </h5>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                            {selectedStudent.name} has shown significant improvement in Mathematics compared to the previous unit test.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
