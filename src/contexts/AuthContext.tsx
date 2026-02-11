import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole } from '../types/database';
import { User, Session } from '@supabase/supabase-js';

// MOCK USER IDs
const MOCK_USERS: Record<UserRole, string> = {
  'SUPERADMIN': '00000000-0000-0000-0000-000000000001',
  'ADMIN': '00000000-0000-0000-0000-000000000002',
  'EDUCATOR': '00000000-0000-0000-0000-000000000003',
  'PARENT': '00000000-0000-0000-0000-000000000004',
  'LEARNER': '00000000-0000-0000-0000-000000000005', // Optional
  'COUNSELOR': '00000000-0000-0000-0000-000000000006', // Optional
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  selectRole: (role: UserRole) => Promise<void>;
  clearRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage on mount
    const savedRole = localStorage.getItem('mock_role') as UserRole;
    if (savedRole && MOCK_USERS[savedRole]) {
      mockLogin(savedRole);
    } else {
      setLoading(false);
    }
  }, []);

  const mockLogin = (newRole: UserRole) => {
    const userId = MOCK_USERS[newRole];
    const mockUser: User = {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: `${newRole.toLowerCase()}@demoschool.com`,
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmation_sent_at: '',
      confirmed_at: '',
      last_sign_in_at: '',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { role: newRole },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      identities: [],
      factors: []
    };

    const mockSession: Session = {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser
    };

    setUser(mockUser);
    setSession(mockSession);
    setRole(newRole);
    localStorage.setItem('mock_role', newRole);
    setLoading(false);
  };

  const selectRole = async (newRole: UserRole) => {
    setLoading(true);
    // Simulate network delay for realism if desired, but instant is better
    mockLogin(newRole);
  };

  const clearRole = async () => {
    localStorage.removeItem('mock_role');
    setRole(null);
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        selectRole,
        clearRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

