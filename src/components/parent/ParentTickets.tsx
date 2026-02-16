import { useState, useEffect } from 'react';
import { Ticket, Plus, MessageSquare, Clock, CheckCircle2, AlertCircle, Send, X } from 'lucide-react';
import { useParent } from '../../contexts/ParentContext';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/helpers';

export function ParentTickets() {
    const { selectedStudent, parent } = useParent();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [newReply, setNewReply] = useState('');
    const [replies, setReplies] = useState<any[]>([]);

    const [newTicket, setNewTicket] = useState({
        category: 'General',
        subject: '',
        description: '',
        priority: 'Medium'
    });

    useEffect(() => {
        if (selectedStudent) {
            loadTickets();
        }
    }, [selectedStudent]);

    useEffect(() => {
        if (selectedTicket) {
            loadReplies();
        }
    }, [selectedTicket]);

    const loadTickets = async () => {
        try {
            setLoading(true);
            const { data } = await supabase
                .from('service_tickets')
                .select('*')
                .eq('student_id', selectedStudent.id)
                .order('created_at', { ascending: false });

            setTickets(data || []);
        } catch (error) {
            console.error('Error loading tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadReplies = async () => {
        const { data } = await supabase
            .from('ticket_replies')
            .select('*')
            .eq('ticket_id', selectedTicket.id)
            .order('created_at', { ascending: true });

        setReplies(data || []);
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data, error } = await supabase
                .from('service_tickets')
                .insert([{
                    ...newTicket,
                    school_id: selectedStudent.school_id,
                    parent_id: parent.id,
                    student_id: selectedStudent.id,
                    status: 'Open'
                }])
                .select()
                .single();

            if (error) throw error;
            setIsCreateModalOpen(false);
            setTickets([data, ...tickets]);
            setNewTicket({ category: 'General', subject: '', description: '', priority: 'Medium' });
        } catch (error) {
            console.error('Error creating ticket:', error);
        }
    };

    const handleSendReply = async () => {
        if (!newReply.trim()) return;
        try {
            const { data, error } = await supabase
                .from('ticket_replies')
                .insert([{
                    ticket_id: selectedTicket.id,
                    sender_id: parent.user_id,
                    sender_role: 'PARENT',
                    message: newReply
                }])
                .select()
                .single();

            if (error) throw error;
            setReplies([...replies, data]);
            setNewReply('');
        } catch (error) {
            console.error('Error sending reply:', error);
        }
    };

    if (loading) {
        return <div className="space-y-6 animate-pulse">
            <div className="h-12 bg-slate-200 rounded-2xl w-1/4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-48 bg-slate-200 rounded-3xl" />
                <div className="h-48 bg-slate-200 rounded-3xl" />
            </div>
        </div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                    <MessageSquare className="w-6 h-6 text-indigo-600" />
                    Support Tickets
                </h3>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 flex items-center gap-2 hover:bg-indigo-700 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    New Request
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tickets.map((ticket) => (
                    <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:scale-[1.02] transition-all cursor-pointer group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${ticket.status === 'Open' ? 'bg-indigo-100 text-indigo-700' :
                                    ticket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                {ticket.status}
                            </span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatDate(ticket.created_at)}</span>
                        </div>
                        <h4 className="font-bold text-lg text-slate-900 mb-2 truncate group-hover:text-indigo-600 transition-colors">{ticket.subject}</h4>
                        <p className="text-slate-500 text-sm line-clamp-2 mb-6 font-medium italic">"{ticket.description}"</p>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                            <span className="text-[10px] font-black uppercase text-slate-400">{ticket.category}</span>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${ticket.priority === 'Urgent' ? 'bg-red-500' :
                                        ticket.priority === 'High' ? 'bg-amber-500' : 'bg-sky-500'
                                    }`}></span>
                                <span className="text-[10px] font-black uppercase text-slate-400">{ticket.priority}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {tickets.length === 0 && (
                    <div className="col-span-full bg-white rounded-[2.5rem] p-20 text-center border border-slate-100 shadow-xl">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Ticket className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No active requests</h3>
                        <p className="text-slate-500 font-medium">Need help? Raise a ticket and we'll get back to you.</p>
                    </div>
                )}
            </div>

            {/* Create Ticket Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                            <h4 className="text-2xl font-black text-slate-900">Raise New Request</h4>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTicket} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Category</label>
                                    <select
                                        value={newTicket.category}
                                        onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option>Academic</option>
                                        <option>Transport</option>
                                        <option>Fee</option>
                                        <option>Technical</option>
                                        <option>General</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Priority</label>
                                    <select
                                        value={newTicket.priority}
                                        onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option>Low</option>
                                        <option>Medium</option>
                                        <option>High</option>
                                        <option>Urgent</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Subject</label>
                                <input
                                    type="text"
                                    required
                                    value={newTicket.subject}
                                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                                    placeholder="Brief summary of your request"
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Description</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={newTicket.description}
                                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                                    placeholder="Provide detailed information..."
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                />
                            </div>
                            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all">
                                Submit Request
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Ticket Detail Sidebar/Drawer (Simplified) */}
            {selectedTicket && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h4 className="text-xl font-black text-slate-900 mb-1">{selectedTicket.subject}</h4>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">#{selectedTicket.id.slice(0, 8)} • {selectedTicket.category}</p>
                            </div>
                            <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-white rounded-xl shadow-sm border border-slate-200">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                                <p className="text-indigo-800 font-medium italic">"{selectedTicket.description}"</p>
                                <p className="text-[10px] font-black uppercase text-indigo-400 mt-4 text-right">Original Message • {formatDate(selectedTicket.created_at)}</p>
                            </div>

                            <div className="space-y-6">
                                {replies.map((reply) => (
                                    <div key={reply.id} className={`flex ${reply.sender_role === 'PARENT' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-5 rounded-3xl shadow-sm ${reply.sender_role === 'PARENT'
                                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                                : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                                            }`}>
                                            <p className="text-sm font-medium">{reply.message}</p>
                                            <p className={`text-[9px] font-black uppercase mt-2 opacity-60 ${reply.sender_role === 'PARENT' ? 'text-white' : 'text-slate-400'}`}>
                                                {reply.sender_role === 'PARENT' ? 'You' : 'Admin'} • {formatDate(reply.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                            <div className="relative">
                                <textarea
                                    rows={2}
                                    value={newReply}
                                    onChange={(e) => setNewReply(e.target.value)}
                                    placeholder="Type your message..."
                                    className="w-full pl-6 pr-16 py-4 bg-white border border-slate-200 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm resize-none"
                                />
                                <button
                                    onClick={handleSendReply}
                                    disabled={!newReply.trim()}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
