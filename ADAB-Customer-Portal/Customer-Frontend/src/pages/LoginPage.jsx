import React, { useState, useEffect } from 'react';
import { AuthAPI } from '../services/api';
import { lookupPincode, getOfflinePincodeHint } from '../utils/pincode';

/**
 * LoginPage Component
 * Full-featured Customer Portal Login & 3-Step Registration Wizard
 * - Step 1: User Personal Details (Name, Email, Phone, Password, Confirm Password)
 * - Step 2: OTP Verification (6-digit verification code with resend timer)
 * - Step 3: Delivery Address (Address line, Landmark, Pincode auto-detection, City, State, Type)
 * All data saved securely to database with encrypted passwords.
 * Adheres strictly to ADAB brand theme (#18753C, #F26E21, #F6F9F6).
 */
export default function LoginPage({ onLoginSuccess, onNavigate }) {
  // Modes: 'login' | 'register' | 'forgot' | 'reset'
  const [mode, setMode] = useState('login');

  // Register Multi-step Wizard: 1 (Details) | 2 (OTP) | 3 (Address)
  const [signupStep, setSignupStep] = useState(1);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Step 1: Personal Details
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Register Step 2: OTP Verification
  const [regOtp, setRegOtp] = useState('');
  const [regOtpHint, setRegOtpHint] = useState('');
  const [otpResendTimer, setOtpResendTimer] = useState(0);

  // Register Step 3: User's Delivery Address
  const [regAddressType, setRegAddressType] = useState('Home');
  const [regRecipientName, setRegRecipientName] = useState('');
  const [regRecipientPhone, setRegRecipientPhone] = useState('');
  const [regAddressLine, setRegAddressLine] = useState('');
  const [regLandmark, setRegLandmark] = useState('');
  const [regPincode, setRegPincode] = useState('');
  const [regCity, setRegCity] = useState('Surat');
  const [regState, setRegState] = useState('Gujarat');
  const [regIsDefault, setRegIsDefault] = useState(true);
  const [isDetectingRegPin, setIsDetectingRegPin] = useState(false);
  const [regPinHint, setRegPinHint] = useState('');

  // Forgot / Reset password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [generatedOtpHint, setGeneratedOtpHint] = useState('');

  // Loading & feedback states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Timer countdown for OTP resend
  useEffect(() => {
    let timer = null;
    if (otpResendTimer > 0) {
      timer = setInterval(() => {
        setOtpResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpResendTimer]);

  const clearFeedback = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Switch modes cleanly
  const switchMode = (newMode) => {
    clearFeedback();
    if (newMode === 'register') {
      setSignupStep(1);
    }
    setMode(newMode);
  };

  // Handle Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    clearFeedback();

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthAPI.login(loginEmail.trim(), loginPassword);
      if (res && res.success && res.user) {
        localStorage.setItem('adab_auth_token', res.token || 'auth_token_' + Date.now());
        localStorage.setItem('adab_user', JSON.stringify(res.user));
        localStorage.setItem('adab_user_id', res.user.id);

        setSuccessMsg(`Welcome back, ${res.user.name || res.user.full_name || 'Customer'}!`);
        
        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        }
      } else {
        setErrorMsg(res?.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // SIGN UP WIZARD - STEP 1: PERSONAL DETAILS
  // ==========================================================
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    clearFeedback();

    if (!regName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regEmail.trim() || !emailRegex.test(regEmail.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const cleanedPhone = regPhone.replace(/\D/g, '');
    if (cleanedPhone && cleanedPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthAPI.sendRegistrationOtp(regEmail.trim(), regPhone.trim(), regName.trim());
      if (res && res.success) {
        if (res.otp) {
          setRegOtpHint(res.otp);
          setRegOtp(res.otp); // Prefill for smooth demo / automated testing
        }
        setOtpResendTimer(30);
        setRegRecipientName(regName.trim());
        setRegRecipientPhone(regPhone.trim());
        setSignupStep(2);
        setSuccessMsg(res.message || 'Verification code sent to your email.');
      } else {
        setErrorMsg(res?.message || 'Failed to send verification code. Please check your email.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error initiating verification. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // SIGN UP WIZARD - STEP 2: OTP VERIFICATION
  // ==========================================================
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    clearFeedback();

    if (!regOtp.trim() || regOtp.trim().length < 4) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthAPI.verifyRegistrationOtp(regEmail.trim(), regOtp.trim());
      if (res && (res.success || res.verified)) {
        setSignupStep(3);
        setSuccessMsg('✓ Verified successfully! Please set your delivery address.');
      } else {
        setErrorMsg(res?.message || 'Invalid verification code. Please check and try again.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Verification failed. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP in Step 2
  const handleResendOtp = async () => {
    if (otpResendTimer > 0 || loading) return;
    clearFeedback();
    setLoading(true);
    try {
      const res = await AuthAPI.sendRegistrationOtp(regEmail.trim(), regPhone.trim(), regName.trim());
      if (res && res.success) {
        if (res.otp) {
          setRegOtpHint(res.otp);
          setRegOtp(res.otp);
        }
        setOtpResendTimer(30);
        setSuccessMsg('A fresh verification code has been sent!');
      } else {
        setErrorMsg(res?.message || 'Could not resend code. Please try again.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Pincode Auto-detection in Step 3
  const handleRegPincodeChange = async (rawVal) => {
    const val = rawVal.replace(/\D/g, '').slice(0, 6);
    setRegPincode(val);

    if (val.length === 6) {
      const offline = getOfflinePincodeHint(val);
      if (offline) {
        setRegCity(offline.city);
        setRegState(offline.state);
        setRegPinHint(`✓ Detected ${offline.city}, ${offline.state}`);
      }

      setIsDetectingRegPin(true);
      try {
        const detected = await lookupPincode(val);
        if (detected) {
          if (detected.city) setRegCity(detected.city);
          if (detected.state) setRegState(detected.state);
          setRegPinHint(`✓ Auto-detected: ${detected.city || offline?.city || 'Surat'}, ${detected.state || offline?.state || 'Gujarat'}`);
        } else if (!offline) {
          setRegPinHint('Pincode set. Confirm city & state below.');
        }
      } catch (e) {
        console.debug('Pincode detection warning:', e);
      } finally {
        setIsDetectingRegPin(false);
      }
    } else {
      setRegPinHint('');
    }
  };

  // ==========================================================
  // SIGN UP WIZARD - STEP 3: USER ADDRESS & FINISH
  // ==========================================================
  const handleStep3Submit = async (e) => {
    e.preventDefault();
    clearFeedback();

    if (!regAddressLine.trim()) {
      setErrorMsg('Please enter your street address / flat details.');
      return;
    }

    if (!regPincode.trim() || regPincode.trim().length < 6) {
      setErrorMsg('Please enter a valid 6-digit pincode.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: regName.trim(),
        full_name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        password: regPassword,
        otp: regOtp.trim(),
        // Address Details
        address_line: regAddressLine.trim(),
        landmark: regLandmark.trim(),
        city: regCity.trim() || 'Surat',
        state: regState.trim() || 'Gujarat',
        pincode: regPincode.trim(),
        label: regAddressType,
        recipient_name: regRecipientName.trim() || regName.trim(),
        recipient_phone: regRecipientPhone.trim() || regPhone.trim(),
        is_default: regIsDefault
      };

      const res = await AuthAPI.register(payload);
      if (res && res.success && res.user) {
        localStorage.setItem('adab_auth_token', res.token || 'auth_token_' + Date.now());
        localStorage.setItem('adab_user', JSON.stringify(res.user));
        localStorage.setItem('adab_user_id', res.user.id);
        if (res.address) {
          try {
            localStorage.setItem('adab_selected_address', JSON.stringify(res.address));
          } catch {}
        }

        setSuccessMsg('Account created and address saved successfully! Welcome to ADAB.');

        if (onLoginSuccess) {
          onLoginSuccess(res.user, res.address || null);
        }
      } else {
        setErrorMsg(res?.message || 'Registration failed. Please check your details.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to complete registration. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password submission
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    clearFeedback();

    if (!forgotEmail.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthAPI.forgotPassword(forgotEmail.trim());
      if (res && res.success) {
        setSuccessMsg(res.message || 'Verification code sent to your email.');
        if (res.otp) {
          setGeneratedOtpHint(res.otp);
          setResetOtp(res.otp);
        }
        setMode('reset');
      } else {
        setErrorMsg(res?.message || 'Could not find an account with this email.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Email not found or service unavailable.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password submission
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    clearFeedback();

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthAPI.resetPassword(forgotEmail.trim(), resetOtp.trim(), newPassword);
      if (res && res.success) {
        setSuccessMsg('Password reset successfully! Please log in with your new password.');
        setLoginEmail(forgotEmail);
        setLoginPassword('');
        setMode('login');
      } else {
        setErrorMsg(res?.message || 'Failed to reset password. Please check your OTP.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-6 px-4">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('home')}
          className="inline-flex items-center gap-2 mb-3 cursor-pointer group"
        >
          <span className="w-11 h-11 rounded-2xl bg-[#18753C] text-white flex items-center justify-center font-black text-xl shadow-md group-hover:scale-105 transition-transform">
            A
          </span>
          <span className="font-black text-2xl tracking-tight text-[#0F172A]">
            ADAB
          </span>
        </button>
        <p className="text-xs text-gray-500 font-medium">
          Neighbourhood shops delivered in minutes · Surat
        </p>
      </div>

      {/* Main Auth Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.07)] border border-gray-100 relative overflow-hidden">
        {/* Subtle Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#18753C] via-[#23B65D] to-[#F26E21]"></div>

        {/* Feedback Alert Banners */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2.5 animate-fadeIn">
            <i className="fa-solid fa-circle-exclamation text-sm shrink-0 mt-0.5 text-red-500"></i>
            <span className="flex-1 font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 bg-green-50 border border-green-200 text-[#18753C] text-xs rounded-xl flex items-start gap-2.5 animate-fadeIn">
            <i className="fa-solid fa-circle-check text-sm shrink-0 mt-0.5 text-[#18753C]"></i>
            <span className="flex-1 font-medium leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* ========================================================
            VIEW 1: LOGIN (SIGN IN)
        ======================================================== */}
        {mode === 'login' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Login
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Enter your email and password to access your account, orders and addresses.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-envelope text-sm"></i>
                  </span>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. pooja@example.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#18753C] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Password Input with See Password Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-bold text-[#18753C] hover:text-[#156030] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-lock text-sm"></i>
                  </span>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#18753C] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-700 cursor-pointer transition-colors"
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`fa-solid ${showLoginPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-4 bg-[#18753C] hover:bg-[#156030] text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Logging In...</span>
                  </>
                ) : (
                  <>
                    <span>Login</span>
                    <i className="fa-solid fa-arrow-right text-xs"></i>
                  </>
                )}
              </button>
            </form>

            {/* Quick Helper to Register */}
            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-600 font-medium">
                Not a user?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="font-extrabold text-[#18753C] hover:text-[#156030] hover:underline cursor-pointer"
                >
                  Register here
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 2: 3-STEP REGISTER WIZARD
        ======================================================== */}
        {mode === 'register' && (
          <div>
            {/* 3-Step Progress Indicator */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3 relative px-1">
                {/* Background Connecting Line */}
                <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
                {/* Active Connecting Line */}
                <div
                  className="absolute top-4 left-6 h-0.5 bg-[#18753C] -translate-y-1/2 z-0 transition-all duration-300"
                  style={{
                    width: signupStep === 1 ? '0%' : signupStep === 2 ? '48%' : '90%'
                  }}
                />

                {/* Step 1 Node */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      signupStep > 1
                        ? 'bg-[#18753C] text-white shadow-xs'
                        : signupStep === 1
                        ? 'bg-[#18753C] text-white ring-4 ring-emerald-100 shadow-sm'
                        : 'bg-white border-2 border-gray-300 text-gray-400'
                    }`}
                  >
                    {signupStep > 1 ? <i className="fa-solid fa-check text-[11px]"></i> : '1'}
                  </div>
                  <span className={`text-[10px] font-extrabold mt-1.5 ${signupStep === 1 ? 'text-[#18753C]' : 'text-gray-500'}`}>
                    Details
                  </span>
                </div>

                {/* Step 2 Node */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      signupStep > 2
                        ? 'bg-[#18753C] text-white shadow-xs'
                        : signupStep === 2
                        ? 'bg-[#18753C] text-white ring-4 ring-emerald-100 shadow-sm'
                        : 'bg-white border-2 border-gray-300 text-gray-400'
                    }`}
                  >
                    {signupStep > 2 ? <i className="fa-solid fa-check text-[11px]"></i> : '2'}
                  </div>
                  <span className={`text-[10px] font-extrabold mt-1.5 ${signupStep === 2 ? 'text-[#18753C]' : 'text-gray-500'}`}>
                    Verify
                  </span>
                </div>

                {/* Step 3 Node */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      signupStep === 3
                        ? 'bg-[#18753C] text-white ring-4 ring-emerald-100 shadow-sm'
                        : 'bg-white border-2 border-gray-300 text-gray-400'
                    }`}
                  >
                    3
                  </div>
                  <span className={`text-[10px] font-extrabold mt-1.5 ${signupStep === 3 ? 'text-[#18753C]' : 'text-gray-500'}`}>
                    Address
                  </span>
                </div>
              </div>

              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                {signupStep === 1 && 'Create Account'}
                {signupStep === 2 && 'Verify Code'}
                {signupStep === 3 && 'Delivery Address'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {signupStep === 1 && 'Step 1 of 3: Enter your personal details and password.'}
                {signupStep === 2 && `Step 2 of 3: Enter the 6-digit code sent to ${regEmail}.`}
                {signupStep === 3 && 'Step 3 of 3: Enter your home or work address for 14–45 min delivery.'}
              </p>
            </div>

            {/* ----------------------------------------------------
                PAGE 1: PERSONAL DETAILS
            ---------------------------------------------------- */}
            {signupStep === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <i className="fa-solid fa-user text-sm"></i>
                    </span>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Pooja Sharma"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#18753C] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <i className="fa-solid fa-envelope text-sm"></i>
                    </span>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. pooja@example.com"
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#18753C] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Mobile Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold text-xs">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="98765 12340"
                      className="w-full pl-12 pr-4 py-2.5 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#18753C] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <i className="fa-solid fa-lock text-sm"></i>
                    </span>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-11 py-2.5 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#18753C] focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-700 cursor-pointer transition-colors"
                      title={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      <i className={`fa-solid ${showRegPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <i className="fa-solid fa-shield-halved text-sm"></i>
                    </span>
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-10 pr-11 py-2.5 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#18753C] focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-700 cursor-pointer transition-colors"
                      title={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      <i className={`fa-solid ${showRegConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                    </button>
                  </div>
                </div>

                {/* Continue to Step 2 Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 py-3.5 px-4 bg-[#18753C] hover:bg-[#156030] text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                      <span>Sending Verification Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Verification</span>
                      <i className="fa-solid fa-arrow-right text-xs"></i>
                    </>
                  )}
                </button>

                <div className="mt-5 pt-4 border-t border-gray-100 text-center">
                  <p className="text-xs text-gray-600 font-medium">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="font-extrabold text-[#18753C] hover:text-[#156030] hover:underline cursor-pointer"
                    >
                      Login here
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* ----------------------------------------------------
                PAGE 2: OTP VERIFICATION
            ---------------------------------------------------- */}
            {signupStep === 2 && (
              <form onSubmit={handleStep2Submit} className="space-y-4">
                {/* OTP Hint Helper Banner for Instant Testing */}
                {regOtpHint && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between animate-fadeIn">
                    <span>Verification code: <strong className="font-mono text-sm tracking-widest">{regOtpHint}</strong></span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">Valid 15m</span>
                  </div>
                )}

                {/* 6-Digit OTP Code Input */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 text-center">
                    Enter 6-Digit Code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      autoFocus
                      maxLength={6}
                      value={regOtp}
                      onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="------"
                      className="w-full text-center py-3.5 bg-[#F8F9FA] border-2 border-emerald-500 rounded-xl text-xl font-mono tracking-[0.5em] font-extrabold text-gray-900 focus:outline-none focus:bg-white transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* Resend Code Section */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-gray-500">Didn't receive code?</span>
                  {otpResendTimer > 0 ? (
                    <span className="font-bold text-gray-400">
                      Resend in {otpResendTimer}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="font-bold text-[#18753C] hover:underline cursor-pointer"
                    >
                      Resend Code
                    </button>
                  )}
                </div>

                {/* Action Buttons: Back + Verify */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearFeedback();
                      setSignupStep(1);
                    }}
                    className="w-1/3 py-3 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <i className="fa-solid fa-arrow-left text-[10px]"></i>
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading || regOtp.length < 4}
                    className="flex-1 py-3.5 px-4 bg-[#18753C] hover:bg-[#156030] text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Continue</span>
                        <i className="fa-solid fa-arrow-right text-xs"></i>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ----------------------------------------------------
                PAGE 3: USER'S DELIVERY ADDRESS
            ---------------------------------------------------- */}
            {signupStep === 3 && (
              <form onSubmit={handleStep3Submit} className="space-y-3.5">
                {/* Address Label Pills */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Address Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'Home', icon: 'fa-house' },
                      { key: 'Work', icon: 'fa-briefcase' },
                      { key: 'Other', icon: 'fa-location-dot' }
                    ].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setRegAddressType(t.key)}
                        className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          regAddressType === t.key
                            ? 'border-[#18753C] bg-emerald-50 text-[#18753C] shadow-xs'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <i className={`fa-solid ${t.icon} text-[11px]`}></i>
                        <span>{t.key}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipient Name & Phone */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      required
                      value={regRecipientName}
                      onChange={(e) => setRegRecipientName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full px-3 py-2 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#18753C]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      required
                      value={regRecipientPhone}
                      onChange={(e) => setRegRecipientPhone(e.target.value)}
                      placeholder="Mobile Phone"
                      className="w-full px-3 py-2 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#18753C]"
                    />
                  </div>
                </div>

                {/* Street Address / Flat details */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Flat / House No / Street Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={regAddressLine}
                    onChange={(e) => setRegAddressLine(e.target.value)}
                    placeholder="e.g. Flat 502, Orchid Heights, VIP Road, Vesu"
                    className="w-full px-3.5 py-2.5 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#18753C] focus:bg-white resize-none"
                  />
                </div>

                {/* Landmark */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Landmark / Area <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={regLandmark}
                    onChange={(e) => setRegLandmark(e.target.value)}
                    placeholder="e.g. Near Textile Market / Opposite Central Mall"
                    className="w-full px-3.5 py-2.5 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#18753C] focus:bg-white"
                  />
                </div>

                {/* Pincode with Auto-detect */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    {isDetectingRegPin && (
                      <span className="text-[10px] text-[#18753C] font-bold flex items-center gap-1">
                        <i className="fa-solid fa-spinner fa-spin text-[9px]"></i> Detecting City & State...
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={regPincode}
                    onChange={(e) => handleRegPincodeChange(e.target.value)}
                    placeholder="e.g. 395007"
                    className="w-full px-3.5 py-2.5 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#18753C] focus:bg-white"
                  />
                  {regPinHint && (
                    <div className="text-[11px] font-bold text-emerald-700 mt-1 flex items-center gap-1">
                      <i className="fa-solid fa-circle-check text-[10px]"></i>
                      <span>{regPinHint}</span>
                    </div>
                  )}
                </div>

                {/* City & State */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={regCity}
                      onChange={(e) => setRegCity(e.target.value)}
                      placeholder="Surat"
                      className="w-full px-3 py-2 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#18753C]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={regState}
                      onChange={(e) => setRegState(e.target.value)}
                      placeholder="Gujarat"
                      className="w-full px-3 py-2 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#18753C]"
                    />
                  </div>
                </div>

                {/* Default Address Checkbox */}
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regIsDefault}
                    onChange={(e) => setRegIsDefault(e.target.checked)}
                    className="w-4 h-4 accent-[#18753C] rounded cursor-pointer"
                  />
                  <span className="text-xs text-gray-700 font-semibold select-none">
                    Set as default delivery address
                  </span>
                </label>

                {/* Action Buttons: Back + Finish */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearFeedback();
                      setSignupStep(2);
                    }}
                    className="w-1/3 py-3 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <i className="fa-solid fa-arrow-left text-[10px]"></i>
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3.5 px-4 bg-[#18753C] hover:bg-[#156030] text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                        <span>Saving Account & Address...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Sign Up</span>
                        <i className="fa-solid fa-check text-xs"></i>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ========================================================
            VIEW 3: FORGOT PASSWORD (STEP 1)
        ======================================================== */}
        {mode === 'forgot' && (
          <div>
            <div className="mb-6">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs font-bold text-gray-500 hover:text-gray-900 mb-2 flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-arrow-left text-[10px]"></i> Back to Login
              </button>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Forgot Password
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Enter your registered email address and we'll send you a verification code to reset your password.
              </p>
            </div>

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Registered Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-envelope text-sm"></i>
                  </span>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. pooja@example.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#18753C] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-[#18753C] hover:bg-[#156030] text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <i className="fa-solid fa-arrow-right text-xs"></i>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================
            VIEW 4: RESET PASSWORD (STEP 2)
        ======================================================== */}
        {mode === 'reset' && (
          <div>
            <div className="mb-6">
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-xs font-bold text-gray-500 hover:text-gray-900 mb-2 flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-arrow-left text-[10px]"></i> Change Email
              </button>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Reset Password
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Verification code sent for <span className="font-semibold text-gray-700">{forgotEmail}</span>. Enter your code and new password.
              </p>
            </div>

            {generatedOtpHint && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                <span>Verification code: <strong className="font-mono text-sm">{generatedOtpHint}</strong></span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">Valid 15m</span>
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-4">
              {/* Verification Code */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  6-Digit Verification Code <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-key text-sm"></i>
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full pl-10 pr-4 py-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-mono tracking-widest text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#18753C] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-lock text-sm"></i>
                  </span>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-11 py-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#18753C] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-700 cursor-pointer transition-colors"
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`fa-solid ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-shield-halved text-sm"></i>
                  </span>
                  <input
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-11 py-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#18753C] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-700 cursor-pointer transition-colors"
                    title={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`fa-solid ${showConfirmNewPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-[#18753C] hover:bg-[#156030] text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Set New Password</span>
                    <i className="fa-solid fa-check text-xs"></i>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Guest browse notice */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('home')}
          className="text-xs font-bold text-gray-500 hover:text-[#18753C] transition-colors cursor-pointer"
        >
          <i className="fa-solid fa-store mr-1.5"></i>
          Continue browsing shops as guest
        </button>
      </div>
    </div>
  );
}
