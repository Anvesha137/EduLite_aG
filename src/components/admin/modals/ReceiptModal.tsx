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
    schoolId: string;
}

export function ReceiptModal({ isOpen, onClose, studentFee, schoolId }: ReceiptModalProps) {
    const [installments, setInstallments] = useState<InstallmentData[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && studentFee) {
            fetchData();
        }
    }, [isOpen, studentFee]);

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
                    installment:fee_installments (
                        installment_number,
                        installment_name,
                        due_date,
                        status
                    )
                `)
                .eq('student_fee_id', studentFee.id)
                .order('payment_date', { ascending: false });

            if (transError) throw transError;
            setTransactions(transData || []);

        } catch (err) {
            console.error('Error fetching data for receipt:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Fee Receipt - ${studentFee.student_name}`} size="lg">
            <div className="space-y-6">
                <div className="border-b border-slate-200 pb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">Fee Receipt</h3>
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
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-4 text-center text-sm text-slate-500">No transactions found</td>
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
                        Print
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
