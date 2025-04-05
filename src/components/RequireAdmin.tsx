import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RequireAdminProps {
  children: React.ReactNode;
}

const RequireAdmin: React.FC<RequireAdminProps> = ({ children }) => {
  const { isLoggedIn, user } = useAuth();
  
  // 로그인하지 않았거나 ROLE_ADMIN 권한이 없는 경우 홈으로 리디렉션
  if (!isLoggedIn || !user?.roles?.includes('ROLE_ADMIN')) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

export default RequireAdmin; 