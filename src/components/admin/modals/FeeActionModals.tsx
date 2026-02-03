import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { formatCurrency, formatDate } from '../../../lib/helpers';
import { Modal } from '../../Modal';
import { StudentFeeData } from './ReceiptModal';
import { CheckCircle } from 'lucide-react';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentFee: StudentFeeData;
    onSave: () => void;
    schoolId: string;
    userId: string;
}

export function PaymentModal({ isOpen, onClose, studentFee, onSave, schoolId, userId }: PaymentModalProps) {
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
                student_fee_id: studentFee.id,
                amount: paymentAmount,
                payment_mode: paymentMode,
                transaction_ref: transactionRef || null,
                payment_date: new Date().toISOString().split('T')[0],
                paid_by: userId || null,
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

interface InstallmentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentFee: StudentFeeData;
    onPaymentSuccess: () => void;
    schoolId: string;
    userId: string;
}

export function InstallmentsModal({ isOpen, onClose, studentFee, onPaymentSuccess, schoolId, userId }: InstallmentsModalProps) {
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
            setLoading(true);
            const { data, error } = await supabase
                .from('fee_installments')
                .select('*')
                .eq('student_id', studentFee.student_id)
                .eq('academic_year', '2024-25')
                .order('due_date');

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
                student_fee_id: studentFee.id,
                installment_id: installment.id,
                amount: paymentAmount,
                payment_mode: paymentMode,
                transaction_ref: transactionRef || null,
                payment_date: new Date().toISOString().split('T')[0],
                paid_by: userId || null,
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

export function DiscountModal({ isOpen, onClose, studentFee, onSave, schoolId, userId }: DiscountModalProps) {
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
                requested_by: userId || null,
                requested_amount: discountAmount,
                reason: reason,
                status: 'approved',
                reviewed_by: userId || null,
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
                    discount_approved_by: userId || null,
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
