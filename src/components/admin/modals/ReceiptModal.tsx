import { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
import { Modal } from '../../Modal';
import { supabase } from '../../../lib/supabase';
import { formatCurrency } from '../../../lib/helpers';

export interface StudentFeeData {
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
    school_id?: string;
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

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentFee: StudentFeeData;
    initialTransaction?: any;
}

export function ReceiptModal({ isOpen, onClose, studentFee, initialTransaction }: ReceiptModalProps) {
    const [installments, setInstallments] = useState<InstallmentData[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // New state for single receipt printing
    const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
    const [view, setView] = useState<'summary' | 'receipt'>('summary');

    useEffect(() => {
        if (isOpen) {
            if (studentFee) {
                fetchData();
            }
            if (initialTransaction) {
                setSelectedTransaction(initialTransaction);
                setView('receipt');
            } else {
                setView('summary');
                setSelectedTransaction(null);
            }
        } else {
            // Reset view when closed
            setView('summary');
            setSelectedTransaction(null);
        }
    }, [isOpen, studentFee, initialTransaction]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch Installments
            const { data: instData, error: instError } = await supabase
                .from('fee_installments')
                .select('*')
                .eq('student_id', studentFee.student_id)
                .eq('academic_year', '2024-25')
                .order('due_date');

            if (instError) throw instError;
            setInstallments(instData || []);

            // Fetch Transactions (Payments)
            const { data: transData, error: transError } = await supabase
                .from('fee_payments')
                .select(`
                    *,
                    installment_id
                `)
                .eq('student_fee_id', studentFee.id)
                .order('payment_date', { ascending: false });

            if (transError) throw transError;

            // Manual Join with Installments (instData)
            const formattedTransactions = (transData || []).map((tx: any) => {
                const linkedInst = (instData || []).find((i: any) => i.id === tx.installment_id);
                return {
                    ...tx,
                    installment: linkedInst ? {
                        installment_number: linkedInst.installment_number,
                        installment_name: linkedInst.installment_name,
                        due_date: linkedInst.due_date,
                        status: linkedInst.status
                    } : undefined
                };
            });

            setTransactions(formattedTransactions);

        } catch (err) {
            console.error('Error fetching data for receipt:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrintSingle = (transaction: any) => {
        setSelectedTransaction(transaction);
        setView('receipt');
    };

    // View: Single Receipt
    if (view === 'receipt' && selectedTransaction) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title={`Payment Receipt - ${selectedTransaction.transaction_ref || 'N/A'}`} size="lg">
                <div className="space-y-6">
                    <div className="border-b border-slate-200 pb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">Payment Receipt</h3>
                                <p className="text-sm text-slate-500">Date: {new Date(selectedTransaction.payment_date).toLocaleDateString('en-IN')}</p>
                                <p className="text-sm text-slate-500">Receipt No: {selectedTransaction.transaction_ref || 'PENDING'}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-slate-900">{studentFee.student_name}</p>
                                <p className="text-sm text-slate-500">ADM: {studentFee.admission_number}</p>
                                <p className="text-sm text-slate-500">Class: {studentFee.class_name} - {studentFee.section_name}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 text-center">
                        <p className="text-slate-500 mb-1">Amount Paid</p>
                        <p className="text-3xl font-bold text-slate-900">{formatCurrency(selectedTransaction.amount)}</p>
                        <div className="mt-4 flex justify-center gap-4 text-sm">
                            <span className="px-3 py-1 bg-white rounded border border-slate-200 text-slate-600 capitalize">
                                Mode: {selectedTransaction.payment_mode}
                            </span>
                            <span className="px-3 py-1 bg-white rounded border border-slate-200 text-slate-600">
                                For: {selectedTransaction.installment?.installment_name || 'General Fee'}
                            </span>
                        </div>
                    </div>

                    {/* Footer / Auth Signature Area */}
                    <div className="pt-12 mt-8 border-t border-slate-200 flex justify-between items-end text-sm text-slate-500">
                        <div>
                            <p>Generated on {new Date().toLocaleDateString('en-IN')}</p>
                        </div>
                        <div className="text-right">
                            <div className="h-12 w-32 border-b border-slate-300 mb-2"></div>
                            <p>Authorized Signature</p>
                        </div>
                    </div>

                    <div className="flex justify-between gap-3 pt-4 no-print">
                        <button
                            onClick={() => {
                                setView('summary');
                                setSelectedTransaction(null);
                            }}
                            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Back to Summary
                        </button>
                        <div className="flex gap-3">
                            <button
                                onClick={() => window.print()}
                                className="px-4 py-2 bg-slate-800 text-white rounded-lg flex items-center gap-2 hover:bg-slate-900"
                            >
                                <Printer className="w-4 h-4" />
                                Print Receipt
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        );
    }

    // View: Summary (Default)
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Fee Statement - ${studentFee.student_name}`} size="lg">
            <div className="space-y-6">
                <div className="border-b border-slate-200 pb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">Fee Statement</h3>
                            <p className="text-sm text-slate-500">Date: {new Date().toLocaleDateString('en-IN')}</p>
                            <p className="text-sm text-slate-500">Academic Year: 2024-25</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-slate-900">{studentFee.student_name}</p>
                            <p className="text-sm text-slate-500">ADM: {studentFee.admission_number}</p>
                            <p className="text-sm text-slate-500">Class: {studentFee.class_name} - {studentFee.section_name}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="font-semibold text-sm text-slate-900 mb-3">Payment Summary</h4>
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

                {/* Installments Breakdown */}
                <div>
                    <h4 className="font-semibold text-sm text-slate-900 mb-3">Installment Breakdown</h4>
                    {loading ? (
                        <p className="text-xs text-slate-500">Loading details...</p>
                    ) : (
                        <div className="overflow-hidden border border-slate-200 rounded-lg">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Installment</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Paid</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Pending</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {installments.map((inst, idx) => (
                                        <tr key={inst.id || idx}>
                                            <td className="px-4 py-2 text-sm text-slate-900">Installment {idx + 1}</td>
                                            <td className="px-4 py-2 text-sm text-slate-600">{new Date(inst.due_date).toLocaleDateString('en-IN')}</td>
                                            <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(inst.amount)}</td>
                                            <td className="px-4 py-2 text-sm text-right text-green-600">{formatCurrency(inst.paid_amount || 0)}</td>
                                            <td className="px-4 py-2 text-sm text-right text-red-600">{formatCurrency((inst.amount || 0) - (inst.paid_amount || 0))}</td>
                                            <td className="px-4 py-2 text-sm text-center">
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
                                            <td colSpan={6} className="px-4 py-4 text-center text-sm text-slate-500">No installments found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Transaction Details */}
                <div>
                    <h4 className="font-semibold text-sm text-slate-900 mb-3">Transaction Details</h4>
                    {loading ? (
                        <p className="text-xs text-slate-500">Loading details...</p>
                    ) : (
                        <div className="overflow-hidden border border-slate-200 rounded-lg">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Installment No</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Pay Date</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Paid Amount</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase">Mode</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Receipt No</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {transactions.map((trans, idx) => (
                                        <tr key={trans.id || idx}>
                                            <td className="px-4 py-2 text-sm text-slate-900">
                                                {trans.installment?.installment_number ? `Installment ${trans.installment.installment_number}` : 'General'}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-slate-600">{new Date(trans.payment_date).toLocaleDateString('en-IN')}</td>
                                            <td className="px-4 py-2 text-sm text-right font-bold text-slate-900">{formatCurrency(trans.amount)}</td>
                                            <td className="px-4 py-2 text-sm text-center capitalize">{trans.payment_mode}</td>
                                            <td className="px-4 py-2 text-sm text-slate-600">{trans.transaction_ref || '-'}</td>
                                            <td className="px-4 py-2 text-sm text-center">
                                                <button
                                                    onClick={() => handlePrintSingle(trans)}
                                                    className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                                                    title="Print Receipt"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-4 text-center text-sm text-slate-500">No transactions found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 no-print">
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-slate-800 text-white rounded-lg flex items-center gap-2 hover:bg-slate-900"
                    >
                        <Printer className="w-4 h-4" />
                        Print Statement
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}
