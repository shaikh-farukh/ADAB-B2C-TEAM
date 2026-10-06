import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, AlertCircle, CheckCircle2, ChevronLeft, ShieldAlert } from 'lucide-react';
import { validatePassword, requiredField } from '../../utils/validation';
import { useNotification } from '../../context/NotificationContext';
import authService from '../../services/authService';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { showSuccess, showError } = useNotification();

  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false,
  });

  const errors = useMemo(() => {
    const passwordError = validatePassword(formData.password);
    let confirmError = requiredField(formData.confirmPassword, 'Confirm Password');

    if (!confirmError && formData.password !== formData.confirmPassword) {
      confirmError = 'Passwords do not match';
    }

    return {
      password: passwordError,
      confirmPassword: confirmError,
    };
  }, [formData]);

  const isFormValid = !errors.password && !errors.confirmPassword;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field: 'password' | 'confirmPassword') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ password: true, confirmPassword: true });

    if (!isFormValid) {
      showError("Please ensure your password meets the complexity requirements.");
      return;
    }

    if (!token) {
      showError("Invalid reset token.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.resetPassword({
        token,
        new_password: formData.password
      });

      if (response.success) {
        setIsSuccess(true);
        showSuccess(response.message || "Password reset successfully");
      } else {
        showError(response.message || "Invalid or expired reset token");
      }
    } catch (err: any) {
      const message = err.response?.data?.message || "Failed to reset password. Please request a new link.";
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/auth/login', { replace: true });
  };

  const inputClasses = (field: 'password' | 'confirmPassword') => `
    block w-full pl-10 pr-3 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-all
    ${touched[field] && errors[field as keyof typeof errors]
      ? 'border-adab-orange/50 focus:ring-2 focus:ring-adab-orange/20 focus:border-adab-orange'
      : 'border-gray-300 focus:ring-2 focus:ring-adab-green/20 focus:border-adab-green'}
  `;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-adab-green rounded-xl flex items-center justify-center text-white text-3xl font-bold shadow-xl">
            A
          </div>
        </div>

        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight uppercase tracking-widest opacity-90">
          {isSuccess ? 'Reset Complete' : 'Reset Password'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isSuccess
            ? 'Your account security has been updated.'
            : token ? 'Establish a new strong password for your portal account.' : 'Verify your reset link to continue.'
          }
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-2xl border border-gray-100 rounded-2xl sm:px-10">
          {!token ? (
            /* Invalid Token State */
            <div className="py-6 text-center animate-in zoom-in-95 duration-300">
              <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6 border border-red-100 shadow-inner">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-8">
                Invalid or expired reset link. Please request a new link to proceed with password recovery.
              </p>
              <Link to="/auth/forgot-password" university-tag="sm" className="w-full inline-flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-adab-orange hover:bg-orange-700 transition-all active:scale-[0.98]">
                Request New Link
              </Link>
            </div>
          ) : !isSuccess ? (
            /* Form State */
            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className={`h-4 w-4 transition-colors ${touched.password && errors.password ? 'text-adab-orange' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onBlur={() => handleBlur('password')}
                    onChange={handleChange}
                    className={inputClasses('password')}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                </div>
                {touched.password && errors.password && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-adab-orange animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.password}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className={`h-4 w-4 transition-colors ${touched.confirmPassword && errors.confirmPassword ? 'text-adab-orange' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onBlur={() => handleBlur('confirmPassword')}
                    onChange={handleChange}
                    className={inputClasses('confirmPassword')}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                </div>
                {touched.confirmPassword && errors.confirmPassword && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-adab-orange animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.confirmPassword}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!isFormValid || isLoading}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-base font-bold text-white transition-all transform active:scale-[0.98]
                    ${isFormValid && !isLoading
                      ? 'bg-adab-green hover:bg-green-800'
                      : 'bg-gray-300 cursor-not-allowed opacity-80'}`}
                >
                  {isLoading ? 'Processing...' : 'Reset Password'}
                </button>
              </div>

              <div className="mt-8 border-t border-gray-100 pt-8">
                <div className="text-center">
                  <Link to="/auth/login" className="text-sm font-bold text-adab-green hover:text-green-800 transition-colors inline-flex items-center gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    Back to Login
                  </Link>
                </div>
              </div>
            </form>
          ) : (
            /* Success State */
            <div className="flex flex-col items-center py-4 animate-in zoom-in-95 duration-300">
              <div className="mb-6 flex items-center justify-center w-20 h-20 bg-green-50 rounded-full border border-green-100 shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-adab-green" />
              </div>

              <div className="text-center mb-8">
                <h3 className="text-lg font-bold text-gray-900">Security Updated</h3>
                <p className="text-sm text-gray-500 mt-2">Your password has been successfully reset. You can now access your dashboard using your new credentials.</p>
              </div>

              <button
                type="button"
                onClick={handleGoToLogin}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-base font-bold text-white bg-adab-green hover:bg-green-800 transition-all active:scale-[0.98]"
              >
                Return to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;