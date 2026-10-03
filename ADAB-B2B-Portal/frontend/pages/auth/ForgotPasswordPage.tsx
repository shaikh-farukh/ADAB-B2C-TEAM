import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, AlertCircle, ChevronLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { validateEmail } from '../../utils/validation';
import { useNotification } from '../../context/NotificationContext';
import authService from '../../services/authService';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const emailError = useMemo(() => {
    return touchedEmail ? validateEmail(email) : null;
  }, [email, touchedEmail]);

  const isEmailValid = validateEmail(email) === null;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouchedEmail(true);
    if (!isEmailValid) {
      showError("Please enter a valid work email address");
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.forgotPassword(email);
      if (response.success) {
        setLinkSent(true);
        showSuccess(response.message || "A password reset link has been sent to your email address.");
      } else {
        showError(response.message || "Unable to send reset link. Please try again.");
      }
    } catch (err: any) {
      const message = err.response?.data?.message || "Internal system error. Please try again later.";
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans animate-in fade-in duration-500">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-adab-green rounded-xl flex items-center justify-center text-white text-3xl font-bold shadow-xl">
            A
          </div>
        </div>

        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Account Recovery
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Restore access to your ADAB B2B Portal account.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-2xl border border-gray-100 rounded-2xl sm:px-10">
          {!linkSent ? (
            <form className="space-y-6" onSubmit={handleSendCode} noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className={`h-4 w-4 transition-colors ${emailError ? 'text-adab-orange' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onBlur={() => setTouchedEmail(true)}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-all
                      ${emailError
                        ? 'border-adab-orange/50 focus:ring-adab-orange/20 focus:border-adab-orange'
                        : 'border-gray-300 focus:ring-adab-green/20 focus:border-adab-green'}`}
                    placeholder="name@company.com"
                    disabled={isLoading}
                  />
                </div>
                {emailError && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-adab-orange animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {emailError}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!isEmailValid || isLoading}
                  className={`w-full flex items-center justify-center py-3 px-4 rounded-xl shadow-lg text-base font-bold text-white transition-all transform active:scale-[0.98]
                    ${isEmailValid && !isLoading
                      ? 'bg-adab-green hover:bg-green-800'
                      : 'bg-gray-300 cursor-not-allowed opacity-80'}`}
                >
                  {isLoading ? 'Processing...' : 'Send Recovery Link'}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <div className="py-4 text-center animate-in zoom-in-95 duration-300">
              <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-adab-green mb-6 border border-green-100 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Check Your Inbox</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                A password reset link has been sent to your email address. Please follow the instructions to establish a new password.
              </p>
              <div className="mt-8 pt-8 border-t border-gray-50">
                <button
                  onClick={() => setLinkSent(false)}
                  className="text-xs font-bold text-adab-orange hover:text-orange-700 uppercase tracking-widest transition-colors"
                >
                  Try a different email
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-gray-100 pt-8">
            <div className="text-center">
              <Link to="/auth/login" className="text-sm font-bold text-adab-green hover:text-green-800 transition-colors inline-flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;