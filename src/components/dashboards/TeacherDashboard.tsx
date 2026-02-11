import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Layout } from '../Layout';
import {
    LayoutDashboard,
    Users,
    UserCheck,
    BookOpen,
    Award,
    Calendar,
    FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MyClasses } from './teacher/MyClasses';
import { AttendanceView } from './teacher/AttendanceView';
import { MarksEntry } from './teacher/MarksEntry';
import { ReportCards } from './teacher/ReportCards';

type View = 'dashboard' | 'my-classes' | 'my-subjects' | 'attendance' | 'marks' | 'reports' | 'settings';

const STORAGE_KEY = 'teacher_current_view';

export function TeacherDashboard() {
    const { user } = useAuth();
    const [currentView, setCurrentView] = useState<View>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return (saved as View) || 'dashboard';
    });
    const [loading, setLoading] = useState(true);
    const [myClasses, setMyClasses] = useState<any[]>([]);
    const [mySubjects, setMySubjects] = useState<any[]>([]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, currentView);
    }, [currentView]);

    useEffect(() => {
        if (user) {
            loadTeacherData();
        }
    }, [user]);

    const loadTeacherData = async () => {
        try {
            setLoading(true);
            // Get Educator ID linked to Auth User
            const { data: educatorData, error: eduError } = await supabase
                .from('educators')
                .select('id')
                .eq('user_id', user?.id)
                .single();

            if (eduError) throw eduError;
            if (!educatorData) return;

            const educatorId = educatorData.id;

            // Fetch Assignments
            const { data: assignments, error: assignError } = await supabase
                .from('educator_class_assignments')
                .select(`
          *,
          class:classes(id, grade, grade_order),
          section:sections(id, name),
          subject:subjects(id, name, code)
        `)
                .eq('educator_id', educatorId)
                .eq('status', 'active'); // Ensure we respect active status

            if (assignError) throw assignError;

            if (assignments) {
                // Process Classes (Unique Class-Section combos)
                const uniqueClasses = new Map();
                assignments.forEach((a: any) => {
                    const key = `${a.class.id}-${a.section.id}`;
                    if (!uniqueClasses.has(key)) {
                        uniqueClasses.set(key, {
                            class: a.class,
                            section: a.section,
                            is_class_teacher: a.is_class_teacher,
                            subjects: []
                        });
                    }
                    if (a.subject) {
                        uniqueClasses.get(key).subjects.push(a.subject);
                    }
                });
                setMyClasses(Array.from(uniqueClasses.values()));

                // Process Subjects (Flat list if needed, or derived from classes)
                const subjectsList = assignments.filter((a: any) => a.subject).map((a: any) => ({
                    subject: a.subject,
                    class: a.class,
                    section: a.section
                }));
                setMySubjects(subjectsList);
            }

        } catch (error) {
            console.error('Error loading teacher data:', error);
        } finally {
            setLoading(false);
        }
    };

    const navigation = [
        { name: 'Dashboard', icon: LayoutDashboard, active: currentView === 'dashboard', onClick: () => setCurrentView('dashboard') },
        { name: 'My Classes', icon: Users, active: currentView === 'my-classes', onClick: () => setCurrentView('my-classes') },
        { name: 'My Subjects', icon: BookOpen, active: currentView === 'my-subjects', onClick: () => setCurrentView('my-subjects') },
        { name: 'Attendance', icon: UserCheck, active: currentView === 'attendance', onClick: () => setCurrentView('attendance') },
        { name: 'Marks Entry', icon: Award, active: currentView === 'marks', onClick: () => setCurrentView('marks') },
        { name: 'Reports', icon: FileText, active: currentView === 'reports', onClick: () => setCurrentView('reports') },
        { name: 'Timetable', icon: Calendar, active: currentView === 'settings', onClick: () => setCurrentView('settings') }, // Placeholder
    ];

    const renderDashboard = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">My Classes</h3>
                    <p className="text-3xl font-bold text-blue-600">{myClasses.length}</p>
                    <p className="text-sm text-slate-500">Assigned Classes</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">My Subjects</h3>
                    <p className="text-3xl font-bold text-violet-600">{mySubjects.length}</p>
                    <p className="text-sm text-slate-500">Subjects Taugh</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Pending Tasks</h3>
                    <p className="text-3xl font-bold text-amber-600">0</p>
                    <p className="text-sm text-slate-500">Attendance/Marks Pending</p>
                </div>
            </div>

            {/* Quick View of Classes */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Assigned Classes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myClasses.map((cls, idx) => (
                        <div key={idx} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-slate-900">{cls.class.grade} - {cls.section.name}</h4>
                                    <p className="text-xs text-slate-500">{cls.is_class_teacher ? 'Class Teacher' : 'Subject Teacher'}</p>
                                </div>
                                {cls.is_class_teacher && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">CT</span>}
                            </div>
                            <div className="text-sm text-slate-600">
                                {cls.subjects.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {cls.subjects.map((s: any) => (
                                            <span key={s.id} className="bg-slate-100 px-2 py-1 rounded text-xs">{s.name}</span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="italic text-xs">No subjects assigned directly</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <Layout
            title="Teacher Dashboard"
            navigation={navigation}
        >
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <>
                    {currentView === 'dashboard' && renderDashboard()}
                    {currentView === 'my-classes' && <MyClasses />}
                    {currentView === 'my-subjects' && <div className="text-center py-20 text-slate-500">My Subjects Interface Coming Soon</div>}
                    {currentView === 'attendance' && <AttendanceView />}
                    {currentView === 'marks' && <MarksEntry />}
                    {currentView === 'reports' && <ReportCards />}
                    {currentView === 'settings' && <div className="text-center py-20 text-slate-500">Settings Interface Coming Soon</div>}
                </>
            )}
        </Layout>
    );
}
