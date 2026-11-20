import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AuthAPI } from '../services/api';
import { lookupPincode, getOfflinePincodeHint } from '../utils/pincode';

/**
 * LoginPage Component - ADAB Customer Portal
 * Clean, minimal, premium pop-up modal authentication
 *
 * Preserves ALL functionalities:
 * - Email OTP (Brevo SMTP 6-digit verification code) & Password login
 * - Google OAuth & Google Identity Services (GIS) One Tap / Account Chooser
 * - Continue as Guest option
 * - 3-Step Registration Wizard:
 *     Step 1: Personal Details (Name, Email, Phone, Password, Confirm Password)
 *     Step 2: OTP Verification (6-digit code with resend countdown timer & hints)
 *     Step 3: Delivery Address with 4 separated fields for accurate geocoding:
 *             - House / Flat / Block No
 *             - Building / Society / Apartment Name
 *             - Area / Street / Locality Name
 *             - Landmark (optional)
 *             - Pincode auto-detection for Surat/Gujarat
 * - Forgot & Reset Password flows
 */
export default function LoginPage({ onLoginSuccess, onNavigate, onContinueGuest, onClose, initialMode = 'login' }) {
  // Modes: 'login' | 'register' | 'forgot' | 'reset'
  const [prevInitialMode, setPrevInitialMode] = useState(initialMode);
  const [mode, setMode] = useState(initialMode === 'signup' ? 'register' : (initialMode || 'login'));

  // Multi-step Registration Wizard: 1 (Details) | 2 (OTP) | 3 (Address)
  const [signupStep, setSignupStep] = useState(1);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else if (onContinueGuest) {
      onContinueGuest();
    } else if (onNavigate) {
      onNavigate('home');
    }
  }, [onClose, onContinueGuest, onNavigate]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  // Synchronize mode if initialMode changes dynamically from parent navigation
  if (initialMode !== prevInitialMode) {
    setPrevInitialMode(initialMode);
    setMode(initialMode === 'signup' ? 'register' : (initialMode || 'login'));
    if (initialMode === 'signup' || initialMode === 'register') {
      setSignupStep(1);
    }
  }

  // Login form state
  const [loginMethod, setLoginMethod] = useState('otp'); // 'otp' | 'password' (Default to Email OTP Login)
  const [loginOtpStep, setLoginOtpStep] = useState(1); // 1 = Enter Email, 2 = Enter OTP
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginOtp, setLoginOtp] = useState('');
  const [loginOtpTimer, setLoginOtpTimer] = useState(0);

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
  const [regHouseNumber, setRegHouseNumber] = useState('');
  const [regBuildingName, setRegBuildingName] = useState('');
  const [regAreaName, setRegAreaName] = useState('');
  const [regLandmark, setRegLandmark] = useState('');
  const [regPincode, setRegPincode] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regState, setRegState] = useState('');
  const [regIsDefault, setRegIsDefault] = useState(true);
  const [isDetectingRegPin, setIsDetectingRegPin] = useState(false);
  const [regPinHint, setRegPinHint] = useState('');

  // Forgot & Reset password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [generatedOtpHint, setGeneratedOtpHint] = useState('');

  // Loading & feedback states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Hidden Google button container for GIS prompt
  const googleBtnContainerRef = useRef(null);
  const tokenClientRef = useRef(null);

  // Timer countdown for registration OTP resend
  useEffect(() => {
    let timer = null;
    if (otpResendTimer > 0) {
      timer = setInterval(() => {
        setOtpResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [otpResendTimer]);

  // Timer countdown for Login OTP resend
  useEffect(() => {
    let timer = null;
    if (loginOtpTimer > 0) {
      timer = setInterval(() => {
        setLoginOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [loginOtpTimer]);

  // Clear feedback messages
  const clearFeedback = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Switch modes cleanly
  const switchMode = (newMode) => {
    clearFeedback();
    if (newMode === 'register') {
      setSignupStep(1);
    } else if (newMode === 'login') {
      setLoginOtpStep(1);
      setLoginOtp('');
    }
    setMode(newMode);
    if (onNavigate) {
      if (newMode === 'register') {
        onNavigate('signup');
      } else if (newMode === 'login') {
        onNavigate('login');
      }
    }
  };

  // ==========================================================
  // EMAIL OTP LOGIN HANDLERS
  // ==========================================================
  const handleSendLoginOtp = async (e) => {
    if (e) e.preventDefault();
    clearFeedback();

    if (!loginEmail.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginEmail.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthAPI.sendLoginOtp(loginEmail.trim());
      if (res && res.success) {
        setLoginOtp(''); // Empty so user types code received in their email
        setLoginOtpTimer(30);
        setLoginOtpStep(2);
        setSuccessMsg(res.message || 'Verification code sent to your email! Please check your inbox (and Spam folder).');
      } else {
        setErrorMsg(res?.message || 'Could not send verification code.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send login code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (e) => {
    if (e) e.preventDefault();
    clearFeedback();

    if (!loginOtp.trim() || loginOtp.trim().length < 4) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthAPI.verifyLoginOtp(loginEmail.trim(), loginOtp.trim());
      if (res && res.success && res.user) {
        localStorage.setItem('adab_auth_token', res.token || 'auth_token_' + Date.now());
        localStorage.setItem('adab_user', JSON.stringify(res.user));
        localStorage.setItem('adab_user_id', res.user.id);

        setSuccessMsg(`Welcome back, ${res.user.name || res.user.full_name || 'Customer'}!`);

        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        }
      } else {
        setErrorMsg(res?.message || 'Invalid verification code. Please check and try again.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Verification failed. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendLoginOtp = async () => {
    if (loginOtpTimer > 0 || loading) return;
    clearFeedback();
    setLoading(true);
    try {
      const res = await AuthAPI.sendLoginOtp(loginEmail.trim());
      if (res && res.success) {
        setLoginOtp('');
        setLoginOtpTimer(30);
        setSuccessMsg('A fresh verification code has been sent to your email! Please check your inbox.');
      } else {
        setErrorMsg(res?.message || 'Failed to resend code.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // GOOGLE OAUTH HANDLERS
  // ==========================================================
  // Handle Google OAuth Credential (ID Token) Response
  const handleGoogleCredentialResponse = useCallback(async (response) => {
    clearFeedback();
    setGoogleLoading(true);
    try {
      const res = await AuthAPI.googleAuth({ credential: response.credential });
      if (res && res.success && res.user) {
        localStorage.setItem('adab_auth_token', res.token || 'auth_token_' + Date.now());
        localStorage.setItem('adab_user', JSON.stringify(res.user));
        localStorage.setItem('adab_user_id', res.user.id);

        const welcomeText = res.is_new_user
          ? `Welcome to ADAB, ${res.user.name || res.user.full_name || 'Customer'}! Your account has been created.`
          : `Welcome back, ${res.user.name || res.user.full_name || 'Customer'}!`;

        setSuccessMsg(welcomeText);

        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        }
      } else {
        setErrorMsg(res?.message || 'Google authentication failed. Please try again.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Unable to authenticate with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }, [onLoginSuccess]);

  // Handle Google OAuth Access Token Response
  const handleGoogleTokenSuccess = useCallback(async (accessToken) => {
    clearFeedback();
    setGoogleLoading(true);
    try {
      // Fetch verified user profile directly from Google
      let userInfo = null;
      try {
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (infoRes.ok) {
          userInfo = await infoRes.json();
        }
      } catch (err) {
        console.warn('Google userinfo fetch in browser notice:', err.message);
      }

      const res = await AuthAPI.googleAuth({
        access_token: accessToken,
        user_info: userInfo
      });

      if (res && res.success && res.user) {
        localStorage.setItem('adab_auth_token', res.token || 'auth_token_' + Date.now());
        localStorage.setItem('adab_user', JSON.stringify(res.user));
        localStorage.setItem('adab_user_id', res.user.id);

        const welcomeText = res.is_new_user
          ? `Welcome to ADAB, ${res.user.name || res.user.full_name || 'Customer'}! Your account has been created.`
          : `Welcome back, ${res.user.name || res.user.full_name || 'Customer'}!`;

        setSuccessMsg(welcomeText);

        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        }
      } else {
        setErrorMsg(res?.message || 'Google authentication failed. Please try again.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Unable to authenticate with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }, [onLoginSuccess]);

  // Listen for popup redirect hash or message event
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        if (accessToken) {
          if (window.opener && window.opener !== window) {
            try {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', access_token: accessToken }, window.location.origin);
              window.close();
              return;
            } catch {
              // ignore
            }
          }
          window.history.replaceState(null, '', window.location.pathname);
          setTimeout(() => {
            handleGoogleTokenSuccess(accessToken);
          }, 0);
        }
      }

      const handleMessage = (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'GOOGLE_AUTH_SUCCESS' && event.data?.access_token) {
          handleGoogleTokenSuccess(event.data.access_token);
        }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [handleGoogleTokenSuccess]);

  // Initialize Google Identity Services (GIS)
  useEffect(() => {
    const clientId = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.GOOGLE_CLIENT_ID) ||
      (typeof window !== 'undefined' && window.GOOGLE_CLIENT_ID) ||
      '';

    const setupGoogleGsi = () => {
      if (typeof window !== 'undefined' && window.google?.accounts && clientId) {
        try {
          // 1. Initialize Google Identity Services (One Tap & ID Token)
          if (window.google.accounts.id) {
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: handleGoogleCredentialResponse,
              auto_select: false,
              cancel_on_tap_outside: true
            });

            if (googleBtnContainerRef.current) {
              window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                width: 380,
                text: 'continue_with',
                shape: 'rectangular',
                logo_alignment: 'center'
              });
            }
          }

          // 2. Initialize OAuth2 Token Client for Custom Button Popup Account Chooser
          if (window.google.accounts.oauth2) {
            tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
              client_id: clientId,
              scope: 'email profile openid',
              prompt: 'select_account',
              callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                  handleGoogleTokenSuccess(tokenResponse.access_token);
                } else if (tokenResponse?.error) {
                  console.warn('[Google OAuth] Error response:', tokenResponse.error);
                  setGoogleLoading(false);
                  if (tokenResponse.error !== 'popup_closed_by_user') {
                    setErrorMsg('Google sign-in was canceled or encountered an issue. Please try again.');
                  }
                }
              }
            });
          }
        } catch (e) {
          console.debug('[Google OAuth] GSI initialization notice:', e.message);
        }
      }
    };

    if (typeof window !== 'undefined') {
      if (!window.google?.accounts) {
        const existingScript = document.getElementById('google-gsi-client');
        if (!existingScript) {
          const script = document.createElement('script');
          script.id = 'google-gsi-client';
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = setupGoogleGsi;
          document.body.appendChild(script);
        } else {
          existingScript.addEventListener('load', setupGoogleGsi);
          existingScript.onload = setupGoogleGsi;
        }
      } else {
        setupGoogleGsi();
      }
    }
  }, [handleGoogleCredentialResponse, handleGoogleTokenSuccess, mode, signupStep]);

  // Trigger Google Sign-In with official Account Chooser Popup
  const triggerGoogleSignIn = () => {
    clearFeedback();
    const clientId = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.GOOGLE_CLIENT_ID) ||
      (typeof window !== 'undefined' && window.GOOGLE_CLIENT_ID) ||
      '';

    const isRealClientId = clientId && !clientId.includes('your_google_client_id');

    if (!isRealClientId) {
      simulateDevGoogleAuth();
      return;
    }

    setGoogleLoading(true);

    // Priority 1: Official Google OAuth2 Token Client Popup (Account Chooser)
    if (tokenClientRef.current) {
      try {
        tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('Google token client prompt error:', err);
      }
    }

    // Priority 2: Google Identity Services One Tap prompt
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
        return;
      } catch (err) {
        console.warn('Google id prompt error:', err);
      }
    }

    // Priority 3: Direct official Google Account Chooser popup window
    if (typeof window !== 'undefined') {
      const redirectUri = window.location.origin + window.location.pathname;
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=email%20profile%20openid&prompt=select_account`;
      const width = 500;
      const height = 620;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(oauthUrl, 'GoogleSignIn', `width=${width},height=${height},left=${left},top=${top}`);
      if (!popup) {
        setGoogleLoading(false);
        setErrorMsg('Popup was blocked by your browser. Please allow popups for this site.');
      }
    }
  };

  // Demo Fallback for local testing without active Google Cloud Console credentials
  const simulateDevGoogleAuth = async () => {
    setGoogleLoading(true);
    try {
      const mockPayload = {
        email: mode === 'register' ? `google_shopper_${Date.now().toString().slice(-4)}@adabtest.com` : 'priya.sharma@adabtest.com',
        name: 'Priya Sharma',
        full_name: 'Priya Sharma',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        sub: `google_oauth_sub_${Date.now()}`
      };
      const mockToken = 'mock_google_token_' + btoa(JSON.stringify(mockPayload));

      const res = await AuthAPI.googleAuth({ credential: mockToken });
      if (res && res.success && res.user) {
        localStorage.setItem('adab_auth_token', res.token || 'auth_token_' + Date.now());
        localStorage.setItem('adab_user', JSON.stringify(res.user));
        localStorage.setItem('adab_user_id', res.user.id);

        setSuccessMsg(
          res.is_new_user
            ? `✓ Connected with Google! Welcome to ADAB, ${res.user.name || res.user.full_name || 'Customer'}.`
            : `✓ Connected with Google! Welcome back, ${res.user.name || res.user.full_name || 'Customer'}.`
        );

        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        }
      } else {
        setErrorMsg(res?.message || 'Google authentication demo failed. Please check backend connection.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Google authentication failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ==========================================================
  // PASSWORD LOGIN SUBMISSION
  // ==========================================================
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
    if (!cleanedPhone || cleanedPhone.length < 10) {
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
        }
        setRegOtp(''); // Keep empty so user inputs code from their email
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
        setSuccessMsg('✓ Contact verified! Please set your delivery address.');
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
        setRegOtp('');
        setOtpResendTimer(30);
        setSuccessMsg('A fresh verification code has been sent to your email!');
      } else {
        setErrorMsg(res?.message || 'Could not resend code. Please try again.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // Pincode auto-detection in Step 3
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
          const detectedCity = detected.city || offline?.city || '';
          const detectedState = detected.state || offline?.state || '';
          setRegPinHint(`✓ Auto-detected: ${[detectedCity, detectedState].filter(Boolean).join(', ')}`);
        } else if (!offline) {
          setRegPinHint('Pincode set. Confirm city & state below.');
        }
      } catch (e) {
        console.debug('Pincode detection notice:', e.message);
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

    if (!regHouseNumber.trim()) {
      setErrorMsg('Please enter your house or flat number.');
      return;
    }

    if (!regBuildingName.trim()) {
      setErrorMsg('Please enter your building, apartment, or society name.');
      return;
    }

    if (!regAreaName.trim()) {
      setErrorMsg('Please enter your area or street name.');
      return;
    }

    if (!regPincode.trim() || regPincode.trim().length < 6) {
      setErrorMsg('Please enter a valid 6-digit pincode.');
      return;
    }

    const combinedAddress = `${regHouseNumber.trim()}, ${regBuildingName.trim()}, ${regAreaName.trim()}`;

    setLoading(true);
    try {
      const payload = {
        name: regName.trim(),
        full_name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        password: regPassword,
        otp: regOtp.trim(),
        // Address Details separated for precise society-level mapping
        house_number: regHouseNumber.trim(),
        building_name: regBuildingName.trim(),
        area_name: regAreaName.trim(),
        address_line: combinedAddress,
        address: combinedAddress,
        landmark: regLandmark.trim(),
        city: regCity.trim(),
        state: regState.trim(),
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
          } catch {
            // ignore
          }
        }

        setSuccessMsg('Account created and delivery address saved! Welcome to ADAB.');

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

  // ==========================================================
  // FORGOT / RESET PASSWORD SUBMISSIONS
  // ==========================================================
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
          setGeneratedOtpHint(`Demo hint: Your OTP is ${res.otp}`);
        }
        setResetOtp('');
        setMode('reset');
      } else {
        setErrorMsg(res?.message || 'Failed to send reset code. Please check your email.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error requesting password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    clearFeedback();

    if (!resetOtp.trim()) {
      setErrorMsg('Please enter the OTP verification code.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthAPI.resetPassword(forgotEmail.trim(), resetOtp.trim(), newPassword);
      if (res && res.success) {
        setSuccessMsg('✓ Password updated successfully! Please log in with your new password.');
        setLoginEmail(forgotEmail.trim());
        setLoginPassword('');
        setLoginMethod('password');
        setMode('login');
      } else {
        setErrorMsg(res?.message || 'Password reset failed. Invalid or expired OTP.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="authModalHeading"
      id="loginModalOverlay"
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-[460px] my-auto bg-white rounded-[28px] border border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.28)] p-5 sm:p-6 transition-all max-h-[96vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with ADAB Logo and Close button */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#18753C] text-white flex items-center justify-center font-black text-base shadow-xs">
              A
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 leading-none">ADAB</span>
              <p className="text-[10px] text-slate-500 font-normal leading-tight">
                Neighbourhood shops delivered in minutes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>

        {/* Heading */}
        <div className="text-center my-1.5">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">
            {mode === 'register'
              ? (signupStep === 1 ? 'Create an account' : signupStep === 2 ? 'Verify your contact' : 'Delivery address')
              : mode === 'forgot'
              ? 'Reset password'
              : mode === 'reset'
              ? 'Set new password'
              : 'Welcome back'}
          </h1>
          <p className="text-[11px] text-slate-500 font-normal mt-0.5">
            {mode === 'register'
              ? (signupStep === 1
                  ? 'Sign up to start shopping local'
                  : signupStep === 2
                  ? `Enter 6-digit code sent to ${regEmail || regPhone}`
                  : 'Set your address for 14-45 min local delivery')
              : mode === 'forgot'
              ? 'Enter your email to receive a recovery code'
              : mode === 'reset'
              ? 'Enter your OTP and choose a new password'
              : 'Log in to continue shopping'}
          </p>
        </div>

        {/* Segmented Toggle: Login | Create Account */}
        {(mode === 'login' || mode === 'register') && (
          <div className="relative bg-slate-100 p-0.5 rounded-lg flex items-center mb-2" role="tablist">
            <div
              className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-white rounded-md shadow-xs transition-all duration-200 ease-out"
              style={{
                left: mode === 'register' ? 'calc(50% + 1px)' : '2px'
              }}
              aria-hidden="true"
            />
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => switchMode('login')}
              className={`relative z-10 w-1/2 py-1 text-center text-xs transition-colors duration-150 cursor-pointer ${
                mode === 'login' ? 'text-slate-900 font-bold' : 'text-slate-500 font-normal hover:text-slate-800'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => switchMode('register')}
              className={`relative z-10 w-1/2 py-1 text-center text-xs transition-colors duration-150 cursor-pointer ${
                mode === 'register' ? 'text-slate-900 font-bold' : 'text-slate-500 font-normal hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Multi-step Stepper Indicator for Sign Up */}
        {mode === 'register' && (
          <div className="flex items-center justify-between mb-2 px-1">
            {[
              { step: 1, label: 'Details' },
              { step: 2, label: 'Verify' },
              { step: 3, label: 'Address' }
            ].map((item, idx) => (
              <div key={item.step} className="flex items-center gap-1">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    signupStep > item.step
                      ? 'bg-[#18753C] text-white'
                      : signupStep === item.step
                      ? 'bg-[#18753C] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {signupStep > item.step ? <i className="fa-solid fa-check text-[8px]"></i> : item.step}
                </div>
                <span
                  className={`text-[11px] ${
                    signupStep === item.step ? 'font-bold text-slate-900' : 'text-slate-400 font-normal'
                  }`}
                >
                  {item.label}
                </span>
                {idx < 2 && <div className="w-6 sm:w-10 h-[1px] bg-slate-200 mx-1"></div>}
              </div>
            ))}
          </div>
        )}

        {/* Inline Feedback Messages */}
        {errorMsg && (
          <div
            role="alert"
            className="mb-2 p-2 rounded-lg bg-red-50/80 border border-red-100 text-red-700 text-xs font-normal flex items-start gap-1.5"
          >
            <i className="fa-solid fa-circle-exclamation text-red-500 mt-0.5 shrink-0 text-xs"></i>
            <span className="flex-1 leading-relaxed">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div
            role="status"
            className="mb-2 p-2 rounded-lg bg-emerald-50/80 border border-emerald-100 text-[#18753C] text-xs font-normal flex items-start gap-1.5"
          >
            <i className="fa-solid fa-circle-check text-[#18753C] mt-0.5 shrink-0 text-xs"></i>
            <span className="flex-1 leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* ========================================================
            VIEW 1: LOGIN (SIGN IN) - EMAIL OTP & PASSWORD
        ======================================================== */}
        {mode === 'login' && (
          <div className="space-y-2">
            {/* Sub-toggle: Email OTP vs Password */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('otp');
                  clearFeedback();
                }}
                className={`flex-1 py-1 text-center rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  loginMethod === 'otp'
                    ? 'bg-white text-[#18753C] font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <i className="fa-solid fa-envelope-open-text text-[10px]"></i>
                <span>Email OTP</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('password');
                  clearFeedback();
                }}
                className={`flex-1 py-1 text-center rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  loginMethod === 'password'
                    ? 'bg-white text-[#18753C] font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <i className="fa-solid fa-lock text-[10px]"></i>
                <span>Password</span>
              </button>
            </div>

            {/* A: Email OTP Login */}
            {loginMethod === 'otp' && (
              <div>
                {loginOtpStep === 1 ? (
                  <form onSubmit={handleSendLoginOtp} className="space-y-2">
                    <div>
                      <label htmlFor="loginEmailOtp" className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Registered Email
                      </label>
                      <input
                        id="loginEmailOtp"
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          if (errorMsg) clearFeedback();
                        }}
                        placeholder="you@example.com"
                        className="w-full h-[36px] px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#18753C] focus:ring-1 focus:ring-[#18753C]/20 transition-all font-normal"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">We'll send a 6-digit login code to your email inbox</p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || googleLoading}
                      className="w-full h-[38px] bg-[#18753C] hover:bg-[#135d30] text-white font-semibold text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                    >
                      {loading ? (
                        <>
                          <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                          <span>Sending code...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Login Code</span>
                          <i className="fa-solid fa-arrow-right text-[10px]"></i>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyLoginOtp} className="space-y-2">
                    <div className="p-2 bg-emerald-50/80 border border-emerald-100 rounded-lg text-xs text-[#18753C] flex items-center justify-between">
                      <div className="truncate">Code sent to <strong>{loginEmail}</strong></div>
                      <button
                        type="button"
                        onClick={() => setLoginOtpStep(1)}
                        className="text-[10px] font-bold underline ml-2 shrink-0 cursor-pointer"
                      >
                        Change
                      </button>
                    </div>

                    <div>
                      <label htmlFor="loginOtpInput" className="block text-xs font-semibold text-slate-700 mb-1 text-center">
                        Enter 6-Digit Code
                      </label>
                      <input
                        id="loginOtpInput"
                        type="text"
                        required
                        autoFocus
                        maxLength={6}
                        value={loginOtp}
                        onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="------"
                        className="w-full h-[42px] text-center bg-slate-50 border-2 border-[#18753C] rounded-lg text-xl font-mono tracking-[0.3em] font-black text-slate-900 focus:outline-none focus:bg-white transition-all shadow-xs"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <span className="text-slate-400">Didn't receive code?</span>
                      {loginOtpTimer > 0 ? (
                        <span className="font-semibold text-slate-400">Resend in {loginOtpTimer}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendLoginOtp}
                          disabled={loading}
                          className="font-semibold text-[#18753C] hover:underline cursor-pointer"
                        >
                          Resend Code
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          clearFeedback();
                          setLoginOtpStep(1);
                        }}
                        className="w-1/3 h-[38px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <i className="fa-solid fa-arrow-left text-[10px]"></i>
                        <span>Back</span>
                      </button>

                      <button
                        type="submit"
                        disabled={loading || loginOtp.length < 4}
                        className="flex-1 h-[38px] bg-[#18753C] hover:bg-[#135d30] text-white font-semibold text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <span>Verify &amp; Log In</span>
                            <i className="fa-solid fa-arrow-right text-[10px]"></i>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* B: Password Login */}
            {loginMethod === 'password' && (
              <form onSubmit={handleLoginSubmit} className="space-y-2">
                <div>
                  <label htmlFor="loginEmail" className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Email Address
                  </label>
                  <input
                    id="loginEmail"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (errorMsg) clearFeedback();
                    }}
                    placeholder="you@example.com"
                    className="w-full h-[36px] px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#18753C] focus:ring-1 focus:ring-[#18753C]/20 transition-all font-normal"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label htmlFor="loginPassword" className="block text-[11px] font-semibold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[11px] font-semibold text-[#18753C] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="loginPassword"
                      name="password"
                      type={showLoginPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        if (errorMsg) clearFeedback();
                      }}
                      placeholder="Enter your password"
                      className="w-full h-[36px] pl-2.5 pr-8 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#18753C] focus:ring-1 focus:ring-[#18753C]/20 transition-all font-normal"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      <i className={`fa-solid ${showLoginPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full h-[38px] bg-[#18753C] hover:bg-[#135d30] text-white font-semibold text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                >
                  {loading ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                      <span>Logging in...</span>
                    </>
                  ) : (
                    <span>Log in</span>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ========================================================
            VIEW 2: SIGN UP - STEP 1: PERSONAL DETAILS
        ======================================================== */}
        {mode === 'register' && signupStep === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="regName" className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Full Name
                </label>
                <input
                  id="regName"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={regName}
                  onChange={(e) => {
                    setRegName(e.target.value);
                    if (errorMsg) clearFeedback();
                  }}
                  placeholder="e.g. Priya Sharma"
                  className="w-full h-[36px] px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#18753C] focus:ring-1 focus:ring-[#18753C]/20 transition-all font-normal"
                />
              </div>

              <div>
                <label htmlFor="regPhone" className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Mobile Number
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-[11px] font-semibold text-slate-500 pointer-events-none">
                    +91
                  </span>
                  <input
                    id="regPhone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    maxLength={10}
                    value={regPhone}
                    onChange={(e) => {
                      setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                      if (errorMsg) clearFeedback();
                    }}
                    placeholder="98765 12340"
                    className="w-full h-[36px] pl-9 pr-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#18753C] focus:ring-1 focus:ring-[#18753C]/20 transition-all font-normal"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="regEmail" className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                Email Address
              </label>
              <input
                id="regEmail"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={regEmail}
                onChange={(e) => {
                  setRegEmail(e.target.value);
                  if (errorMsg) clearFeedback();
                }}
                placeholder="you@example.com"
                className="w-full h-[36px] px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#18753C] focus:ring-1 focus:ring-[#18753C]/20 transition-all font-normal"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="regPassword" className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="regPassword"
                    name="password"
                    type={showRegPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      if (errorMsg) clearFeedback();
                    }}
                    placeholder="Min 6 chars"
                    className="w-full h-[36px] pl-2.5 pr-8 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#18753C] focus:ring-1 focus:ring-[#18753C]/20 transition-all font-normal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <i className={`fa-solid ${showRegPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="regConfirmPassword" className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="regConfirmPassword"
                    name="confirmPassword"
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => {
                      setRegConfirmPassword(e.target.value);
                      if (errorMsg) clearFeedback();
                    }}
                    placeholder="Re-enter password"
                    className="w-full h-[36px] pl-2.5 pr-8 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#18753C] focus:ring-1 focus:ring-[#18753C]/20 transition-all font-normal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    aria-label={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <i className={`fa-solid ${showRegConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[38px] bg-[#18753C] hover:bg-[#135d30] text-white font-semibold text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                  <span>Sending code...</span>
                </>
              ) : (
                <>
                  <span>Continue to Verification</span>
                  <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================
            VIEW 3: SIGN UP - STEP 2: OTP VERIFICATION
        ======================================================== */}
        {mode === 'register' && signupStep === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-2.5">
            <div className="p-2 bg-emerald-50/80 border border-emerald-100 rounded-lg text-xs text-[#18753C] flex items-center justify-between">
              <div className="truncate">Code sent to <strong>{regEmail}</strong></div>
              <button
                type="button"
                onClick={() => setSignupStep(1)}
                className="text-[10px] font-bold underline ml-2 shrink-0 cursor-pointer"
              >
                Change
              </button>
            </div>

            <div>
              <label htmlFor="regOtpInput" className="block text-xs font-semibold text-slate-700 mb-1 text-center">
                Enter 6-Digit Code
              </label>
              <input
                id="regOtpInput"
                type="text"
                required
                autoFocus
                maxLength={6}
                value={regOtp}
                onChange={(e) => {
                  setRegOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                  if (errorMsg) clearFeedback();
                }}
                placeholder="------"
                className="w-full h-[42px] text-center bg-slate-50 border-2 border-[#18753C] rounded-lg text-xl font-mono tracking-[0.3em] font-black text-slate-900 focus:outline-none focus:bg-white transition-all shadow-xs"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <span className="text-slate-400">Didn't receive code?</span>
              {otpResendTimer > 0 ? (
                <span className="font-semibold text-slate-400">Resend in {otpResendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="font-semibold text-[#18753C] hover:underline cursor-pointer"
                >
                  Resend Code
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  clearFeedback();
                  setSignupStep(1);
                }}
                className="w-1/3 h-[38px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
              >
                <i className="fa-solid fa-arrow-left text-[10px]"></i>
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={loading || regOtp.length < 4}
                className="flex-1 h-[38px] bg-[#18753C] hover:bg-[#135d30] text-white font-semibold text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <i className="fa-solid fa-arrow-right text-[10px]"></i>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================
            VIEW 4: SIGN UP - STEP 3: DELIVERY ADDRESS
        ======================================================== */}
        {mode === 'register' && signupStep === 3 && (
          <form onSubmit={handleStep3Submit} className="space-y-2">
            {/* Address Type Selection */}
            <div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: 'Home', icon: 'fa-house' },
                  { key: 'Work', icon: 'fa-briefcase' },
                  { key: 'Other', icon: 'fa-location-dot' }
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setRegAddressType(t.key)}
                    className={`py-1 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      regAddressType === t.key
                        ? 'border-[#18753C] bg-emerald-50 text-[#18753C] shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <i className={`fa-solid ${t.icon} text-[10px]`}></i>
                    <span>{t.key}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient Name & Phone */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Recipient Name
                </label>
                <input
                  type="text"
                  required
                  value={regRecipientName}
                  onChange={(e) => setRegRecipientName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full h-[34px] px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-normal text-slate-900 focus:outline-none focus:border-[#18753C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  required
                  value={regRecipientPhone}
                  onChange={(e) => setRegRecipientPhone(e.target.value)}
                  placeholder="Mobile Phone"
                  className="w-full h-[34px] px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-normal text-slate-900 focus:outline-none focus:border-[#18753C]"
                />
              </div>
            </div>

            {/* House / Flat & Building in 2 cols */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Flat / House No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={regHouseNumber}
                  onChange={(e) => setRegHouseNumber(e.target.value)}
                  placeholder="Flat 502 / House 12"
                  className="w-full h-[34px] px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-normal text-slate-900 focus:outline-none focus:border-[#18753C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Building / Society <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={regBuildingName}
                  onChange={(e) => setRegBuildingName(e.target.value)}
                  placeholder="Shivalik Residency"
                  className="w-full h-[34px] px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-normal text-slate-900 focus:outline-none focus:border-[#18753C]"
                />
              </div>
            </div>

            {/* Area & Landmark in 2 cols */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Area / Locality <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={regAreaName}
                  onChange={(e) => setRegAreaName(e.target.value)}
                  placeholder="VIP Road, Vesu"
                  className="w-full h-[34px] px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-normal text-slate-900 focus:outline-none focus:border-[#18753C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Landmark <span className="text-slate-400 font-normal">(opt)</span>
                </label>
                <input
                  type="text"
                  value={regLandmark}
                  onChange={(e) => setRegLandmark(e.target.value)}
                  placeholder="Near City Mall"
                  className="w-full h-[34px] px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-normal text-slate-900 focus:outline-none focus:border-[#18753C]"
                />
              </div>
            </div>

            {/* Pincode & City */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Pincode (6-digit) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={regPincode}
                    onChange={(e) => handleRegPincodeChange(e.target.value)}
                    placeholder="395007"
                    className="w-full h-[34px] px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-normal text-slate-900 focus:outline-none focus:border-[#18753C]"
                  />
                  {isDetectingRegPin && (
                    <i className="fa-solid fa-circle-notch fa-spin absolute right-2.5 top-2.5 text-xs text-slate-400"></i>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">City</label>
                <input
                  type="text"
                  required
                  value={regCity}
                  onChange={(e) => setRegCity(e.target.value)}
                  className="w-full h-[34px] px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-normal text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            {regPinHint && (
              <p className="text-[10px] text-[#18753C] font-semibold">{regPinHint}</p>
            )}

            {/* State & Default address checkbox */}
            <div className="grid grid-cols-2 gap-2 items-center">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">State</label>
                <input
                  type="text"
                  required
                  value={regState}
                  onChange={(e) => setRegState(e.target.value)}
                  className="w-full h-[34px] px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-normal text-slate-800 focus:outline-none"
                />
              </div>
              <div className="pt-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regIsDefault}
                    onChange={(e) => setRegIsDefault(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#18753C] focus:ring-[#18753C] border-slate-300"
                  />
                  <span className="text-[11px] text-slate-600 font-normal">Default address</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  clearFeedback();
                  setSignupStep(2);
                }}
                className="w-1/3 h-[38px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
              >
                <i className="fa-solid fa-arrow-left text-[10px]"></i>
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 h-[38px] bg-[#18753C] hover:bg-[#135d30] text-white font-semibold text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <i className="fa-solid fa-check text-xs"></i>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================
            VIEW 5: FORGOT PASSWORD
        ======================================================== */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-2">
            <div>
              <label htmlFor="forgotEmail" className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                Email Address
              </label>
              <input
                id="forgotEmail"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={forgotEmail}
                onChange={(e) => {
                  setForgotEmail(e.target.value);
                  if (errorMsg) clearFeedback();
                }}
                placeholder="you@example.com"
                className="w-full h-[36px] px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#18753C] focus:ring-1 focus:ring-[#18753C]/20 transition-all font-normal"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[38px] bg-[#18753C] hover:bg-[#135d30] text-white font-semibold text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 mt-1"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                  <span>Sending code...</span>
                </>
              ) : (
                <span>Send Reset Code</span>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs font-semibold text-slate-600 hover:text-[#18753C] cursor-pointer"
              >
                ← Back to log in
              </button>
            </div>
          </form>
        )}

        {/* ========================================================
            VIEW 6: RESET PASSWORD
        ======================================================== */}
        {mode === 'reset' && (
          <form onSubmit={handleResetSubmit} className="space-y-2">
            {generatedOtpHint && (
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-[#18753C] font-normal">
                {generatedOtpHint}
              </div>
            )}
            <div>
              <label htmlFor="resetOtp" className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                Verification Code
              </label>
              <input
                id="resetOtp"
                name="otp"
                type="text"
                required
                value={resetOtp}
                onChange={(e) => {
                  setResetOtp(e.target.value);
                  if (errorMsg) clearFeedback();
                }}
                placeholder="Enter 6-digit code"
                className="w-full h-[36px] px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#18753C] focus:ring-1 focus:ring-[#18753C]/20 transition-all font-normal tracking-widest text-center"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="newPassword" className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errorMsg) clearFeedback();
                    }}
                    placeholder="Min 6 chars"
                    className="w-full h-[36px] pl-2.5 pr-8 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#18753C] focus:ring-1 focus:ring-[#18753C]/20 transition-all font-normal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <i className={`fa-solid ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmNewPassword" className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmNewPassword"
                    name="confirmNewPassword"
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => {
                      setConfirmNewPassword(e.target.value);
                      if (errorMsg) clearFeedback();
                    }}
                    placeholder="Re-enter password"
                    className="w-full h-[36px] pl-2.5 pr-8 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#18753C] focus:ring-1 focus:ring-[#18753C]/20 transition-all font-normal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <i className={`fa-solid ${showConfirmNewPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[38px] bg-[#18753C] hover:bg-[#135d30] text-white font-semibold text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 mt-1"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                  <span>Updating password...</span>
                </>
              ) : (
                <span>Set New Password</span>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs font-semibold text-slate-600 hover:text-[#18753C] cursor-pointer"
              >
                ← Back to log in
              </button>
            </div>
          </form>
        )}

        {/* Divider & Google Sign In (for login & register step 1) */}
        {(mode === 'login' || (mode === 'register' && signupStep === 1)) && (
          <>
            <div className="relative my-2 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <span className="relative bg-white px-2 text-[10px] text-slate-400 font-medium">or</span>
            </div>

            <div className="relative w-full h-[36px]">
              <button
                type="button"
                onClick={triggerGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full h-[36px] bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-60"
              >
                {googleLoading ? (
                  <i className="fa-solid fa-circle-notch fa-spin text-slate-400 text-xs"></i>
                ) : (
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>{googleLoading ? 'Connecting...' : 'Continue with Google'}</span>
              </button>

              {/* Official Google GSI Button overlay for native 1-click accounts.google.com chooser */}
              <div
                ref={googleBtnContainerRef}
                onClick={triggerGoogleSignIn}
                className="absolute inset-0 opacity-[0.001] overflow-hidden cursor-pointer flex items-center justify-center pointer-events-none [&_iframe]:pointer-events-auto [&_iframe]:w-full [&_iframe]:h-full"
                style={{ minHeight: '36px' }}
              />
            </div>

            {/* Continue as Guest option */}
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleClose}
                className="w-full h-8 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/80 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <i className="fa-regular fa-compass text-slate-400 text-xs"></i>
                <span>Continue as Guest</span>
              </button>
            </div>

            <p className="text-center text-[10px] text-slate-400 font-normal mt-1.5 leading-tight">
              By continuing you agree to our Terms &amp; Privacy Policy
            </p>
          </>
        )}

        {/* Screen-reader accessible fallback */}
        <div className="sr-only">
          Not a user? <button type="button" onClick={() => switchMode('register')}>Register here</button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
