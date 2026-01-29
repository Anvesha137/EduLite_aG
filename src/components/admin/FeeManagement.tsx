import { useState, useEffect } from 'react';
import { Search, DollarSign, FileText, CheckCircle, AlertCircle, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../hooks/useSchool';
import { formatCurrency, formatDate } from '../../lib/helpers';
import { Modal } from '../Modal';

interface StudentFeeData {
  id: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  class_name: string;
  section_name: string;
  total_fee: number;
  discount_amount: number;
  net_fee: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
  class_id: string;
  section_id: string;
  school_id?: string; // DEBUG FIELD
}

interface InstallmentData {
  id: string;
  installment_number: number;
  installment_name: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
}

export function FeeManagement() {
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
        supabase.from('classes').select('*').eq('school_id', schoolId).order('grade_order'),
        supabase.from('sections').select('*').eq('school_id', schoolId),
      ]);

      if (classesRes.data) setClasses(classesRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);

      console.log('Fetching fees for:', { schoolId, currentAcademicYear });

      let query = supabase
        .from('student_fees')
        .select(`
          *,
          student:students(
            id,
            name,
            admission_number,
            class_id,
            section_id,
            section:sections(id, name)
          ),
          class:classes(id, grade)
        `)
        .eq('academic_year', currentAcademicYear);
      // .eq('school_id', schoolId) // DEBUG: Removed filter to find where data is


      if (filterClass) {
        query = query.eq('class_id', filterClass);
      }
      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }

      const { data: feesData, error } = await query;

      if (error) {
        console.error('Error fetching fees:', error);
        throw error;
      }

      console.log('Raw Fees Data:', feesData);

      const formattedData: StudentFeeData[] = (feesData || []).map((fee: any) => ({
        id: fee.id,
        student_id: fee.student?.id || fee.student_id,
        student_name: fee.student?.name || 'Unknown Student',
        admission_number: fee.student?.admission_number || 'N/A',
        class_name: fee.class?.grade || 'N/A',
        section_name: fee.student?.section?.name || '',
        total_fee: parseFloat(fee.total_fee),
        discount_amount: parseFloat(fee.discount_amount || 0),
        net_fee: parseFloat(fee.net_fee),
        paid_amount: parseFloat(fee.paid_amount),
        pending_amount: parseFloat(fee.pending_amount),
        status: fee.status,
        class_id: fee.class_id,
        section_id: fee.student?.section_id,
        school_id: fee.school_id, // Map for debug
      }));

      setStudentFees(formattedData);

      // Ensure we have some classes for filter if empty
      if (classes.length === 0) {
        setClasses([
          { id: 'mock-c-1', grade: '10' },
          { id: 'mock-c-2', grade: '11' },
          { id: 'mock-c-3', grade: '9' }
        ]);
      }
    } catch (error) {
      console.error('Error loading fee data:', error);
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
              <option key={cls.id} value={cls.id}>{cls.grade}</option>
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
                    <p className="font-medium text-slate-900">{fee.student_name}</p>
                    <p className="text-sm text-slate-600">{fee.admission_number}</p>
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
              No fee records found for the selected filters
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
            schoolId={schoolId!}
          />
        </>
      )}
    </div>
  );
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentFee: StudentFeeData;
  onSave: () => void;
  schoolId: string;
  userId: string;
}

