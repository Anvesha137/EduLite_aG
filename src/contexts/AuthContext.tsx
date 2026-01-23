import { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole } from '../types/database';

interface AuthContextType {
  role: UserRole | null;
  selectRole: (role: UserRole) => void;
  clearRole: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null);

  const selectRole = (newRole: UserRole) => {
    setRole(newRole);
  };

  const clearRole = () => {
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        role,
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
