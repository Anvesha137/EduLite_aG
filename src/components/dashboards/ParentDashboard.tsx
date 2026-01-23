import { useState, useEffect } from 'react';
import { Layout } from '../Layout';
import {
  LayoutDashboard,
  User,
  UserCheck,
  BookOpen,
  DollarSign,
  FileText,
  Megaphone,
  Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Student, Attendance, Announcement } from '../../types/database';

type View = 'dashboard' | 'profile' | 'attendance' | 'exams' | 'fees' | 'diary' | 'announcements';

const STORAGE_KEY = 'parent_current_view';

export function ParentDashboard() {
  const { profile, schoolId } = useAuth();
  const [currentView, setCurrentView] = useState<View>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as View) || 'dashboard';
  });
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
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
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', profile?.id)
        .eq('school_id', schoolId)
        .maybeSingle();

      if (parent) {
        const { data: childrenData } = await supabase
          .from('students')
          .select('*, class:classes(*), section:sections(*)')
          .eq('parent_id', parent.id)
          .eq('status', 'active');

        if (childrenData && childrenData.length > 0) {
          setChildren(childrenData as any);
          setSelectedChild(childrenData[0] as any);

          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const { data: attendanceData } = await supabase
            .from('attendance')
            .select('*')
            .eq('student_id', childrenData[0].id)
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
            .order('date', { ascending: false });

          if (attendanceData) setAttendance(attendanceData);
        }
      }

      const { data: announcementsData } = await supabase
        .from('announcements')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('published_at', { ascending: false })
        .limit(5);

      if (announcementsData) setAnnouncements(announcementsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, active: currentView === 'dashboard', onClick: () => setCurrentView('dashboard') },
    { name: 'Profile', icon: User, active: currentView === 'profile', onClick: () => setCurrentView('profile') },
    { name: 'Attendance', icon: UserCheck, active: currentView === 'attendance', onClick: () => setCurrentView('attendance') },
    { name: 'Exams & Results', icon: BookOpen, active: currentView === 'exams', onClick: () => setCurrentView('exams') },
    { name: 'Fees', icon: DollarSign, active: currentView === 'fees', onClick: () => setCurrentView('fees') },
    { name: 'Daily Diary', icon: FileText, active: currentView === 'diary', onClick: () => setCurrentView('diary') },
    { name: 'Announcements', icon: Megaphone, active: currentView === 'announcements', onClick: () => setCurrentView('announcements') },
  ];

  const presentDays = attendance.filter(a => a.status === 'present').length;
  const totalDays = attendance.length;
  const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  const renderDashboard = () => (
    <div className="space-y-6">
      {children.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Child</label>
          <select
            value={selectedChild?.id}
            onChange={(e) => {
              const child = children.find(c => c.id === e.target.value);
              if (child) setSelectedChild(child);
            }}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name} - {(child as any).class?.grade}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedChild && (
        <>
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-10 h-10" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1">{selectedChild.name}</h2>
                <p className="text-blue-100 mb-2">
                  Class: {(selectedChild as any).class?.grade} - Section {(selectedChild as any).section?.name}
                </p>
                <p className="text-sm text-blue-100">
                  Admission No: {selectedChild.admission_number}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-1">{attendancePercentage}%</h3>
              <p className="text-sm text-slate-600">Attendance Rate</p>
              <p className="text-xs text-slate-500 mt-2">
                {presentDays} / {totalDays} days present
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-1">-</h3>
              <p className="text-sm text-slate-600">Last Exam Score</p>
              <p className="text-xs text-slate-500 mt-2">No recent exams</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-1">₹0</h3>
              <p className="text-sm text-slate-600">Pending Fees</p>
              <p className="text-xs text-green-600 mt-2">All paid</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Attendance</h3>
              <div className="space-y-2">
                {attendance.slice(0, 7).map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-900">
                        {new Date(record.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        record.status === 'present'
                          ? 'bg-green-100 text-green-700'
                          : record.status === 'absent'
                          ? 'bg-red-100 text-red-700'
                          : record.status === 'late'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>
                ))}
                {attendance.length === 0 && (
                  <p className="text-slate-500 text-center py-4">No attendance records yet</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">School Announcements</h3>
              <div className="space-y-3">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className={`p-4 rounded-lg border ${
                      announcement.priority === 'urgent'
                        ? 'bg-red-50 border-red-200'
                        : announcement.priority === 'high'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Megaphone
                        className={`w-5 h-5 mt-0.5 ${
                          announcement.priority === 'urgent'
                            ? 'text-red-600'
                            : announcement.priority === 'high'
                            ? 'text-amber-600'
                            : 'text-blue-600'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 mb-1">{announcement.title}</h4>
                        <p className="text-sm text-slate-600 line-clamp-2">{announcement.content}</p>
                        <p className="text-xs text-slate-500 mt-2">
                          {new Date(announcement.published_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <p className="text-slate-500 text-center py-4">No announcements</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {children.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Children Linked</h3>
          <p className="text-slate-600">
            Please contact your school administrator to link your child's profile.
          </p>
        </div>
      )}
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Attendance Records</h2>
        {children.length > 1 && (
          <select
            value={selectedChild?.id}
            onChange={(e) => {
              const child = children.find(c => c.id === e.target.value);
              if (child) setSelectedChild(child);
            }}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm text-slate-600 mb-1">Total Days</p>
          <p className="text-3xl font-bold text-slate-900">{totalDays}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm text-slate-600 mb-1">Present</p>
          <p className="text-3xl font-bold text-green-600">{presentDays}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm text-slate-600 mb-1">Absent</p>
          <p className="text-3xl font-bold text-red-600">
            {attendance.filter(a => a.status === 'absent').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm text-slate-600 mb-1">Percentage</p>
          <p className="text-3xl font-bold text-blue-600">{attendancePercentage}%</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Date</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Day</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {attendance.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {new Date(record.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        record.status === 'present'
                          ? 'bg-green-100 text-green-700'
                          : record.status === 'absent'
                          ? 'bg-red-100 text-red-700'
                          : record.status === 'late'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{record.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <Layout title="Parent Portal" navigation={navigation}>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {currentView === 'dashboard' && renderDashboard()}
          {currentView === 'profile' && (
            <div className="text-center py-12">
              <p className="text-slate-600">Student profile details</p>
            </div>
          )}
          {currentView === 'attendance' && renderAttendance()}
          {currentView === 'exams' && (
            <div className="text-center py-12">
              <p className="text-slate-600">Exam results and report cards</p>
            </div>
          )}
          {currentView === 'fees' && (
            <div className="text-center py-12">
              <p className="text-slate-600">Fee payment and history</p>
            </div>
          )}
          {currentView === 'diary' && (
            <div className="text-center py-12">
              <p className="text-slate-600">Daily diary and homework</p>
            </div>
          )}
          {currentView === 'announcements' && (
            <div className="text-center py-12">
              <p className="text-slate-600">All school announcements</p>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
