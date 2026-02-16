import { ReactNode, useState } from 'react';
import { LogOut, Menu, X, LayoutDashboard, Megaphone, BookOpen, DollarSign, Ticket, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useParent } from '../../contexts/ParentContext';
import { ChildSwitcher } from './ChildSwitcher';

interface ParentLayoutProps {
    children: ReactNode;
    currentView: string;
    onViewChange: (view: any) => void;
}

export function ParentLayout({ children, currentView, onViewChange }: ParentLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { clearRole } = useAuth();
    const { parent } = useParent();

    const navigation = [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
        { id: 'announcements', name: 'Announcements', icon: Megaphone },
        { id: 'results', name: 'Results', icon: BookOpen },
        { id: 'fees', name: 'Fees', icon: DollarSign },
        { id: 'tickets', name: 'Support Tickets', icon: Ticket },
        { id: 'profile', name: 'Profile', icon: User },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-slate-900/50 z-20 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex items-center justify-between h-20 px-6 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-md">
                            <span className="text-white font-bold text-lg">E</span>
                        </div>
                        <div>
                            <span className="font-bold text-slate-900 block leading-tight text-lg">EduLite</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Parent Portal</span>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    onViewChange(item.id);
                                    setSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                        ? 'bg-orange-50 text-orange-600 font-bold shadow-sm border border-orange-100'
                                        : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-orange-600' : 'text-slate-400'}`} />
                                <span>{item.name}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100 flex-none space-y-4">
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm border-2 border-white">
                            {parent?.profiles?.father_name?.charAt(0) || 'P'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                                {parent?.profiles?.father_name || 'Parent Account'}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Shared Access</p>
                        </div>
                    </div>
                    <button
                        onClick={clearRole}
                        className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors text-sm font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="lg:pl-64 flex flex-col min-h-screen">
                <header className="sticky top-0 z-10 h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-bold text-slate-900 hidden md:block capitalize">
                            {currentView.replace('-', ' ')}
                        </h2>
                    </div>

                    <ChildSwitcher />
                </header>

                <main className="p-6 flex-1">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
