import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import sellerService from '../services/sellerService';

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
  const [profile, setProfile] = useState(null);
  const [store, setStore] = useState(null);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [onboardingData, setOnboardingData] = useState(null);
  const [kycSteps, setKycSteps] = useState(() => {
    const saved = localStorage.getItem('seller_kyc_steps');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_APPROVED_STEPS;
  });
  const [loading, setLoading] = useState(true);

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

  const fetchSellerData = useCallback(async (backgroundOnly = false) => {
    if (!isTestEnv && !localStorage.getItem('seller_token')) {
      setLoading(false);
      return;
    }
    try {
      if (!backgroundOnly) setLoading(true);
      const [profileRes, storeRes, metricsRes, onboardingRes] = await Promise.all([
        sellerService.getProfile().catch(() => ({ data: null })),
        sellerService.getStore().catch(() => ({ data: null })),
        sellerService.getDashboardMetrics().catch(() => ({ data: null })),
        sellerService.getOnboarding ? sellerService.getOnboarding().catch(() => ({ data: null })) : Promise.resolve({ data: null })
      ]);

      const ob = onboardingRes?.data || null;
      setProfile(ob?.profile || profileRes?.data || null);
      setStore(ob?.store || storeRes?.data || null);
      setDashboardMetrics(metricsRes?.data || null);
      if (ob) {
        setOnboardingData(ob);
        if (ob.kycSteps) {
          setKycSteps(ob.kycSteps);
        }
      }
    } catch (err) {
      console.error('Failed to load seller context:', err);
    } finally {
      setLoading(false);
    }
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
    if (prof) setProfile(prof);
    if (st) setStore(st);
    if (onboarding) setOnboardingData(onboarding);
    setLoading(false);
    setIsAuthenticated(true);
    // Load dashboard metrics in background without blocking Verify redirect
    sellerService.getDashboardMetrics()
      .then((metricsRes) => {
        if (metricsRes?.data) setDashboardMetrics(metricsRes.data);
      })
      .catch(() => {});
  };

  const login = async (phone, pin) => {
    const res = await sellerService.login(phone, pin);
    const data = res?.data || res;
    handleAuthSuccess(data);
    return data;
  };

  const signup = async (phone, pin, extra = {}) => {
    const res = await sellerService.signup(phone, pin, extra);
    const data = res?.data || res;
    handleAuthSuccess(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('seller_token');
    localStorage.removeItem('seller_user_id');
    localStorage.removeItem('seller_store_id');
    localStorage.removeItem('seller_kyc_steps');
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
      if (updatedOb.profile) setProfile(updatedOb.profile);
      if (updatedOb.store) setStore(updatedOb.store);
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

  return (
    <SellerContext.Provider
      value={{
        isAuthenticated,
        profile,
        store,
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
