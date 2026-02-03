import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, CreditCard, User, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../hooks/useSchool';
import { Student } from '../../types/database'; // Adjust path if needed
import { formatDate, formatCurrency } from '../../lib/helpers'; // Assuming helpers exist, if not I'll define local
import { ReceiptModal, StudentFeeData } from './modals/ReceiptModal';

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
    const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Receipt Modal State
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedStudentFee, setSelectedStudentFee] = useState<StudentFeeData | null>(null);
    const [fetchingReceipt, setFetchingReceipt] = useState(false);

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

            // 2. Fetch Transaction History (2-step process for reliability)
            // First get the student_fee_ids for this student
            const { data: feeData, error: feeError } = await supabase
                .from('student_fees')
                .select('id')
                .eq('student_id', studentId);

            if (feeError) throw feeError;

            const feeIds = feeData.map(f => f.id);

            if (feeIds.length > 0) {
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
                        installment:fee_installments (
                            due_date,
                            amount,
                            name:installment_name
                        )
                    `)
                    .in('student_fee_id', feeIds)
                    .order('payment_date', { ascending: false });

                if (transError) throw transError;

                // Map the data
                const formattedTransactions = (transData || []).map((tx: any) => ({
                    id: tx.id,
                    amount: tx.amount,
                    payment_mode: tx.payment_mode,
                    transaction_ref: tx.transaction_ref,
                    payment_date: tx.payment_date,
                    remarks: tx.remarks,
                    student_fee_id: tx.student_fee_id,
                    installment: tx.installment ? {
                        due_date: tx.installment.due_date,
                        amount: tx.installment.amount,
                        fee_head: {
                            name: tx.installment.name || 'Installment'
                        }
                    } : undefined
                }));

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

    const handlePrintReceipt = async (transaction: TransactionHistoryItem) => {
        try {
            setFetchingReceipt(true);

            // We need to fetch the full StudentFeeData for the modal
            // The modal expects specific fields that might not be in the simple 'student_fees' id fetch
            // So we fetch the single fee record details
            const { data: feeData, error } = await supabase
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
                .eq('id', transaction.student_fee_id)
                .single();

            if (error) throw error;

            if (feeData) {
                // Map to StudentFeeData interface
                const feeDetails: StudentFeeData = {
                    id: feeData.id,
                    student_id: feeData.student?.id || feeData.student_id,
                    student_name: feeData.student?.name || 'Unknown',
                    admission_number: feeData.student?.admission_number || 'N/A',
                    class_name: feeData.class?.grade || 'N/A',
                    section_name: feeData.student?.section?.name || '',
                    total_fee: parseFloat(feeData.total_fee),
                    discount_amount: parseFloat(feeData.discount_amount || 0),
                    net_fee: parseFloat(feeData.net_fee),
                    paid_amount: parseFloat(feeData.paid_amount),
                    pending_amount: parseFloat(feeData.pending_amount),
                    status: feeData.status,
                    class_id: feeData.class_id,
                    section_id: feeData.student?.section_id,
                    school_id: feeData.school_id
                };

                setSelectedStudentFee(feeDetails);
                setShowReceiptModal(true);
            }

        } catch (error) {
            console.error('Error fetching receipt details:', error);
            alert('Could not load receipt details.');
        } finally {
            setFetchingReceipt(false);
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
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                                    {typedStudent.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{typedStudent.name}</p>
                                    <p className="text-xs text-slate-500 uppercase">{typedStudent.status}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500">Class</p>
                                    <p className="font-medium text-slate-900">{typedStudent.class?.grade || '-'} {typedStudent.section?.name || ''}</p>
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

                {/* Right Column: Transaction History */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-amber-600" />
                                Fee Transaction History
                            </h3>
                        </div>

                        {transactions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Receipt No</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Fee Head</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Mode</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 text-right">Amount</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {transactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 text-slate-600">{formatDate(tx.payment_date)}</td>
                                                <td className="px-6 py-4 font-medium text-slate-900">
                                                    {tx.transaction_ref || 'N/A'}
                                                    {tx.remarks && <p className="text-xs text-slate-400 font-normal">{tx.remarks}</p>}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    {/* Fallback to installment amount/date if head name missing or just 'Tuition Fee' default */}
                                                    {tx.installment?.fee_head?.name || 'Fee Payment'}
                                                    <span className="block text-xs text-slate-400">
                                                        Due: {tx.installment?.due_date ? formatDate(tx.installment.due_date) : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 capitalize">
                                                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                                                        {tx.payment_mode}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-900 text-right">
                                                    {formatCurrency(tx.amount)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handlePrintReceipt(tx)}
                                                        disabled={fetchingReceipt}
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
                                <p>No transaction history found for this student.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedStudentFee && schoolId && (
                <ReceiptModal
                    isOpen={showReceiptModal}
                    onClose={() => {
                        setShowReceiptModal(false);
                        setSelectedStudentFee(null);
                    }}
                    studentFee={selectedStudentFee}
                    schoolId={schoolId}
                />
            )}
        </div>
    );
}
