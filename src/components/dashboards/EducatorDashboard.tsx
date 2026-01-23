import { useState, useEffect } from 'react';
import { Layout } from '../Layout';
import {
  LayoutDashboard,
  UserCheck,
  BookOpen,
  FileText,
  Calendar,
  Users,
  BookMarked,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Student, Class, Section, Subject } from '../../types/database';

type View = 'dashboard' | 'attendance' | 'marks' | 'diary' | 'timetable' | 'notes';

const STORAGE_KEY = 'educator_current_view';

interface ClassAssignment {
  class_id: string;
  section_id: string;
  subject_id: string;
  class?: Class;
  section?: Section;
  subject?: Subject;
}

export function EducatorDashboard() {
  const { profile, schoolId } = useAuth();
  const [currentView, setCurrentView] = useState<View>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as View) || 'dashboard';
  });
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && schoolId) {
      loadData();
    }
  }, [profile, schoolId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currentView);
  }, [currentView]);

  const loadData = async () => {
    try {
      const { data: educator } = await supabase
        .from('educators')
        .select('id')
        .eq('user_id', profile?.id)
        .eq('school_id', schoolId)
        .maybeSingle();

      if (educator) {
        const { data: assignmentsData } = await supabase
          .from('educator_class_assignments')
          .select(`
            class_id,
            section_id,
            subject_id,
            class:classes(*),
            section:sections(*),
            subject:subjects(*)
          `)
          .eq('educator_id', educator.id)
          .eq('academic_year', '2024-25');

        if (assignmentsData) {
          setAssignments(assignmentsData as any);

          if (assignmentsData.length > 0) {
            const firstAssignment = assignmentsData[0];
            setSelectedClass(firstAssignment.class_id);

            const { data: studentsData } = await supabase
              .from('students')
              .select('*')
              .eq('school_id', schoolId)
              .eq('class_id', firstAssignment.class_id)
              .eq('section_id', firstAssignment.section_id)
              .eq('status', 'active')
              .order('name');

            if (studentsData) setStudents(studentsData);
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, active: currentView === 'dashboard', onClick: () => setCurrentView('dashboard') },
    { name: 'Attendance', icon: UserCheck, active: currentView === 'attendance', onClick: () => setCurrentView('attendance') },
    { name: 'Enter Marks', icon: BookOpen, active: currentView === 'marks', onClick: () => setCurrentView('marks') },
    { name: 'Daily Diary', icon: FileText, active: currentView === 'diary', onClick: () => setCurrentView('diary') },
    { name: 'Timetable', icon: Calendar, active: currentView === 'timetable', onClick: () => setCurrentView('timetable') },
    { name: 'Student Notes', icon: BookMarked, active: currentView === 'notes', onClick: () => setCurrentView('notes') },
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-3xl font-bold mb-1">{assignments.length}</h3>
          <p className="text-blue-100 text-sm">Classes Assigned</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-3xl font-bold mb-1">{students.length}</h3>
          <p className="text-emerald-100 text-sm">Total Students</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-3xl font-bold mb-1">{new Date().toLocaleDateString('en-US', { weekday: 'short' })}</h3>
          <p className="text-amber-100 text-sm">Today's Day</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">My Class Assignments</h3>
          <div className="space-y-3">
            {assignments.map((assignment, idx) => (
              <div key={idx} className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">
                      {(assignment.class as any)?.grade} - Section {(assignment.section as any)?.name}
                    </h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Subject: {(assignment.subject as any)?.name}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {assignments.length === 0 && (
              <p className="text-slate-500 text-center py-4">No class assignments yet</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => setCurrentView('attendance')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
            >
              <UserCheck className="w-5 h-5" />
              <span className="font-medium">Mark Attendance</span>
            </button>
            <button
              onClick={() => setCurrentView('marks')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"
            >
              <BookOpen className="w-5 h-5" />
              <span className="font-medium">Enter Marks</span>
            </button>
            <button
              onClick={() => setCurrentView('diary')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors"
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">Write Daily Diary</span>
            </button>
            <button
              onClick={() => setCurrentView('notes')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg transition-colors"
            >
              <BookMarked className="w-5 h-5" />
              <span className="font-medium">Add Student Note</span>
            </button>
          </div>
        </div>
      </div>

      {students.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Current Class Students</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.slice(0, 6).map((student) => (
              <div key={student.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">
                    {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{student.name}</p>
                  <p className="text-sm text-slate-600">{student.admission_number}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Mark Attendance</h2>
        <div className="flex items-center gap-4">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Class</option>
            {assignments.map((assignment, idx) => (
              <option key={idx} value={assignment.class_id}>
                {(assignment.class as any)?.grade} - Section {(assignment.section as any)?.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            defaultValue={new Date().toISOString().split('T')[0]}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Roll No.</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Student Name</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">Present</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">Absent</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">Late</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">Leave</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {students.map((student, idx) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-900">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-xs">
                          {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <span className="font-medium text-slate-900">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input type="radio" name={`attendance-${student.id}`} className="w-4 h-4 text-green-600" defaultChecked />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input type="radio" name={`attendance-${student.id}`} className="w-4 h-4 text-red-600" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input type="radio" name={`attendance-${student.id}`} className="w-4 h-4 text-amber-600" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input type="radio" name={`attendance-${student.id}`} className="w-4 h-4 text-blue-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            Submit Attendance
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Layout title="Educator Portal" navigation={navigation}>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {currentView === 'dashboard' && renderDashboard()}
          {currentView === 'attendance' && renderAttendance()}
          {currentView === 'marks' && (
            <div className="text-center py-12">
              <p className="text-slate-600">Marks entry interface</p>
            </div>
          )}
          {currentView === 'diary' && (
            <div className="text-center py-12">
              <p className="text-slate-600">Daily diary entry form</p>
            </div>
          )}
          {currentView === 'timetable' && (
            <div className="text-center py-12">
              <p className="text-slate-600">Your teaching timetable</p>
            </div>
          )}
          {currentView === 'notes' && (
            <div className="text-center py-12">
              <p className="text-slate-600">Student notes interface</p>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
