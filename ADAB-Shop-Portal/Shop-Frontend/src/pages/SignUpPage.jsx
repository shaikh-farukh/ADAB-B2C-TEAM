import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSeller } from '../context/SellerContext';
import { routeAfterAuth } from '../utils/authRouter';

export default function SignUpPage() {
  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { signup, loginWithGoogle } = useSeller();
  const navigate = useNavigate();

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
  };

  const handleSignUpSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    // Validations
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }

    if (!storeName.trim() || storeName.trim().length < 2) {
      setError('Please enter your store or business trade name.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await signup(cleanPhone, password, {
        email: email.trim() || undefined,
        full_name: fullName.trim(),
        store_name: storeName.trim(),
        idMode: 'phone'
      });

      // Save local auth state for phone
      localStorage.setItem('seller_login_phone', cleanPhone);
      localStorage.setItem('seller_auth_mode', 'phone');
      if (email.trim()) localStorage.setItem('seller_login_email', email.trim().toLowerCase());

      routeAfterAuth(data, navigate);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Registration failed. Please check your information.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Google SSO One-Tap Quick Register
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '238782717135-jbafl6ffcgdhpcc33nj3tmtqr538paqr.apps.googleusercontent.com';

  const handleGoogleSignUp = async () => {
    setError('');
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
              setError('Google Sign-Up was cancelled.');
            } else {
              setError(`Google Sign-Up failed: ${tokenResponse.error_description || tokenResponse.error}`);
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
            const msg = err?.response?.data?.error || err?.message || 'Google registration failed.';
            setError(msg);
          } finally {
            setSubmitting(false);
          }
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      setSubmitting(false);
      setError(err?.message || 'Failed to initialize Google Sign-Up.');
    }
  };

  return (
    <div className="h-screen h-[100dvh] w-full bg-gradient-to-b from-slate-50 via-gray-50 to-slate-100 flex flex-col justify-center items-center p-3 sm:p-4 font-sans relative overflow-hidden select-none">
      
      {/* Subtle Background Ambient Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Centered Floating Card */}
      <div className="w-full max-w-md relative z-10 my-auto">
        <div className="bg-white/95 backdrop-blur-md py-4 sm:py-5 px-5 sm:px-7 shadow-xl shadow-slate-200/60 border border-slate-200/80 rounded-2xl sm:rounded-3xl transition-all max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
          
          {/* Logo & Branding */}
          <div className="flex items-center justify-center gap-2 mb-2 sm:mb-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-md shadow-emerald-500/25">
              A
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-none">
                ada<span className="text-emerald-500">B</span>
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Seller Central
              </span>
            </div>
          </div>

          <div className="text-center mb-3">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Register Your Store
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Join ADAB and start selling to thousands of nearby buyers
            </p>
          </div>

          {/* Sign Up Form */}
          <form className="space-y-2 sm:space-y-2.5" onSubmit={handleSignUpSubmit} noValidate autoComplete="off">
            
            {/* Full Name & Store Name Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                  Owner Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <i className="fa-regular fa-user text-xs"></i>
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Rajesh Sharma"
                    className="block w-full h-[36px] sm:h-[38px] pl-8 pr-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                  Store / Trade Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <i className="fa-solid fa-store text-xs"></i>
                  </div>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Sharma Mart"
                    className="block w-full h-[36px] sm:h-[38px] pl-8 pr-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Mobile Phone & Work Email in 2 Columns on Desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <span className="text-[11px] font-bold text-slate-700">+91</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="9876543210"
                    className="block w-full pl-10 pr-2.5 py-1.5 h-[36px] sm:h-[38px] bg-slate-50/70 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 font-mono font-bold text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                  Work Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <i className="fa-regular fa-envelope text-xs"></i>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@store.com"
                    className="block w-full pl-8 pr-2.5 h-[36px] sm:h-[38px] bg-slate-50/70 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                Create Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <i className="fa-solid fa-lock text-xs"></i>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="block w-full h-[36px] sm:h-[38px] pl-8 pr-9 bg-slate-50/70 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white text-xs sm:text-sm"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-emerald-600 cursor-pointer"
                >
                  <i className={showPassword ? 'fa-regular fa-eye-slash text-xs' : 'fa-regular fa-eye text-xs'}></i>
                </button>
              </div>
            </div>

            {/* Terms Notice */}
            <p className="text-[10px] text-slate-500 leading-tight">
              By creating a store, you agree to ADAB's{' '}
              <span className="text-emerald-600 font-semibold cursor-pointer">Merchant Terms</span> &{' '}
              <span className="text-emerald-600 font-semibold cursor-pointer">Privacy Policy</span>.
            </p>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-[38px] sm:h-[40px] flex justify-center items-center py-2 px-4 rounded-xl shadow-md shadow-emerald-500/20 text-xs sm:text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] transition cursor-pointer disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {submitting ? 'Registering Store...' : 'Create Seller Account & Continue →'}
            </button>
          </form>

          {/* Social Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[11px]">
              <span className="px-2.5 bg-white text-slate-400 font-medium">Or quick register with</span>
            </div>
          </div>

          {/* Google Sign-Up Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={submitting}
            className="w-full h-[36px] sm:h-[38px] flex justify-center items-center py-1.5 px-4 border border-slate-300/90 rounded-xl shadow-xs text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer disabled:opacity-60"
          >
            <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          {/* Error Feedback */}
          {error && (
            <div className="mt-2 w-full px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation text-rose-500 shrink-0 text-xs"></i>
              <span className="leading-tight flex-1">{error}</span>
            </div>
          )}

          {/* Link to Sign In */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have a registered store?{' '}
              <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-700 ml-1">
                Sign In to Account &rarr;
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
