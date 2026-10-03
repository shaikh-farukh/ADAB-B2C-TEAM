import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, UserRole } from '../../store/useAuthStore';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRole: UserRole;
}

/**
 * Responsibility: Protects routes from unauthorized role access.
 * Redirects to root if the current role doesn't match requirements.
 */
const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRole }) => {
  const { role, isLoggedIn } = useAuthStore();

  if (!isLoggedIn) {
    return <Navigate to="/auth" replace />;
  }

  if (role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;