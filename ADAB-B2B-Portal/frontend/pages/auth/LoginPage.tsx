import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, ShieldCheck, ArrowRight, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { validateEmail, validatePassword } from '../../utils/validation';
import { useNotification } from '../../context/NotificationContext';
import { useAuthStore } from '../../store/useAuthStore';
import authService from '../../services/authService';
import { useGoogleLogin } from '@react-oauth/google';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const { setLoggedIn, setRole } = useAuthStore();

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        const response = await authService.googleLogin(tokenResponse.access_token, { action: 'login' });
        if (response.success && response.data) {
          const { token, user } = response.data;
          const businessType = user.business_type;
          const derivedRole = user.role || (businessType?.toLowerCase() === 'manufacturer' ? 'manufacturer' : 'distributor');

          // token is handled via HttpOnly cookie
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('user_role', derivedRole);

          setRole(derivedRole);
          setLoggedIn(true);

          showSuccess(response.message || 'Google login successful');
          navigate(`/${derivedRole}/dashboard`, { replace: true });
        } else {
          showError(response.message || 'Google login failed');
        }
      } catch (err: any) {
        const message = err.response?.data?.message || 'Google authentication failed';
        showError(message);
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => showError('Google login failed')
  });

  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [errors, setErrors] = useState({ email: '', password: '' });

  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [touchedOtp, setTouchedOtp] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setErrors({
      email: validateEmail(email) || '',
      password: password ? '' : 'Password is required',
    });
  }, [email, password]);

  const isPasswordFormValid = !errors.email && !errors.password;
  const isOtpEmailValid = !errors.email;
  const isOtpComplete = otp.every((digit) => digit !== '' && /^\d$/.test(digit));

  const handleBlur = (field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!isPasswordFormValid) {
      showError('Please fill all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.login({ email, password });

      if (response.success && response.data) {
        const { token, user } = response.data;
        const businessType = user.business_type;
        const derivedRole = user.role || (businessType?.toLowerCase() === 'manufacturer' ? 'manufacturer' : 'distributor');

        // token is handled via HttpOnly cookie
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('user_role', derivedRole);

        setRole(derivedRole);
        setLoggedIn(true);

        showSuccess(response.message || 'Login successful');
        navigate(`/${derivedRole}/dashboard`, { replace: true });
      } else {
        showError(response.message || 'Invalid credentials');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Internal system error. Please try again later.';
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched((prev) => ({ ...prev, email: true }));
    if (!isOtpEmailValid) {
      showError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.requestOtp(email);
      if (response.success) {
        setOtpStep(2);
        showSuccess(response.message || 'OTP code sent to email');
      } else {
        showError(response.message || 'Failed to send OTP code');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error transmitting OTP request';
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouchedOtp(true);
    if (!isOtpComplete) {
      showError('Please complete the OTP verification');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.verifyOtp({ email, otp: otp.join('') });
      if (response.success && response.data) {
        const { token, user } = response.data;
        const businessType = user.business_type;
        const derivedRole = user.role || (businessType?.toLowerCase() === 'manufacturer' ? 'manufacturer' : 'distributor');

        // token is handled via HttpOnly cookie
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('user_role', derivedRole);

        setRole(derivedRole);
        setLoggedIn(true);

        showSuccess(response.message || 'Authenticated successfully');
        navigate(`/${derivedRole}/dashboard`, { replace: true });
      } else {
        showError(response.message || 'OTP verification failed');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Invalid code or connection error';
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    const newOtp = [...otp];
    pastedData.forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);
    const nextIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  const showEmailError = touched.email && !!errors.email;
  const showPasswordError = touched.password && !!errors.password;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans animate-in fade-in duration-500">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex items-center gap-3 group">
            <div className="w-14 h-14 bg-adab-green rounded-2xl flex items-center justify-center shadow-xl shadow-adab-green/20">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-black tracking-tighter text-gray-900 leading-none">
                ada<span className="text-adab-green">B</span>
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                Enterprise Portal
              </span>
            </div>
          </div>
        </div>
        <h2 className="mt-8 text-center text-3xl font-extrabold text-gray-900 tracking-tight">Welcome Back</h2>
        <p className="mt-2 text-center text-sm text-gray-500">Secure access to your B2B dashboard.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl border border-gray-100 rounded-2xl sm:px-10">
          <div className="flex p-1 bg-gray-100 rounded-xl mb-8">
            <button
              onClick={() => {
                setLoginMode('password');
                setOtpStep(1);
              }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all
                ${loginMode === 'password' ? 'bg-white text-adab-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              disabled={isLoading}
            >
              Password
            </button>
            <button
              onClick={() => {
                setLoginMode('otp');
                setOtpStep(1);
              }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all
                ${loginMode === 'otp' ? 'bg-white text-adab-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              disabled={isLoading}
            >
              OTP Code
            </button>
          </div>

          {loginMode === 'password' ? (
            <form className="space-y-6" onSubmit={handlePasswordSubmit} noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className={`h-4 w-4 transition-colors ${showEmailError ? 'text-adab-orange' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onBlur={() => handleBlur('email')}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-all
                      ${showEmailError
                        ? 'border-adab-orange/50 focus:ring-adab-orange/20 focus:border-adab-orange'
                        : 'border-gray-300 focus:ring-adab-green/20 focus:border-adab-green'}`}
                    placeholder="name@company.com"
                    disabled={isLoading}
                  />
                </div>
                {showEmailError && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-adab-orange animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.email}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <div className="text-sm">
                    <Link to="/auth/forgot-password" university-tag="forgot-password" className="font-medium text-adab-green hover:text-green-800 transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className={`h-4 w-4 transition-colors ${showPasswordError ? 'text-adab-orange' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onBlur={() => handleBlur('password')}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`block w-full pl-10 pr-12 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-all
                      ${showPasswordError
                        ? 'border-adab-orange/50 focus:ring-adab-orange/20 focus:border-adab-orange'
                        : 'border-gray-300 focus:ring-adab-green/20 focus:border-adab-green'}`}
                    placeholder="Password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-adab-green transition-colors disabled:cursor-not-allowed"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {showPasswordError && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-adab-orange animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.password}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!isPasswordFormValid || isLoading}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-base font-bold text-white transition-all transform
                    ${isPasswordFormValid && !isLoading
                      ? 'bg-adab-green hover:bg-green-800 active:scale-[0.98]'
                      : 'bg-gray-300 cursor-not-allowed opacity-80'}`}
                >
                  {isLoading ? 'Processing...' : 'Sign In to Portal'}
                </button>
              </div>
            </form>
          ) : (
            <div className="animate-in slide-in-from-right-4 duration-300">
              {otpStep === 1 ? (
                <form className="space-y-6" onSubmit={handleSendOtp} noValidate>
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Work Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className={`h-4 w-4 transition-colors ${showEmailError ? 'text-adab-orange' : 'text-gray-400'}`} />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={email}
                        onBlur={() => handleBlur('email')}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-all
                          ${showEmailError
                            ? 'border-adab-orange/50 focus:ring-adab-orange/20 focus:border-adab-orange'
                            : 'border-gray-300 focus:ring-adab-green/20 focus:border-adab-green'}`}
                        placeholder="name@company.com"
                        disabled={isLoading}
                      />
                    </div>
                    {showEmailError && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-adab-orange">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.email}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={!isOtpEmailValid || isLoading}
                      className={`w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-base font-bold text-white transition-all transform
                        ${isOtpEmailValid && !isLoading
                          ? 'bg-adab-green hover:bg-green-800 active:scale-[0.98]'
                          : 'bg-gray-300 cursor-not-allowed opacity-80'}`}
                    >
                      {isLoading ? 'Sending...' : 'Send OTP Code'}
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                <form className="space-y-6" onSubmit={handleVerifyOtp} noValidate>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 text-adab-green mb-4">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 mb-6">
                      Enter the 6-digit code sent to <br />
                      <span className="font-bold text-gray-900">{email}</span>
                    </p>
                  </div>

                  <div className="flex justify-between gap-2 sm:gap-3">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          otpInputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(e.target.value, index)}
                        onKeyDown={(e) => handleOtpKeyDown(e, index)}
                        onPaste={index === 0 ? handleOtpPaste : undefined}
                        className="w-full h-12 text-center text-xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-adab-green/20 focus:border-adab-green outline-none transition-all"
                        disabled={isLoading}
                      />
                    ))}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={!isOtpComplete || isLoading}
                      className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-base font-bold text-white transition-all transform
                        ${isOtpComplete && !isLoading
                          ? 'bg-adab-green hover:bg-green-800 active:scale-[0.98]'
                          : 'bg-gray-300 cursor-not-allowed opacity-80'}`}
                    >
                      {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                    </button>
                  </div>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setOtpStep(1)}
                      className="text-xs font-bold text-gray-400 hover:text-adab-green uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto"
                      disabled={isLoading}
                    >
                      <ChevronLeft className="w-3 h-3" />
                      Back to email
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => googleLogin()}
                className="w-full flex justify-center py-2.5 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-100 pt-8">
            <div className="text-center">
              <span className="text-sm text-gray-500">New to ADAB Portal? </span>
              <Link to="/auth/signup" className="text-sm font-bold text-adab-green hover:text-green-800 transition-colors">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
