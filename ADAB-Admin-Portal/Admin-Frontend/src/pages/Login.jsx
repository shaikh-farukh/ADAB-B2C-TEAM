import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import apiClient from '../api/apiClient';

export default function Login({ initialMode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const resolveModeFromPath = (pathname) => {
    if (pathname === '/signup') return 'SIGNUP';
    if (pathname === '/forgot-password') return 'FORGOT';
    if (pathname === '/reset-password') return 'RESET';
    return 'LOGIN';
  };

  // Mode: 'LOGIN' | 'SIGNUP' | 'FORGOT' | 'RESET'
  const [mode, setMode] = useState(
    initialMode || resolveModeFromPath(location.pathname)
  );

  // Login Method when mode === 'LOGIN': 'PASSWORD' | 'OTP'
  const [loginMethod, setLoginMethod] = useState('PASSWORD');

  // OTP Step when loginMethod === 'OTP': 'EMAIL' | 'VERIFY'
  const [otpStep, setOtpStep] = useState('EMAIL');

  // Form Fields (always start completely empty)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  // Prevent browser password-manager autofill on initial load / after logout
  const [inputsUnlocked, setInputsUnlocked] = useState(false);

  // Status States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const clearAllFields = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setOtp('');
    setInputsUnlocked(false);
  };

  useEffect(() => {
    const nextMode = initialMode || resolveModeFromPath(location.pathname);
    setMode(nextMode);

    if (nextMode === 'RESET') {
      const qEmail = searchParams.get('email') || '';
      const qCode = searchParams.get('code') || '';
      if (qEmail) setEmail(qEmail);
      if (qCode) setOtp(qCode.replace(/\D/g, '').slice(0, 6));
      setPassword('');
      setConfirmPassword('');
    } else {
      clearAllFields();
    }
  }, [location.pathname, initialMode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const switchMode = (nextMode, preserveMessages = false) => {
    clearAllFields();
    setMode(nextMode);
    if (!preserveMessages) {
      setError('');
      setInfoMessage('');
    }
    setOtpStep('EMAIL');
    const pathMap = {
      LOGIN: '/login',
      SIGNUP: '/signup',
      FORGOT: '/forgot-password',
      RESET: '/reset-password'
    };
    navigate(pathMap[nextMode] || '/login', { replace: true });
  };

  // ─── 1. SIGN UP (First Name, Last Name, Email, Password) ───
  const handleSignup = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('Please enter your first name, last name, email, and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const res = await apiClient.post('/auth/signup', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password
      });

      if (res.data && res.data.token) {
        clearAllFields();
        localStorage.setItem('token', res.data.token);
        sessionStorage.setItem('admin_authenticated', 'true');
        if (res.data.user) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
        }
        navigate('/');
      } else {
        clearAllFields();
        setInfoMessage('Account created successfully. Please sign in.');
        switchMode('LOGIN', true);
      }
    } catch (err) {
      console.error('Signup error:', err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      setError(serverMsg || 'Failed to register administrator account.');
    } finally {
      setLoading(false);
    }
  };

  // ─── 2. LOGIN OPTION A: EMAIL & PASSWORD ───
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const res = await apiClient.post('/auth/login', {
        email: email.trim(),
        password
      });

      if (res.data && res.data.token) {
        clearAllFields();
        localStorage.setItem('token', res.data.token);
        sessionStorage.setItem('admin_authenticated', 'true');
        if (res.data.user) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
        }
        navigate('/');
      } else {
        setError('Login succeeded, but no session token was returned.');
      }
    } catch (err) {
      console.error('Password login error:', err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      setError(serverMsg || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // ─── 3. LOGIN OPTION B: EMAIL WITH OTP (2-STEP) ───
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your administrator email address.');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const res = await apiClient.post('/auth/otp/request', {
        email: trimmedEmail
      });

      if (res.data && res.data.success) {
        setOtpStep('VERIFY');
        setOtp('');
        setResendCooldown(30);
        setInfoMessage(res.data.message || `A 6-digit verification code has been sent to ${trimmedEmail}`);
      } else {
        setError(res.data?.message || 'Failed to send verification code.');
      }
    } catch (err) {
      console.error('OTP request error:', err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      setError(serverMsg || 'Failed to send verification code. Please check your email and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.replace(/\D/g, '').trim();
    if (cleanOtp.length !== 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiClient.post('/auth/otp/verify', {
        email: email.trim(),
        otp: cleanOtp
      });

      if (res.data && res.data.token) {
        clearAllFields();
        localStorage.setItem('token', res.data.token);
        sessionStorage.setItem('admin_authenticated', 'true');
        if (res.data.user) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
        }
        navigate('/');
      } else {
        setError('OTP verification succeeded, but no session token was returned.');
      }
    } catch (err) {
      console.error('OTP verify error:', err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      setError(serverMsg || 'Invalid or expired verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── 4. FORGOT PASSWORD & RESET PASSWORD ───
  const handleForgotPassword = async (e) => {
    if (e) e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const res = await apiClient.post('/auth/forgot-password', {
        email: trimmedEmail,
        origin: window.location.origin
      });

      if (res.data && res.data.success) {
        setOtp('');
        setPassword('');
        setConfirmPassword('');
        setResendCooldown(30);
        setInfoMessage(res.data.message || `Password reset code sent to ${trimmedEmail}`);
        setMode('RESET');
      } else {
        setError(res.data?.message || 'Failed to send password reset email.');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      setError(serverMsg || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const cleanCode = otp.replace(/\D/g, '').trim();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (cleanCode.length !== 6) {
      setError('Please enter the 6-digit password reset code sent to your email.');
      return;
    }
    if (!password || password.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiClient.post('/auth/reset-password', {
        email: email.trim(),
        code: cleanCode,
        new_password: password
      });

      if (res.data && res.data.success) {
        clearAllFields();
        setLoginMethod('PASSWORD');
        setMode('LOGIN');
        setError('');
        setInfoMessage(res.data.message || 'Password reset successfully! Please sign in with your new password.');
        navigate('/login', { replace: true });
      } else {
        setError(res.data?.message || 'Failed to reset password.');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      setError(serverMsg || 'Invalid or expired reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/dev-login');
      if (res.data && res.data.token) {
        clearAllFields();
        localStorage.setItem('token', res.data.token);
        sessionStorage.setItem('admin_authenticated', 'true');
        navigate('/');
      }
    } catch (_) {
      setError('Development auto-login is not available.');
    } finally {
      setLoading(false);
    }
  };

  const getSubtitle = () => {
    if (mode === 'SIGNUP') return 'Create Administrator Account';
    if (mode === 'FORGOT') return 'Forgot Password — Account Recovery';
    if (mode === 'RESET') return 'Set New Administrator Password';
    return 'Enterprise Platform Authentication';
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl border border-slate-100 space-y-5">
        {/* Brand Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-slate-900 leading-tight">ADAB Admin Portal</h1>
            <p className="text-xs text-indigo-600 font-semibold">{getSubtitle()}</p>
          </div>
        </div>

        {/* Error & Info Alerts */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-start gap-2">
            <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-700 font-semibold flex items-start gap-2">
            <i className="fa-solid fa-envelope-circle-check mt-0.5"></i>
            <span>{infoMessage}</span>
          </div>
        )}

        {/* ───────────────── 1. SIGN UP PAGE FORM ───────────────── */}
        {mode === 'SIGNUP' ? (
          <form onSubmit={handleSignup} autoComplete="off" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">First Name</label>
                <input
                  type="text"
                  name="admin_signup_first_name"
                  autoComplete="off"
                  readOnly={!inputsUnlocked}
                  onFocus={() => setInputsUnlocked(true)}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Last Name</label>
                <input
                  type="text"
                  name="admin_signup_last_name"
                  autoComplete="off"
                  readOnly={!inputsUnlocked}
                  onFocus={() => setInputsUnlocked(true)}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
              <input
                type="email"
                name="admin_signup_email"
                autoComplete="off"
                readOnly={!inputsUnlocked}
                onFocus={() => setInputsUnlocked(true)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
              <input
                type="password"
                name="admin_signup_password"
                autoComplete="new-password"
                readOnly={!inputsUnlocked}
                onFocus={() => setInputsUnlocked(true)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min. 6 chars)"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <p className="text-center text-xs text-slate-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('LOGIN')}
                className="font-bold text-indigo-600 hover:text-indigo-800"
              >
                Sign In
              </button>
            </p>
          </form>
        ) : mode === 'FORGOT' ? (
          /* ───────────────── 2. FORGOT PASSWORD PAGE FORM ───────────────── */
          <form onSubmit={handleForgotPassword} autoComplete="off" className="space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Enter your registered email address and we will send a password reset email with a 6-digit recovery code to your inbox.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Admin Email Address</label>
              <input
                type="email"
                name="admin_forgot_email"
                autoComplete="off"
                readOnly={!inputsUnlocked}
                onFocus={() => setInputsUnlocked(true)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Sending Reset Email...' : 'Send Reset Email'}
            </button>

            <p className="text-center text-xs text-slate-500">
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => switchMode('LOGIN')}
                className="font-bold text-indigo-600 hover:text-indigo-800"
              >
                Back to Sign In
              </button>
            </p>
          </form>
        ) : mode === 'RESET' ? (
          /* ───────────────── 3. RESET PASSWORD PAGE FORM ───────────────── */
          <form onSubmit={handleResetPassword} autoComplete="off" className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Admin Email Address</label>
              <input
                type="email"
                name="admin_reset_email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">6-Digit Reset Code (from Email)</label>
              <input
                type="text"
                name="admin_reset_code"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-center font-mono text-lg font-extrabold tracking-[0.4em] text-slate-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">New Password</label>
              <input
                type="password"
                name="admin_reset_new_password"
                autoComplete="new-password"
                readOnly={!inputsUnlocked}
                onFocus={() => setInputsUnlocked(true)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min. 6 chars)"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Confirm New Password</label>
              <input
                type="password"
                name="admin_reset_confirm_password"
                autoComplete="new-password"
                readOnly={!inputsUnlocked}
                onFocus={() => setInputsUnlocked(true)}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Saving New Password...' : 'Reset Password'}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading || resendCooldown > 0}
                className="font-semibold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Reset Code'}
              </button>

              <button
                type="button"
                onClick={() => switchMode('LOGIN')}
                className="font-bold text-slate-600 hover:text-slate-900"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          /* ───────────────── 4. LOGIN PAGE FORM ───────────────── */
          <div className="space-y-4">
            {/* Two Login Method Options: Email & Password vs Email with OTP (2-Step) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  clearAllFields();
                  setLoginMethod('PASSWORD');
                  setError('');
                  setInfoMessage('');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${loginMethod === 'PASSWORD'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <i className="fa-solid fa-lock"></i>
                <span>Email &amp; Password</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  clearAllFields();
                  setLoginMethod('OTP');
                  setOtpStep('EMAIL');
                  setError('');
                  setInfoMessage('');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${loginMethod === 'OTP'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <i className="fa-solid fa-envelope-open-text"></i>
                <span>Email OTP (2-Step)</span>
              </button>
            </div>

            {loginMethod === 'PASSWORD' ? (
              /* Option 1: Email + Password Login */
              <form onSubmit={handlePasswordLogin} autoComplete="off" className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Admin Email Address</label>
                  <input
                    type="email"
                    name="admin_login_email"
                    autoComplete="off"
                    readOnly={!inputsUnlocked}
                    onFocus={() => setInputsUnlocked(true)}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Password</label>
                    <button
                      type="button"
                      onClick={() => switchMode('FORGOT')}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    name="admin_login_password"
                    autoComplete="new-password"
                    readOnly={!inputsUnlocked}
                    onFocus={() => setInputsUnlocked(true)}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            ) : otpStep === 'EMAIL' ? (
              /* Option 2 (Step 1): Request Email OTP */
              <form onSubmit={handleRequestOtp} autoComplete="off" className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Step 1 of 2: Admin Email Address
                  </label>
                  <input
                    type="email"
                    name="admin_otp_email"
                    autoComplete="off"
                    readOnly={!inputsUnlocked}
                    onFocus={() => setInputsUnlocked(true)}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-600 leading-relaxed">
                  <i className="fa-solid fa-mobile-screen-button text-indigo-600 mr-1.5"></i>
                  We will send a 6-digit verification code to your email inbox on your phone.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Sending OTP...' : 'Sign In with OTP'}
                </button>
              </form>
            ) : (
              /* Option 2 (Step 2): Verify 6-Digit Email OTP */
              <form onSubmit={handleVerifyOtp} autoComplete="off" className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Step 2 of 2: 6-Digit Verification Code
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setOtp('');
                        setOtpStep('EMAIL');
                        setError('');
                        setInfoMessage('');
                      }}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Change Email
                    </button>
                  </div>
                  <input
                    type="text"
                    name="admin_otp_code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    required
                    autoFocus
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-center font-mono text-xl font-extrabold tracking-[0.5em] text-slate-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400">Didn&apos;t receive the code?</span>
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={loading || resendCooldown > 0}
                    className="font-semibold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )}

            <p className="text-center text-xs text-slate-500 pt-1">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('SIGNUP')}
                className="font-bold text-indigo-600 hover:text-indigo-800"
              >
                Sign Up
              </button>
            </p>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Development Mode</span>
          <button
            onClick={handleDevLogin}
            disabled={loading}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Quick Dev Session →
          </button>
        </div>
      </div>
    </div>
  );
}
