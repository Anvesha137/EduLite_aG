import { useState, useEffect } from 'react';
import { ParentLayout } from './ParentLayout';
import { ParentDashboard } from './ParentDashboard';
import { ParentFees } from './ParentFees';
import { ParentResults } from './ParentResults';
import { ParentAnnouncements } from './ParentAnnouncements';
import { ParentTickets } from './ParentTickets';
import { ParentProfile } from './ParentProfile';
import { useParent } from '../../contexts/ParentContext';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheck, UserCircle, GraduationCap } from 'lucide-react';

type ParentView = 'dashboard' | 'announcements' | 'results' | 'fees' | 'tickets' | 'profile';

export function ParentPortal() {
    const { user } = useAuth();
    const {
        loading,
        parent,
        allParents,
        children: students,
        selectedStudent,
        switchParent,
        switchStudent
    } = useParent();

    const [currentView, setCurrentView] = useState<ParentView>(() => {
        return (localStorage.getItem('parent_portal_view') as ParentView) || 'dashboard';
    });

    useEffect(() => {
        localStorage.setItem('parent_portal_view', currentView);
    }, [currentView]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse">Loading Parent Portal...</p>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        switch (currentView) {
            case 'dashboard':
                return <ParentDashboard />;
            case 'announcements':
                return <ParentAnnouncements />;
            case 'results':
                return <ParentResults />;
            case 'fees':
                return <ParentFees />;
            case 'tickets':
                return <ParentTickets />;
            case 'profile':
                return <ParentProfile />;
            default:
                return <ParentDashboard />;
        }
    };

    const isDemoMode = user?.id === '00000000-0000-0000-0000-000000000004';

    return (
        <ParentLayout currentView={currentView} onViewChange={setCurrentView}>
            {isDemoMode && (
                <div className="mb-8 bg-orange-50 border border-orange-200 p-6 rounded-[2.5rem] flex flex-col lg:flex-row items-center justify-between gap-6 shadow-sm shadow-orange-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-black text-orange-950 text-sm">Demo Access Active</h3>
                            <p className="text-[11px] text-orange-700 font-bold uppercase tracking-widest">Toggle Parents & Students</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
                        {/* Parent Switcher */}
                        <div className="flex items-center gap-3 bg-white/60 p-1.5 pr-4 rounded-2xl border border-orange-100 w-full md:w-auto backdrop-blur-md">
                            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                <UserCircle className="w-4 h-4 text-orange-500" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-orange-400 leading-none mb-1">Select Parent</span>
                                <select
                                    className="bg-transparent text-sm font-black text-orange-950 focus:outline-none min-w-[140px]"
                                    value={parent?.id || ''}
                                    onChange={(e) => switchParent(e.target.value)}
                                >
                                    {allParents.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.relationship})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Student Switcher (Context-aware) */}
                        <div className="flex items-center gap-3 bg-white/60 p-1.5 pr-4 rounded-2xl border border-orange-100 w-full md:w-auto backdrop-blur-md">
                            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                <GraduationCap className="w-4 h-4 text-orange-500" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-orange-400 leading-none mb-1">Select Child</span>
                                <select
                                    className="bg-transparent text-sm font-black text-orange-950 focus:outline-none min-w-[140px]"
                                    value={selectedStudent?.id || ''}
                                    onChange={(e) => switchStudent(e.target.value)}
                                >
                                    {students.length > 0 ? (
                                        students.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))
                                    ) : (
                                        <option value="">No children found</option>
                                    )}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!selectedStudent && !loading ? (
                <div className="bg-white rounded-[2.5rem] p-12 text-center border border-slate-100 shadow-xl max-w-md mx-auto">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">👤</div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Access Restricted</h2>
                    <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">
                        This parent account does not have any active student records linked. {isDemoMode ? 'Try switching to another parent above.' : 'Please contact the school office.'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-200 hover:scale-[1.02] transition-all"
                    >
                        Refresh Connection
                    </button>
                </div>
            ) : renderContent()}
        </ParentLayout>
    );
}
