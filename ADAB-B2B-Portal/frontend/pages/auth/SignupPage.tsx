import React, { useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Building2,
  Lock,
  ShieldCheck,
  Factory,
  Truck,
  Store,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ChevronLeft
} from 'lucide-react';
import {
  requiredField,
  validateEmail,
  validateMobile,
  validatePassword
} from '../../utils/validation';
import { useNotification } from '../../context/NotificationContext';
import { useAuthStore } from '../../store/useAuthStore';
import authService from '../../services/authService';
import { useGoogleLogin } from '@react-oauth/google';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const { setLoggedIn, setRole } = useAuthStore();

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        const response = await authService.googleLogin(tokenResponse.access_token, { role: formData.role, action: 'signup' });
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

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    companyName: '',
    role: 'manufacturer' as 'manufacturer' | 'distributor',
    password: '',
    confirmPassword: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const errors = useMemo(() => {
    return {
      fullName: requiredField(formData.fullName, 'Full Name'),
      email: validateEmail(formData.email),
      mobile: validateMobile(formData.mobile),
      companyName: requiredField(formData.companyName, 'Business Name'),
      role: requiredField(formData.role, 'Role'),
      password: validatePassword(formData.password),
      confirmPassword: formData.confirmPassword === ''
        ? 'Please confirm your password'
        : formData.confirmPassword !== formData.password
          ? 'Passwords do not match'
          : null
    };
  }, [formData]);

  const isFormValid = !Object.values(errors).some(error => error !== null);
  const isEmailValid = !errors.email;
  const isOtpComplete = otp.every(digit => digit !== '' && /^\d$/.test(digit));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSendOtp = async () => {
    if (!isEmailValid) {
      showError("Please enter a valid work email");
      return;
    }

    try {
      setIsLoading(true);
      await authService.requestOtp(formData.email);
      setIsOtpSent(true);
      showSuccess("Verification code sent successfully");
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!isOtpComplete) {
      showError("Invalid verification code");
      return;
    }

    try {
      setIsLoading(true);
      const otpResponse = await authService.verifyOtp({ email: formData.email, otp: otp.join('') });
      const otpData = otpResponse?.data || otpResponse;

      let token = otpData?.token || otpData?.access_token;
      const roleFromApi = otpData?.role || otpData?.user?.role;
      let loginData: any = null;

      if (!token) {
        const loginResponse = await authService.login({ email: formData.email, password: formData.password });
        loginData = loginResponse?.data || loginResponse;
        token = loginData?.token || loginData?.access_token;
      }

      // token is handled via HttpOnly cookie

      const user = otpData?.user || loginData?.user;
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }

      localStorage.setItem('user_role', roleFromApi || formData.role);
      setIsOtpVerified(true);

      showSuccess("Email verified successfully");
      setLoggedIn(true);
      setRole((roleFromApi || formData.role) as 'manufacturer' | 'distributor');
      navigate(`/${roleFromApi || formData.role}/dashboard`);
    } catch (err: any) {
      showError(err.response?.data?.message || "OTP verification failed");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      showError("Please fill all required fields");
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        full_name: formData.fullName,
        email: formData.email,
        mobile: formData.mobile,
        company_name: formData.companyName,
        role: formData.role,
        password: formData.password,
      };

      await authService.signup(payload);
      showSuccess("Registration successful. Sending verification code...");
    } catch (err: any) {
      showError(err.response?.data?.message || "Registration failed");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    await handleSendOtp();
  };

  const getFieldError = (field: keyof typeof errors) => {
    return touched[field] ? errors[field] : null;
  };

  const inputClasses = (field: keyof typeof errors) => `
    block w-full pl-10 pr-3 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-all
    ${getFieldError(field)
      ? 'border-adab-orange/50 focus:ring-adab-orange/20 focus:border-adab-orange'
      : 'border-gray-300 focus:ring-adab-green/20 focus:border-adab-green'}
  `;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans animate-in fade-in duration-500">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
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
        <h2 className="mt-8 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Create Portal Account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Access the global ADAB manufacturing and distribution network.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-10 px-6 shadow-2xl border border-gray-100 rounded-2xl sm:px-12">
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className={`h-4 w-4 ${getFieldError('fullName') ? 'text-adab-orange' : 'text-gray-400'}`} />
                  </div>
                  <input
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onBlur={() => handleBlur('fullName')}
                    onChange={handleChange}
                    className={inputClasses('fullName')}
                    placeholder="Enter full name"
                    disabled={isLoading || isOtpSent}
                  />
                </div>
                {getFieldError('fullName') && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-adab-orange animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {getFieldError('fullName')}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Work Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className={`h-4 w-4 ${getFieldError('email') ? 'text-adab-orange' : 'text-gray-400'}`} />
                  </div>
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onBlur={() => handleBlur('email')}
                    onChange={handleChange}
                    className={inputClasses('email')}
                    placeholder="name@company.com"
                    disabled={isLoading || isOtpSent}
                  />
                </div>
                {getFieldError('email') && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-adab-orange animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {getFieldError('email')}
                  </div>
                )}
              </div>
            </div>

            <div className={`p-4 rounded-xl border transition-all duration-300 ${isOtpVerified ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
              {!isOtpSent && !isOtpVerified ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Email Verification</p>
                    <p className="text-xs text-gray-400">Verify your work email to enable account creation.</p>
                  </div>
                  <p className="text-[10px] text-gray-400 italic">Sent after signup submission</p>
                </div>
              ) : isOtpVerified ? (
                <div className="flex items-center gap-3 text-adab-green">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-bold uppercase tracking-widest">Email Verified Successfully</span>
                </div>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-900 uppercase tracking-widest">Enter 6-Digit Code</p>
                  </div>
                  <div className="flex justify-between gap-2">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { otpInputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(e.target.value, index)}
                        onKeyDown={(e) => handleOtpKeyDown(e, index)}
                        className="w-full h-10 text-center text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-adab-orange/20 focus:border-adab-orange outline-none transition-all"
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={!isOtpComplete || isLoading}
                    className={`w-full py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all
                      ${isOtpComplete && !isLoading
                        ? 'bg-adab-green text-white hover:bg-green-700 shadow-md'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                  >
                    {isLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mobile Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className={`h-4 w-4 ${getFieldError('mobile') ? 'text-adab-orange' : 'text-gray-400'}`} />
                  </div>
                  <input
                    name="mobile"
                    type="tel"
                    required
                    value={formData.mobile}
                    onBlur={() => handleBlur('mobile')}
                    onChange={handleChange}
                    className={inputClasses('mobile')}
                    placeholder="+91 98765 43210"
                    disabled={isLoading || isOtpSent}
                  />
                </div>
                {getFieldError('mobile') && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-adab-orange animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {getFieldError('mobile')}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className={`h-4 w-4 ${getFieldError('companyName') ? 'text-adab-orange' : 'text-gray-400'}`} />
                  </div>
                  <input
                    name="companyName"
                    type="text"
                    required
                    value={formData.companyName}
                    onBlur={() => handleBlur('companyName')}
                    onChange={handleChange}
                    className={inputClasses('companyName')}
                    placeholder="Company Ltd"
                    disabled={isLoading || isOtpSent}
                  />
                </div>
                {getFieldError('companyName') && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-adab-orange animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {getFieldError('companyName')}
                  </div>
                )}
              </div>
            </div>

            <div>
              <span className="block text-sm font-semibold text-gray-700 mb-4">Registration Role</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={`
                  relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                  ${formData.role === 'manufacturer'
                    ? 'border-adab-green bg-green-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                  ${isLoading || isOtpSent ? 'opacity-50 cursor-not-allowed' : ''}
                `}>
                  <input
                    type="radio"
                    name="role"
                    value="manufacturer"
                    className="sr-only"
                    checked={formData.role === 'manufacturer'}
                    onChange={() => !isLoading && !isOtpSent && setFormData(p => ({...p, role: 'manufacturer'}))}
                    disabled={isLoading || isOtpSent}
                  />
                  <div className={`p-2 rounded-lg mr-3 ${formData.role === 'manufacturer' ? 'bg-adab-green text-white' : 'bg-gray-100 text-gray-400'}`}>
                    <Factory className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 leading-none">Manufacturer</p>
                    <p className="text-[10px] text-gray-500 mt-1">Production</p>
                  </div>
                  {formData.role === 'manufacturer' && (
                    <ShieldCheck className="absolute top-2 right-2 h-4 w-4 text-adab-green" />
                  )}
                </label>

                <label className={`
                  relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                  ${formData.role === 'distributor'
                    ? 'border-adab-orange bg-orange-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                  ${isLoading || isOtpSent ? 'opacity-50 cursor-not-allowed' : ''}
                `}>
                  <input
                    type="radio"
                    name="role"
                    value="distributor"
                    className="sr-only"
                    checked={formData.role === 'distributor'}
                    onChange={() => !isLoading && !isOtpSent && setFormData(p => ({...p, role: 'distributor'}))}
                    disabled={isLoading || isOtpSent}
                  />
                  <div className={`p-2 rounded-lg mr-3 ${formData.role === 'distributor' ? 'bg-adab-orange text-white' : 'bg-gray-100 text-gray-400'}`}>
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 leading-none">Distributor</p>
                    <p className="text-[10px] text-gray-500 mt-1">Logistics</p>
                  </div>
                  {formData.role === 'distributor' && (
                    <ShieldCheck className="absolute top-2 right-2 h-4 w-4 text-adab-orange" />
                  )}
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className={`h-4 w-4 ${getFieldError('password') ? 'text-adab-orange' : 'text-gray-400'}`} />
                  </div>
                  <input
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onBlur={() => handleBlur('password')}
                    onChange={handleChange}
                    className={inputClasses('password')}
                    placeholder="••••••••"
                    disabled={isLoading || isOtpSent}
                  />
                </div>
                {getFieldError('password') && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-adab-orange animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {getFieldError('password')}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className={`h-4 w-4 ${getFieldError('confirmPassword') ? 'text-adab-orange' : 'text-gray-400'}`} />
                  </div>
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onBlur={() => handleBlur('confirmPassword')}
                    onChange={handleChange}
                    className={inputClasses('confirmPassword')}
                    placeholder="••••••••"
                    disabled={isLoading || isOtpSent}
                  />
                </div>
                {getFieldError('confirmPassword') && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-adab-orange animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {getFieldError('confirmPassword')}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={!isFormValid || isLoading || isOtpSent}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-base font-bold text-white transition-all transform active:scale-[0.98]
                  ${isFormValid && !isLoading && !isOtpSent
                    ? 'bg-adab-green hover:bg-green-800'
                    : 'bg-gray-300 cursor-not-allowed opacity-80'}`}
              >
                {isLoading ? 'Processing...' : 'Create Account'}
              </button>
              {isOtpSent && !isOtpVerified && (
                <p className="text-[10px] text-center mt-2 text-adab-orange font-bold uppercase tracking-widest animate-pulse">
                  Complete verification below
                </p>
              )}
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or sign up with</span>
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
          </form>

          <div className="mt-8 border-t border-gray-100 pt-8">
            <div className="text-center">
              <span className="text-sm text-gray-500">Already have an account? </span>
              <Link to="/auth/login" className="text-sm font-bold text-adab-green hover:text-green-800 transition-colors">
                Sign in to your portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
