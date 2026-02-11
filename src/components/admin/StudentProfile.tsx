import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, CreditCard, User, Printer, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../hooks/useSchool';
import { Student } from '../../types/database'; // Adjust path if needed
import { formatDate, formatCurrency } from '../../lib/helpers'; // Assuming helpers exist, if not I'll define local
import { ReceiptModal, StudentFeeData } from './modals/ReceiptModal';
import { PaymentModal, InstallmentsModal, DiscountModal } from './modals/FeeActionModals';

// Define types for the transaction history view since it's a join
interface TransactionHistoryItem {
    id: string;
    amount: number;
    payment_mode: string;
    transaction_ref: string | null;
    payment_date: string;
    remarks: string | null;
    student_fee_id: string; // Needed for receipt
    installment?: {
        installment_number?: number;
        due_date: string;
        amount: number;
        fee_head?: {
            name: string;
        };
    };
}

interface StudentProfileProps {
    studentId: string;
    onBack: () => void;
}

export function StudentProfile({ studentId, onBack }: StudentProfileProps) {
    const { schoolId } = useSchool();
    const [student, setStudent] = useState<Student | null>(null);
    const [installments, setInstallments] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Receipt Modal State
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedStudentFee, setSelectedStudentFee] = useState<StudentFeeData | null>(null);
    const [selectedReceiptTx, setSelectedReceiptTx] = useState<TransactionHistoryItem | null>(null);

    // Fee Actions State
    const [userId, setUserId] = useState<string>('');
    const [feeRecord, setFeeRecord] = useState<StudentFeeData | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showInstallmentsModal, setShowInstallmentsModal] = useState(false);
    const [showDiscountModal, setShowDiscountModal] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUserId(user.id);
        });
    }, []);

    useEffect(() => {
        if (studentId && schoolId) {
            loadProfileData();
        }
    }, [studentId, schoolId]);

    const loadProfileData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Student Details with Class, Section, Parent
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('*, class:classes(*), section:sections(*), parent:parents(*)')
                .eq('id', studentId)
                .single();

            if (studentError) throw studentError;
            setStudent(studentData as any);

            // Fetch Installments for this student
            const { data: instData, error: instError } = await supabase
                .from('fee_installments')
                .select('*')
                .eq('student_id', studentId)
                .eq('academic_year', '2024-25')
                .order('due_date');

            if (instError) throw instError;
            setInstallments(instData || []);

            // 2. Fetch Transaction History (2-step process for reliability)
            // 2. Fetch Transaction History and Fee Record
            // Fetch fee record
            const { data: feeData, error: feeError } = await supabase
                .from('student_fees')
                .select('*')
                .eq('student_id', studentId)
                .eq('academic_year', '2024-25')
                .maybeSingle();

            if (feeError) throw feeError;

            // Allow no fee record (maybe new student)

            if (feeData) {
                const mappedFeeRecord: StudentFeeData = {
                    id: feeData.id,
                    student_id: feeData.student_id,
                    student_name: (studentData as any).name,
                    admission_number: (studentData as any).admission_number,
                    class_name: (studentData as any).class?.name || '',
                    section_name: (studentData as any).section?.name || '',
                    total_fee: parseFloat(feeData.total_fee),
                    discount_amount: parseFloat(feeData.discount_amount || 0),
                    net_fee: parseFloat(feeData.net_fee),
                    paid_amount: parseFloat(feeData.paid_amount),
                    pending_amount: parseFloat(feeData.pending_amount),
                    status: feeData.status,
                    class_id: feeData.class_id,
                    section_id: (studentData as any).section_id,
                    school_id: feeData.school_id
                };
                setFeeRecord(mappedFeeRecord);
            }

            if (feeData) {
                const feeIds = [feeData.id];
                const { data: transData, error: transError } = await supabase
                    .from('fee_payments')
                    .select(`
                        id,
                        amount,
                        payment_date,
                        payment_mode,
                        transaction_ref,
                        remarks,
                        student_fee_id,
                        installment_id
                    `)
                    .in('student_fee_id', feeIds)
                    .order('payment_date', { ascending: false });

                if (transError) throw transError;

                // Map the data - Manual Join
                const formattedTransactions = (transData || []).map((tx: any) => {
                    const linkedInst = instData ? instData.find((inst: any) => inst.id === tx.installment_id) : undefined;

                    return {
                        id: tx.id,
                        amount: tx.amount,
                        payment_mode: tx.payment_mode,
                        transaction_ref: tx.transaction_ref,
                        payment_date: tx.payment_date,
                        remarks: tx.remarks,
                        student_fee_id: tx.student_fee_id,
                        installment: linkedInst ? {
                            installment_number: linkedInst.installment_number,
                            due_date: linkedInst.due_date,
                            amount: linkedInst.amount,
                            fee_head: {
                                name: linkedInst.installment_name || 'Installment'
                            }
                        } : undefined
                    };
                });

                setTransactions(formattedTransactions);
            } else {
                setTransactions([]);
            }

        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrintReceipt = (transaction: TransactionHistoryItem) => {
        if (feeRecord) {
            setSelectedStudentFee(feeRecord);
            setSelectedReceiptTx(transaction);
            setShowReceiptModal(true);
        }
    };


    if (loading) {
        return <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>;
    }

    if (!student) {
        return <div className="text-center py-12">Student not found</div>;
    }

    const typedStudent = student as any; // Cast for joined properties

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{typedStudent.name}</h2>
                        <p className="text-slate-500">Admission No: {typedStudent.admission_number}</p>
                    </div>
                </div>

                {feeRecord && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setSelectedStudentFee(feeRecord);
                                setSelectedReceiptTx(null);
                                setShowReceiptModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                            <Printer className="w-4 h-4" />
                            Print Statement
                        </button>
                        {feeRecord.status !== 'paid' && (
                            <button
                                onClick={() => {
                                    setSelectedStudentFee(feeRecord);
                                    setShowPaymentModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                                <DollarSign className="w-4 h-4" />
                                Collect Fee
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setSelectedStudentFee(feeRecord);
                                setShowInstallmentsModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                            <FileText className="w-4 h-4" />
                            Installments
                        </button>
                        {feeRecord.discount_amount === 0 && (
                            <button
                                onClick={() => {
                                    setSelectedStudentFee(feeRecord);
                                    setShowDiscountModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                                <AlertCircle className="w-4 h-4" />
                                Discount
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Personal Info */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600" />
                            Student Details
                        </h3>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                {typedStudent.photo_url ? (
                                    <img
                                        src={typedStudent.photo_url}
                                        alt={typedStudent.name}
                                        className="w-16 h-16 rounded-full object-cover border border-slate-200"
                                    />
                                ) : (
                                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl border border-blue-200">
                                        {typedStudent.name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <p className="font-medium text-slate-900 text-lg">{typedStudent.name}</p>
                                    <p className="text-sm text-slate-500 uppercase font-semibold">{typedStudent.status}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500">Class</p>
                                    <p className="font-medium text-slate-900">{typedStudent.class?.name || '-'} {typedStudent.section?.name || ''}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Gender</p>
                                    <p className="font-medium text-slate-900 capitalize">{typedStudent.gender}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Date of Birth</p>
                                    <p className="font-medium text-slate-900">{formatDate(typedStudent.dob)}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Blood Group</p>
                                    <p className="font-medium text-slate-900">{typedStudent.blood_group || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Admission Date</p>
                                    <p className="font-medium text-slate-900">{formatDate(typedStudent.admission_date)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-emerald-600" />
                            Parent/Guardian Details
                        </h3>
                        {typedStudent.parent ? (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-slate-500">Name</p>
                                    <p className="font-medium text-slate-900">{typedStudent.parent.name}</p>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-700">{typedStudent.parent.phone}</span>
                                </div>
                                {typedStudent.parent.email && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-700">{typedStudent.parent.email}</span>
                                    </div>
                                )}
                                {typedStudent.address && (
                                    <div className="flex items-start gap-2 text-sm pt-2 border-t border-slate-100">
                                        <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                                        <span className="text-slate-700">{typedStudent.address}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 italic">No parent details linked.</p>
                        )}
                    </div>
                </div>

                {/* Right Column: Fee Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Installment Breakdown */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-amber-600" />
                                Installment Breakdown
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Installment</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Due Date</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 text-right">Amount</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 text-right">Paid</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 text-right">Pending</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {installments.map((inst: any, idx: number) => (
                                        <tr key={inst.id || idx}>
                                            <td className="px-6 py-4 text-slate-900">Installment {idx + 1}</td>
                                            <td className="px-6 py-4 text-slate-600">{formatDate(inst.due_date)}</td>
                                            <td className="px-6 py-4 text-right font-medium">{formatCurrency(inst.amount)}</td>
                                            <td className="px-6 py-4 text-right text-green-600">{formatCurrency(inst.paid_amount || 0)}</td>
                                            <td className="px-6 py-4 text-right text-red-600">{formatCurrency((inst.amount || 0) - (inst.paid_amount || 0))}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${(inst.paid_amount || 0) >= inst.amount ? 'bg-green-100 text-green-700' :
                                                    (inst.paid_amount || 0) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {(inst.paid_amount || 0) >= inst.amount ? 'Paid' : (inst.paid_amount || 0) > 0 ? 'Partial' : 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {installments.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-4 text-center text-slate-500">No installments found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-blue-600" />
                                Transaction Details
                            </h3>
                        </div>

                        {transactions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Installment No</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Pay Date</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 text-right">Paid Amount</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 text-center">Mode</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Receipt No</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {transactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 text-slate-900">
                                                    {tx.installment?.fee_head?.name?.includes('Installment')
                                                        ? tx.installment.fee_head.name
                                                        : `Installment ${tx.installment?.installment_number || '-'}`}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">{formatDate(tx.payment_date)}</td>
                                                <td className="px-6 py-4 font-bold text-slate-900 text-right">
                                                    {formatCurrency(tx.amount)}
                                                </td>
                                                <td className="px-6 py-4 text-center capitalize">
                                                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                                                        {tx.payment_mode}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-900">
                                                    {tx.transaction_ref || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handlePrintReceipt(tx)}
                                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                                                        title="Print Receipt"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-slate-500">
                                <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                                <p>No transactions found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedStudentFee && schoolId && (
                <>
                    <ReceiptModal
                        isOpen={showReceiptModal}
                        onClose={() => {
                            setShowReceiptModal(false);
                            setSelectedStudentFee(null);
                            setSelectedReceiptTx(null);
                        }}
                        studentFee={selectedStudentFee}
                        initialTransaction={selectedReceiptTx}
                    />
                    <PaymentModal
                        isOpen={showPaymentModal}
                        onClose={() => {
                            setShowPaymentModal(false);
                            setSelectedStudentFee(null);
                        }}
                        studentFee={selectedStudentFee}
                        onSave={loadProfileData}
                        schoolId={schoolId}
                        userId={userId}
                    />
                    <InstallmentsModal
                        isOpen={showInstallmentsModal}
                        onClose={() => {
                            setShowInstallmentsModal(false);
                            setSelectedStudentFee(null);
                        }}
                        studentFee={selectedStudentFee}
                        onPaymentSuccess={loadProfileData}
                        schoolId={schoolId}
                        userId={userId}
                    />
                    <DiscountModal
                        isOpen={showDiscountModal}
                        onClose={() => {
                            setShowDiscountModal(false);
                            setSelectedStudentFee(null);
                        }}
                        studentFee={selectedStudentFee}
                        onSave={loadProfileData}
                        schoolId={schoolId}
                        userId={userId}
                    />
                </>
            )}
        </div>
    );
}
