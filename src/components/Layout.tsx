import { ReactNode } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
  title: string;
  navigation: Array<{
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    active?: boolean;
    onClick?: () => void;
  }>;
}

export function Layout({ children, title, navigation }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role, clearRole } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <div
        className={`fixed inset-0 bg-slate-900/50 z-20 lg:hidden transition-opacity ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">ERP</span>
            </div>
            <span className="font-bold text-slate-900">School ERP</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-slate-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={item.onClick}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  item.active
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center text-white font-medium">
              {role?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {role?.replace('ADMIN', 'Admin').replace('EDUCATOR', 'Teacher').replace('PARENT', 'Parent').replace('SUPERADMIN', 'Super Admin')}
              </p>
              <p className="text-xs text-slate-500">Demo User</p>
            </div>
          </div>
          <button
            onClick={clearRole}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Change Role</span>
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
