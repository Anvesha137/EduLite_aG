import { useAuth, AuthProvider } from './contexts/AuthContext';
import { ParentProvider } from './contexts/ParentContext';
import { AdminDashboard } from './components/dashboards/AdminDashboard';
import { TeacherDashboard } from './components/dashboards/TeacherDashboard';
import { ParentPortal } from './components/parent/ParentPortal';
import { Login } from './components/Login';

function AppContent() {
  const { role } = useAuth();

  if (!role) {
    return <Login />;
  }

  if (role === 'EDUCATOR') {
    return <TeacherDashboard />;
  }

  if (role === 'PARENT') {
    return (
      <ParentProvider>
        <ParentPortal />
      </ParentProvider>
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
