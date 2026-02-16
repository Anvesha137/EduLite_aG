import { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Clock, CheckCircle2, AlertCircle, FileText, Printer, ArrowRight } from 'lucide-react';
import { useParent } from '../../contexts/ParentContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/helpers';

export function ParentFees() {
    const { selectedStudent } = useParent();
    const [feeRecord, setFeeRecord] = useState<any>(null);
    const [installments, setInstallments] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (selectedStudent) {
            loadFeeData();
        }
    }, [selectedStudent]);

    const loadFeeData = async () => {
        try {
            setLoading(true);

            // 1. Fetch main fee record
            const { data: record } = await supabase
                .from('student_fees')
                .select('*')
                .eq('student_id', selectedStudent.id)
                .maybeSingle();

            setFeeRecord(record);

            // 2. Fetch Installments
            const { data: instData } = await supabase
                .from('fee_installments')
                .select('*')
                .eq('student_id', selectedStudent.id)
                .order('due_date');

            setInstallments(instData || []);

            // 3. Fetch Transactions
            if (record) {
                const { data: transData } = await supabase
                    .from('fee_payments')
                    .select('*')
                    .eq('student_fee_id', record.id)
                    .order('payment_date', { ascending: false });

                setTransactions(transData || []);
            }

        } catch (error) {
            console.error('Error loading fee data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="space-y-6 animate-pulse">
            <div className="h-40 bg-slate-200 rounded-[2.5rem]" />
            <div className="h-96 bg-slate-200 rounded-[2.5rem]" />
        </div>;
    }

    if (!feeRecord) {
        return (
            <div className="bg-white rounded-[2.5rem] p-12 text-center border border-slate-100 shadow-xl">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Fee Structure Assigned</h3>
                <p className="text-slate-500">The fee structure for this academic year has not been assigned to {selectedStudent.name}.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Summary Top Card */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 to-transparent"></div>
                <div className="relative">
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Total Outstanding</p>
                    <h2 className="text-5xl font-black mb-1">{formatCurrency(feeRecord.pending_amount)}</h2>
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                        <Clock className="w-4 h-4" />
                        <span>Next Due: Feb 28, 2026</span>
                    </div>
                </div>

                <div className="relative flex flex-wrap justify-center gap-4">
                    <div className="bg-white/10 px-6 py-4 rounded-3xl backdrop-blur-md border border-white/10 text-center">
                        <p className="text-[10px] uppercase font-black mb-1 opacity-70">Paid</p>
                        <p className="text-xl font-black text-emerald-400">{formatCurrency(feeRecord.paid_amount)}</p>
                    </div>
                    <div className="bg-white/10 px-6 py-4 rounded-3xl backdrop-blur-md border border-white/10 text-center">
                        <p className="text-[10px] uppercase font-black mb-1 opacity-70">Total Net</p>
                        <p className="text-xl font-black">{formatCurrency(feeRecord.net_fee)}</p>
                    </div>
                    <button className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-3xl font-black shadow-lg shadow-orange-600/30 transition-all flex items-center gap-2 group">
                        Pay Fees Now <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Installment Breakdown */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-blue-600" />
                        Installment Breakdown
                    </h3>

                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Installment</th>
                                        <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Due Date</th>
                                        <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                        <th className="px-8 py-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {installments.map((inst, idx) => (
                                        <tr key={inst.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <p className="font-bold text-slate-900">Installment {idx + 1}</p>
                                                <p className="text-xs text-slate-500">{inst.installment_name || 'Academic Fee'}</p>
                                            </td>
                                            <td className="px-8 py-6 text-slate-600 font-medium">
                                                {formatDate(inst.due_date)}
                                            </td>
                                            <td className="px-8 py-6 text-right font-black text-slate-900">
                                                {formatCurrency(inst.amount)}
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex justify-center">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight ${inst.paid_amount >= inst.amount
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : inst.paid_amount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                                        }`}>
                                                        {inst.paid_amount >= inst.amount ? 'Paid' : inst.paid_amount > 0 ? 'Partial' : 'Pending'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Recent Payments */}
                <div className="space-y-6">
                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <Clock className="w-6 h-6 text-indigo-600" />
                        History
                    </h3>

                    <div className="space-y-4">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 group">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-xs font-black uppercase text-slate-400 mb-1">{formatDate(tx.payment_date)}</p>
                                        <h4 className="font-black text-lg text-slate-900">{formatCurrency(tx.amount)}</h4>
                                    </div>
                                    <button className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <Printer className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>#{tx.transaction_ref || 'TRX-12345'}</span>
                                    <span className="flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3 text-emerald-500" /> {tx.payment_mode}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {transactions.length === 0 && (
                            <div className="bg-slate-50 rounded-3xl p-8 text-center text-slate-400 italic text-sm">
                                No recent payments found.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
