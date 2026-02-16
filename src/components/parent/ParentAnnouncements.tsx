import { useState, useEffect } from 'react';
import { Megaphone, Calendar, User, Search, Filter, Bell, BellOff } from 'lucide-react';
import { useParent } from '../../contexts/ParentContext';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/helpers';

export function ParentAnnouncements() {
    const { selectedStudent } = useParent();
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'urgent' | 'school' | 'class'>('all');

    useEffect(() => {
        if (selectedStudent) {
            loadAnnouncements();
        }
    }, [selectedStudent, filter]);

    const loadAnnouncements = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('announcements')
                .select('*')
                .eq('is_active', true)
                .order('published_at', { ascending: false });

            if (filter === 'urgent') {
                query = query.eq('priority', 'urgent');
            }

            const { data } = await query;
            setAnnouncements(data || []);
        } catch (error) {
            console.error('Error loading announcements:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="space-y-6 animate-pulse">
            <div className="h-12 bg-slate-200 rounded-2xl w-1/3" />
            <div className="h-32 bg-slate-200 rounded-[2.5rem]" />
            <div className="h-32 bg-slate-200 rounded-[2.5rem]" />
        </div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                    {(['all', 'urgent', 'school', 'class'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${filter === f ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search updates..."
                        className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
                    />
                </div>
            </div>

            <div className="space-y-6">
                {announcements.map((ann) => (
                    <div key={ann.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden group hover:scale-[1.01] transition-all">
                        <div className={`h-2 w-full ${ann.priority === 'urgent' ? 'bg-red-600' :
                                ann.priority === 'high' ? 'bg-amber-500' : 'bg-blue-600'
                            }`} />
                        <div className="p-8">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center flex-none ${ann.priority === 'urgent' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                    <Megaphone className="w-8 h-8" />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatDate(ann.published_at)}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            <User className="w-3.5 h-3.5" />
                                            Admin Office
                                        </div>
                                        {ann.priority === 'urgent' && (
                                            <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-black rounded-full uppercase tracking-tighter">Immediate Action</span>
                                        )}
                                    </div>

                                    <h4 className="text-2xl font-black text-slate-900 leading-tight">{ann.title}</h4>
                                    <p className="text-slate-500 font-medium leading-relaxed italic">{ann.content}</p>

                                    {ann.attachments && ann.attachments.length > 0 && (
                                        <div className="pt-4 flex gap-4">
                                            <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100 transition-colors">
                                                View Attachment
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {announcements.length === 0 && (
                    <div className="bg-white rounded-[2.5rem] p-20 text-center border border-slate-100 shadow-xl">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <BellOff className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Silence is Golden</h3>
                        <p className="text-slate-500 font-medium tracking-tight">No new announcements found for this filter.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
