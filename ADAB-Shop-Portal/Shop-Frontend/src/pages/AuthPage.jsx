import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeller } from '../context/SellerContext';
import sellerService from '../services/sellerService';

const HARDCODED_OTP = '123456';

export default function AuthPage() {
  const [idMode, setIdMode] = useState('phone'); // 'phone' | 'email'

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [portalStarted, setPortalStarted] = useState(false);

  const [otp, setOtp] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const phoneInputRef = useRef(null);
  const emailInputRef = useRef(null);

  const { login, signup } = useSeller();
  const navigate = useNavigate();

  const selectIdMode = (mode) => {
    if (portalStarted) return;
    if (mode === 'phone') {
      setEmail('');
    } else {
      setPhone('');
    }
    setIdMode(mode);
    setError('');
    setTimeout(() => {
      if (mode === 'phone') phoneInputRef.current?.focus();
      else emailInputRef.current?.focus();
    }, 20);
  };

  const handlePhoneChange = (e) => {
    if (portalStarted) return;
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
    if (email) setEmail('');
  };

  const handleEmailChange = (e) => {
    if (portalStarted) return;
    setEmail(e.target.value);
    if (phone) setPhone('');
  };

  const handlePasswordChange = (e) => {
    if (portalStarted) return;
    setPassword(e.target.value);
  };

  const handleOtpChange = (e) => {
    if (!portalStarted) return;
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(digitsOnly);
  };

  const handleConfirmPasswordChange = (e) => {
    if (!portalStarted) return;
    setConfirmPassword(e.target.value);
  };

  // Step 1: User presses "Start the Portal"
  const handleStartPortal = async (e) => {
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
        setError('Please enter a valid email address.');
        return;
      }
    }

    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const identifier = idMode === 'email' ? email.trim() : (email.trim() || phone);
      if (identifier) {
        const otpRes = await sellerService.sendOtp({ email: email.trim(), phone, idMode });
        const isSimulated = otpRes?.data?.isSimulated || otpRes?.isSimulated;
        if (idMode === 'email') {
          setInfoMsg(
            isSimulated
              ? `Verification code dispatched (Simulated / Demo code: 123456).`
              : `Verification code sent to ${email.trim()}. Please check your inbox.`
          );
        } else {
          setInfoMsg('Enter the verification code or demo code 123456 to continue.');
        }
      }
    } catch (err) {
      console.warn('OTP dispatch warning:', err?.message);
      setInfoMsg('Enter verification code or demo code 123456.');
    } finally {
      setSubmitting(false);
      // Lock top inputs & unlock OTP + Confirm Password + Verify
      setPortalStarted(true);
    }
  };

  // Step 2: User presses "Verify"
  const handleVerify = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!portalStarted) return;
    setError('');

    let otpValid = false;
    if (otp === HARDCODED_OTP) {
      otpValid = true;
    } else {
      try {
        const verifyRes = await sellerService.verifyOtp({
          email: email.trim(),
          phone,
          otp,
          idMode
        });
        if (verifyRes?.data?.success || verifyRes?.success) {
          otpValid = true;
        }
      } catch (err) {
        // Fallback check
      }
    }

    if (!otpValid) {
      setError('Invalid or expired OTP. Please check and try again, or enter 123456.');
      return;
    }

    if (confirmPassword !== password) {
      setError('Confirm Password does not match the password entered above.');
      return;
    }

    try {
      setSubmitting(true);
      if (idMode === 'phone' && phone) {
        const cleanLoginPhone = phone.replace(/\D/g, '').slice(-10);
        if (cleanLoginPhone) localStorage.setItem('seller_login_phone', cleanLoginPhone);
        localStorage.setItem('seller_auth_mode', 'phone');
        localStorage.removeItem('seller_login_email');
      } else if (idMode === 'email' && email) {
        localStorage.setItem('seller_login_email', email.trim().toLowerCase());
        localStorage.setItem('seller_auth_mode', 'email');
        localStorage.removeItem('seller_login_phone');
      } else {
        localStorage.setItem('seller_auth_mode', idMode || 'phone');
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
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Verification failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // One-click Login with Gmail
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
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Gmail login failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Demo Fill Up: Only fills the currently highlighted card (Phone OR Email) + Password
  const handleDemoFillUp = () => {
    setPortalStarted(false);
    if (idMode === 'email') {
      setEmail('seller@adab.com');
      setPhone('');
      setPassword('adab1234');
    } else {
      setPhone('9999999999');
      setEmail('');
      setPassword('123456');
    }
    setOtp('');
    setConfirmPassword('');
    setError('');
  };

  const handleResetTopSection = () => {
    setPortalStarted(false);
    setOtp('');
    setConfirmPassword('');
    setError('');
  };

  const isPhoneActive = idMode === 'phone';
  const isEmailActive = idMode === 'email';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-green-900 to-gray-900 flex items-center justify-center p-4">
      <div className="card !shadow-none max-w-2xl w-full p-7 space-y-5 border border-emerald-800/30 bg-white rounded-2xl">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#15803D] text-white flex items-center justify-center font-extrabold text-lg">
              A
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-gray-900 leading-tight">ADAB Seller Portal</h1>
              <p className="text-xs text-gray-500">Unified merchant access &amp; store onboarding</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {portalStarted && (
              <button
                type="button"
                onClick={handleResetTopSection}
                className="text-xs font-bold text-[#15803D] hover:underline cursor-pointer mr-1"
              >
                Edit Credentials
              </button>
            )}
            <button
              type="button"
              onClick={handleDemoFillUp}
              className="px-3 py-1.5 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-xs font-extrabold shrink-0 transition cursor-pointer"
            >
              Demo Fill Up
            </button>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-start gap-2">
            <i className="fa-solid fa-circle-exclamation mt-0.5 text-rose-600"></i>
            <span>{error}</span>
          </div>
        )}

        {infoMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-start gap-2">
            <i className="fa-solid fa-circle-check mt-0.5 text-emerald-600"></i>
            <span>{infoMsg}</span>
          </div>
        )}

        {/* SECTION 1: Dynamic Expand/Compress Columns */}
        <div
          role="region"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !portalStarted) handleStartPortal(e);
          }}
          className="space-y-4"
        >
          {/* Dynamic Expand/Compress Columns: Active column = 68%, Compressed column = 32% */}
          <div className="relative w-full">
            {/* Sliding Tall Green Container spanning Row 1 + Row 2 (Always 68% width) */}
            <div
              className={`pointer-events-none absolute inset-y-0 w-[calc(68%-0.5rem)] rounded-xl transition-all duration-300 ease-out ${
                isEmailActive ? 'left-[calc(32%+0.5rem)]' : 'left-0'
              } ${
                portalStarted
                  ? 'bg-gray-200 border-2 border-gray-300'
                  : 'bg-[#15803D] border-2 border-[#15803D]'
              }`}
            />

            {/* ROW 1: Phone Number (Left, expands/compresses) & Email Address (Right, compresses/expands) */}
            <div className="relative z-10 h-[78px] w-full">
              {/* Left Column: Phone Number */}
              <div
                onClick={() => selectIdMode('phone')}
                className={`absolute inset-y-0 left-0 p-3 rounded-xl transition-all duration-300 ease-out ${
                  isPhoneActive ? 'w-[calc(68%-0.5rem)]' : 'w-[calc(32%-0.5rem)]'
                } ${portalStarted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <label
                  className={`text-xs font-bold block mb-1.5 cursor-pointer transition-colors duration-200 truncate ${
                    portalStarted
                      ? 'text-gray-500'
                      : isPhoneActive
                      ? 'text-white'
                      : 'text-gray-600'
                  }`}
                >
                  Phone Number{' '}
                  {isPhoneActive && (
                    <span className={portalStarted ? 'text-gray-500' : 'text-amber-200 font-extrabold'}>*</span>
                  )}
                </label>
                <div className="relative">
                  <span
                    className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold ${
                      portalStarted || !isPhoneActive ? 'text-gray-400' : 'text-[#15803D]'
                    }`}
                  >
                    +91
                  </span>
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    name="adab_seller_phone_input"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={10}
                    disabled={portalStarted}
                    value={phone}
                    onFocus={() => !portalStarted && selectIdMode('phone')}
                    onChange={handlePhoneChange}
                    placeholder="9876543210"
                    className={`w-full pl-10 pr-3 py-2 rounded-lg border text-sm font-mono font-bold outline-none transition-colors ${
                      portalStarted
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : isPhoneActive
                        ? 'bg-white text-gray-900 border-white'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  />
                </div>
              </div>

              {/* Right Column: Email Address */}
              <div
                onClick={() => selectIdMode('email')}
                className={`absolute inset-y-0 p-3 rounded-xl transition-all duration-300 ease-out ${
                  isEmailActive
                    ? 'left-[calc(32%+0.5rem)] w-[calc(68%-0.5rem)]'
                    : 'left-[calc(68%+0.5rem)] w-[calc(32%-0.5rem)]'
                } ${portalStarted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <label
                  className={`text-xs font-bold block mb-1.5 cursor-pointer transition-colors duration-200 truncate ${
                    portalStarted
                      ? 'text-gray-500'
                      : isEmailActive
                      ? 'text-white'
                      : 'text-gray-600'
                  }`}
                >
                  Email Address{' '}
                  {isEmailActive && (
                    <span className={portalStarted ? 'text-gray-500' : 'text-amber-200 font-extrabold'}>*</span>
                  )}
                </label>
                <input
                  ref={emailInputRef}
                  type="text"
                  inputMode="email"
                  name="adab_seller_email_input"
                  autoComplete="off"
                  disabled={portalStarted}
                  value={email}
                  onFocus={() => !portalStarted && selectIdMode('email')}
                  onChange={handleEmailChange}
                  placeholder="seller@adab.com"
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-semibold outline-none transition-colors ${
                    portalStarted
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : isEmailActive
                      ? 'bg-white text-gray-900 border-white'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                />
              </div>
            </div>

            {/* ROW 2: Password (68% width, inside green container) & Login with Gmail (32% width, in compressed column) */}
            <div className="relative z-10 h-[82px] w-full">
              {/* Password Field (Moves with the 68% green highlight container) */}
              <div
                className={`absolute inset-y-0 w-[calc(68%-0.5rem)] px-3 pb-3.5 pt-1.5 transition-all duration-300 ease-out ${
                  isEmailActive ? 'left-[calc(32%+0.5rem)]' : 'left-0'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    className={`text-xs font-bold ${
                      portalStarted ? 'text-gray-500' : 'text-white'
                    }`}
                  >
                    Password{' '}
                    <span className={portalStarted ? 'text-gray-500' : 'text-amber-200 font-extrabold'}>*</span>
                  </label>
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={portalStarted}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className={`text-[10px] font-bold hover:underline cursor-pointer ${
                      portalStarted ? 'text-gray-400' : 'text-green-100'
                    }`}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type="text"
                  name="adab_seller_pwd_custom"
                  autoComplete="off"
                  disabled={portalStarted}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' }}
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-semibold outline-none transition-colors ${
                    portalStarted
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-900 border-white'
                  }`}
                />
              </div>

              {/* Login with Gmail Button (Sits in the 32% compressed column, vertically aligned with Password input) */}
              <div
                className={`absolute inset-y-0 w-[calc(32%-0.5rem)] px-3 pb-3.5 pt-1.5 transition-all duration-300 ease-out ${
                  isEmailActive ? 'left-0' : 'left-[calc(68%+0.5rem)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 invisible select-none" aria-hidden="true">
                  <span className="text-xs font-bold">Spacer</span>
                </div>
                <button
                  type="button"
                  disabled={portalStarted || submitting}
                  onClick={handleGmailLogin}
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition ${
                    portalStarted || submitting
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-200 hover:border-gray-300 cursor-pointer'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M12 10.2v3.9h5.5c-.24 1.26-.96 2.33-2.04 3.05l3.3 2.56c1.92-1.77 3.04-4.38 3.04-7.51 0-.72-.06-1.42-.19-2H12z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.3-2.56c-.91.61-2.07.99-3.32.99-2.55 0-4.71-1.72-5.48-4.04H3.11v2.64C4.76 19.89 8.12 22 12 22z"
                    />
                    <path
                      fill="#4A90E2"
                      d="M6.52 13.96A5.98 5.98 0 0 1 6.2 12c0-.68.12-1.34.32-1.96V7.4H3.11A9.98 9.98 0 0 0 2 12c0 1.61.39 3.14 1.11 4.6l3.41-2.64z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.95 2.98 14.7 2 12 2 8.12 2 4.76 4.11 3.11 7.4l3.41 2.64C7.29 7.7 9.45 5.98 12 5.98z"
                    />
                  </svg>
                  <span className="truncate">Login with Gmail</span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartPortal}
            disabled={portalStarted}
            className={`w-full py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition ${
              portalStarted
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'btn-primary cursor-pointer'
            }`}
          >
            <i className="fa-solid fa-play text-xs"></i> Start the Portal
          </button>
        </div>

        {/* SECTION 2: OTP, Confirm Password/PIN & "Verify" */}
        <div
          role="region"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && portalStarted && !submitting) handleVerify(e);
          }}
          className="space-y-4 pt-2 border-t border-gray-100"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`text-xs font-bold block mb-1 ${portalStarted ? 'text-gray-700' : 'text-gray-400'}`}>
                Enter OTP <span className="text-rose-600 font-extrabold">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                disabled={!portalStarted}
                value={otp}
                onChange={handleOtpChange}
                placeholder="123456"
                className={`w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold tracking-widest outline-none transition ${
                  !portalStarted
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-900 border-gray-200 focus:border-[#15803D]'
                }`}
              />
            </div>

            <div>
              <label className={`text-xs font-bold block mb-1 ${portalStarted ? 'text-gray-700' : 'text-gray-400'}`}>
                Confirm Password <span className="text-rose-600 font-extrabold">*</span>
              </label>
              <input
                type="text"
                name="adab_seller_confirm_pwd"
                autoComplete="off"
                disabled={!portalStarted}
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                placeholder="••••••••"
                style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' }}
                className={`w-full px-3 py-2 rounded-xl border text-sm font-semibold outline-none transition ${
                  !portalStarted
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-900 border-gray-200 focus:border-[#15803D]'
                }`}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleVerify}
            disabled={!portalStarted || submitting}
            className={`w-full py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition ${
              !portalStarted
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'btn-primary disabled:opacity-60 cursor-pointer'
            }`}
          >
            <i className="fa-solid fa-shield-check"></i>
            {submitting ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </div>
    </div>
  );
}
