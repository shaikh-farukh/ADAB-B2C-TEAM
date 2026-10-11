import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeller } from '../context/SellerContext';

const HARDCODED_OTP = '123456';

export default function AuthPage() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [portalStarted, setPortalStarted] = useState(false);

  const [otp, setOtp] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useSeller();
  const navigate = useNavigate();

  const handlePhoneChange = (e) => {
    if (portalStarted) return;
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
  };

  const handlePinChange = (e) => {
    if (portalStarted) return;
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(digitsOnly);
  };

  const handleOtpChange = (e) => {
    if (!portalStarted) return;
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(digitsOnly);
  };

  const handleConfirmPinChange = (e) => {
    if (!portalStarted) return;
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setConfirmPin(digitsOnly);
  };

  // Step 1: User presses "Start the Portal"
  const handleStartPortal = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setError('PIN must be exactly 6 digits.');
      return;
    }

    // Lock top inputs & unlock OTP + Confirm PIN + Verify
    setPortalStarted(true);
  };

  // Step 2: User presses "Verify"
  const handleVerify = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!portalStarted) return;
    setError('');

    if (otp !== HARDCODED_OTP) {
      setError('Invalid OTP. Please check and try again.');
      return;
    }

    if (confirmPin !== pin) {
      setError('Confirm PIN does not match the 6-digit PIN entered above.');
      return;
    }

    try {
      setSubmitting(true);
      const data = await login(phone, pin);
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

  // Demo Fill Up: Fills Phone Number & PIN in the top section (before "Start the Portal")
  const handleDemoFillUp = () => {
    setPortalStarted(false);
    setPhone('9876543210');
    setPin('123456');
    setOtp('');
    setConfirmPin('');
    setError('');
  };

  const handleResetTopSection = () => {
    setPortalStarted(false);
    setOtp('');
    setConfirmPin('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-green-900 to-gray-900 flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-emerald-800/30 bg-white rounded-2xl">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-dark text-white flex items-center justify-center font-extrabold text-xl shadow-md">
              A
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-gray-900 leading-tight">ADAB Seller Portal</h1>
              <p className="text-xs text-gray-500">Unified merchant access &amp; store onboarding</p>
            </div>
          </div>
          {portalStarted && (
            <button
              type="button"
              onClick={handleResetTopSection}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              Edit Number
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-start gap-2">
            <i className="fa-solid fa-circle-exclamation mt-0.5 text-rose-600"></i>
            <span>{error}</span>
          </div>
        )}

        {/* SECTION 1: Phone Number, PIN & "Start the Portal" */}
        <div
          role="region"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !portalStarted) handleStartPortal(e);
          }}
          className="space-y-3.5"
        >
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Phone Number <span className="text-rose-600 font-extrabold">*</span>
            </label>
            <div className="relative">
              <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold ${portalStarted ? 'text-gray-400' : 'text-gray-500'}`}>
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                disabled={portalStarted}
                value={phone}
                onChange={handlePhoneChange}
                placeholder="9876543210"
                className={`w-full pl-11 pr-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold outline-none transition ${
                  portalStarted
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-900 border-gray-200 focus:border-green-600'
                }`}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-gray-700">
                6-Digit PIN <span className="text-rose-600 font-extrabold">*</span>
              </label>
              <span className="text-[11px] font-semibold text-gray-400">{pin.length}/6 digits</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              disabled={portalStarted}
              value={pin}
              onChange={handlePinChange}
              placeholder="••••••"
              style={{ WebkitTextSecurity: 'disc' }}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-base font-mono tracking-[0.4em] outline-none transition ${
                portalStarted
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-900 border-gray-200 focus:border-green-600'
              }`}
            />
          </div>

          <button
            type="button"
            onClick={handleStartPortal}
            disabled={portalStarted}
            className={`w-full py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition ${
              portalStarted
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'btn-primary shadow-md'
            }`}
          >
            <i className="fa-solid fa-play text-xs"></i> Start the Portal
          </button>
        </div>

        {/* RESERVED TEXT AREA FOR OTP STATUS MESSAGE */}
        <div
          className={`min-h-[42px] px-3.5 py-2.5 rounded-xl border text-xs font-extrabold flex items-center transition ${
            portalStarted
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-gray-50 border-gray-100 text-gray-400'
          }`}
        >
          {portalStarted ? (
            <span className="flex items-center gap-1.5">
              <i className="fa-solid fa-circle-check text-emerald-600"></i>
              Sent OTP to verify
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-medium">
              <i className="fa-solid fa-lock text-gray-400"></i>
              OTP verification will unlock after pressing Start the Portal
            </span>
          )}
        </div>

        {/* SECTION 2: OTP, Confirm PIN & "Verify" (Initially Disabled/Grey, Unlocks After Start the Portal) */}
        <div
          role="region"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && portalStarted && !submitting) handleVerify(e);
          }}
          className="space-y-3.5 pt-1 border-t border-gray-100"
        >
          <div className="grid grid-cols-2 gap-3">
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
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold tracking-widest outline-none transition ${
                  !portalStarted
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-900 border-gray-200 focus:border-green-600'
                }`}
              />
            </div>

            <div>
              <label className={`text-xs font-bold block mb-1 ${portalStarted ? 'text-gray-700' : 'text-gray-400'}`}>
                Confirm PIN <span className="text-rose-600 font-extrabold">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                disabled={!portalStarted}
                value={confirmPin}
                onChange={handleConfirmPinChange}
                placeholder="••••••"
                style={{ WebkitTextSecurity: 'disc' }}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-base font-mono tracking-[0.35em] outline-none transition ${
                  !portalStarted
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-900 border-gray-200 focus:border-green-600'
                }`}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleVerify}
            disabled={!portalStarted || submitting}
            className={`w-full py-3 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition ${
              !portalStarted
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'btn-primary shadow-md disabled:opacity-60'
            }`}
          >
            <i className="fa-solid fa-shield-check"></i>
            {submitting ? 'Verifying...' : 'Verify'}
          </button>
        </div>

        {/* SECTION 3: Demo Fill Up (Below Verify, Fills Top Section) */}
        <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-extrabold text-emerald-950">Demo Store Credentials</div>
            <div className="text-[11px] text-emerald-800 font-mono">
              Phone: <b>9876543210</b> • PIN: <b>123456</b>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDemoFillUp}
            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold shrink-0 transition"
          >
            Demo Fill Up
          </button>
        </div>
      </div>
    </div>
  );
}
