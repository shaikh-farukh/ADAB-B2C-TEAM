import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage from './ResetPasswordPage';
import { KYBOnboarding } from './KYBOnboarding';

/**
 * Responsibility: Handles all authentication-related views.
 * Routes: /auth/login, /auth/signup, /auth/forgot-password, /auth/reset-password, /auth/kyb-onboarding.
 */
const AuthPages: React.FC = () => {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="signup" element={<SignupPage />} />
      <Route path="register" element={<Navigate to="signup" replace />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />
      <Route path="kyb-onboarding" element={<KYBOnboarding />} />
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
};

export default AuthPages;