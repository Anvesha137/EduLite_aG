import { useState, useEffect } from 'react';
import { Megaphone, BookOpen, DollarSign, Ticket, Bell, ArrowRight, FileText, TrendingUp, Clock, ShieldCheck } from 'lucide-react';
import { useParent } from '../../contexts/ParentContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/helpers';

export function ParentDashboard() {
    const { selectedStudent } = useParent();
    const [stats, setStats] = useState({
        attendance: 0,
        pendingFees: 0,
        openTickets: 0,
        recentGrade: '-'
    });
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (selectedStudent) {
            loadDashboardData();
        }
    }, [selectedStudent]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Fee Summary
            const { data: feeData } = await supabase
                .from('student_fees')
                .select('pending_amount')
                .eq('student_id', selectedStudent.id)
                .maybeSingle();

            // 2. Fetch Open Tickets
            const { count: ticketCount } = await supabase
                .from('service_tickets')
                .select('*', { count: 'exact', head: true })
                .eq('student_id', selectedStudent.id)
                .in('status', ['Open', 'In Progress']);

            // 3. Fetch Recent Announcements
            const { data: announcementData } = await supabase
                .from('announcements')
                .select('*')
                .eq('is_active', true)
                .order('published_at', { ascending: false })
                .limit(3);

            // 4. Fetch Attendance % (Placeholder for now)
            setStats({
                attendance: 94,
                pendingFees: feeData?.pending_amount || 0,
                openTickets: ticketCount || 0,
                recentGrade: 'A+'
            });

            setAnnouncements(announcementData || []);

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="animate-pulse space-y-6">
            <div className="h-48 bg-slate-200 rounded-3xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="h-32 bg-slate-200 rounded-2xl" />
                <div className="h-32 bg-slate-200 rounded-2xl" />
                <div className="h-32 bg-slate-200 rounded-2xl" />
            </div>
        </div>;
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Quick Profile Card */}
            <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 rounded-[2.5rem] shadow-2xl p-8 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>

                <div className="relative flex flex-col md:flex-row items-center gap-8">
                    <div className="relative">
                        <div className="w-32 h-32 bg-white/20 rounded-3xl border-4 border-white/30 p-1 backdrop-blur-sm">
                            {selectedStudent.photo_url ? (
                                <img src={selectedStudent.photo_url} alt={selectedStudent.name} className="w-full h-full rounded-[1.25rem] object-cover" />
                            ) : (
                                <div className="w-full h-full bg-white/10 rounded-[1.25rem] flex items-center justify-center text-4xl font-black">
                                    {selectedStudent.name.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-xl shadow-lg border-2 border-white">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-4xl font-black mb-2 tracking-tight">{selectedStudent.name}</h2>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 items-center opacity-90">
                            <span className="px-4 py-1.5 bg-white/20 rounded-full text-sm font-bold backdrop-blur-sm border border-white/10">
                                Class {selectedStudent.class?.name} - {selectedStudent.section?.name}
                            </span>
                            <span className="px-4 py-1.5 bg-white/20 rounded-full text-sm font-bold backdrop-blur-sm border border-white/10">
                                Roll No: {selectedStudent.roll_no || '08'}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20 text-center min-w-[120px]">
                            <p className="text-[10px] uppercase font-black mb-1 opacity-70 tracking-widest">Attendance</p>
                            <p className="text-4xl font-black">{stats.attendance}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    label="Fees Status"
                    value={stats.pendingFees > 0 ? formatCurrency(stats.pendingFees) : 'All Clear'}
                    sub="Amount Payable"
                    icon={DollarSign}
                    color="amber"
                />
                <StatCard
                    label="Active Tickets"
                    value={stats.openTickets}
                    sub="Support Required"
                    icon={Ticket}
                    color="rose"
                />
                <StatCard
                    label="Latest Result"
                    value={stats.recentGrade}
                    sub="Final Exams"
                    icon={TrendingUp}
                    color="emerald"
                />
                <StatCard
                    label="Recent Attendance"
                    value="Present"
                    sub="Today, 09:15 AM"
                    icon={Clock}
                    color="indigo"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Announcements Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                            <span className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Bell className="w-5 h-5 text-blue-600" />
                            </span>
                            Latest Announcements
                        </h3>
                        <button className="text-blue-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                            View All <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {announcements.map((ann, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-200/50 transition-all group">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center flex-none group-hover:bg-blue-50 transition-colors">
                                        <Megaphone className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                {formatDate(ann.published_at)}
                                            </span>
                                            {ann.priority === 'urgent' && (
                                                <span className="px-3 py-1 bg-red-100 text-red-600 text-[10px] font-black rounded-full uppercase">Urgent</span>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-lg text-slate-900 mb-1 leading-tight">{ann.title}</h4>
                                        <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed">{ann.content}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions Side */}
                <div className="space-y-8">
                    <h3 className="text-2xl font-black text-slate-900">Reports</h3>
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                        <div className="p-4 space-y-2">
                            <ReportItem title="Term 1 Report Card" icon={FileText} date="Oct 2025" />
                            <ReportItem title="Monthly Attendance" icon={Clock} date="Feb 2026" />
                            <ReportItem title="Fee Statement 2026" icon={DollarSign} date="Latest" />
                        </div>
                        <button className="w-full bg-slate-50 py-4 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                            Access Document Vault
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
    const colorClasses: any = {
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    };

    return (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:scale-[1.02] transition-transform">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border ${colorClasses[color]}`}>
                <Icon className="w-6 h-6" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
            <h4 className="text-2xl font-black text-slate-900 mb-1 truncate">{value}</h4>
            <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                <p className="text-xs text-slate-500 font-medium">{sub}</p>
            </div>
        </div>
    );
}

function ReportItem({ title, icon: Icon, date }: any) {
    return (
        <div className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-[1.5rem] transition-colors cursor-pointer group">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-none group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{title}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{date}</p>
            </div>
        </div>
    );
}
