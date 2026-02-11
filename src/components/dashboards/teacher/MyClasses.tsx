import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Users, BookOpen } from 'lucide-react';

interface ClassAssignment {
    class_id: string;
    section_id: string;
    is_class_teacher: boolean;
    class_name: string;
    section_name: string;
    subjects: {
        id: string;
        name: string;
        code: string;
    }[];
    student_count: number;
}

export function MyClasses({ educatorId }: { educatorId: string | null }) {
    const { user } = useAuth();
    const [classes, setClasses] = useState<ClassAssignment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (educatorId) {
            fetchClasses(educatorId);
        }
    }, [educatorId]);

    const fetchClasses = async (id: string) => {
        try {
            setLoading(true);

            // Get Assignments
            const { data: assignments, error } = await supabase
                .from('educator_class_assignments')
                .select(`
          class_id,
          section_id,
          is_class_teacher,
          class:classes(id, name, sort_order),
          section:sections(id, name),
          subject:subjects(id, name, code)
        `)
                .eq('educator_id', id)
            // .eq('status', 'active'); // removed for safety

            if (error) throw error;

            if (assignments) {
                // Group by Class-Section
                const grouped = new Map<string, ClassAssignment>();

                for (const a of assignments as any[]) {
                    if (!a.class || !a.section) continue;

                    const key = `${a.class.id}-${a.section.id}`;

                    if (!grouped.has(key)) {
                        // Fetch student count for this class section
                        const { count } = await supabase
                            .from('students')
                            .select('*', { count: 'exact', head: true })
                            .eq('class_id', a.class.id)
                            .eq('section_id', a.section.id)
                            .eq('status', 'active');

                        grouped.set(key, {
                            class_id: a.class.id,
                            section_id: a.section.id,
                            is_class_teacher: a.is_class_teacher, // If multiples, true takes precedence ideally
                            class_name: a.class.name,
                            section_name: a.section.name,
                            subjects: [],
                            student_count: count || 0
                        });
                    }

                    const entry = grouped.get(key)!;
                    if (a.is_class_teacher) entry.is_class_teacher = true;
                    if (a.subject) {
                        if (!entry.subjects.find(s => s.id === a.subject.id)) {
                            entry.subjects.push(a.subject);
                        }
                    }
                }

                setClasses(Array.from(grouped.values()));
            }

        } catch (error) {
            console.error('Error fetching classes:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">My Classes</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((cls) => (
                    <div key={`${cls.class_id}-${cls.section_id}`} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">{cls.class_name} - {cls.section_name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${cls.is_class_teacher
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {cls.is_class_teacher ? 'Class Teacher' : 'Subject Teacher'}
                                        </span>
                                    </div>
                                </div>
                                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                    <Users className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm text-slate-600">
                                    <span>Students</span>
                                    <span className="font-medium text-slate-900">{cls.student_count}</span>
                                </div>

                                <div className="border-t border-slate-100 pt-4">
                                    <p className="text-sm font-medium text-slate-900 mb-2 flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-slate-400" />
                                        Subjects
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {cls.subjects.length > 0 ? (
                                            cls.subjects.map(subject => (
                                                <span key={subject.id} className="text-xs bg-slate-50 border border-slate-200 px-2 py-1 rounded">
                                                    {subject.name}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">No specific subjects</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-100 flex gap-3">
                                <button className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                                    View Students
                                </button>
                                {cls.is_class_teacher && (
                                    <button className="flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors">
                                        Attendance
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {classes.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-900">No Classes Assigned</h3>
                        <p className="text-slate-500">You haven't been assigned to any classes yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
