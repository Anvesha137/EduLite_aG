import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Trash2, Edit2, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../hooks/useSchool';

interface Expense {
    id: string;
    title: string;
    category: 'Maintenance' | 'Salary' | 'Events' | 'Utilities' | 'Supplies' | 'Other';
    amount: number;
    date: string;
    payment_method: string;
    paid_to: string;
    description: string;
}

export function ExpenseManagement() {
    const { schoolId } = useSchool();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Partial<Expense> | null>(null);

    // Filters
    const [filterCategory, setFilterCategory] = useState<string>('All');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of current month
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (schoolId) {
            fetchExpenses();
        }
    }, [schoolId, filterCategory, dateRange]);

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('expenses')
                .select('*')
                .eq('school_id', schoolId)
                .gte('date', dateRange.start)
                .lte('date', dateRange.end)
                .order('date', { ascending: false });

            if (filterCategory !== 'All') {
                query = query.eq('category', filterCategory);
            }

            const { data, error } = await query;
            if (error) throw error;
            setExpenses(data || []);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingExpense?.title || !editingExpense.amount) return;

        try {
            const payload = {
                ...editingExpense,
                school_id: schoolId,
                created_by: (await supabase.auth.getUser()).data.user?.id
            };

            let error;
            if (editingExpense.id) {
                const { error: updateError } = await supabase.from('expenses').update(payload).eq('id', editingExpense.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase.from('expenses').insert([payload]);
                error = insertError;
            }

            if (error) throw error;

            setShowModal(false);
            setEditingExpense(null);
            fetchExpenses();
        } catch (error) {
            console.error('Error saving expense:', error);
            alert('Failed to save expense: ' + (error as any).message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this expense?')) return;
        try {
            await supabase.from('expenses').delete().eq('id', id);
            fetchExpenses();
        } catch (error) {
            console.error('Error deleting expense:', error);
        }
    };

    const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const categories = ['Maintenance', 'Salary', 'Events', 'Utilities', 'Supplies', 'Other'];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">

            {/* Header & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="text-slate-500 text-sm font-medium mb-2">Total Expenses (Selected Period)</h3>
                    <div className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-red-500" />
                        ₹{totalAmount.toLocaleString()}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="text-slate-500 text-sm font-medium mb-2">Most Recent</h3>
                    <div className="text-lg font-bold text-slate-900 truncate">
                        {expenses[0]?.title || 'No expenses recorded'}
                    </div>
                    <div className="text-sm text-slate-400">
                        {expenses[0]?.date || '-'}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex gap-4 items-center w-full md:w-auto">
                    <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-slate-50">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <input
                            type="date"
                            className="bg-transparent text-sm focus:outline-none"
                            value={dateRange.start}
                            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                        <span className="text-slate-400">-</span>
                        <input
                            type="date"
                            className="bg-transparent text-sm focus:outline-none"
                            value={dateRange.end}
                            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                    </div>
                    <select
                        className="border rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none"
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                    >
                        <option value="All">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <button
                    onClick={() => {
                        setEditingExpense({
                            date: new Date().toISOString().split('T')[0],
                            category: 'Other',
                            payment_method: 'Cash'
                        });
                        setShowModal(true);
                    }}
                    className="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Add Expense
                </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b font-medium text-slate-700">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Title</th>
                            <th className="p-4">Category</th>
                            <th className="p-4">Paid To</th>
                            <th className="p-4">Mode</th>
                            <th className="p-4 text-right">Amount</th>
                            <th className="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr><td colSpan={7} className="p-8 text-center text-slate-500">Loading...</td></tr>
                        ) : expenses.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-slate-500">No expenses found for this period.</td></tr>
                        ) : (
                            expenses.map(exp => (
                                <tr key={exp.id} className="hover:bg-slate-50 group">
                                    <td className="p-4 text-slate-500">{exp.date}</td>
                                    <td className="p-4 font-medium text-slate-900">
                                        {exp.title}
                                        {exp.description && <div className="text-xs text-slate-400 mt-1 truncate max-w-[200px]">{exp.description}</div>}
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                            {exp.category}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-600">{exp.paid_to || '-'}</td>
                                    <td className="p-4 text-slate-500">{exp.payment_method}</td>
                                    <td className="p-4 text-right font-bold text-slate-900">₹{Number(exp.amount).toLocaleString()}</td>
                                    <td className="p-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingExpense(exp); setShowModal(true); }} className="p-1 hover:bg-blue-50 text-blue-600 rounded"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(exp.id)} className="p-1 hover:bg-red-50 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {!loading && expenses.length > 0 && (
                        <tfoot className="bg-slate-50 font-bold text-slate-900 border-t">
                            <tr>
                                <td colSpan={5} className="p-4 text-right">Total</td>
                                <td className="p-4 text-right">₹{totalAmount.toLocaleString()}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Modal */}
            {showModal && editingExpense && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg">{editingExpense.id ? 'Edit Expense' : 'Add New Expense'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Date</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded p-2"
                                        required
                                        value={editingExpense.date}
                                        onChange={e => setEditingExpense({ ...editingExpense, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                                    <input
                                        type="number"
                                        className="w-full border rounded p-2"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={editingExpense.amount}
                                        onChange={e => setEditingExpense({ ...editingExpense, amount: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Title</label>
                                <input
                                    type="text"
                                    className="w-full border rounded p-2"
                                    required
                                    placeholder="e.g. Office Supplies"
                                    value={editingExpense.title || ''}
                                    onChange={e => setEditingExpense({ ...editingExpense, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Category</label>
                                    <select
                                        className="w-full border rounded p-2"
                                        value={editingExpense.category}
                                        onChange={e => setEditingExpense({ ...editingExpense, category: e.target.value as any })}
                                    >
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Payment Method</label>
                                    <select
                                        className="w-full border rounded p-2"
                                        value={editingExpense.payment_method}
                                        onChange={e => setEditingExpense({ ...editingExpense, payment_method: e.target.value })}
                                    >
                                        <option>Cash</option>
                                        <option>Bank Transfer</option>
                                        <option>UPI</option>
                                        <option>Cheque</option>
                                        <option>Card</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Paid To</label>
                                <input
                                    type="text"
                                    className="w-full border rounded p-2"
                                    placeholder="Vendor Name"
                                    value={editingExpense.paid_to || ''}
                                    onChange={e => setEditingExpense({ ...editingExpense, paid_to: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    className="w-full border rounded p-2 h-20"
                                    placeholder="Additional details..."
                                    value={editingExpense.description || ''}
                                    onChange={e => setEditingExpense({ ...editingExpense, description: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Expense</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
