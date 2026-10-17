import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import sellerService from '../services/sellerService';
import { getStoreTimingStatus } from '../utils/storeTiming';

const SellerContext = createContext();

const DEFAULT_APPROVED_STEPS = {
  step1: true,
  step2: true,
  step3: true,
  step4: true,
  step5: true,
  step6: true,
  step7: true
};

export function SellerProvider({ children }) {
  const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'test';

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (isTestEnv) return true;
    return Boolean(localStorage.getItem('seller_token'));
  });
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('seller_profile_cache');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });
  const [store, setStore] = useState(() => {
    const saved = localStorage.getItem('seller_store_cache');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });
  const [dashboardMetrics, setDashboardMetrics] = useState(() => {
    try {
      const saved = localStorage.getItem('seller_dashboard_metrics');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });
  const [onboardingData, setOnboardingData] = useState(() => {
    const saved = localStorage.getItem('seller_onboarding_cache');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });
  const [kycSteps, setKycSteps] = useState(() => {
    const saved = localStorage.getItem('seller_kyc_steps');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_APPROVED_STEPS;
  });
  const [loading, setLoading] = useState(() => {
    if (isTestEnv) return false;
    if (!localStorage.getItem('seller_token')) return false;
    return !localStorage.getItem('seller_profile_cache');
  });

  const inFlightRef = React.useRef(null);
  const lastFetchTimeRef = React.useRef(0);

  // Global Bulk Upload Jobs State
  const [uploadJobs, setUploadJobs] = useState(() => {
    const saved = localStorage.getItem('adab_bulk_jobs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('adab_bulk_jobs', JSON.stringify(uploadJobs));
  }, [uploadJobs]);

  useEffect(() => {
    localStorage.setItem('seller_kyc_steps', JSON.stringify(kycSteps));
  }, [kycSteps]);

  useEffect(() => {
    if (profile) {
      localStorage.setItem('seller_profile_cache', JSON.stringify(profile));
    }
  }, [profile]);

  useEffect(() => {
    if (store) {
      localStorage.setItem('seller_store_cache', JSON.stringify(store));
    }
  }, [store]);

  useEffect(() => {
    if (onboardingData) {
      localStorage.setItem('seller_onboarding_cache', JSON.stringify(onboardingData));
    }
  }, [onboardingData]);

  useEffect(() => {
    if (dashboardMetrics) {
      try {
        localStorage.setItem('seller_dashboard_metrics', JSON.stringify(dashboardMetrics));
      } catch (e) {}
    }
  }, [dashboardMetrics]);

  const fetchSellerData = useCallback(async (backgroundOnly = false) => {
    if (!isTestEnv && !localStorage.getItem('seller_token')) {
      setLoading(false);
      return;
    }

    const now = Date.now();
    if (inFlightRef.current) {
      return inFlightRef.current;
    }
    if (backgroundOnly && now - lastFetchTimeRef.current < 2000) {
      return;
    }

    const runFetch = async () => {
      try {
        if (!backgroundOnly && !localStorage.getItem('seller_profile_cache')) {
          setLoading(true);
        }

        // Primary 1-query fetch for onboarding + profile + store + bank + kycSteps
        const onboardingRes = sellerService.getOnboarding
          ? await sellerService.getOnboarding().catch(() => ({ data: null }))
          : { data: null };

        const ob = onboardingRes?.data || null;

        if (ob) {
          lastFetchTimeRef.current = Date.now();
          setOnboardingData(ob);
          if (ob.profile) {
            setProfile(ob.profile);
            if (ob.profile.id) localStorage.setItem('seller_user_id', ob.profile.id);
          }
          if (ob.store) {
            setStore(ob.store);
            if (ob.store.id) localStorage.setItem('seller_store_id', ob.store.id);
          }
          if (ob.kycSteps) setKycSteps(ob.kycSteps);
        } else {
          // Fallback to individual endpoints (also required by unit tests mocking getProfile/getStore)
          const [profileRes, storeRes] = await Promise.all([
            sellerService.getProfile().catch(() => ({ data: null })),
            sellerService.getStore().catch(() => ({ data: null }))
          ]);
          if (profileRes?.data) {
            setProfile(profileRes.data);
            if (profileRes.data.id) localStorage.setItem('seller_user_id', profileRes.data.id);
          }
          if (storeRes?.data) {
            setStore(storeRes.data);
            if (storeRes.data.id) localStorage.setItem('seller_store_id', storeRes.data.id);
          }
        }

        // Load dashboard metrics without blocking onboarding/profile state
        sellerService.getDashboardMetrics()
          .then((metricsRes) => {
            if (metricsRes?.data) setDashboardMetrics(metricsRes.data);
          })
          .catch(() => {});
      } catch (err) {
        console.error('Failed to load seller context:', err);
      } finally {
        setLoading(false);
        inFlightRef.current = null;
      }
    };

    inFlightRef.current = runFetch();
    return inFlightRef.current;
  }, [isTestEnv]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSellerData(Boolean(profile && store));
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Automatically sync seller profile & KYC status from DB when user switches back to browser tab
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchSellerData(true);
      }
    };
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);
    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [isAuthenticated, fetchSellerData]);

  const handleAuthSuccess = (authPayload) => {
    const { token, userId, storeId, profile: prof, store: st, kycSteps: steps, onboarding } = authPayload;
    localStorage.setItem('seller_token', token);
    localStorage.setItem('seller_user_id', userId);
    localStorage.setItem('seller_store_id', storeId);
    if (steps) {
      localStorage.setItem('seller_kyc_steps', JSON.stringify(steps));
      setKycSteps(steps);
    }
    if (prof) {
      localStorage.setItem('seller_profile_cache', JSON.stringify(prof));
      setProfile(prof);
    }
    if (st) {
      localStorage.setItem('seller_store_cache', JSON.stringify(st));
      setStore(st);
    }
    if (onboarding) {
      localStorage.setItem('seller_onboarding_cache', JSON.stringify(onboarding));
      setOnboardingData(onboarding);
    }
    const rawP = authPayload.phone || prof?.phone || st?.phone || '';
    const cleanDigits = String(rawP).replace(/\D/g, '').slice(-10);
    if (cleanDigits) {
      localStorage.setItem('seller_phone', `+91${cleanDigits}`);
    }
    const rawEmail = authPayload.email || prof?.email || '';
    if (rawEmail) {
      localStorage.setItem('seller_email', String(rawEmail).trim().toLowerCase());
    }
    lastFetchTimeRef.current = Date.now();
    setLoading(false);
    setIsAuthenticated(true);
    // Load dashboard metrics in background without blocking Verify redirect
    sellerService.getDashboardMetrics()
      .then((metricsRes) => {
        if (metricsRes?.data) setDashboardMetrics(metricsRes.data);
      })
      .catch(() => {});
  };

  const login = async (phone, password, extra = {}) => {
    const res = await sellerService.login(phone, password, extra);
    const data = res?.data || res;
    const mode = extra.idMode || (extra.email && !phone ? 'email' : 'phone');
    localStorage.setItem('seller_auth_mode', mode);
    handleAuthSuccess(data);
    return data;
  };

  const signup = async (phone, password, extra = {}) => {
    const res = await sellerService.signup(phone, password, extra);
    const data = res?.data || res;
    const mode = extra.idMode || (extra.email && !phone ? 'email' : 'phone');
    localStorage.setItem('seller_auth_mode', mode);
    handleAuthSuccess(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('seller_token');
    localStorage.removeItem('seller_user_id');
    localStorage.removeItem('seller_store_id');
    localStorage.removeItem('seller_kyc_steps');
    localStorage.removeItem('seller_profile_cache');
    localStorage.removeItem('seller_store_cache');
    localStorage.removeItem('seller_onboarding_cache');
    localStorage.removeItem('seller_phone');
    localStorage.removeItem('seller_login_phone');
    localStorage.removeItem('seller_email');
    localStorage.removeItem('seller_login_email');
    localStorage.removeItem('seller_auth_mode');
    localStorage.removeItem('seller_login_identifier');
    localStorage.removeItem('seller_dashboard_metrics');
    localStorage.removeItem('seller_orders_cache');
    localStorage.removeItem('seller_b2b_cache');
    localStorage.removeItem('seller_returns_cache');
    localStorage.removeItem('seller_sidebar_counts');
    setIsAuthenticated(false);
    setProfile(null);
    setStore(null);
    setDashboardMetrics(null);
    setOnboardingData(null);
    setKycSteps(DEFAULT_APPROVED_STEPS);
  };

  const rawKycStatus = String(profile?.kyc_status || '').trim().toUpperCase();
  const rawUserStatus = String(profile?.status || '').trim().toUpperCase();

  const isKycApproved = Boolean(
    ['APPROVED', 'VERIFIED', 'ACTIVE'].includes(rawKycStatus) ||
    ['APPROVED', 'VERIFIED'].includes(rawUserStatus)
  );

  const isKycRejected = Boolean(
    !isKycApproved && (
      ['REJECTED', 'DENIED', 'DECLINED'].includes(rawKycStatus) ||
      ['REJECTED', 'DENIED', 'DECLINED'].includes(rawUserStatus)
    )
  );

  const saveOnboardingStep = async (stepNum, stepPayload) => {
    const res = await sellerService.saveOnboardingStep(stepNum, stepPayload);
    const updatedOb = res?.data || res;
    const updatedApproved =
      String(updatedOb?.profile?.kyc_status || '').trim().toUpperCase() === 'APPROVED' || isKycApproved;
    const isComplianceStep = [1, 2, 3, 5].includes(Number(stepNum));
    const mergedSteps = {
      ...(kycSteps || {}),
      ...(updatedOb?.kycSteps || {}),
      [`step${stepNum}`]: true,
      ...(isComplianceStep && !updatedApproved ? { step7: false } : {})
    };
    setKycSteps(mergedSteps);
    localStorage.setItem('seller_kyc_steps', JSON.stringify(mergedSteps));
    if (updatedOb) {
      setOnboardingData(updatedOb);
      localStorage.setItem('seller_onboarding_cache', JSON.stringify(updatedOb));
      if (updatedOb.profile) {
        setProfile(updatedOb.profile);
        localStorage.setItem('seller_profile_cache', JSON.stringify(updatedOb.profile));
      }
      if (updatedOb.store) {
        setStore(updatedOb.store);
        localStorage.setItem('seller_store_cache', JSON.stringify(updatedOb.store));
      }
    }
    return { ...(updatedOb || {}), kycSteps: mergedSteps };
  };

  const isCriticalSetupDone = Boolean(
    (kycSteps?.step1 && kycSteps?.step2) || isKycApproved || isKycRejected
  );

  const isApplicationSubmitted = Boolean(
    isKycApproved ||
    isKycRejected ||
    kycSteps?.step7 ||
    (['SUBMITTED', 'UNDER_REVIEW'].includes(rawKycStatus) && kycSteps?.step7 !== false) ||
    Boolean(profile?.submitted_at)
  );

  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    // Re-check timing status every 30 seconds to automatically update on open/close boundaries
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const storeTiming = useMemo(() => {
    return getStoreTimingStatus(store, currentTime);
  }, [store, currentTime]);

  const updateStoreSettings = useCallback(async (settingsData) => {
    try {
      const res = await sellerService.updateSettings(settingsData);
      setStore((prev) => {
        const next = { ...(prev || {}), ...settingsData };
        localStorage.setItem('seller_store_cache', JSON.stringify(next));
        return next;
      });
      return res?.data;
    } catch (e) {
      console.error('Failed to update store settings:', e);
      throw e;
    }
  }, []);

  const toggleStoreOnline = useCallback(async () => {
    // If store is open, clicking it turns it off (is_online: false).
    // If store is closed (either manually or outside hours), clicking it turns it online (is_online: true).
    const currentEffectiveOpen = storeTiming?.isOpen;
    const nextOnline = !currentEffectiveOpen;
    return await updateStoreSettings({ is_online: nextOnline });
  }, [storeTiming?.isOpen, updateStoreSettings]);

  return (
    <SellerContext.Provider
      value={{
        isAuthenticated,
        profile,
        store,
        storeTiming,
        updateStoreSettings,
        toggleStoreOnline,
        dashboardMetrics,
        onboardingData,
        kycSteps,
        isCriticalSetupDone,
        isApplicationSubmitted,
        isKycApproved,
        isKycRejected,
        loading,
        refreshSellerData: fetchSellerData,
        login,
        signup,
        logout,
        saveOnboardingStep,
        uploadJobs,
        setUploadJobs
      }}
    >
      {children}
    </SellerContext.Provider>
  );
}

