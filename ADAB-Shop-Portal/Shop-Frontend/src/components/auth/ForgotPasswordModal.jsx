import React, { useState, useEffect, useRef } from 'react';
import sellerService from '../../services/sellerService';

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  title = 'Reset Portal Password',
  subtitle,
  submitLabel = 'Update Password',
  initialIdMode = 'phone',
  initialPhone = '',
  initialEmail = '',
  onSuccess
}) {
  const [idMode, setIdMode] = useState(initialIdMode);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [step, setStep] = useState(1); // 1 = request OTP, 2 = verify & set new password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  const otpInputRef = useRef(null);

  // Sync initial props when modal opens
  useEffect(() => {
    if (isOpen) {
      const cleanPhone = (initialPhone || '').replace(/\D/g, '').slice(-10);
      const cleanEmail = (initialEmail || '').trim();
      const defaultMode = initialIdMode || (cleanEmail && !cleanPhone ? 'email' : 'phone');

      setIdMode(defaultMode);
      setPhone(cleanPhone);
      setEmail(cleanEmail);
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setInfoMsg('');
      setStep(1);
      setCountdown(0);
    }
  }, [isOpen, initialIdMode, initialPhone, initialEmail]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
    setError('');
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setError('');
  };

  const handleSendOtp = async () => {
    setError('');
    setInfoMsg('');

    if (idMode === 'phone') {
      const cleanDigits = phone.replace(/\D/g, '');
      if (!cleanDigits || cleanDigits.length < 10) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }
    } else {
      const cleanEmail = email.trim();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setError('Please enter a valid work email address.');
        return;
      }
    }

    try {
      setLoading(true);
      await sellerService.sendOtp({
        phone: idMode === 'phone' ? phone.slice(-10) : undefined,
        email: idMode === 'email' ? email.trim() : undefined,
        idMode
      });

      setStep(2);
      setCountdown(30);
      setInfoMsg(
        idMode === 'phone'
          ? `Verification code sent to +91 ${phone.slice(-10)}.`
          : `Verification code sent to ${email.trim()}.`
      );
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to send verification code. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setError('Please enter the verification code.');
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setError('New password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter carefully.');
      return;
    }

    try {
      setLoading(true);
      const res = await sellerService.resetPassword({
        phone: idMode === 'phone' ? phone.slice(-10) : undefined,
        email: idMode === 'email' ? email.trim() : undefined,
        otp: cleanOtp,
        newPassword,
        idMode
      });

      const successMsg = res?.data?.message || 'Password reset successfully! Please sign in with your new password.';
      onSuccess?.(successMsg);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to reset password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-7 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors cursor-pointer outline-none focus:outline-none"
          aria-label="Close modal"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 text-[#15803D] rounded-xl flex items-center justify-center shadow-xs">
            <i className="fa-solid fa-key text-sm"></i>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 leading-tight">
              {title}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {subtitle || (step === 1 ? 'Verify your identity to create a new password' : 'Enter verification code and your new password')}
            </p>
          </div>
        </div>

        {/* Step 1: Identifier Selection & Send OTP */}
        {step === 1 ? (
          <div className="space-y-4">
            {/* Mode Switcher */}
            <div className="flex p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setIdMode('phone');
                  setError('');
                }}
                className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  idMode === 'phone' ? 'bg-white text-[#22c55e] shadow-xs' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Phone Number
              </button>
              <button
                type="button"
                onClick={() => {
                  setIdMode('email');
                  setError('');
                }}
                className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  idMode === 'email' ? 'bg-white text-[#22c55e] shadow-xs' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Work Email
              </button>
            </div>

            {/* Input Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                {idMode === 'phone' ? 'Registered Mobile Number' : 'Registered Work Email'}
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
                  type={idMode === 'phone' ? 'tel' : 'email'}
                  inputMode={idMode === 'phone' ? 'numeric' : 'email'}
                  maxLength={idMode === 'phone' ? 10 : undefined}
                  value={idMode === 'phone' ? phone : email}
                  onChange={idMode === 'phone' ? handlePhoneChange : handleEmailChange}
                  placeholder={idMode === 'phone' ? '9876543210' : 'name@company.com'}
                  autoFocus
                  className={`block w-full pr-3.5 py-2.5 h-[42px] bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-[#22c55e] sm:text-sm ${
                    idMode === 'phone' ? 'pl-16 font-mono font-bold' : 'pl-10 font-sans'
                  }`}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-start gap-2">
                <i className="fa-solid fa-circle-exclamation mt-0.5 text-rose-500 shrink-0 text-sm"></i>
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#22c55e] hover:bg-green-600 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-green-500/20 cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? 'Sending Code...' : 'Send OTP Code'}
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Enter OTP, New Password, and Re-enter Password */
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            {/* Recipient Notice */}
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
              <span className="truncate font-semibold">
                Code sent to: {idMode === 'phone' ? `+91 ${phone}` : email}
              </span>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError('');
                }}
                className="text-[11px] font-bold text-[#15803D] hover:underline shrink-0 ml-2 cursor-pointer"
              >
                Change
              </button>
            </div>

            {/* OTP Code Input */}
            <div>
              <div className="flex items-center justify-between h-5 mb-1">
                <label className="block text-xs font-semibold text-gray-700 leading-none">
                  6-Digit OTP Code
                </label>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || countdown > 0}
                  className={`text-[11px] font-bold leading-none cursor-pointer ${
                    countdown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-[#22c55e] hover:underline'
                  }`}
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                </button>
              </div>
              <div className="relative">
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
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setError('');
                  }}
                  placeholder="123456"
                  autoFocus
                  className="block w-full pl-10 pr-3.5 py-2.5 h-[42px] bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-[#22c55e] sm:text-sm font-mono font-bold tracking-widest"
                />
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <i className="fa-solid fa-lock text-xs"></i>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="adab_forgot_new_pwd"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="At least 4 characters"
                  className="block w-full pl-10 pr-10 py-2.5 h-[42px] bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-[#22c55e] sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-[#22c55e] cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={showPassword ? 'fa-regular fa-eye-slash text-sm' : 'fa-regular fa-eye text-sm'}></i>
                </button>
              </div>
            </div>

            {/* Re-enter New Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Re-enter New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <i className="fa-solid fa-shield text-xs"></i>
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="adab_forgot_confirm_pwd"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Re-enter to confirm"
                  className="block w-full pl-10 pr-10 py-2.5 h-[42px] bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-[#22c55e] sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-[#22c55e] cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={showConfirmPassword ? 'fa-regular fa-eye-slash text-sm' : 'fa-regular fa-eye text-sm'}></i>
                </button>
              </div>
            </div>

            {/* Error / Info Alerts */}
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-start gap-2">
                <i className="fa-solid fa-circle-exclamation mt-0.5 text-rose-500 shrink-0 text-sm"></i>
                <span>{error}</span>
              </div>
            )}

            {infoMsg && !error && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-start gap-2">
                <i className="fa-solid fa-circle-check mt-0.5 text-emerald-600 shrink-0 text-sm"></i>
                <span>{infoMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#22c55e] hover:bg-green-600 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-green-500/20 cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? 'Updating...' : submitLabel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
