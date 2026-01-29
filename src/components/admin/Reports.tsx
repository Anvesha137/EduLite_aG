import { useState, useEffect } from 'react';
import { Download, Calendar, Users, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../hooks/useSchool';

type ReportType = 'attendance' | 'fees' | 'exams' | 'students';

export function Reports() {
  const { schoolId } = useSchool();
  const [selectedReport, setSelectedReport] = useState<ReportType>('attendance');
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (schoolId && startDate && endDate) {
      generateReport();
    }
  }, [selectedReport, startDate, endDate, schoolId]);

  const generateReport = async () => {
    setLoading(true);
    try {
      switch (selectedReport) {
        case 'attendance':
          await generateAttendanceReport();
          break;
        case 'fees':
          await generateFeesReport();
          break;
        case 'exams':
          await generateExamsReport();
          break;
        case 'students':
          await generateStudentsReport();
          break;
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAttendanceReport = async () => {
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select(`
        *,
        students:student_id (
          name, 
          admission_number, 
          class:class_id (grade)
        )
      `)
      .eq('school_id', schoolId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    setReportData(attendanceData || []);

    const totalRecords = attendanceData?.length || 0;
    const presentCount = attendanceData?.filter(a => a.status === 'present').length || 0;
    const absentCount = attendanceData?.filter(a => a.status === 'absent').length || 0;
    const attendanceRate = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : 0;

    setSummary({
      totalRecords,
      presentCount,
      absentCount,
      attendanceRate,
    });
  };

  const generateFeesReport = async () => {
    const { data: feesData } = await supabase
      .from('fee_transactions')
      .select(`
        *,
        students:student_id (name, admission_number),
        installment:installment_id (
          amount,
          fee_head:fee_head_id (name)
        )
      `)
      .eq('school_id', schoolId)
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
      .order('payment_date', { ascending: false });

    // Transform data for display/export
    const processedData = feesData?.map((t: any) => ({
      ...t,
      student_name: t.students?.name,
      admission_number: t.students?.admission_number,
      fee_type: t.installment?.fee_head?.name,
      amount_paid: t.amount,
      payment_date: t.payment_date,
      status: 'paid' // Transactions are always paid if they exist here
    })) || [];

    setReportData(processedData);

    const totalAmount = feesData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const totalTransactions = feesData?.length || 0;

    // For summary, we might want to query fee_installments separately to get pending, 
    // but for now let's show transaction stats.
    setSummary({
      totalAmount,
      totalTransactions,
      avgTransaction: totalTransactions > 0 ? (totalAmount / totalTransactions).toFixed(2) : 0
    });
  };

  const generateExamsReport = async () => {
    const { data: examsData } = await supabase
      .from('marks')
      .select(`
        *,
        students:student_id (name, admission_number),
        exams:exam_id (name, exam_type),
        subjects:subject_id (name)
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    const processedData = examsData?.map((r: any) => ({
      student_name: r.students?.name,
      admission_number: r.students?.admission_number,
      exam_name: r.exams?.name,
      subject: r.subjects?.name,
      marks_obtained: r.marks_obtained,
      max_marks: r.max_marks,
      grade: r.grade,
      date: r.created_at.split('T')[0]
    })) || [];

    setReportData(processedData);

    const totalResults = examsData?.length || 0;
    const avgMarks = totalResults > 0
      ? (examsData?.reduce((sum, r) => sum + (r.marks_obtained || 0), 0) / totalResults).toFixed(2)
      : 0;

    // Simple pass check (assuming grade 'F' or < 33% is fail if no grade)
    const passCount = examsData?.filter(r => {
      if (r.grade) return !['F', 'Fail', 'E'].includes(r.grade);
      return (r.marks_obtained / r.max_marks) >= 0.33;
    }).length || 0;

    const passRate = totalResults > 0 ? ((passCount / totalResults) * 100).toFixed(1) : 0;

    setSummary({
      totalResults,
      avgMarks,
      passCount,
      passRate,
    });
  };

  const generateStudentsReport = async () => {
    const { data: studentsData } = await supabase
      .from('students')
      .select(`
        *,
        classes:class_id (grade),
        sections:section_id (name)
      `)
      .eq('school_id', schoolId)
      .order('name');

    setReportData(studentsData || []);

    const totalStudents = studentsData?.length || 0;
    const activeStudents = studentsData?.filter(s => s.status === 'active').length || 0;
    const inactiveStudents = studentsData?.filter(s => s.status !== 'active').length || 0;

    setSummary({
      totalStudents,
      activeStudents,
      inactiveStudents,
    });
  };

  const downloadReport = () => {
    const headers = Object.keys(reportData[0] || {}).join(',');
    const rows = reportData.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReport}_report_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const reportTypes = [
    { id: 'attendance', name: 'Attendance Report', icon: Users },
    { id: 'fees', name: 'Fee Collection Report', icon: DollarSign },
    { id: 'exams', name: 'Exam Results Report', icon: FileText },
    { id: 'students', name: 'Students Report', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
        {reportData.length > 0 && (
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {reportTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedReport(type.id as ReportType)}
              className={`p-4 rounded-xl border-2 transition-all ${selectedReport === type.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
            >
              <Icon className={`w-6 h-6 mb-2 ${selectedReport === type.id ? 'text-blue-600' : 'text-slate-600'}`} />
              <p className={`text-sm font-medium ${selectedReport === type.id ? 'text-blue-900' : 'text-slate-700'}`}>
                {type.name}
              </p>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-slate-600 mt-4">Generating report...</p>
          </div>
        ) : summary ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(summary).map(([key, value]) => (
                <div key={key} className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600 capitalize mb-1">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {typeof value === 'number' && key.includes('Amount') ? `$${value.toFixed(2)}` : value}
                    {key.includes('Rate') || key.includes('Percentage') ? '%' : ''}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Report Data</h3>
              <div className="overflow-x-auto">
                <p className="text-sm text-slate-600">
                  {reportData.length} records found. Click "Download Report" to export as CSV.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            Select report type and date range to generate report
          </div>
        )}
      </div>
    </div>
  );
}
