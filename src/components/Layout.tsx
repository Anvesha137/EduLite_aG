import { ReactNode, useState, useEffect, useRef } from 'react';
import { LogOut, Menu, X, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Student } from '../types/database';

interface LayoutProps {
  children: ReactNode;
  title: string;
  navigation: Array<{
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    active?: boolean;
    onClick?: () => void;
  }>;
  onStudentSearch?: (studentId: string) => void;
}

export function Layout({ children, title, navigation, onStudentSearch }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role, clearRole } = useAuth();

  // Global Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.length >= 2) {
        performSearch();
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const performSearch = async () => {
    setSearching(true);
    try {
      const { data } = await supabase
        .from('students')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,admission_number.ilike.%${searchTerm}%`)
        .limit(5);

      if (data) {
        setSearchResults(data as any); // Cast if needed
        setShowResults(true);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchResultClick = (studentId: string) => {
    setSearchTerm('');
    setShowResults(false);
    if (onStudentSearch) {
      onStudentSearch(studentId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div
        className={`fixed inset-0 bg-slate-900/50 z-20 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
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

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={item.onClick}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${item.active
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

        <div className="p-4 border-t border-slate-200 flex-none">
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
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 hidden md:block">{title}</h1>

            {/* Global Search Bar */}
            <div className="max-w-md w-full relative ml-4" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-200 max-h-96 overflow-y-auto z-50">
                  {searchResults.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => handleSearchResultClick(student.id)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors flex items-center gap-3"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{student.name}</p>
                        <p className="text-xs text-slate-500">Adm: {student.admission_number} • Class {student.class_id ? 'Linked' : '-'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
