import { useState } from 'react';
import { UserRole } from '../types/database';
import { Users, GraduationCap, UserCog, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const { selectRole } = useAuth();
  const [loading, setLoading] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (role: UserRole) => {
    setLoading(role);
    setError(null);
    try {
      await selectRole(role);
      // navigation is handled by App.tsx based on user state
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message);
      setLoading(null);
    }
  };

  const roles = [
    {
      role: 'SUPERADMIN' as UserRole,
      title: 'Super Admin',
      description: 'Manage multiple schools and system settings',
      icon: Shield,
      color: 'bg-purple-600 hover:bg-purple-700',
    },
    {
      role: 'ADMIN' as UserRole,
      title: 'School Admin',
      description: 'Manage school operations and staff',
      icon: UserCog,
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      role: 'EDUCATOR' as UserRole,
      title: 'Teacher',
      description: 'Manage classes and student progress',
      icon: GraduationCap,
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      role: 'PARENT' as UserRole,
      title: 'Parent',
      description: 'View student information and updates',
      icon: Users,
      color: 'bg-orange-600 hover:bg-orange-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">School ERP System</h1>
          <p className="text-lg text-gray-600">Select a role to login as Demo User</p>
          {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map(({ role, title, description, icon: Icon, color }) => (
            <button
              key={role}
              onClick={() => handleLogin(role)}
              disabled={loading !== null}
              className={`${color} text-white p-8 rounded-2xl shadow-lg transition-all transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="bg-white bg-opacity-20 p-4 rounded-full mb-4">
                  {loading === role ? (
                    <Loader2 size={40} className="animate-spin" />
                  ) : (
                    <Icon size={40} />
                  )}
                </div>
                <h2 className="text-2xl font-bold mb-2">{title}</h2>
                <p className="text-white text-opacity-90">{description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
