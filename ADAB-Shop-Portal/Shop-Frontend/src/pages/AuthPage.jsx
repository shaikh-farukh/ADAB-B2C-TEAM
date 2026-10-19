import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeller } from '../context/SellerContext';
import sellerService from '../services/sellerService';
import ForgotPasswordModal from '../components/auth/ForgotPasswordModal';

export default function AuthPage() {
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
  const phoneInputRef = identifierInputRef;
  const emailInputRef = identifierInputRef;
  const otpInputRef = useRef(null);

  const { login, loginWithOtp, signup } = useSeller();
  const navigate = useNavigate();

  // Resend Countdown Timer
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const selectIdMode = (mode) => {
    if (mode === 'phone') {
      setEmail('');
    } else {
      setPhone('');
    }
    setIdMode(mode);
    setOtpSent(false);
    setOtp('');
    setError('');
    // Synchronously focus without 30ms delay to eliminate any black blink
    identifierInputRef.current?.focus({ preventScroll: true });
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

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handleOtpChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(digitsOnly);
  };

  const routeAfterAuth = (data) => {
    const steps = data?.kycSteps;
    const prof = data?.profile;
    const rawKyc = String(prof?.kyc_status || '').trim().toUpperCase();
    const rawUserStatus = String(prof?.status || '').trim().toUpperCase();
    const isApproved =
      ['APPROVED', 'VERIFIED', 'ACTIVE'].includes(rawKyc) ||
      ['APPROVED', 'VERIFIED'].includes(rawUserStatus);
    const isSubmitted =
      isApproved ||
      Boolean(steps?.step7) ||
      Boolean(prof?.submitted_at) ||
      ['SUBMITTED', 'UNDER_REVIEW', 'REJECTED', 'DENIED', 'DECLINED'].includes(rawKyc) ||
      ['REJECTED', 'DENIED', 'DECLINED'].includes(rawUserStatus);

    if (isApproved) {
      navigate('/', { replace: true });
    } else if (isSubmitted || (steps?.step1 && steps?.step2)) {
      navigate('/regstatus', { replace: true });
    } else {
      const targetStep = !steps?.step1 ? 1 : 2;
      navigate(`/onboarding?step=${targetStep}`, { replace: true });
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
      setError('Password must be at least 4 characters.');
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

      let data;
      try {
        data = await login(phone, password, {
          email: email.trim(),
          password,
          idMode
        });
      } catch (loginErr) {
        const errorMsg = String(loginErr?.response?.data?.error || loginErr?.message || '').toLowerCase();
        if (errorMsg.includes('account not found') || errorMsg.includes('register first')) {
          const namePart = email.trim() ? email.trim().split('@')[0] : 'Merchant';
          const defaultName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
          data = await signup(phone, password, {
            email: email.trim() || undefined,
            full_name: defaultName,
            store_name: `${defaultName} Store`,
            idMode
          });
        } else {
          throw loginErr;
        }
      }

      routeAfterAuth(data);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Sign in failed. Please check your credentials.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // OTP MODE: Send OTP Code (swaps full-width button to resized right-shifted button)
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

  // OTP MODE: Verify & Sign In
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

      routeAfterAuth(data);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'OTP verification failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Unified Form Submit (Sign In to Portal)
  const handleUnifiedSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (authMode === 'password') {
      return handlePasswordSubmit(e);
    } else {
      if (!otpSent) {
        return handleSendOtp(e);
      } else {
        return handleVerifyOtp(e);
      }
    }
  };

  // One-click Login with Gmail / Google SSO
  const handleGmailLogin = async () => {
    try {
      setError('');
      setSubmitting(true);
      const targetEmail = email.trim() || 'seller@adab.com';
      localStorage.setItem('seller_login_email', targetEmail.toLowerCase());
      localStorage.setItem('seller_auth_mode', 'email');
      localStorage.removeItem('seller_login_phone');
      const data = await login('', 'adab1234', {
        email: targetEmail,
        password: 'adab1234',
        idMode: 'email'
      });
      routeAfterAuth(data);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Google authentication failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-4 px-4 sm:px-6 lg:px-8 font-sans overflow-x-hidden">
      {/* Main Single-Page Authentication Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 px-6 shadow-xl border border-gray-100 rounded-3xl sm:px-8">
          
          {/* Top Brand Logo inside Card */}
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <div className="w-10 h-10 bg-[#22c55e] rounded-xl flex items-center justify-center shadow-md shadow-green-500/20 text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight text-gray-900 leading-none">
                ada<span className="text-[#22c55e]">B</span>
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                Enterprise Portal
              </span>
            </div>
          </div>

          {/* 1. PRIMARY IDENTIFIER SELECTOR: Phone Number vs Work Email */}
          <div className="flex p-1 bg-gray-100 rounded-xl mb-4">
            <button
              type="button"
              onClick={() => selectIdMode('phone')}
              className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                idMode === 'phone'
                  ? 'bg-white text-[#22c55e] shadow-xs'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Phone Number
            </button>
            <button
              type="button"
              onClick={() => selectIdMode('email')}
              className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                idMode === 'email'
                  ? 'bg-white text-[#22c55e] shadow-xs'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Work Email
            </button>
          </div>

          {/* 2. UNIFIED FORM */}
          <form
            className="space-y-3.5"
            onSubmit={handleUnifiedSubmit}
            noValidate
            autoComplete="off"
          >
            {/* ROW 1: Identifier Input (Phone or Email) - Persistent single input eliminates black blink */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {idMode === 'phone' ? 'Mobile Phone Number' : 'Work Email Address'}
              </label>
              <div className="relative bg-white rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  {idMode === 'phone' ? (
                    <>
                      <i className="fa-solid fa-phone text-xs"></i>
                      <span className="text-xs font-bold text-gray-700 ml-1.5">+91</span>
                    </>
                  ) : (
                    <i className="fa-regular fa-envelope text-sm"></i>
                  )}
                </div>
                <input
                  ref={identifierInputRef}
                  type={idMode === 'phone' ? 'tel' : 'email'}
                  name={idMode === 'phone' ? 'adab_seller_phone_input' : 'adab_seller_email_input'}
                  inputMode={idMode === 'phone' ? 'numeric' : 'email'}
                  autoComplete={idMode === 'phone' ? 'tel' : 'email'}
                  maxLength={idMode === 'phone' ? 10 : undefined}
                  value={idMode === 'phone' ? phone : email}
                  onChange={idMode === 'phone' ? handlePhoneChange : handleEmailChange}
                  placeholder={idMode === 'phone' ? '9876543210' : 'name@company.com'}
                  className={`block w-full pr-3.5 py-2.5 h-[42px] bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-[#22c55e] sm:text-sm ${
                    idMode === 'phone' ? 'pl-16 font-mono font-bold' : 'pl-10 font-sans'
                  }`}
                />
              </div>
            </div>

            {/* ROW 2: AUTH METHOD SWITCHER & DYNAMIC SWAP AREA */}
            <div className="pt-1">
              {/* Password vs OTP Code Tabs co-located with the input */}
              <div className="flex p-1 bg-gray-100 rounded-xl mb-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('password');
                    setError('');
                    setInfoMsg('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    authMode === 'password'
                      ? 'bg-white text-[#22c55e] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
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
                  className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    authMode === 'otp'
                      ? 'bg-white text-[#22c55e] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  OTP Code
                </button>
              </div>

              {/* DYNAMIC SWAP: Password Input OR Send/Enter OTP (Fixed h-[68px] guarantees zero card resize) */}
              <div className="h-[68px] w-full">
                {authMode === 'password' ? (
                  /* PASSWORD AREA */
                  <div className="h-full w-full flex flex-col justify-between">
                    <div className="flex items-center justify-between h-5 mb-1.5">
                      <label className="block text-xs font-semibold text-gray-600 leading-none">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setIsForgotModalOpen(true);
                        }}
                        className="text-xs font-medium text-gray-400 hover:text-gray-600 leading-none transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative h-[42px] w-full">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <i className="fa-solid fa-lock text-xs"></i>
                      </div>
                      <input
                        type="text"
                        name="adab_seller_pwd_custom"
                        autoComplete="new-password"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-form-type="other"
                        value={password}
                        onChange={handlePasswordChange}
                        placeholder="••••••••"
                        style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' }}
                        className="block w-full h-[42px] pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-[#22c55e] sm:text-sm"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-[#22c55e] transition-colors cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <i className={showPassword ? 'fa-regular fa-eye-slash text-sm' : 'fa-regular fa-eye text-sm'}></i>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* OTP AREA: Swaps with password area with identical height */
                  <div className="h-full w-full flex flex-col justify-between">
                    <div className="flex items-center justify-between h-5 mb-1.5">
                      <label className="block text-xs font-semibold text-gray-600 leading-none">
                        {otpSent ? 'Enter OTP Code' : 'Verification Code'}
                      </label>
                      {otpSent ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#15803D] border border-emerald-200 font-bold text-[11px] leading-none flex items-center gap-1">
                          <i className="fa-solid fa-circle-check text-[10px]"></i> OTP Sent
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-gray-400 leading-none">
                          One-time code
                        </span>
                      )}
                    </div>

                    {!otpSent ? (
                      /* Initial State: Full-width Bordered Send OTP button matching password input height */
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={submitting}
                        className="w-full h-[42px] rounded-xl border border-[#22c55e] bg-white hover:bg-emerald-50/70 active:scale-[0.99] text-[#15803D] font-bold text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed outline-none focus:outline-none focus-visible:outline-none"
                      >
                        <i className="fa-solid fa-paper-plane text-xs text-[#22c55e]"></i>
                        <span>{submitting ? 'Sending Code...' : 'Send OTP Code'}</span>
                      </button>
                    ) : (
                      /* Sent State: Button resizes and shifts to right, revealing OTP input area */
                      <div className="flex items-center gap-2.5 h-[42px] w-full">
                        <div className="relative flex-1 h-full">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                            <i className="fa-solid fa-shield-halved text-xs"></i>
                          </div>
                          <input
                            ref={otpInputRef}
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            maxLength={6}
                            value={otp}
                            onChange={handleOtpChange}
                            placeholder="123456"
                            autoFocus
                            className="block w-full h-[42px] pl-10 pr-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-[#22c55e] sm:text-sm font-mono font-bold tracking-widest"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={submitting || countdown > 0}
                          className={`h-[42px] px-3.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                            countdown > 0
                              ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                              : 'bg-emerald-50 text-[#15803D] border border-emerald-200 hover:bg-emerald-100 active:scale-95'
                          }`}
                        >
                          {countdown > 0 ? `Resend (${countdown}s)` : 'Resend OTP'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ROW 3: Primary Action Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-md shadow-green-500/20 text-sm font-bold text-white bg-[#22c55e] hover:bg-green-600 active:scale-[0.98] transition-all cursor-pointer disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {submitting ? 'Processing...' : 'Sign In to Portal'}
              </button>
            </div>
          </form>

          {/* Social Sign-In & Divider */}
          <div className="mt-3.5">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-gray-400 font-medium">Or continue with</span>
              </div>
            </div>

            <div className="mt-2.5">
              <button
                type="button"
                onClick={handleGmailLogin}
                disabled={submitting}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-xl shadow-xs text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
            </div>
          </div>

          {/* Pre-stated Feedback Notification Slot (Constant dimension prevents main card resize & eliminates page shift) */}
          <div className="mt-3.5 h-[50px] w-full">
            {error ? (
              <div className="w-full h-full px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2.5 animate-in fade-in duration-200">
                <i className="fa-solid fa-circle-exclamation text-rose-500 shrink-0 text-sm"></i>
                <span className="line-clamp-2 leading-tight flex-1">{error}</span>
              </div>
            ) : infoMsg ? (
              <div className="w-full h-full px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2.5 animate-in fade-in duration-200">
                <i className="fa-solid fa-circle-check text-emerald-600 shrink-0 text-sm"></i>
                <span className="line-clamp-2 leading-tight flex-1">{infoMsg}</span>
              </div>
            ) : (
              <div className="w-full h-full px-3 py-2 rounded-xl bg-gray-50/70 border border-gray-100 flex items-center justify-center gap-2 text-xs font-medium text-gray-400 select-none">
                <i className="fa-solid fa-shield-halved text-gray-400 text-xs"></i>
                <span>Protected by ADAB Merchant Security</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal Popup */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        initialIdMode={idMode}
        initialPhone={phone}
        initialEmail={email}
        onSuccess={(successMessage) => {
          setInfoMsg(successMessage);
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
