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

    const processedData = attendanceData?.map((a: any) => ({
      student_name: a.students?.name || 'Unknown',
      admission_number: a.students?.admission_number || 'N/A',
      class: a.students?.class?.grade || 'N/A',
      date: a.date,
      status: a.status,
      remarks: a.remarks || '-'
    })) || [];

    setReportData(processedData);

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
    // 1. Fetch Paid Student Fees for the Table (User Request: "rows for Paid")
    const { data: feesData, error: feesError } = await supabase
      .from('student_fees')
      .select(`
        *,
        student:students(name, admission_number),
        class:classes(grade),
        section:sections(name)
      `)
      .eq('school_id', schoolId)
      .gt('paid_amount', 0) // Show all records with any payment
      .order('updated_at', { ascending: false });

    if (feesError) {
      console.error('Error fetching fees data:', feesError);
    }

    // Process table data
    const processedData = feesData?.map((fee: any) => ({
      student_name: fee.student?.name || 'Unknown',
      admission_number: fee.student?.admission_number || 'N/A',
      class_grade: fee.class?.grade || 'N/A',
      section_name: fee.section?.name || '',
      total_fee: fee.total_fee,
      amount_paid: fee.paid_amount, // Show full paid amount in table
      date: fee.updated_at ? fee.updated_at.split('T')[0] : 'N/A',
      status: 'Paid'
    })) || [];

    setReportData(processedData);

    // 2. Fetch Fee Transactions to calculate accurate Total Amount, Total Transactions, Avg Transaction
    const { data: transactionsData, error: txError } = await supabase
      .from('fee_payments')
      .select('amount, payment_date')
      .eq('school_id', schoolId)
      .gte('payment_date', startDate)
      .lte('payment_date', endDate);

    if (txError) {
      console.error('Error fetching transactions:', txError);
    }

    const totalAmount = transactionsData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const totalTransactions = transactionsData?.length || 0;
    const avgTransaction = totalTransactions > 0 ? (totalAmount / totalTransactions).toFixed(2) : 0;

    setSummary({
      totalAmount,
      totalTransactions,
      avgTransaction
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

    const processedData = studentsData?.map((s: any) => ({
      name: s.name,
      admission_number: s.admission_number,
      class: s.classes?.grade || 'N/A',
      section: s.sections?.name || 'N/A',
      parent_name: s.parent?.name || 'N/A',
      status: s.status,
      admission_date: s.admission_date
    })) || [];

    setReportData(processedData);

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
              {Object.entries(summary).map(([key, value]) => {
                let displayValue: React.ReactNode = value as React.ReactNode;
                let label = key.replace(/([A-Z])/g, ' $1').trim();

                if (typeof value === 'number') {
                  if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('avg')) {
                    displayValue = `$${value.toFixed(2)}`;
                  } else if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('percentage')) {
                    displayValue = `${value}%`;
                  } else {
                    displayValue = value.toString();
                  }
                }

                return (
                  <div key={key} className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-600 capitalize mb-1">
                      {label}
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {displayValue}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Report Data: {selectedReport.charAt(0).toUpperCase() + selectedReport.slice(1)}</h3>

              <div className="overflow-x-auto">
                {selectedReport === 'fees' ? (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-medium">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Admission No</th>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3 text-right">Total Fee</th>
                        <th className="px-4 py-3 text-right">Paid Amount</th>
                        <th className="px-4 py-3 text-center">Date</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">{row.student_name}</td>
                          <td className="px-4 py-3 text-slate-600">{row.admission_number}</td>
                          <td className="px-4 py-3 text-slate-600">{row.class_grade} {row.section_name && `(${row.section_name})`}</td>
                          <td className="px-4 py-3 text-right text-slate-900 font-medium">${row.total_fee}</td>
                          <td className="px-4 py-3 text-right text-green-700 font-bold">${row.amount_paid}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{row.date}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  // Default/Other Reports table fallback (Attendance, Exams, Students)
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-medium">
                      <tr>
                        {/* Auto-generate headers provided data is consistent */}
                        {Object.keys(reportData[0] || {}).slice(0, 6).map(key => (
                          <th key={key} className="px-4 py-3">{key.replace(/_/g, ' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          {Object.values(row).slice(0, 6).map((val: any, vIdx) => (
                            <td key={vIdx} className="px-4 py-3 text-slate-700">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {reportData.length === 0 && (
                  <div className="text-center py-8 text-slate-500">No records found.</div>
                )}
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
