import { ChevronDown, User } from 'lucide-react';
import { useParent } from '../../contexts/ParentContext';
import { useState, useRef, useEffect } from 'react';

export function ChildSwitcher() {
    const { children, selectedStudent, switchStudent } = useParent();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!selectedStudent) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all shadow-sm"
            >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                    {selectedStudent.photo_url ? (
                        <img src={selectedStudent.photo_url} alt={selectedStudent.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        selectedStudent.name.charAt(0)
                    )}
                </div>
                <div className="text-left hidden sm:block">
                    <p className="text-sm font-bold text-slate-900 leading-none mb-1">{selectedStudent.name}</p>
                    <p className="text-[11px] text-slate-500 uppercase tracking-tight">
                        {selectedStudent.class?.name} - {selectedStudent.section?.name}
                    </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && children.length > 1 && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                    <div className="p-2 space-y-1">
                        {children.map((child) => (
                            <button
                                key={child.id}
                                onClick={() => {
                                    switchStudent(child.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${selectedStudent.id === child.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedStudent.id === child.id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                                    }`}>
                                    {child.photo_url ? (
                                        <img src={child.photo_url} alt={child.name} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        child.name.charAt(0)
                                    )}
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold">{child.name}</p>
                                    <p className="text-[10px] opacity-70">
                                        Adm: {child.admission_number}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
