import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';

export default function Login() {
  const [step, setStep] = useState('EMAIL'); // 'EMAIL' | 'OTP'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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
        setStep('OTP');
        setOtp('');
        setResendCooldown(30);
        setInfoMessage(res.data.message || `A 6-digit verification code has been sent to ${trimmedEmail}`);
      } else {
        setError(res.data?.message || 'Failed to send verification code.');
      }
    } catch (err) {
      console.error('OTP request error:', err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      if (err.response?.status === 404) {
        setError(serverMsg || 'No administrator account found with this email address.');
      } else if (err.response?.status === 403) {
        setError(serverMsg || 'Access denied. Only administrator accounts can sign in to the Admin Portal.');
      } else {
        setError(serverMsg || 'Unable to connect to Admin Backend. Please ensure the server is running.');
      }
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
        localStorage.setItem('token', res.data.token);
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

  const handleDevLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/dev-login');
      if (res.data && res.data.token) {
        localStorage.setItem('token', res.data.token);
        navigate('/');
      }
    } catch (err) {
      setError('Development auto-login is not available.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl border border-slate-100 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-slate-900 leading-tight">ADAB Admin Authentication</h1>
            <p className="text-xs text-indigo-600 font-semibold">Passwordless Email OTP Sign-In</p>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          {step === 'EMAIL'
            ? 'Enter your authorized administrator email to receive a one-time 6-digit verification code in your email inbox.'
            : `Check your email app on your phone (${email.trim()}) and enter the 6-digit verification code below.`}
        </p>

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

        {step === 'EMAIL' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Admin Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-600 leading-relaxed">
              <i className="fa-solid fa-key text-indigo-600 mr-1.5"></i>
              The Admin Portal uses passwordless Email OTP authentication exclusively. Only active administrator accounts can sign in.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Sending Verification Code...' : 'Send Verification OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">6-Digit Verification Code</label>
                <button
                  type="button"
                  onClick={() => {
                    setStep('EMAIL');
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
              {loading ? 'Verifying OTP...' : 'Verify OTP & Sign In'}
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
