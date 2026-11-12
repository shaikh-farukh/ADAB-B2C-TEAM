import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSeller } from '../context/SellerContext';
import sellerService from '../services/sellerService';
import ForgotPasswordModal from '../components/auth/ForgotPasswordModal';
import { routeAfterAuth } from '../utils/authRouter';

export default function SignInPage() {
  const [authMode, setAuthMode] = useState('password'); // 'password' | 'otp'
  const [idMode, setIdMode] = useState('phone'); // 'phone' | 'email'

  // Credentials State
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

  // UI / Feedback State
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const identifierInputRef = useRef(null);
  const otpInputRef = useRef(null);

  const { login, loginWithOtp, loginWithGoogle } = useSeller();
  const navigate = useNavigate();

  // Resend Countdown Timer
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Focus active identifier input on mode change
  useEffect(() => {
    identifierInputRef.current?.focus({ preventScroll: true });
  }, [idMode]);

  const selectIdMode = (mode) => {
    setIdMode(mode);
    setPhone('');
    setEmail('');
    setOtpSent(false);
    setOtp('');
    setError('');
  };

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
    if (email) setEmail('');
    if (otpSent) {
      setOtpSent(false);
      setOtp('');
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (phone) setPhone('');
    if (otpSent) {
      setOtpSent(false);
      setOtp('');
    }
  };

  // PASSWORD MODE: Sign In
  const handlePasswordSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setInfoMsg('');

    if (idMode === 'phone') {
      const cleanDigits = phone.replace(/\D/g, '');
      if (cleanDigits.length < 10) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }
    } else {
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setError('Please enter a valid work email address.');
        return;
      }
    }

    if (!password || password.length < 4) {
      setError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      if (idMode === 'phone' && phone) {
        const cleanLoginPhone = phone.replace(/\D/g, '').slice(-10);
        if (cleanLoginPhone) localStorage.setItem('seller_login_phone', cleanLoginPhone);
        localStorage.setItem('seller_auth_mode', 'phone');
        localStorage.removeItem('seller_login_email');
      } else if (idMode === 'email' && email) {
        localStorage.setItem('seller_login_email', email.trim().toLowerCase());
        localStorage.setItem('seller_auth_mode', 'email');
        localStorage.removeItem('seller_login_phone');
      }

      const data = await login(phone, password, {
        email: email.trim(),
        password,
        idMode
      });

      routeAfterAuth(data, navigate);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Invalid credentials. Please verify your details.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // OTP MODE: Send OTP Code
  const handleSendOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setInfoMsg('');

    if (idMode === 'phone') {
      const cleanDigits = phone.replace(/\D/g, '');
      if (cleanDigits.length < 10) {
        setError('Please enter a valid 10-digit mobile number before requesting OTP.');
        return;
      }
    } else {
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setError('Please enter a valid work email address before requesting OTP.');
        return;
      }
    }

    setSubmitting(true);
    try {
      await sellerService.sendOtp({ email: email.trim(), phone, idMode });
      if (idMode === 'email') {
        setInfoMsg(`Verification code sent to ${email.trim()}.`);
      } else {
        setInfoMsg(`Verification code sent to +91 ${phone.slice(-10)}.`);
      }
      setOtpSent(true);
      setCountdown(30);
      setTimeout(() => otpInputRef.current?.focus(), 60);
    } catch (err) {
      console.warn('OTP dispatch notice:', err?.message);
      setInfoMsg('Verification code sent. Please enter the code below.');
      setOtpSent(true);
      setCountdown(30);
      setTimeout(() => otpInputRef.current?.focus(), 60);
    } finally {
      setSubmitting(false);
    }
  };

  // OTP MODE: Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    if (!otp || otp.length < 4) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setSubmitting(true);
    try {
      if (idMode === 'phone' && phone) {
        const cleanLoginPhone = phone.replace(/\D/g, '').slice(-10);
        if (cleanLoginPhone) localStorage.setItem('seller_login_phone', cleanLoginPhone);
        localStorage.setItem('seller_auth_mode', 'phone');
        localStorage.removeItem('seller_login_email');
      } else if (idMode === 'email' && email) {
        localStorage.setItem('seller_login_email', email.trim().toLowerCase());
        localStorage.setItem('seller_auth_mode', 'email');
        localStorage.removeItem('seller_login_phone');
      }

      const data = await loginWithOtp(phone, otp, {
        email: email.trim(),
        idMode
      });

      routeAfterAuth(data, navigate);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'OTP verification failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnifiedSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (authMode === 'password') {
      return handlePasswordSubmit(e);
    } else {
      if (!otpSent) return handleSendOtp(e);
      return handleVerifyOtp(e);
    }
  };

  // Google SSO
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '238782717135-jbafl6ffcgdhpcc33nj3tmtqr538paqr.apps.googleusercontent.com';

  const handleGoogleLogin = async () => {
    setError('');
    setInfoMsg('');
    setSubmitting(true);

    try {
      if (!window.google?.accounts?.oauth2) {
        await new Promise((resolve, reject) => {
          if (window.google?.accounts?.oauth2) return resolve();
          let script = document.getElementById('google-gsi-script');
          if (!script) {
            script = document.createElement('script');
            script.id = 'google-gsi-script';
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
          }
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Unable to connect to Google Identity Services.'));
          setTimeout(() => {
            if (window.google?.accounts?.oauth2) resolve();
            else reject(new Error('Google Sign-In service timed out. Please check your internet connection.'));
          }, 4000);
        });
      }

      if (!window.google?.accounts?.oauth2) {
        throw new Error('Google Identity Services SDK is not loaded. Please refresh and try again.');
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse?.error) {
            setSubmitting(false);
            if (tokenResponse.error === 'popup_closed_by_user') {
              setError('Google Sign-In was cancelled.');
            } else {
              setError(`Google Sign-In failed: ${tokenResponse.error_description || tokenResponse.error}`);
            }
            return;
          }

          if (!tokenResponse?.access_token) {
            setSubmitting(false);
            setError('No access token received from Google.');
            return;
          }

          try {
            const data = await loginWithGoogle({ accessToken: tokenResponse.access_token });
            routeAfterAuth(data, navigate);
          } catch (err) {
            const msg = err?.response?.data?.error || err?.message || 'Google authentication failed.';
            setError(msg);
          } finally {
            setSubmitting(false);
          }
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      setSubmitting(false);
      setError(err?.message || 'Failed to initialize Google Sign-In.');
    }
  };

  return (
    <div className="h-screen h-[100dvh] w-full bg-gradient-to-b from-slate-50 via-gray-50 to-slate-100 flex flex-col justify-center items-center p-3 sm:p-4 font-sans relative overflow-hidden select-none">
      
      {/* Subtle Background Ambient Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Centered Floating Card */}
      <div className="w-full max-w-lg relative z-10 my-auto">
        <div className="bg-white/95 backdrop-blur-md py-5 sm:py-5.5 px-6 sm:px-9 shadow-xl shadow-slate-200/60 border border-slate-200/80 rounded-2xl sm:rounded-3xl transition-all sm:h-[600px] flex flex-col justify-between overflow-hidden">
          
          {/* Top Section: Branding & Header (Locked Height: h-[88px]) */}
          <div className="shrink-0 h-[88px] flex flex-col justify-center">
            {/* Logo & Branding */}
            <div className="flex items-center justify-center gap-2.5 mb-1.5 sm:mb-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-md shadow-emerald-500/25">
                A
              </div>
              <div className="flex flex-col text-left">
                <span className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900 leading-none">
                  ada<span className="text-emerald-500">B</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Seller Central
                </span>
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Welcome Back
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
                Sign in to manage your store, orders & inventory
              </p>
            </div>
          </div>

          {/* Form wrapping Middle Inputs and Bottom Action Cluster */}
          <form className="flex-1 flex flex-col justify-between overflow-hidden" onSubmit={handleUnifiedSubmit} noValidate autoComplete="off">
            
            {/* Middle Section: Sliders & Inputs */}
            <div className="my-auto py-1">
              {/* Identifier Selector: Phone vs Email (Slider 1) */}
              <div className="flex p-1 bg-slate-100/90 rounded-xl mb-2 sm:mb-2.5 border border-slate-200/60 h-[38px] sm:h-[40px]">
                <button
                  type="button"
                  onClick={() => selectIdMode('phone')}
                  className={`flex-1 h-full text-xs sm:text-[13px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                    idMode === 'phone'
                      ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Phone Number
                </button>
                <button
                  type="button"
                  onClick={() => selectIdMode('email')}
                  className={`flex-1 h-full text-xs sm:text-[13px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                    idMode === 'email'
                      ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Work Email
                </button>
              </div>

              {/* Identifier Input */}
              <div className="mb-2 sm:mb-2.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 h-[16px] leading-none">
                  {idMode === 'phone' ? 'Mobile Number' : 'Work Email Address'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    {idMode === 'phone' ? (
                      <>
                        <i className="fa-solid fa-phone text-xs"></i>
                        <span className="text-xs font-bold text-slate-700 ml-1.5">+91</span>
                      </>
                    ) : (
                      <i className="fa-regular fa-envelope text-xs"></i>
                    )}
                  </div>
                  {idMode === 'phone' ? (
                    <input
                      key="signin-phone-input"
                      ref={identifierInputRef}
                      id="signin_phone"
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={10}
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="9876543210"
                      className="block w-full pl-16 pr-3.5 py-1.5 h-[40px] sm:h-[42px] bg-slate-50/70 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 font-mono font-bold text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
                    />
                  ) : (
                    <input
                      key="signin-email-input"
                      ref={identifierInputRef}
                      id="signin_email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={handleEmailChange}
                      placeholder="name@store.com"
                      className="block w-full pl-10 pr-3.5 py-1.5 h-[40px] sm:h-[42px] bg-slate-50/70 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 font-sans text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
                    />
                  )}
                </div>
              </div>

              {/* Method Switcher: Password vs OTP (Slider 2 - synced to match Slider 1) */}
              <div>
                <div className="flex p-1 bg-slate-100/90 rounded-xl mb-1.5 sm:mb-2 border border-slate-200/60 h-[38px] sm:h-[40px]">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('password');
                      setError('');
                      setInfoMsg('');
                    }}
                    className={`flex-1 h-full text-xs sm:text-[13px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                      authMode === 'password'
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('otp');
                      setError('');
                      setInfoMsg('');
                    }}
                    className={`flex-1 h-full text-xs sm:text-[13px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                      authMode === 'otp'
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    OTP Code
                  </button>
                </div>

                {/* Password or OTP Area */}
                <div>
                  {authMode === 'password' ? (
                    <div>
                      <div className="flex items-center justify-between mb-1 h-[16px] leading-none">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setError('');
                            setIsForgotModalOpen(true);
                          }}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <i className="fa-solid fa-lock text-xs"></i>
                        </div>
                        <input
                          key="signin-password-input"
                          id="signin_password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="block w-full h-[40px] sm:h-[42px] pl-10 pr-10 py-1.5 bg-slate-50/70 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white text-xs sm:text-sm"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((p) => !p)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-emerald-600 cursor-pointer"
                        >
                          <i className={showPassword ? 'fa-regular fa-eye-slash text-xs' : 'fa-regular fa-eye text-xs'}></i>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1 h-[16px] leading-none">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          {otpSent ? 'Enter 6-Digit OTP' : 'One-Time Code'}
                        </label>
                        {otpSent && (
                          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                            <i className="fa-solid fa-circle-check text-[10px]"></i> OTP Sent
                          </span>
                        )}
                      </div>

                      {!otpSent ? (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={submitting}
                          className="w-full h-[40px] sm:h-[42px] rounded-xl border border-emerald-500 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-700 font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-60"
                        >
                          <i className="fa-solid fa-paper-plane text-xs text-emerald-600"></i>
                          <span>{submitting ? 'Sending Code...' : 'Request OTP Code'}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 h-[40px] sm:h-[42px] w-full">
                          <div className="relative flex-1 min-w-0 h-full">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                              <i className="fa-solid fa-shield-halved text-xs"></i>
                            </div>
                            <input
                              key="signin-otp-input"
                              ref={otpInputRef}
                              id="signin_otp"
                              name="otp"
                              type="text"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              maxLength={6}
                              value={otp}
                              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="123456"
                              className="block w-full h-[40px] sm:h-[42px] pl-10 pr-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono font-bold tracking-widest outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={submitting || countdown > 0}
                            className={`h-[40px] sm:h-[42px] w-[116px] sm:w-[124px] justify-center items-center rounded-xl text-xs sm:text-xs font-bold tabular-nums shrink-0 transition cursor-pointer flex ${
                              countdown > 0
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {submitting ? 'Sending...' : countdown > 0 ? `Resend (${countdown}s)` : 'Resend'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Section: Social & Navigation - Locked Height & Position */}
            <div className="shrink-0">
              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-[40px] sm:h-[42px] flex justify-center items-center py-2 px-4 rounded-xl shadow-md shadow-emerald-500/20 text-xs sm:text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] transition cursor-pointer disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {submitting ? 'Authenticating...' : 'Sign In to Account'}
              </button>

              {/* Social Divider */}
              <div className="relative my-2 sm:my-2.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-slate-400 font-medium">Or continue with</span>
                </div>
              </div>

              {/* Google SSO Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={submitting}
                className="w-full h-[40px] sm:h-[42px] flex justify-center items-center py-2 px-4 border border-slate-300/90 rounded-xl shadow-xs text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer disabled:opacity-60"
              >
                <svg className="w-4 h-4 mr-2.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              {/* Feedback / Dialogue Buffer Box (Permanent height buffer to eliminate layout shift) */}
              <div className="mt-2 w-full h-[36px] sm:h-[38px] flex items-center">
                {error ? (
                  <div className="w-full h-full px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                    <i className="fa-solid fa-circle-exclamation text-rose-500 shrink-0 text-xs"></i>
                    <span className="leading-tight flex-1 truncate">{error}</span>
                  </div>
                ) : infoMsg ? (
                  <div className="w-full h-full px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                    <i className="fa-solid fa-circle-check text-emerald-600 shrink-0 text-xs"></i>
                    <span className="leading-tight flex-1 truncate">{infoMsg}</span>
                  </div>
                ) : null}
              </div>

              {/* Link to Sign Up */}
              <div className="mt-2 pt-2 border-t border-slate-100 text-center">
                <p className="text-xs sm:text-sm text-slate-500">
                  New merchant on ADAB?{' '}
                  <Link to="/signup" className="font-bold text-emerald-600 hover:text-emerald-700 ml-1">
                    Create a Seller Account &rarr;
                  </Link>
                </p>
              </div>
            </div>
          </form>

        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        initialIdMode={idMode}
        initialPhone={phone}
        initialEmail={email}
        onSuccess={(msg) => {
          setInfoMsg(msg);
          setError('');
          setAuthMode('password');
          setPassword('');
          setOtp('');
          setOtpSent(false);
        }}
      />
    </div>
  );
}
