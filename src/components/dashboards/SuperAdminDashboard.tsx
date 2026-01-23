import { useState, useEffect } from 'react';
import { Layout } from '../Layout';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Settings,
  HelpCircle,
  BarChart3,
  Users,
  TrendingUp,
  DollarSign,
  School,
  Plus,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { School as SchoolType, Plan, PlatformAnalytics } from '../../types/database';

type View = 'dashboard' | 'schools' | 'subscriptions' | 'modules' | 'support' | 'analytics';

const STORAGE_KEY = 'superadmin_current_view';

export function SuperAdminDashboard() {
  const [currentView, setCurrentView] = useState<View>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as View) || 'dashboard';
  });
  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currentView);
  }, [currentView]);

  const loadData = async () => {
    try {
      const [schoolsRes, plansRes, analyticsRes] = await Promise.all([
        supabase.from('schools').select('*').order('created_at', { ascending: false }),
        supabase.from('plans').select('*').order('price'),
        supabase.from('platform_analytics').select('*').order('date', { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (schoolsRes.data) setSchools(schoolsRes.data);
      if (plansRes.data) setPlans(plansRes.data);
      if (analyticsRes.data) setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, active: currentView === 'dashboard', onClick: () => setCurrentView('dashboard') },
    { name: 'Schools', icon: Building2, active: currentView === 'schools', onClick: () => setCurrentView('schools') },
    { name: 'Subscriptions', icon: CreditCard, active: currentView === 'subscriptions', onClick: () => setCurrentView('subscriptions') },
    { name: 'Modules', icon: Settings, active: currentView === 'modules', onClick: () => setCurrentView('modules') },
    { name: 'Support', icon: HelpCircle, active: currentView === 'support', onClick: () => setCurrentView('support') },
    { name: 'Analytics', icon: BarChart3, active: currentView === 'analytics', onClick: () => setCurrentView('analytics') },
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <School className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{analytics?.total_schools || schools.length}</h3>
          <p className="text-sm text-slate-600 mt-1">Total Schools</p>
          <p className="text-xs text-green-600 mt-2">
            +{analytics?.new_schools || 0} this month
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{analytics?.total_students || 0}</h3>
          <p className="text-sm text-slate-600 mt-1">Total Students</p>
          <p className="text-xs text-slate-500 mt-2">Across all schools</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{analytics?.active_schools || 0}</h3>
          <p className="text-sm text-slate-600 mt-1">Active Schools</p>
          <p className="text-xs text-slate-500 mt-2">
            {analytics?.total_schools ? Math.round((analytics.active_schools / analytics.total_schools) * 100) : 0}% of total
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">₹{(analytics?.revenue || 0).toLocaleString()}</h3>
          <p className="text-sm text-slate-600 mt-1">Total Revenue</p>
          <p className="text-xs text-slate-500 mt-2">This month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Schools</h3>
          <div className="space-y-3">
            {schools.slice(0, 5).map((school) => (
              <div key={school.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{school.name}</p>
                  <p className="text-sm text-slate-600">{school.city}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    school.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : school.status === 'pending'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {school.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Subscription Plans</h3>
          <div className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.id} className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900">{plan.name}</h4>
                  <span className="text-lg font-bold text-blue-600">₹{plan.price.toLocaleString()}</span>
                </div>
                <p className="text-sm text-slate-600 mb-2">{plan.description}</p>
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <span>{plan.student_limit} students</span>
                  <span>{plan.educator_limit} educators</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSchools = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">School Management</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Onboard School
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">School Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Contact</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Location</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Onboarded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {schools.map((school) => (
                <tr key={school.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-slate-900">{school.name}</p>
                      <p className="text-sm text-slate-600">{school.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-slate-900">{school.contact_person}</p>
                      <p className="text-sm text-slate-600">{school.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-900">{school.city}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        school.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : school.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {school.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600">
                      {school.onboarded_at ? new Date(school.onboarded_at).toLocaleDateString() : 'Not yet'}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <Layout title="Platform Management" navigation={navigation}>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {currentView === 'dashboard' && renderDashboard()}
          {currentView === 'schools' && renderSchools()}
          {currentView === 'subscriptions' && (
            <div className="text-center py-12">
              <p className="text-slate-600">Subscription management interface</p>
            </div>
          )}
          {currentView === 'modules' && (
            <div className="text-center py-12">
              <p className="text-slate-600">Module management interface</p>
            </div>
          )}
          {currentView === 'support' && (
            <div className="text-center py-12">
              <p className="text-slate-600">Support ticket management</p>
            </div>
          )}
          {currentView === 'analytics' && (
            <div className="text-center py-12">
              <p className="text-slate-600">Advanced analytics dashboard</p>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
