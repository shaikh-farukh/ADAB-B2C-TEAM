import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSeller } from '../context/SellerContext';
import { useTranslation } from '../context/LanguageContext';

export const getStepTitles = (t) => [
  t ? t('kycStep1Title', 'Store & Owner Profile') : 'Store & Owner Profile',
  t ? t('kycStep2Title', 'KYC & GST Compliance') : 'KYC & GST Compliance',
  t ? t('kycStep3Title', 'Bank Account Details') : 'Bank Account Details',
  t ? t('kycStep4Title', 'Store Operations & Delivery') : 'Store Operations & Delivery',
  t ? t('kycStep5Title', 'B2B Wholesale & Credit') : 'B2B Wholesale & Credit'
];

const STEP_TITLES = [
  'Store & Owner Profile',
  'KYC & GST Compliance',
  'Bank Account Details',
  'Store Operations & Delivery',
  'B2B Wholesale & Credit'
];

const extractCleanPhone = (val) => {
  if (!val) return '';
  const digits = String(val).replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};

export default function OnboardingPage() {
  const { t } = useTranslation();
  const stepTitles = getStepTitles(t);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    profile,
    store,
    onboardingData,
    kycSteps,
    isCriticalSetupDone,
    isApplicationSubmitted = false,
    isKycApproved = false,
    isKycRejected = false,
    refreshSellerData,
    saveOnboardingStep
  } = useSeller();

  useEffect(() => {
    if (refreshSellerData) {
      refreshSellerData(true);
    }
  }, [refreshSellerData]);

  const rawParamStep = Number(searchParams.get('step')) || 1;
  const paramStep = Math.min(5, Math.max(1, rawParamStep));
  const fromPath = searchParams.get('from') || '';
  const featureName = searchParams.get('feature') || '';

  const [currentStep, setCurrentStep] = useState(paramStep);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const authMode = localStorage.getItem('seller_auth_mode') || 
    (localStorage.getItem('seller_login_email') ? 'email' : 
     (localStorage.getItem('seller_login_phone') ? 'phone' : 
      (profile?.email && !profile?.is_phone_verified ? 'email' : 'phone')));
  const isPhoneLogin = authMode === 'phone';
  const isEmailLogin = authMode === 'email';

  // Step 1 State: Store & Owner Profile (Critical) — initialized directly if step1 already saved
  const [shopName, setShopName] = useState(() => (kycSteps?.step1 ? store?.store_name || '' : ''));
  const [legalName, setLegalName] = useState(() => (kycSteps?.step1 ? profile?.legal_name || '' : ''));
  const [entityType, setEntityType] = useState(() => (kycSteps?.step1 ? profile?.entity_type || 'Sole Proprietorship' : 'Sole Proprietorship'));
  const [category, setCategory] = useState(() => (kycSteps?.step1 ? store?.category || 'Grocery & Supermarket' : 'Grocery & Supermarket'));
  const [ownerName, setOwnerName] = useState(() => (kycSteps?.step1 ? profile?.full_name || '' : ''));
  const [phone, setPhone] = useState(() => {
    const loginPhone = localStorage.getItem('seller_login_phone');
    if (loginPhone) return extractCleanPhone(loginPhone);
    if (kycSteps?.step1 || profile?.is_phone_verified) {
      return extractCleanPhone(profile?.phone || store?.phone);
    }
    return '';
  });
  const [email, setEmail] = useState(() => {
    return profile?.email || localStorage.getItem('seller_login_email') || localStorage.getItem('seller_email') || '';
  });
  const [address, setAddress] = useState(() => (kycSteps?.step1 ? store?.address_line || '' : ''));
  const [city, setCity] = useState(() => (kycSteps?.step1 ? store?.city || '' : ''));
  const [stateName, setStateName] = useState(() => (kycSteps?.step1 ? onboardingData?.profileData?.state || store?.state || '' : ''));
  const [pincode, setPincode] = useState(() => (kycSteps?.step1 ? onboardingData?.profileData?.pincode || store?.pincode || '' : ''));

  // Step 2 State: KYC & GST Compliance (Critical)
  const [gstin, setGstin] = useState(() => (kycSteps?.step2 ? profile?.gstin || '' : ''));
  const [pan, setPan] = useState(() => (kycSteps?.step2 && profile?.pan && profile.pan !== 'PENDING00P' ? profile.pan : ''));
  const [fssai, setFssai] = useState(() => (kycSteps?.step2 ? profile?.fssai_license || '' : ''));
  const [udhyam, setUdhyam] = useState(() => (kycSteps?.step2 ? profile?.udhyam_msme || '' : ''));

  // Step 3 State: Bank Account Details
  const [bankName, setBankName] = useState('HDFC Bank');
  const [accHolder, setAccHolder] = useState('');
  const [accNum, setAccNum] = useState('');
  const [accNumConfirm, setAccNumConfirm] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accType, setAccType] = useState('CURRENT');

  // Step 4 State: Store Operations & Delivery
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('22:00');
  const [zoneRadius, setZoneRadius] = useState('10');
  const [delivFast, setDelivFast] = useState(true);
  const [delivSame, setDelivSame] = useState(true);
  const [delivScheduled, setDelivScheduled] = useState(true);
  const [delivPickup, setDelivPickup] = useState(true);
  const [fleet, setFleet] = useState('SELF');

  // Step 5 State: B2B Wholesale & Credit
  const [enableCredit, setEnableCredit] = useState(true);
  const [creditDays, setCreditDays] = useState('14');
  const [creditLimit, setCreditLimit] = useState('');
  const [creditMinOrder, setCreditMinOrder] = useState('');

  // Track optimistic step completion locally to avoid any render-cycle desync when advancing steps
  const [localDoneSteps, setLocalDoneSteps] = useState({});
  const effectiveKycSteps = { ...(kycSteps || {}), ...localDoneSteps };
  const effectiveCriticalDone = Boolean(
    (effectiveKycSteps.step1 && effectiveKycSteps.step2) || isCriticalSetupDone
  );

  useEffect(() => {
    const rawS = Number(searchParams.get('step'));
    if (!rawS) return;
    if (rawS >= 6 && effectiveCriticalDone) {
      navigate('/regstatus', { replace: true });
      return;
    }
    const s = Math.min(5, Math.max(1, rawS));
    if (!effectiveCriticalDone) {
      if (!effectiveKycSteps.step1 && s > 1) {
        setCurrentStep(1);
        return;
      }
      if (effectiveKycSteps.step1 && !effectiveKycSteps.step2 && s > 2) {
        setCurrentStep(2);
        return;
      }
    }
    setCurrentStep(s);
    // Only re-run when URL searchParams change so saving a step never resets currentStep from stale query params
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Populate ONLY the verified phone number by default; other step fields populate if that step was saved or has DB data
  useEffect(() => {
    const loginPhone = localStorage.getItem('seller_login_phone');
    if (loginPhone) {
      setPhone(extractCleanPhone(loginPhone));
    } else if (kycSteps?.step1 || profile?.is_phone_verified) {
      const p = extractCleanPhone(profile?.phone || store?.phone);
      if (p) setPhone(p);
    }

    const loginEmail = profile?.email || localStorage.getItem('seller_login_email') || localStorage.getItem('seller_email') || '';
    if (loginEmail) {
      setEmail((prev) => prev || loginEmail);
    }

    const hasStep1 = Boolean(kycSteps?.step1 || (store?.address_line && String(store.address_line).trim()));
    if (hasStep1) {
      if (store) {
        setShopName(store.store_name || '');
        setCategory(store.category || 'Grocery & Supermarket');
        setAddress(store.address_line || '');
        setCity(store.city || '');
        if (store.state) setStateName(store.state);
        if (store.pincode) setPincode(store.pincode);
      }
      if (profile) {
        setOwnerName(profile.full_name || '');
        setEmail(profile.email || '');
        setLegalName(profile.legal_name || '');
        setEntityType(profile.entity_type || 'Sole Proprietorship');
      }
      if (onboardingData?.profileData) {
        if (onboardingData.profileData.state) setStateName(onboardingData.profileData.state);
        if (onboardingData.profileData.pincode) setPincode(onboardingData.profileData.pincode);
      }
    }

    const hasStep2 = Boolean(kycSteps?.step2 || (profile?.gstin && profile?.pan && profile.pan !== 'PENDING00P'));
    if (hasStep2 && profile) {
      setGstin(profile.gstin || '');
      setPan(profile.pan && profile.pan !== 'PENDING00P' ? profile.pan : '');
      setFssai(profile.fssai_license || '');
      setUdhyam(profile.udhyam_msme || '');
    }

    const hasStep3 = Boolean(kycSteps?.step3 || onboardingData?.bankAccount?.account_number);
    if (hasStep3 && onboardingData?.bankAccount) {
      const b = onboardingData.bankAccount;
      setBankName(b.bank_name || 'HDFC Bank');
      setAccHolder(b.account_holder_name || '');
      setAccNum(b.account_number || '');
      setAccNumConfirm(b.account_number || '');
      setIfsc(b.ifsc_code || '');
      setAccType(b.account_type || 'CURRENT');
    }

    const hasStep4 = Boolean(
      kycSteps?.step4 ||
      (onboardingData?.deliveryConfig && Object.keys(onboardingData.deliveryConfig).length > 0)
    );
    if (hasStep4) {
      if (store) {
        if (store.open_time) setOpenTime(String(store.open_time).slice(0, 5));
        if (store.close_time) setCloseTime(String(store.close_time).slice(0, 5));
        if (store.delivery_radius_km !== undefined && store.delivery_radius_km !== null) {
          setZoneRadius(String(Math.min(20, Math.max(0, Math.round(Number(store.delivery_radius_km))))));
        }
      }
      if (onboardingData?.deliveryConfig && Object.keys(onboardingData.deliveryConfig).length > 0) {
        const d = onboardingData.deliveryConfig;
        if (d.delivery_radius_km !== undefined && d.delivery_radius_km !== null) {
          setZoneRadius(String(Math.min(20, Math.max(0, Math.round(Number(d.delivery_radius_km))))));
        }
        if (d.delivFast !== undefined) setDelivFast(Boolean(d.delivFast));
        if (d.delivSame !== undefined) setDelivSame(Boolean(d.delivSame));
        if (d.delivScheduled !== undefined) setDelivScheduled(Boolean(d.delivScheduled));
        if (d.delivPickup !== undefined) setDelivPickup(Boolean(d.delivPickup));
        if (d.fleet) setFleet(d.fleet);
      }
    }

    const hasStep5 = Boolean(
      kycSteps?.step5 ||
      (onboardingData?.creditConfig && Object.keys(onboardingData.creditConfig).length > 0)
    );
    if (hasStep5 && onboardingData?.creditConfig && Object.keys(onboardingData.creditConfig).length > 0) {
      const c = onboardingData.creditConfig;
      if (c.enableCredit !== undefined) setEnableCredit(Boolean(c.enableCredit));
      if (c.creditDays) setCreditDays(String(c.creditDays));
      if (c.creditLimit) setCreditLimit(String(c.creditLimit));
      if (c.creditMinOrder) setCreditMinOrder(String(c.creditMinOrder));
    }
  }, [profile, store, onboardingData, kycSteps]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const isStepLocked = (stepNum, stepsOverride = effectiveKycSteps) => {
    const steps = stepsOverride || effectiveKycSteps;
    if ((steps?.step1 && steps?.step2) || effectiveCriticalDone) return false;
    if (stepNum === 1) return false;
    if (stepNum === 2) return !steps?.step1;
    return true;
  };

  const goToStep = (stepNum, stepsOverride = effectiveKycSteps) => {
    if (isStepLocked(stepNum, stepsOverride)) {
      setErrorMsg(t('kycErrLockCritical', 'Please complete & save Critical Steps 1 and 2 first to unlock further steps and portal navigation.'));
      return;
    }
    const next = Math.min(5, Math.max(1, stepNum));
    setCurrentStep(next);
    setErrorMsg('');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('step', String(next));
    setSearchParams(nextParams, { replace: true });
  };

  // Skip ONLY the current step (never allowed on critical steps 1 & 2)
  const handleSkipStep = () => {
    if (currentStep <= 2) {
      setErrorMsg(t('kycErrSkipCritical', 'Steps 1 and 2 contain critical store & tax info and cannot be skipped.'));
      return;
    }
    setErrorMsg('');
    if (currentStep < 5) {
      showToast(t('kycToastSkipped', 'Skipped Step {step}. You can complete it anytime later.', { step: currentStep }));
      goToStep(currentStep + 1);
    } else {
      navigate('/regstatus');
    }
  };

  const phoneLast4 = (String(phone || store?.phone || '7890').replace(/\D/g, '').slice(-4)) || '7890';

  const getDemoStepSummary = (step) => {
    if (step === 1) {
      return `Store: Mahadev Supermart ${phoneLast4} • Owner: Rajesh Patel • Surat, Gujarat - 395007`;
    }
    if (step === 2) {
      return `GSTIN: 24AAACP${phoneLast4}A1Z5 • PAN: AAACP${phoneLast4}A • FSSAI: 1072302600${phoneLast4}`;
    }
    if (step === 3) {
      return `Bank: HDFC Bank • A/C: 5020004829${phoneLast4} • IFSC: HDFC0001234 (Current)`;
    }
    if (step === 4) {
      return `Hours: 08:00–22:00 • Radius: 10 km • Express + Same-Day + Scheduled + Pickup • Self Fleet`;
    }
    return `B2B Credit: Enabled • 14 Days Interest-Free • Limit: ₹50,000 • Min Order: ₹5,000`;
  };

  const handleDemoFillCurrentStep = () => {
    setErrorMsg('');
    if (currentStep === 1) {
      if (!isPhoneLogin && (!phone || phone.length !== 10)) {
        setPhone('9876543210');
      }
      setShopName(`Mahadev Supermart ${phoneLast4}`);
      setLegalName(`Mahadev Supermart Enterprises ${phoneLast4}`);
      setEntityType('Sole Proprietorship');
      setCategory('Grocery & Supermarket');
      setOwnerName('Rajesh Patel');
      if (!isEmailLogin) {
        setEmail(`mahadev.${phoneLast4}@adab.in`);
      }
      setAddress('Shop 14, Ground Floor, Sardar Market, Ring Road, Surat');
      setCity('Surat');
      setStateName('Gujarat');
      setPincode('395007');
      showToast(t('kycToastDemoFilled', 'Demo data filled for Step {step} ({title})!', { step: 1, title: stepTitles[0] }));
    } else if (currentStep === 2) {
      setGstin(`24AAACP${phoneLast4}A1Z5`);
      setPan(`AAACP${phoneLast4}A`);
      setFssai(`1072302600${phoneLast4}`);
      setUdhyam(`UDYAM-GJ-22-001${phoneLast4}`);
      showToast(t('kycToastDemoFilled', 'Demo data filled for Step {step} ({title})!', { step: 2, title: stepTitles[1] }));
    } else if (currentStep === 3) {
      setBankName('HDFC Bank');
      setAccHolder(legalName || shopName || `Mahadev Supermart Enterprises ${phoneLast4}`);
      setAccNum(`5020004829${phoneLast4}`);
      setAccNumConfirm(`5020004829${phoneLast4}`);
      setIfsc('HDFC0001234');
      setAccType('CURRENT');
      showToast(t('kycToastDemoFilled', 'Demo data filled for Step {step} ({title})!', { step: 3, title: stepTitles[2] }));
    } else if (currentStep === 4) {
      setOpenTime('08:00');
      setCloseTime('22:00');
      setZoneRadius('10');
      setDelivFast(true);
      setDelivSame(true);
      setDelivScheduled(true);
      setDelivPickup(true);
      setFleet('SELF');
      showToast(t('kycToastDemoFilled', 'Demo data filled for Step {step} ({title})!', { step: 4, title: stepTitles[3] }));
    } else if (currentStep === 5) {
      setEnableCredit(true);
      setCreditDays('14');
      setCreditLimit('50000');
      setCreditMinOrder('5000');
      showToast(t('kycToastDemoFilled', 'Demo data filled for Step {step} ({title})!', { step: 5, title: stepTitles[4] }));
    }
  };

  const handleSaveCurrentStep = async () => {
    setErrorMsg('');
    try {
      setSaving(true);
      let payload = {};

      if (currentStep === 1) {
        const cleanPhoneDigits = extractCleanPhone(phone);
        if (!shopName.trim() || !ownerName.trim() || !address.trim()) {
          setErrorMsg(t('kycErrFillStep1', 'Please fill Store Name, Owner Name, and Complete Store Address (or use Demo Fill Up below).'));
          setSaving(false);
          return;
        }
        if (!cleanPhoneDigits || cleanPhoneDigits.length !== 10) {
          setErrorMsg(t('kycErrInvalidPhone', 'Please enter a valid 10-digit Registered Mobile Number.'));
          setSaving(false);
          return;
        }
        payload = {
          store_name: shopName,
          legal_name: legalName || shopName,
          entity_type: entityType,
          category,
          owner_name: ownerName,
          phone: cleanPhoneDigits,
          email,
          address_line: address,
          city,
          state: stateName,
          pincode
        };
      } else if (currentStep === 2) {
        if (!gstin.trim() || !pan.trim()) {
          setErrorMsg(t('kycErrFillStep2', 'Please enter both GSTIN and PAN Card number (or use Demo Fill Up below).'));
          setSaving(false);
          return;
        }
        payload = {
          gstin,
          pan,
          fssai_license: fssai,
          udhyam_msme: udhyam
        };
      } else if (currentStep === 3) {
        if (!bankName.trim() || !accHolder.trim() || !accNum.trim() || !ifsc.trim()) {
          setErrorMsg(t('kycErrFillStep3', 'Please fill Bank Name, Account Holder, Account Number, and IFSC Code (or click Skip).'));
          setSaving(false);
          return;
        }
        if (accNumConfirm && accNum !== accNumConfirm) {
          setErrorMsg(t('kycErrAccountMismatch', 'Account Number and Confirm Account Number do not match.'));
          setSaving(false);
          return;
        }
        payload = {
          bank_name: bankName,
          account_holder_name: accHolder,
          account_number: accNum,
          ifsc_code: ifsc,
          account_type: accType
        };
      } else if (currentStep === 4) {
        if (!delivFast && !delivSame && !delivScheduled && !delivPickup) {
          setErrorMsg(t('kycErrSelectDeliveryChannel', 'Please select at least one Delivery Channel to save this step.'));
          setSaving(false);
          return;
        }
        const parsedRadius = Number(zoneRadius);
        payload = {
          open_time: openTime,
          close_time: closeTime,
          delivery_radius_km: Number.isFinite(parsedRadius) ? Math.min(20, Math.max(0, parsedRadius)) : 10,
          delivFast,
          delivSame,
          delivScheduled,
          delivPickup,
          fleet
        };
      } else if (currentStep === 5) {
        payload = {
          enableCredit,
          creditDays: Number(creditDays) || 14,
          creditLimit: Number(creditLimit) || 50000,
          creditMinOrder: Number(creditMinOrder) || 5000
        };
      }

      const wasPreviouslySubmitted = Boolean(effectiveKycSteps?.step7 || profile?.submitted_at);
      const isComplianceStep = [1, 2, 3, 5].includes(Number(currentStep));

      const updated = await saveOnboardingStep(currentStep, payload);
      if (currentStep === 1 && payload.phone) {
        localStorage.setItem('seller_login_phone', payload.phone);
        localStorage.setItem('seller_phone', `+91${payload.phone}`);
      }
      const nextSteps = {
        ...effectiveKycSteps,
        ...(updated?.kycSteps || {}),
        [`step${currentStep}`]: true,
        ...(isComplianceStep ? { step7: false } : {})
      };
      setLocalDoneSteps((prev) => ({
        ...prev,
        [`step${currentStep}`]: true,
        ...(isComplianceStep && !isKycApproved ? { step7: false } : {})
      }));

      if (isComplianceStep && wasPreviouslySubmitted && !isKycApproved) {
        showToast(t('kycToastStepSavedCompliance', 'Step {step} ({title}) saved! Compliance details changed — please Resubmit Application.', { step: currentStep, title: stepTitles[currentStep - 1] }));
      } else {
        showToast(t('kycToastStepSaved', 'Step {step} ({title}) saved!', { step: currentStep, title: stepTitles[currentStep - 1] }));
      }

      // If redirected from a specific gated page (e.g. /orders, /delivery, /credit-apply, or /finance) and approved, return there once unlocked!
      if (fromPath && isKycApproved) {
        if (
          (fromPath === '/finance' && nextSteps?.step3) ||
          ((fromPath === '/delivery' || fromPath === '/zones' || fromPath === '/orders' || fromPath === '/partner') && nextSteps?.step4) ||
          ((fromPath === '/credit-apply' || fromPath === '/creditterms') && nextSteps?.step5)
        ) {
          navigate(fromPath, { replace: true });
          return;
        }
      }

      if (currentStep < 5) {
        goToStep(currentStep + 1, nextSteps);
      } else {
        navigate('/regstatus');
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to save step';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  const completedCount = [1, 2, 3, 4, 5].filter((s) => Boolean(effectiveKycSteps?.[`step${s}`])).length;
  const completedPct = Math.round((completedCount / 5) * 100);
  const canAccessTracker = Boolean(effectiveCriticalDone || isKycApproved || isKycRejected || isApplicationSubmitted || effectiveKycSteps?.step7);
  const needsResubmission = Boolean(
    effectiveCriticalDone && !effectiveKycSteps?.step7 && profile?.submitted_at && !isKycApproved && !isKycRejected
  );

  return (
    <section id="sec-onboarding" className="space-y-5">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2">
          <i className="fa-solid fa-circle-check text-emerald-400"></i>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Admin Rejection Banner */}
      {isKycRejected && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 font-bold">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <div className="font-extrabold text-sm text-rose-950">
                {t('kycBannerRejectedTitle', 'Verification Rejected by Admin')}
              </div>
              <p className="text-xs text-rose-800 mt-0.5">
                {t('kycBannerReason', 'Reason:')} <b>{profile?.rejection_reason || t('kycBannerRejectedDefaultReason', 'Compliance details require correction. Please review your KYC steps and resubmit.')}</b>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/regstatus')}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shrink-0 self-start sm:self-center"
          >
            {t('kycBtnGoToAppResubmit', 'Go to Application & Resubmit →')}
          </button>
        </div>
      )}

      {/* Feature Redirect Banner when redirected by KycGate */}
      {fromPath && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold">
              <i className="fa-solid fa-lock-open"></i>
            </div>
            <div>
              <div className="font-extrabold text-sm text-amber-950">
                {t('kycBannerUnlockTitle', 'Complete Step {step} ({title}) to unlock {feature}', {
                  step: currentStep,
                  title: stepTitles[currentStep - 1],
                  feature: featureName || fromPath
                })}
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                {t('kycBannerUnlockDesc', 'You skipped this KYC section earlier. Fill and save this step below to immediately access {feature}.', {
                  feature: featureName || fromPath
                })}
              </p>
            </div>
          </div>
          {isKycApproved && (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-soft !text-xs !py-1.5 !px-3 self-start sm:self-center shrink-0"
            >
              {t('kycBtnBackDashboard', 'Back to Dashboard')}
            </button>
          )}
        </div>
      )}

      {/* Header Banner */}
      <div className="card p-6 bg-gradient-to-br from-brand-dark via-green-700 to-emerald-900 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-extrabold mb-2">
              <i className="fa-solid fa-shield-halved text-green-300"></i> {t('kycBadgeVerified', 'ADAB Verified Merchant Onboarding')}
            </div>
            <h1 className="text-2xl font-extrabold">{t('kycHeaderTitle', 'Store Registration & KYC Verification')}</h1>
            <p className="text-green-100 text-sm mt-1 max-w-xl">
              {t('kycHeaderSubtitle', 'Complete critical steps (1 & 2) for Admin Verification. Updating compliance steps (1, 2, 3, or 5) requires resubmission.')}
            </p>
          </div>
          <div className="flex flex-col gap-2 self-start sm:self-center shrink-0">
            <button
              type="button"
              disabled={!canAccessTracker}
              onClick={() => canAccessTracker && navigate('/regstatus')}
              className={`btn-soft !text-xs border w-full justify-center ${
                canAccessTracker
                  ? '!bg-white/20 !text-white hover:!bg-white/30 border-white/20'
                  : '!bg-white/10 !text-white/50 border-white/10 cursor-not-allowed'
              }`}
            >
              <i className={`fa-solid ${canAccessTracker ? 'fa-clock-rotate-left' : 'fa-lock'} mr-1`}></i>
              {canAccessTracker ? t('kycBtnViewStatus', 'View Application Status') : t('kycBtnLockedStatus', 'Locked until Critical KYC (1 & 2)')}
            </button>

            <button
              type="button"
              disabled={!effectiveCriticalDone}
              onClick={() => effectiveCriticalDone && navigate('/regstatus')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition flex items-center justify-center gap-1.5 w-full ${
                !effectiveCriticalDone
                  ? 'bg-white/10 text-white/40 border-white/10 cursor-not-allowed'
                  : isKycRejected
                  ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-300 shadow-sm'
                  : isKycApproved || effectiveKycSteps?.step7
                  ? 'bg-emerald-500/40 text-white border-emerald-300/60 hover:bg-emerald-500/50'
                  : 'bg-amber-400 hover:bg-amber-300 text-green-950 border-amber-300 shadow-sm'
              }`}
            >
              {isKycApproved ? (
                <>
                  <i className="fa-solid fa-circle-check"></i> {t('kycBtnVerified', 'Verified & Approved')}
                </>
              ) : isKycRejected ? (
                <>
                  <i className="fa-solid fa-circle-xmark"></i> {t('kycBtnRejected', 'Rejected — Resubmit')}
                </>
              ) : effectiveKycSteps?.step7 ? (
                <>
                  <i className="fa-solid fa-circle-check"></i> {t('kycBtnSubmitted', 'Submitted (Review)')}
                </>
              ) : needsResubmission ? (
                <>
                  <i className="fa-solid fa-rotate-right"></i> {t('kycBtnResubmit', 'Resubmit Application')}
                </>
              ) : (
                <>
                  <i className={`fa-solid ${effectiveCriticalDone ? 'fa-paper-plane' : 'fa-lock'}`}></i> {t('kycBtnSubmit', 'Submit Application')}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stepper Indicator (5 Steps) */}
        <div className="mt-6 pt-4 border-t border-white/20">
          <div className="flex justify-between text-xs font-bold text-green-100 mb-2">
            <span>
              {t('kycStepOfFive', 'Step {currentStep} of 5: {title}', {
                currentStep,
                title: stepTitles[currentStep - 1]
              })}
            </span>
            <span id="onboardingStepPct" className="text-white">
              {t('kycCompletedProgress', '{completedPct}% KYC Completed ({completedCount}/5)', {
                completedPct,
                completedCount
              })}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              id="onboardingProgressBar"
              className="h-full bg-green-400 transition-all duration-300 rounded-full"
              style={{ width: `${completedPct}%` }}
            ></div>
          </div>
          <div className="grid grid-cols-5 gap-1.5 mt-3 text-[10px] sm:text-xs text-center font-bold">
            {[
              { num: 1, label: t('kycTabProfile', '1. Profile') },
              { num: 2, label: t('kycTabKycGst', '2. KYC & GST') },
              { num: 3, label: t('kycTabBank', '3. Bank A/C') },
              { num: 4, label: t('kycTabDelivery', '4. Delivery') },
              { num: 5, label: t('kycTabCredit', '5. Credit') }
            ].map((tab) => {
              const isDone = Boolean(effectiveKycSteps?.[`step${tab.num}`]);
              const isActive = currentStep === tab.num;
              const locked = isStepLocked(tab.num);
              return (
                <button
                  key={tab.num}
                  type="button"
                  disabled={locked}
                  onClick={() => goToStep(tab.num)}
                  className={`py-1.5 px-1 rounded-lg truncate transition flex items-center justify-center gap-1 ${
                    isActive
                      ? 'bg-white text-green-900 shadow-sm font-extrabold'
                      : isDone
                      ? 'bg-emerald-500/30 text-white border border-emerald-300/40'
                      : locked
                      ? 'bg-black/20 text-white/40 cursor-not-allowed'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {isDone && <i className="fa-solid fa-check text-[9px] text-emerald-300"></i>}
                  {!isDone && locked && <i className="fa-solid fa-lock text-[9px] text-white/40"></i>}
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
          <i className="fa-solid fa-triangle-exclamation text-rose-600"></i>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step Containers */}
      <div className="card p-6 bg-white shadow-sm border border-gray-200">
        {/* STEP 1: Basic Profile (Critical) */}
        {currentStep === 1 && (
          <div id="obStep1" className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 text-green-800 flex items-center justify-center font-bold">1</div>
                <div>
                  <h2 className="font-extrabold text-base text-gray-900">{t('kycStep1Title', 'Store & Owner Profile')}</h2>
                  <p className="text-xs text-gray-400">{t('kycStep1Subtitle', 'Critical info required for store activation')}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">{t('kycBadgeCriticalStep', 'Critical Step')}</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div
                  data-title={t('kycStoreNameLabel', 'Store / Trade Display Name')}
                  className="text-xs font-bold text-gray-700 block mb-1 before:content-[attr(data-title)] after:content-['_*'] after:text-rose-600 after:font-extrabold"
                />
                <input
                  type="text"
                  name="ob_custom_s1"
                  autoComplete="one-time-code"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600 font-bold"
                  placeholder={t('kycStoreNamePlaceholder', 'e.g. Mahadev Kirana & General')}
                />
              </div>
              <div>
                <div
                  data-title={t('kycLegalNameLabel', 'Legal Registered Entity Name')}
                  className="text-xs font-bold text-gray-700 block mb-1 before:content-[attr(data-title)] after:content-['_*'] after:text-rose-600 after:font-extrabold"
                />
                <input
                  type="text"
                  name="ob_custom_s2"
                  autoComplete="one-time-code"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600"
                  placeholder={t('kycLegalNamePlaceholder', 'As per PAN / GSTIN')}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <div
                  data-title={t('kycEntityTypeLabel', 'Business Constitution')}
                  className="text-xs font-bold text-gray-700 block mb-1 before:content-[attr(data-title)] after:content-['_*'] after:text-rose-600 after:font-extrabold"
                />
                <select
                  name="ob_custom_s3"
                  autoComplete="one-time-code"
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600 bg-white"
                >
                  <option value="Sole Proprietorship">{t('kycEntitySoleProp', 'Sole Proprietorship')}</option>
                  <option value="Partnership Firm">{t('kycEntityPartnership', 'Partnership Firm')}</option>
                  <option value="LLP">{t('kycEntityLlp', 'Limited Liability Partnership (LLP)')}</option>
                  <option value="Private Limited">{t('kycEntityPvtLtd', 'Private Limited Company')}</option>
                  <option value="Individual Trader">{t('kycEntityTrader', 'Individual Trader')}</option>
                </select>
              </div>
              <div>
                <div
                  data-title={t('kycCategoryLabel', 'Primary Category')}
                  className="text-xs font-bold text-gray-700 block mb-1 before:content-[attr(data-title)] after:content-['_*'] after:text-rose-600 after:font-extrabold"
                />
                <select
                  name="ob_custom_s4"
                  autoComplete="one-time-code"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600 bg-white"
                >
                  <option value="Grocery & Supermarket">{t('kycCatGrocery', 'Grocery & Supermarket')}</option>
                  <option value="Clothing & Textiles">{t('kycCatClothing', 'Clothing, Kurtis & Fashion')}</option>
                  <option value="Food & Restaurant">{t('kycCatFood', 'Food, Sweets & Bakery')}</option>
                  <option value="FMCG & Wholesale">{t('kycCatFmcg', 'FMCG & General Goods')}</option>
                  <option value="Pharmacy & Wellness">{t('kycCatPharmacy', 'Pharmacy & Health')}</option>
                </select>
              </div>
              <div>
                <div
                  data-title={t('kycOwnerNameLabel', 'Owner / Director Name')}
                  className="text-xs font-bold text-gray-700 block mb-1 before:content-[attr(data-title)] after:content-['_*'] after:text-rose-600 after:font-extrabold"
                />
                <input
                  type="text"
                  name="ob_custom_s5"
                  autoComplete="one-time-code"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder={t('kycOwnerNamePlaceholder', 'e.g. Rajesh Patel')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div
                  data-title={t('kycRegPhoneLabel', 'Registered Mobile Number')}
                  className="text-xs font-bold text-gray-700 block mb-1 before:content-[attr(data-title)] after:content-['_*'] after:text-rose-600 after:font-extrabold"
                />
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-gray-500 font-mono select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    name="ob_custom_phone"
                    maxLength={10}
                    autoComplete="tel"
                    value={phone}
                    disabled={isPhoneLogin}
                    readOnly={isPhoneLogin}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className={`w-full pl-12 ${isPhoneLogin ? 'pr-32 bg-gray-100 text-gray-700 cursor-not-allowed select-all' : 'pr-28 bg-white focus:border-green-600'} py-2.5 rounded-xl border border-gray-200 text-sm font-mono outline-none`}
                  />
                  <div className="absolute right-2.5 flex items-center pointer-events-none">
                    {isPhoneLogin ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-[11px] font-extrabold rounded-lg shrink-0 flex items-center gap-1 shadow-xs">
                        <i className="fa-solid fa-circle-check text-green-600"></i> {t('kycOtpVerified', 'OTP Verified')}
                      </span>
                    ) : phone.length === 10 ? (
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-lg shrink-0 border border-blue-200 flex items-center gap-1">
                        <i className="fa-solid fa-circle-info text-blue-500"></i> {t('kycTenDigits', '10 Digits')}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-lg shrink-0 border border-amber-200/60">
                        {t('kycDigitsLeft', '{count} digits left', { count: 10 - phone.length })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <div
                  data-title={isEmailLogin ? t('kycRegEmailLabel', 'Registered Business Email') : t('kycOfficialEmailLabel', 'Official Business Email')}
                  className={`text-xs font-bold text-gray-700 block mb-1 before:content-[attr(data-title)] ${isEmailLogin ? "after:content-['_*'] after:text-rose-600 after:font-extrabold" : ""}`}
                />
                <div className="relative flex items-center">
                  <input
                    type="email"
                    name="ob_custom_email"
                    autoComplete="email"
                    value={email}
                    disabled={isEmailLogin}
                    readOnly={isEmailLogin}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. store@adab.in"
                    className={`w-full px-3.5 ${isEmailLogin ? 'pr-32 bg-gray-100 text-gray-700 cursor-not-allowed select-all' : 'pr-3.5 bg-white focus:border-green-600'} py-2.5 rounded-xl border border-gray-200 text-sm outline-none`}
                  />
                  {isEmailLogin && (
                    <div className="absolute right-2.5 flex items-center pointer-events-none">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-[11px] font-extrabold rounded-lg shrink-0 flex items-center gap-1 shadow-xs">
                        <i className="fa-solid fa-circle-check text-green-600"></i> {t('kycOtpVerified', 'OTP Verified')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div
                data-title={t('kycAddressLabel', 'Complete Store Address')}
                className="text-xs font-bold text-gray-700 block mb-1 before:content-[attr(data-title)] after:content-['_*'] after:text-rose-600 after:font-extrabold"
              />
              <input
                type="text"
                name="ob_custom_s7"
                autoComplete="one-time-code"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600 mb-2"
                placeholder={t('kycAddressPlaceholder', 'e.g. Shop 14, Sardar Market')}
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  name="ob_custom_s8"
                  autoComplete="one-time-code"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
                  placeholder={t('kycCityPlaceholder', 'e.g. Surat')}
                />
                <input
                  type="text"
                  name="ob_custom_s9"
                  autoComplete="one-time-code"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
                  placeholder={t('kycStatePlaceholder', 'e.g. Gujarat')}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  name="ob_custom_s10"
                  autoComplete="one-time-code"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono"
                  placeholder={t('kycPincodePlaceholder', 'e.g. 395007')}
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1.5">
                <i className="fa-solid fa-map-location-dot text-emerald-600"></i>
                <span>{t('kycGeocodedNote', 'Store coordinates are automatically geocoded from this address for delivery mapping & radius calculation.')}</span>
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: KYC & GST Compliance (Critical) */}
        {currentStep === 2 && (
          <div id="obStep2" className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 text-green-800 flex items-center justify-center font-bold">2</div>
                <div>
                  <h2 className="font-extrabold text-base text-gray-900">{t('kycStep2Heading', 'Business KYC & Tax Compliance')}</h2>
                  <p className="text-xs text-gray-400">{t('kycStep2Subtitle', 'Mandatory tax credentials for invoicing and product publishing')}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">{t('kycBadgeCriticalStep', 'Critical Step')}</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  {t('kycGstinLabel', 'GSTIN (Goods & Services Tax ID)')} <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 24AAAAA0000A1Z5"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono uppercase outline-none focus:border-green-600 bg-green-50/50 text-green-900 font-bold"
                />
                {gstin && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-green-700 font-bold">
                    <i className="fa-solid fa-circle-check text-green-600"></i> {t('kycActiveTaxpayer', 'Active Taxpayer Format')}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  {t('kycPanLabel', 'Proprietor / Company PAN Card')} <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono uppercase outline-none focus:border-green-600"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">{t('kycFssaiLabel', 'FSSAI Food License (For Food/Kirana)')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={fssai}
                  onChange={(e) => setFssai(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono outline-none focus:border-green-600"
                  placeholder={t('kycFssaiPlaceholder', '14-digit FSSAI License Number')}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">{t('kycUdhyamLabel', 'Udhyam MSME Registration (Optional)')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={udhyam}
                  onChange={(e) => setUdhyam(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono outline-none focus:border-green-600"
                  placeholder="UDYAM-GJ-01-0082910"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Bank Account & Payouts */}
        {currentStep === 3 && (
          <div id="obStep3" className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 text-green-800 flex items-center justify-center font-bold">3</div>
                <div>
                  <h2 className="font-extrabold text-base text-gray-900">{t('kycStep3Heading', 'Bank Account & Settlement Setup')}</h2>
                  <p className="text-xs text-gray-400">{t('kycStep3Subtitle', 'Unlocks Bank Payouts & Money page (/finance)')}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">{t('kycBadgeUnlocksPayouts', 'Unlocks Payouts')}</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  {t('kycBankNameLabel', 'Beneficiary Bank Name')} <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600 bg-white font-bold"
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="State Bank of India">State Bank of India (SBI)</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="Bank of Baroda">Bank of Baroda</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  {t('kycAccHolderLabel', 'Account Holder Name')} <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={accHolder}
                  onChange={(e) => setAccHolder(e.target.value)}
                  placeholder={t('kycAccHolderPlaceholder', 'Beneficiary Name')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  {t('kycAccNumLabel', 'Bank Account Number')} <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={accNum}
                  onChange={(e) => setAccNum(e.target.value)}
                  placeholder="e.g. 50200049281094"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono outline-none focus:border-green-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  {t('kycAccNumConfirmLabel', 'Confirm Account Number')} <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={accNumConfirm}
                  onChange={(e) => setAccNumConfirm(e.target.value)}
                  placeholder={t('kycAccNumConfirmPlaceholder', 'Re-enter Account Number')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono outline-none focus:border-green-600"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  {t('kycIfscLabel', 'IFSC Code')} <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0001024"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono uppercase outline-none focus:border-green-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">{t('kycAccTypeLabel', 'Account Type')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-bold cursor-pointer ${accType === 'CURRENT' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    <input type="radio" name="obAccType" checked={accType === 'CURRENT'} onChange={() => setAccType('CURRENT')} /> {t('kycCurrentAc', 'Current A/C')}
                  </label>
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-bold cursor-pointer ${accType === 'SAVINGS' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    <input type="radio" name="obAccType" checked={accType === 'SAVINGS'} onChange={() => setAccType('SAVINGS')} /> {t('kycSavingsAc', 'Savings A/C')}
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Store Operations & Delivery Radius */}
        {currentStep === 4 && (
          <div id="obStep4" className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 text-green-800 flex items-center justify-center font-bold">4</div>
                <div>
                  <h2 className="font-extrabold text-base text-gray-900">{t('kycStep4Heading', 'Store Hours & Delivery Logistics')}</h2>
                  <p className="text-xs text-gray-400">{t('kycStep4Subtitle', 'Unlocks Delivery (/delivery)')}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800">{t('kycBadgeUnlocksLogistics', 'Unlocks Logistics')}</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">{t('kycOperatingHoursLabel', 'Operating Hours')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="w-full h-10 px-3 py-2 rounded-xl border border-gray-200 text-sm" />
                    <span className="text-[10px] font-bold text-gray-400 block mt-1 px-0.5">{t('kycOpeningLabel', 'Opening')}</span>
                  </div>
                  <div>
                    <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="w-full h-10 px-3 py-2 rounded-xl border border-gray-200 text-sm" />
                    <span className="text-[10px] font-bold text-gray-400 block mt-1 px-0.5">{t('kycClosingLabel', 'Closing')}</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">{t('kycDeliveryRadiusLabel', 'App Customer Delivery Radius')}</label>
                  <span className="text-[10px] font-bold text-orange-600">
                    {Number(zoneRadius) === 0
                      ? t('kycRadiusPickupOnly', 'Pickup Only (0km)')
                      : Number(zoneRadius) <= 5
                      ? t('kycRadiusImmediate', 'Immediate Neighbourhood')
                      : Number(zoneRadius) <= 12
                      ? t('kycRadiusStandard', 'Standard Town Radius')
                      : t('kycRadiusWide', 'Wide City Coverage')}
                  </span>
                </div>
                {(() => {
                  const parsed = Number(zoneRadius);
                  const radiusVal = Number.isFinite(parsed) ? Math.min(20, Math.max(0, Math.round(parsed))) : 10;
                  return (
                    <div>
                      <div
                        onWheel={(e) => {
                          e.preventDefault();
                          const delta = e.deltaY < 0 ? 1 : -1;
                          const next = Math.min(20, Math.max(0, radiusVal + delta));
                          setZoneRadius(String(next));
                        }}
                        title={t('kycRadiusAdjustTooltip', 'Drag or scroll to adjust delivery radius (0km – 20km)')}
                        className="relative w-full h-10 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden select-none shadow-inner"
                      >
                        {/* Orange Fill Bar with White Text */}
                        <div
                          className={`h-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-extrabold text-xs rounded-xl flex items-center transition-all duration-150 shadow-sm ${
                            radiusVal === 0 ? 'justify-center' : 'justify-end pr-3'
                          }`}
                          style={{
                            width: `calc(3.25rem + ${(radiusVal / 20).toFixed(4)} * (100% - 3.25rem))`
                          }}
                        >
                          <span className="drop-shadow-sm whitespace-nowrap">{radiusVal}km</span>
                        </div>

                        {/* Interactive Range Slider Overlay */}
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="1"
                          value={radiusVal}
                          onChange={(e) => setZoneRadius(e.target.value)}
                          aria-label="App Customer Delivery Radius in kilometers"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10 m-0"
                        />
                      </div>

                      {/* Quick-select scale ticks (0km to 20km) */}
                      <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-1 px-0.5 select-none">
                        {[0, 5, 10, 15, 20].map((mark) => (
                          <button
                            key={mark}
                            type="button"
                            onClick={() => setZoneRadius(String(mark))}
                            className={`hover:text-orange-600 transition ${
                              radiusVal === mark ? 'text-orange-600 font-extrabold' : ''
                            }`}
                          >
                            {mark}km
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-700">
                  {t('kycDeliveryChannelsLabel', 'Delivery Channels')} <span className="text-rose-600 font-extrabold">*</span>
                </label>
                {!delivFast && !delivSame && !delivScheduled && !delivPickup && (
                  <span className="text-[10px] font-extrabold text-rose-600">
                    {t('kycSelectAtLeastOneChannel', 'Select at least 1 channel')}
                  </span>
                )}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <label className={`p-3 rounded-xl border-2 flex items-start gap-2.5 cursor-pointer ${delivFast ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <input type="checkbox" checked={delivFast} onChange={(e) => setDelivFast(e.target.checked)} className="mt-0.5" />
                  <div><div className="font-bold text-xs text-green-900">{t('kycChannelExpress', 'Express (Under 1h)')}</div><div className="text-[10px] text-gray-500">{t('kycChannelExpressDesc', 'Bike dispatch for immediate essentials')}</div></div>
                </label>
                <label className={`p-3 rounded-xl border-2 flex items-start gap-2.5 cursor-pointer ${delivSame ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <input type="checkbox" checked={delivSame} onChange={(e) => setDelivSame(e.target.checked)} className="mt-0.5" />
                  <div><div className="font-bold text-xs text-green-900">{t('kycChannelSameDay', 'Same-Day')}</div><div className="text-[10px] text-gray-500">{t('kycChannelSameDayDesc', 'Same-day city delivery')}</div></div>
                </label>
                <label className={`p-3 rounded-xl border-2 flex items-start gap-2.5 cursor-pointer ${delivScheduled ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <input type="checkbox" checked={delivScheduled} onChange={(e) => setDelivScheduled(e.target.checked)} className="mt-0.5" />
                  <div><div className="font-bold text-xs text-green-900">{t('kycChannelScheduled', 'Scheduled Hours')}</div><div className="text-[10px] text-gray-500">{t('kycChannelScheduledDesc', 'Morning / Evening slot delivery')}</div></div>
                </label>
                <label className={`p-3 rounded-xl border-2 flex items-start gap-2.5 cursor-pointer ${delivPickup ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <input type="checkbox" checked={delivPickup} onChange={(e) => setDelivPickup(e.target.checked)} className="mt-0.5" />
                  <div><div className="font-bold text-xs text-green-900">{t('kycChannelPickup', 'Store Pickup')}</div><div className="text-[10px] text-gray-500">{t('kycChannelPickupDesc', 'Customer collects from counter')}</div></div>
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">{t('kycFleetPrefLabel', 'Logistics Fleet Preference')}</label>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer ${fleet === 'SELF' ? 'border-2 border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <input type="radio" name="obFleet" checked={fleet === 'SELF'} onChange={() => setFleet('SELF')} />
                  <div><div className="font-bold text-xs">{t('kycFleetSelf', 'Self Riders & Vehicles')}</div><div className="text-[10px] text-gray-500">{t('kycFleetSelfDesc', 'You use your own staff for deliveries')}</div></div>
                </label>
                <label className="p-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between gap-2.5 opacity-60 cursor-not-allowed select-none">
                  <div className="flex items-center gap-2.5">
                    <input type="radio" name="obFleet" checked={false} disabled />
                    <div>
                      <div className="font-bold text-xs text-gray-500">{t('kycFleetIntegrated', 'ADAB Integrated Porter Fleet')}</div>
                      <div className="text-[10px] text-gray-400">{t('kycFleetIntegratedDesc', 'On-demand partner delivery drivers')}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-gray-200 text-gray-600 shrink-0">
                    {t('kycUnavailable', 'Unavailable')}
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: B2B Credit & Trade Terms */}
        {currentStep === 5 && (
          <div id="obStep5" className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 text-green-800 flex items-center justify-center font-bold">5</div>
                <div>
                  <h2 className="font-extrabold text-base text-gray-900">{t('kycStep5Heading', 'B2B Wholesale & Store Credit Terms')}</h2>
                  <p className="text-xs text-gray-400">{t('kycStep5Subtitle', 'Unlocks Bank Credit Lines (/credit-apply) & Store Credit Rules (/creditterms)')}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800">{t('kycBadgeUnlocksCredit', 'Unlocks Credit')}</span>
            </div>

            <label className="p-3.5 rounded-xl border-2 border-orange-400 bg-orange-50 flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={enableCredit} onChange={(e) => setEnableCredit(e.target.checked)} className="w-4 h-4" />
              <div>
                <div className="font-extrabold text-sm text-orange-950">{t('kycEnableCreditTitle', 'Enable B2B Store-to-Store Credit Selling')}</div>
                <div className="text-xs text-orange-800">{t('kycEnableCreditDesc', 'Allow nearby & nationwide shops to place bulk orders on credit (ADAB guaranteed)')}</div>
              </div>
            </label>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">{t('kycCreditTenureLabel', 'Credit Payment Tenure')}</label>
                <select
                  value={creditDays}
                  onChange={(e) => setCreditDays(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold bg-white"
                >
                  <option value="7">{t('kycDays7', '7 Days')}</option>
                  <option value="14">{t('kycDays14', '14 Days (Standard)')}</option>
                  <option value="21">{t('kycDays21', '21 Days')}</option>
                  <option value="30">{t('kycDays30', '30 Days')}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">{t('kycMaxCreditLabel', 'Max Credit per Shop (₹)')}</label>
                <input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">{t('kycMinOrderCreditLabel', 'Minimum Order for Credit (₹)')}</label>
                <input
                  type="number"
                  value={creditMinOrder}
                  onChange={(e) => setCreditMinOrder(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold"
                />
              </div>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900">
              <i className="fa-solid fa-hand-holding-dollar mr-1 text-purple-700"></i>
              <strong>{t('kycBuyerCreditTitle', 'ADAB Buyer Credit Line:')}</strong> {t('kycBuyerCreditDesc', 'Completing this step unlocks your ₹2,50,000 credit line to purchase stock from distributors at 0% interest for 14 days.')}
            </div>
          </div>
        )}

        {/* Wizard Navigation Footer */}
        <div className="flex justify-between items-center pt-5 mt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => goToStep(currentStep - 1)}
            id="obBtnBack"
            className="btn-soft !text-xs !py-2 !px-4"
            disabled={currentStep === 1}
          >
            <i className="fa-solid fa-arrow-left mr-1"></i> {t('back', 'Back')}
          </button>

          <div className="text-xs text-gray-400 font-bold">
            Step <span id="obFooterStep">{currentStep}</span> of 5
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 2 && currentStep <= 5 && (
              <button
                type="button"
                onClick={handleSkipStep}
                id="obBtnSkip"
                className="btn-soft !text-xs !py-2 !px-4 font-bold text-gray-600 hover:text-gray-900"
              >
                {t('kycBtnSkip', 'Skip')}
              </button>
            )}
            {currentStep <= 2 && !effectiveCriticalDone && (
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg hidden sm:inline-flex items-center gap-1">
                <i className="fa-solid fa-lock text-[10px]"></i> {t('kycCriticalStepRequired', 'Critical Step Required')}
              </span>
            )}
            <button
              type="button"
              disabled={saving || (currentStep === 4 && !delivFast && !delivSame && !delivScheduled && !delivPickup)}
              onClick={handleSaveCurrentStep}
              id="obBtnNext"
              className="btn-primary !text-xs !py-2 !px-5 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t('saving', 'Saving...') : t('kycSaveAndContinue', 'Save & Continue')} <i className="fa-solid fa-arrow-right ml-1"></i>
            </button>
          </div>
        </div>

        {/* DEMO FILL UP SECTION (Pre-states step info and fills current step inputs) */}
        <div className="mt-4 pt-3.5 border-t border-gray-100">
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                <i className="fa-solid fa-wand-magic-sparkles text-amber-600"></i>
                {t('kycDemoFillTitle', 'Demo Fill Up — Step {step} ({title})', {
                  step: currentStep,
                  title: stepTitles[currentStep - 1]
                })}
              </div>
              <div className="text-[11px] font-mono font-bold text-amber-800 mt-0.5">
                {getDemoStepSummary(currentStep)}
              </div>
            </div>
            <button
              type="button"
              onClick={handleDemoFillCurrentStep}
              className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shrink-0 transition shadow-sm flex items-center gap-1.5 self-start sm:self-center"
            >
              <i className="fa-solid fa-bolt"></i> {t('kycDemoFillBtn', 'Demo Fill Up')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
