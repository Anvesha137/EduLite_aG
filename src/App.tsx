import { useAuth, AuthProvider } from './contexts/AuthContext';
import { AdminDashboard } from './components/dashboards/AdminDashboard';
import { Login } from './components/Login';

function AppContent() {
  const { role } = useAuth();

  if (!role) {
    return <Login />;
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
