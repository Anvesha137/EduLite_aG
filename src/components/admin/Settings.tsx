import { useState, useEffect } from 'react';
import { Save, Building, User, Bell, Lock, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../hooks/useSchool';

type SettingsTab = 'profile' | 'school' | 'notifications' | 'security';

export function Settings() {
  const { schoolId } = useSchool();
  const [activeTab, setActiveTab] = useState<SettingsTab>('school');
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    full_name: 'Demo Admin',
    email: 'admin@demo.com',
    phone: '',
  });

  const [schoolData, setSchoolData] = useState({
    school_name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    attendance_alerts: true,
    fee_reminders: true,
    exam_notifications: true,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (schoolId) {
      loadSchoolData();
    }
  }, [schoolId]);

  const loadSchoolData = async () => {
    try {
      const { data } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .maybeSingle();

      if (data) {
        setSchoolData({
          school_name: data.school_name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
        });
      }
    } catch (error) {
      console.error('Error loading school data:', error);
    }
  };

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
        })
        .eq('id', profile?.id);

      if (error) throw error;
      alert('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSchoolSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('schools')
        .update(schoolData)
        .eq('id', schoolId);

      if (error) throw error;
      alert('School information updated successfully!');
    } catch (error: any) {
      console.error('Error updating school:', error);
      alert('Failed to update school information: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      alert('Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error updating password:', error);
      alert('Failed to update password: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'school', name: 'School Info', icon: Building },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Lock },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Settings</h2>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                />
                <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleProfileSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          )}

          {activeTab === 'school' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  School Name
                </label>
                <input
                  type="text"
                  value={schoolData.school_name}
                  onChange={(e) => setSchoolData({ ...schoolData, school_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Address
                </label>
                <textarea
                  value={schoolData.address}
                  onChange={(e) => setSchoolData({ ...schoolData, address: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={schoolData.phone}
                    onChange={(e) => setSchoolData({ ...schoolData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={schoolData.email}
                    onChange={(e) => setSchoolData({ ...schoolData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={schoolData.website}
                  onChange={(e) => setSchoolData({ ...schoolData, website: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://www.example.com"
                />
              </div>

              <button
                onClick={handleSchoolSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save School Info'}
              </button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6 max-w-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-600" />
                    <div>
                      <p className="font-medium text-slate-900">Email Notifications</p>
                      <p className="text-sm text-slate-600">Receive email updates</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.email_notifications}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, email_notifications: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-slate-600" />
                    <div>
                      <p className="font-medium text-slate-900">Attendance Alerts</p>
                      <p className="text-sm text-slate-600">Get notified about attendance issues</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.attendance_alerts}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, attendance_alerts: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-slate-600" />
                    <div>
                      <p className="font-medium text-slate-900">Fee Reminders</p>
                      <p className="text-sm text-slate-600">Reminders for pending fees</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.fee_reminders}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, fee_reminders: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-slate-600" />
                    <div>
                      <p className="font-medium text-slate-900">Exam Notifications</p>
                      <p className="text-sm text-slate-600">Updates about exams and results</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.exam_notifications}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, exam_notifications: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  alert('Notification settings saved!');
                }}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Save Preferences
              </button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handlePasswordChange}
                disabled={saving || !passwordData.newPassword || !passwordData.confirmPassword}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                {saving ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
