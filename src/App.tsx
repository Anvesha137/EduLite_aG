import { useEffect } from 'react';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { AdminDashboard } from './components/dashboards/AdminDashboard';

function AppContent() {
  const { role, selectRole } = useAuth();

  useEffect(() => {
    if (!role) {
      selectRole('ADMIN');
    }
  }, [role, selectRole]);

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <AdminDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