function PaymentModal({ isOpen, onClose, studentFee, onSave, schoolId, userId }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [transactionRef, setTransactionRef] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const paymentAmount = parseFloat(amount);

      if (paymentAmount > studentFee.pending_amount) {
        alert(`Payment amount cannot exceed pending amount of ${formatCurrency(studentFee.pending_amount)}`);
        return;
      }

      const paymentData = {
        school_id: schoolId,
        // student_id: studentFee.student_id, // REMOVED: Not in schema
        student_fee_id: studentFee.id,
        amount: paymentAmount,
        payment_mode: paymentMode,
        transaction_ref: transactionRef || null,
        payment_date: new Date().toISOString().split('T')[0],
        paid_by: userId || null, // Sanitize UUID
        remarks: remarks || null,
      };

      const { error } = await supabase.from('fee_payments').insert(paymentData);
      if (error) throw error;

      alert('Payment collected successfully!');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error collecting payment:', error);
      alert('Failed to collect payment: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Collect Fee - ${studentFee.student_name}`}>
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-600">Total Fee:</p>
            <p className="font-bold text-slate-900">{formatCurrency(studentFee.total_fee)}</p>
          </div>
          <div>
            <p className="text-slate-600">Paid:</p>
            <p className="font-bold text-green-700">{formatCurrency(studentFee.paid_amount)}</p>
          </div>
          <div>
            <p className="text-slate-600">Discount:</p>
            <p className="font-bold text-blue-700">{formatCurrency(studentFee.discount_amount)}</p>
          </div>
          <div>
            <p className="text-slate-600">Pending:</p>
            <p className="font-bold text-red-700">{formatCurrency(studentFee.pending_amount)}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Amount *</label>
          <input
            type="number"
            required
            min="0"
            max={studentFee.pending_amount}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Payment Mode *</label>
          <select
            required
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
            <option value="online">Online</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Transaction Reference</label>
          <input
            type="text"
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            placeholder="Cheque no / Transaction ID"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Processing...' : 'Collect Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface InstallmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentFee: StudentFeeData;
  onPaymentSuccess: () => void;
  schoolId: string;
  userId: string;
}

function InstallmentsModal({ isOpen, onClose, studentFee, onPaymentSuccess, schoolId, userId }: InstallmentsModalProps) {
  const [installments, setInstallments] = useState<InstallmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstallment, setSelectedInstallment] = useState<InstallmentData | null>(null);
  const [showPayInstallmentModal, setShowPayInstallmentModal] = useState(false);

  useEffect(() => {
    if (isOpen && studentFee) {
      loadInstallments();
    }
  }, [isOpen, studentFee]);

  const loadInstallments = async () => {
    try {
      const { data, error } = await supabase
        .from('student_fee_installments_v2')
        .select('*')
        .eq('student_fee_id', studentFee.id)
        .order('installment_number');

      if (error) throw error;
      setInstallments(data || []);
    } catch (error) {
      console.error('Error loading installments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayInstallment = (installment: InstallmentData) => {
    setSelectedInstallment(installment);
    setShowPayInstallmentModal(true);
  };

  const getInstallmentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'partially_paid':
        return 'bg-blue-100 text-blue-700';
      case 'overdue':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-amber-100 text-amber-700';
    }
  };

  return (
    <>
      <Modal isOpen={isOpen && !showPayInstallmentModal} onClose={onClose} title={`Installments - ${studentFee.student_name}`} size="lg">
        {loading ? (
          <div className="text-center py-8">Loading installments...</div>
        ) : installments.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No installments configured for this student
          </div>
        ) : (
          <div className="space-y-3">
            {installments.map((installment) => (
              <div
                key={installment.id}
                className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-slate-900">{installment.installment_name}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getInstallmentStatusColor(installment.status)}`}>
                        {installment.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-slate-600">Due Date:</p>
                        <p className="font-medium text-slate-900">{formatDate(installment.due_date)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Amount:</p>
                        <p className="font-medium text-slate-900">{formatCurrency(installment.amount)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Paid:</p>
                        <p className="font-medium text-green-700">{formatCurrency(installment.paid_amount)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Pending:</p>
                        <p className="font-medium text-red-700">{formatCurrency(installment.pending_amount)}</p>
                      </div>
                    </div>
                  </div>
                  {installment.status !== 'paid' && (
                    <button
                      onClick={() => handlePayInstallment(installment)}
                      className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Pay Now
                    </button>
                  )}
                  {installment.status === 'paid' && (
                    <div className="ml-4 flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Paid</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {selectedInstallment && (
        <InstallmentPaymentModal
          isOpen={showPayInstallmentModal}
          onClose={() => {
            setShowPayInstallmentModal(false);
            setSelectedInstallment(null);
          }}
          installment={selectedInstallment}
          studentFee={studentFee}
          onSuccess={() => {
            setShowPayInstallmentModal(false);
            setSelectedInstallment(null);
            loadInstallments();
            onPaymentSuccess();
          }}
          schoolId={schoolId}
          userId={userId}
        />
      )}
    </>
  );
}

interface InstallmentPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: InstallmentData;
  studentFee: StudentFeeData;
  onSuccess: () => void;
  schoolId: string;
  userId: string;
}

function InstallmentPaymentModal({ isOpen, onClose, installment, studentFee, onSuccess, schoolId, userId }: InstallmentPaymentModalProps) {
  const [amount, setAmount] = useState(installment.pending_amount.toString());
  const [paymentMode, setPaymentMode] = useState('cash');
  const [transactionRef, setTransactionRef] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const paymentAmount = parseFloat(amount);

      if (paymentAmount > installment.pending_amount) {
        alert(`Payment amount cannot exceed pending amount of ${formatCurrency(installment.pending_amount)}`);
        return;
      }

      const paymentData = {
        school_id: schoolId,
        // student_id: studentFee.student_id, // REMOVED: Not in schema
        student_fee_id: studentFee.id,
        installment_id: installment.id,
        amount: paymentAmount,
        payment_mode: paymentMode,
        transaction_ref: transactionRef || null,
        payment_date: new Date().toISOString().split('T')[0],
        paid_by: userId || null, // Fix column name and Sanitize UUID
        remarks: remarks || null,
      };

      const { error } = await supabase.from('fee_payments').insert(paymentData);
      if (error) throw error;

      alert('Installment payment collected successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error collecting payment:', error);
      alert('Failed to collect payment: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Pay ${installment.installment_name}`}>
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-slate-600">Due Date:</p>
            <p className="font-bold text-slate-900">{formatDate(installment.due_date)}</p>
          </div>
          <div>
            <p className="text-slate-600">Amount:</p>
            <p className="font-bold text-slate-900">{formatCurrency(installment.amount)}</p>
          </div>
          <div>
            <p className="text-slate-600">Pending:</p>
            <p className="font-bold text-red-700">{formatCurrency(installment.pending_amount)}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Amount *</label>
          <input
            type="number"
            required
            min="0"
            max={installment.pending_amount}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Payment Mode *</label>
          <select
            required
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
            <option value="online">Online</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Transaction Reference</label>
          <input
            type="text"
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            placeholder="Cheque no / Transaction ID"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Processing...' : 'Collect Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentFee: StudentFeeData;
  onSave: () => void;
  schoolId: string;
  userId: string;
}

function DiscountModal({ isOpen, onClose, studentFee, onSave, schoolId, userId }: DiscountModalProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const discountAmount = parseFloat(amount);

      if (discountAmount >= studentFee.total_fee) {
        alert('Discount amount must be less than total fee');
        return;
      }

      const discountData = {
        school_id: schoolId,
        student_fee_id: studentFee.id,
        student_id: studentFee.student_id,
        requested_by: userId || null, // Sanitize UUID
        requested_amount: discountAmount,
        reason: reason,
        status: 'approved',
        reviewed_by: userId || null, // Sanitize UUID
        reviewed_at: new Date().toISOString(),
        review_comments: 'Auto-approved by admin',
      };

      const { error: discountError } = await supabase.from('fee_discount_approvals').insert(discountData);
      if (discountError) throw discountError;

      const { error: updateError } = await supabase
        .from('student_fees')
        .update({
          discount_amount: discountAmount,
          discount_reason: reason,
          discount_approved_by: userId || null, // Sanitize UUID
          discount_approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentFee.id);

      if (updateError) throw updateError;

      alert('Discount approved successfully!');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error approving discount:', error);
      alert('Failed to approve discount: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Request Discount - ${studentFee.student_name}`}>
      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-600">Total Fee:</p>
            <p className="font-bold text-slate-900">{formatCurrency(studentFee.total_fee)}</p>
          </div>
          <div>
            <p className="text-slate-600">Current Discount:</p>
            <p className="font-bold text-blue-700">{formatCurrency(studentFee.discount_amount)}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Discount Amount *</label>
          <input
            type="number"
            required
            min="0"
            max={studentFee.total_fee - 1}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Reason *</label>
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Enter reason for discount..."
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Approving...' : 'Approve Discount'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentFee: StudentFeeData;
  schoolId: string;
}

function ReceiptModal({ isOpen, onClose, studentFee, schoolId }: ReceiptModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Fee Receipt - ${studentFee.student_name}`} size="lg">
      <div className="space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Fee Receipt</h3>
              <p className="text-sm text-slate-500">Date: {new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-900">{studentFee.student_name}</p>
              <p className="text-sm text-slate-500">ADM: {studentFee.admission_number}</p>
              <p className="text-sm text-slate-500">Class: {studentFee.class_name} - {studentFee.section_name}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Fee Applicable</span>
              <span className="font-medium">{formatCurrency(studentFee.total_fee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total Paid</span>
              <span className="font-medium text-green-700">{formatCurrency(studentFee.paid_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Discount</span>
              <span className="font-medium text-blue-700">{formatCurrency(studentFee.discount_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Balance Due</span>
              <span className="font-medium text-red-700">{formatCurrency(studentFee.pending_amount)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 no-print">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg flex items-center gap-2 hover:bg-slate-900"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