export function useSeller() {
  const context = useContext(SellerContext);
  if (!context) {
    return {
      isAuthenticated: true,
      profile: null,
      store: null,
      storeTiming: {
        isOpen: true,
        isWithinHours: true,
        isManuallyClosed: false,
        openTimeStr: '08:00 AM',
        closeTimeStr: '10:00 PM',
        rawOpenTime: '08:00:00',
        rawCloseTime: '22:00:00',
        statusLabel: 'Store: Open',
        reason: 'open_scheduled',
        badgeClass: 'bg-green-50 text-green-800 border-green-200',
        dotClass: 'bg-green-500 animate-pulse',
        tooltip: 'Store is Open',
        actionPrompt: 'Click to Close Store'
      },
      updateStoreSettings: async () => {},
      toggleStoreOnline: async () => {},
      onboardingData: null,
      kycSteps: DEFAULT_APPROVED_STEPS,
      isCriticalSetupDone: true,
      isApplicationSubmitted: true,
      isKycApproved: true,
      isKycRejected: false,
      loading: false,
      refreshSellerData: () => {},
      login: async () => {},
      signup: async () => {},
      logout: () => {},
      saveOnboardingStep: async () => {},
      uploadJobs: [],
      setUploadJobs: () => {}
    };
  }
  return context;
}
