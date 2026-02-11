import { useAuth, AuthProvider } from './contexts/AuthContext';
import { AdminDashboard } from './components/dashboards/AdminDashboard';
import { TeacherDashboard } from './components/dashboards/TeacherDashboard';
import { Login } from './components/Login';

function AppContent() {
  const { role } = useAuth();

  if (!role) {
    return <Login />;
  }

  if (role === 'EDUCATOR') {
    return <TeacherDashboard />;
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
