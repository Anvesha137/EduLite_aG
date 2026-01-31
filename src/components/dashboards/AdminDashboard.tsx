import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Layout } from '../Layout';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  DollarSign,
  Megaphone,
  FileText,
  Settings,
  GraduationCap,
  TrendingUp,
  CreditCard,
  Award,
  UserPlus,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Student, Educator, Attendance, Class } from '../../types/database';
import { useSchool } from '../../hooks/useSchool';
import { StudentManagement } from '../admin/StudentManagement';
import { EducatorManagement } from '../admin/EducatorManagement';
import { AttendanceManagement } from '../admin/AttendanceManagement';
// import { ExamManagement } from '../admin/ExamManagement';
import { ResultsManagement } from '../admin/results/ResultsManagement';
import { FeeManagement } from '../admin/FeeManagement';

// ... (keep existing imports)

import { AnnouncementManagement } from '../admin/AnnouncementManagement';
import { Reports } from '../admin/Reports';
import { Settings as SettingsPage } from '../admin/Settings';
import IDCardManagement from '../admin/IDCardManagement';
import CertificateManagement from '../admin/CertificateManagement';
import AdmissionsManagement from '../admin/AdmissionsManagement';
import { SubjectManagement } from '../admin/SubjectManagement';

type View = 'dashboard' | 'students' | 'educators' | 'attendance' | 'exams' | 'fees' | 'announcements' | 'reports' | 'settings' | 'idcards' | 'certificates' | 'admissions' | 'subjects';

const STORAGE_KEY = 'admin_current_view';

export function AdminDashboard() {
  const { role } = useAuth();
  const { schoolId, loading: schoolLoading } = useSchool();
  const [currentView, setCurrentView] = useState<View>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as View) || 'dashboard';
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [educators, setEducators] = useState<Educator[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (schoolId) {
      loadData();
    } else if (!schoolLoading && !schoolId) {
      setLoading(false);
    }
  }, [schoolId, schoolLoading]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currentView);
  }, [currentView]);

  const loadData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [studentsRes, educatorsRes, classesRes, attendanceRes] = await Promise.all([
        supabase.from('students').select('*').eq('school_id', schoolId).eq('status', 'active'),
        supabase.from('educators').select('*').eq('school_id', schoolId).eq('status', 'active'),
        supabase.from('classes').select('*').eq('school_id', schoolId).order('grade_order'),
        supabase.from('attendance').select('*').eq('school_id', schoolId).eq('date', today),
      ]);

      if (studentsRes.data) setStudents(studentsRes.data);
      if (educatorsRes.data) setEducators(educatorsRes.data);
      if (classesRes.data) setClasses(classesRes.data);
      if (attendanceRes.data) setTodayAttendance(attendanceRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const allNavigation = [
    { name: 'Dashboard', icon: LayoutDashboard, active: currentView === 'dashboard', onClick: () => setCurrentView('dashboard') },
    { name: 'Students', icon: Users, active: currentView === 'students', onClick: () => setCurrentView('students') },
    { name: 'Educators', icon: GraduationCap, active: currentView === 'educators', onClick: () => setCurrentView('educators') },
    { name: 'Admissions', icon: UserPlus, active: currentView === 'admissions', onClick: () => setCurrentView('admissions') },
    { name: 'Attendance', icon: UserCheck, active: currentView === 'attendance', onClick: () => setCurrentView('attendance') },
    { name: 'Results & Exams', icon: BookOpen, active: currentView === 'exams', onClick: () => setCurrentView('exams') },
    { name: 'Fees', icon: DollarSign, active: currentView === 'fees', onClick: () => setCurrentView('fees') },
    { name: 'Subjects', icon: BookOpen, active: currentView === 'subjects', onClick: () => setCurrentView('subjects') },
    { name: 'ID Cards', icon: CreditCard, active: currentView === 'idcards', onClick: () => setCurrentView('idcards') },
    { name: 'Certificates', icon: Award, active: currentView === 'certificates', onClick: () => setCurrentView('certificates') },
    { name: 'Announcements', icon: Megaphone, active: currentView === 'announcements', onClick: () => setCurrentView('announcements') },
    { name: 'Reports', icon: FileText, active: currentView === 'reports', onClick: () => setCurrentView('reports') },
    { name: 'Settings', icon: Settings, active: currentView === 'settings', onClick: () => setCurrentView('settings') },
  ];

  const navigation = role === 'COUNSELOR'
    ? allNavigation.filter(n => n.name === 'Admissions')
    : allNavigation;

  useEffect(() => {
    if (role === 'COUNSELOR' && currentView !== 'admissions') {
      setCurrentView('admissions');
    }
  }, [role, currentView]);

  const attendanceRate = students.length > 0
    ? Math.round((todayAttendance.filter(a => a.status === 'present').length / students.length) * 100)
    : 0;

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <TrendingUp className="w-5 h-5 opacity-75" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{students.length}</h3>
          <p className="text-blue-100 text-sm">Total Students</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-3xl font-bold mb-1">{educators.length}</h3>
          <p className="text-emerald-100 text-sm">Teaching Staff</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-3xl font-bold mb-1">{attendanceRate}%</h3>
          <p className="text-amber-100 text-sm">Today's Attendance</p>
        </div>

        <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-3xl font-bold mb-1">{classes.length}</h3>
          <p className="text-violet-100 text-sm">Classes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Class-wise Student Distribution</h3>
          <div className="space-y-3">
            {classes.map((cls) => {
              const classStudents = students.filter(s => s.class_id === cls.id);
              return (
                <div key={cls.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">{cls.grade}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{cls.grade}</p>
                      <p className="text-sm text-slate-600">{classStudents.length} students</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{classStudents.length}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => setCurrentView('students')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Add Student</span>
            </button>
            <button
              onClick={() => setCurrentView('attendance')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"
            >
              <UserCheck className="w-5 h-5" />
              <span className="font-medium">Mark Attendance</span>
            </button>
            <button
              onClick={() => setCurrentView('fees')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors"
            >
              <DollarSign className="w-5 h-5" />
              <span className="font-medium">Collect Fees</span>
            </button>
            <button
              onClick={() => setCurrentView('announcements')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg transition-colors"
            >
              <Megaphone className="w-5 h-5" />
              <span className="font-medium">Send Announcement</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Students</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Admission No.</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Name</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Class</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Status</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Admission Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {students.slice(0, 5).map((student) => {
                const studentClass = classes.find(c => c.id === student.class_id);
                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-900">{student.admission_number}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{student.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{studentClass?.grade || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        {student.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(student.admission_date).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <Layout title="School Administration" navigation={navigation}>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {currentView === 'dashboard' && renderDashboard()}
          {currentView === 'students' && <StudentManagement />}
          {currentView === 'educators' && <EducatorManagement />}
          {currentView === 'admissions' && <AdmissionsManagement />}
          {currentView === 'attendance' && <AttendanceManagement />}
          {currentView === 'exams' && <ResultsManagement />}
          {currentView === 'fees' && <FeeManagement />}
          {currentView === 'subjects' && <SubjectManagement />}
          {currentView === 'idcards' && <IDCardManagement />}
          {currentView === 'certificates' && <CertificateManagement />}
          {currentView === 'announcements' && <AnnouncementManagement />}
          {currentView === 'reports' && <Reports />}
          {currentView === 'settings' && <SettingsPage />}
        </>
      )}
    </Layout>
  );
}
