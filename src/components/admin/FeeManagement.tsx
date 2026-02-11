import { useState, useEffect } from 'react';
import { Search, DollarSign, FileText, AlertCircle, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../hooks/useSchool';
import { formatCurrency } from '../../lib/helpers';
import { ReceiptModal, StudentFeeData } from './modals/ReceiptModal';
import { PaymentModal, InstallmentsModal, DiscountModal } from './modals/FeeActionModals';

interface FeeManagementProps {
  onViewProfile?: (studentId: string) => void;
}


export function FeeManagement({ onViewProfile }: FeeManagementProps) {
  const { schoolId, loading: schoolLoading } = useSchool();
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);
  const [studentFees, setStudentFees] = useState<StudentFeeData[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInstallmentsModal, setShowInstallmentsModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedStudentFee, setSelectedStudentFee] = useState<StudentFeeData | null>(null);
  const [currentAcademicYear] = useState('2024-25');

  useEffect(() => {
    if (schoolId) {
      loadData();
    } else if (!schoolLoading && !schoolId) {
      setLoading(false);
    }
  }, [schoolId, schoolLoading, filterClass, filterSection, filterStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classesRes, sectionsRes] = await Promise.all([
        supabase.from('classes').select('*').eq('school_id', schoolId).order('sort_order'),
        supabase.from('sections').select('*').eq('school_id', schoolId),
      ]);

      if (classesRes.data) setClasses(classesRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);

      console.log('Fetching fees for:', { schoolId, currentAcademicYear });

      // 1. Fetch ALL Students (Source of Truth)
      let studentsQuery = supabase
        .from('students')
        .select(`
            id,
            name,
            admission_number,
            class_id,
            section_id,
            section:sections(id, name),
            class:classes(id, name)
        `)
        .eq('school_id', schoolId)
        // .eq('status', 'active') // REMOVED to show all students
        .order('name');

      // 2. Fetch Fee Records
      let feesQuery = supabase
        .from('student_fees')
        .select('*')
        .eq('academic_year', currentAcademicYear)
        .eq('school_id', schoolId);


      if (filterClass) {
        studentsQuery = studentsQuery.eq('class_id', filterClass);
        // We can't easily filter fees by class_id directly if we want to LEFT JOIN in JS, 
        // but performance wise it's better to fetch relevant fees.
        // However, standard fetch is okay for now.
      }

      const [studentsRes, feesRes] = await Promise.all([
        studentsQuery,
        feesQuery
      ]);

      if (studentsRes.error) throw studentsRes.error;
      const allStudents = studentsRes.data || [];
      const allFees = feesRes.data || [];

      // 3. Merge Data (Left Join)
      const formattedData: StudentFeeData[] = allStudents.map((student: any) => {
        const feeRecord = allFees.find((f: any) => f.student_id === student.id);

        if (feeRecord) {
          // Found Fee Record
          return {
            id: feeRecord.id,
            student_id: student.id,
            student_name: student.name,
            admission_number: student.admission_number,
            class_name: student.class?.name || 'N/A', // FIXED: .name not .grade
            section_name: student.section?.name || '',
            total_fee: parseFloat(feeRecord.total_fee),
            discount_amount: parseFloat(feeRecord.discount_amount || 0),
            net_fee: parseFloat(feeRecord.net_fee),
            paid_amount: parseFloat(feeRecord.paid_amount),
            pending_amount: parseFloat(feeRecord.pending_amount),
            status: feeRecord.status,
            class_id: student.class_id,
            section_id: student.section_id,
            school_id: schoolId || undefined,
          };
        } else {
          // Missing Fee Record - Mock it with "No Record" status
          return {
            id: `mock-fee-${student.id}`, // Temporary ID
            student_id: student.id,
            student_name: student.name,
            admission_number: student.admission_number,
            class_name: student.class?.name || 'N/A', // FIXED: .name not .grade
            section_name: student.section?.name || '',
            total_fee: 0,
            discount_amount: 0,
            net_fee: 0,
            paid_amount: 0,
            pending_amount: 0,
            status: 'not_generated', // Custom Status
            class_id: student.class_id,
            section_id: student.section_id,
            school_id: schoolId || undefined,
          };
        }
      });

      console.log('Merged Fee Data:', formattedData);
      setStudentFees(formattedData);

      // Ensure we have some classes for filter if empty
      if (classes.length === 0) {
        setClasses([
          { id: 'mock-c-1', grade: '10' },
          { id: 'mock-c-2', grade: '11' },
          { id: 'mock-c-3', grade: '9' }
        ]);
      }
    } catch (error: any) {
      console.error('Error loading fee data:', error);
      alert('Error loading data: ' + (error.message || JSON.stringify(error)));
    } finally {
      setLoading(false);
    }
  };

  const fixMissingData = async () => {
    if (!confirm('This will Use ADMIN PRIVILEGES to backfill missing fee records. Continue?')) return;

    try {
      setLoading(true);

      console.log('Calling admin backfill RPC...');
      const { data, error } = await supabase.rpc('backfill_missing_fees_v2', {
        p_school_id: schoolId
      });

      if (error) throw error;

      console.log('RPC Result:', data);
      alert(data?.message || 'Process complete.');
      loadData();

    } catch (error: any) {
      console.error('Error fixing data:', error);
      alert('Error fixing data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudentFees = studentFees.filter(fee => {
    const matchesSearch =
      fee.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.admission_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = !filterSection || fee.section_id === filterSection;
    return matchesSearch && matchesSection;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'partially_paid':
        return 'bg-blue-100 text-blue-700';
      case 'overdue':
        return 'bg-red-100 text-red-700';
      case 'not_generated':
        return 'bg-slate-100 text-slate-500 border border-slate-200';
      default:
        return 'bg-amber-100 text-amber-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'partially_paid':
        return 'Partially Paid';
      case 'overdue':
        return 'Overdue';
      case 'not_generated':
        return 'No Record';
      default:
        return 'Unpaid';
    }
  };

  const handleCollectFee = (studentFee: StudentFeeData) => {
    setSelectedStudentFee(studentFee);
    setShowPaymentModal(true);
  };

  const handleViewInstallments = (studentFee: StudentFeeData) => {
    setSelectedStudentFee(studentFee);
    setShowInstallmentsModal(true);
  };

  const handleRequestDiscount = (studentFee: StudentFeeData) => {
    setSelectedStudentFee(studentFee);
    setShowDiscountModal(true);
  };

  const availableSections = filterClass
    ? sections.filter(s => s.class_id === filterClass)
    : sections;

  if (loading) {
    return <div className="text-center py-12">Loading fee data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Fee Management</h2>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">Academic Year: {currentAcademicYear}</p>
          </div>
          <button
            onClick={fixMissingData}
            disabled={loading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-sm font-medium transition-colors"
          >
            Fix Missing Data
          </button>
        </div>
      </div>

      {/* DEBUG DIAGNOSTICS */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4 text-xs font-mono text-amber-900">
        <p><strong>Debug Info:</strong></p>
        <p>School ID: {schoolId || 'NULL'}</p>
        <p>User ID: {userId || 'NULL'}</p>
        <p>Filter Class: {filterClass || 'None'}</p>
        <p>Filter Status: {filterStatus || 'None'}</p>
        <p>Raw Records Found: {studentFees.length}</p>
        <p>First Record School ID: {studentFees[0]?.school_id || 'N/A'}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name or enrollment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterClass}
            onChange={(e) => {
              setFilterClass(e.target.value);
              setFilterSection('');
            }}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            disabled={!filterClass}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
          >
            <option value="">All Sections</option>
            {availableSections.map(section => (
              <option key={section.id} value={section.id}>{section.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Student Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Class</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Section</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Total Fee</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Paid</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Pending</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Discount</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">Status</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudentFees.map((fee) => (
                <tr key={fee.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onViewProfile && onViewProfile(fee.student_id)}
                      className="text-left hover:text-blue-600 transition-colors"
                    >
                      <p className="font-medium text-slate-900">{fee.student_name}</p>
                      <p className="text-sm text-slate-600">{fee.admission_number}</p>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">{fee.class_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-900">{fee.section_name}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">
                    {formatCurrency(fee.total_fee)}
                  </td>
                  <td className="px-6 py-4 text-right text-green-700 font-medium">
                    {formatCurrency(fee.paid_amount)}
                  </td>
                  <td className="px-6 py-4 text-right text-red-700 font-bold">
                    {formatCurrency(fee.pending_amount)}
                  </td>
                  <td className="px-6 py-4 text-right text-blue-700 font-medium">
                    {fee.discount_amount > 0 ? formatCurrency(fee.discount_amount) : '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(fee.status)}`}>
                      {getStatusLabel(fee.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {fee.status !== 'paid' && (
                        <button
                          onClick={() => handleCollectFee(fee)}
                          className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                          title="Collect Fee"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleViewInstallments(fee)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        title="View Installments"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedStudentFee(fee);
                          setShowReceiptModal(true);
                        }}
                        className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg transition-colors"
                        title="Print Receipt"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {fee.discount_amount === 0 && (
                        <button
                          onClick={() => handleRequestDiscount(fee)}
                          className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors"
                          title="Request Discount"
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStudentFees.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No fee records found for the selected filters.
              <br />
              <button
                onClick={fixMissingData}
                className="mt-2 text-blue-600 underline hover:text-blue-800"
              >
                Click here to fix missing data
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedStudentFee && (
        <>
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedStudentFee(null);
            }}
            studentFee={selectedStudentFee}
            onSave={loadData}
            schoolId={schoolId!}
            userId={userId!}
          />
          <InstallmentsModal
            isOpen={showInstallmentsModal}
            onClose={() => {
              setShowInstallmentsModal(false);
              setSelectedStudentFee(null);
            }}
            studentFee={selectedStudentFee}
            onPaymentSuccess={loadData}
            schoolId={schoolId!}
            userId={userId!}
          />
          <DiscountModal
            isOpen={showDiscountModal}
            onClose={() => {
              setShowDiscountModal(false);
              setSelectedStudentFee(null);
            }}
            studentFee={selectedStudentFee}
            onSave={loadData}
            schoolId={schoolId!}
            userId={userId!}
          />
          <ReceiptModal
            isOpen={showReceiptModal}
            onClose={() => {
              setShowReceiptModal(false);
              setSelectedStudentFee(null);
            }}
            studentFee={selectedStudentFee}
          />
        </>
      )}
    </div>
  );
}
