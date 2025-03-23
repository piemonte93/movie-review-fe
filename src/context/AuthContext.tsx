import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../api/authApi';

interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshAuthStatus: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    refreshAuthStatus();
  }, []);

  const refreshAuthStatus = () => {
    const loggedIn = authApi.isLoggedIn();
    setIsLoggedIn(loggedIn);
    
    if (loggedIn) {
      const currentUser = authApi.getCurrentUser();
      setUser(currentUser);
    } else {
      setUser(null);
    }
  };

  const login = (token: string, userData: User) => {
    // 토큰과 사용자 정보 저장
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // 상태 업데이트
    setIsLoggedIn(true);
    setUser(userData);
  };

  const logout = () => {
    // 토큰과 사용자 정보 제거
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // 상태 업데이트
    setIsLoggedIn(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout, refreshAuthStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};