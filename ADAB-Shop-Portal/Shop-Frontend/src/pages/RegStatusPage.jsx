import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeller } from '../context/SellerContext';

export default function RegStatusPage() {
  const navigate = useNavigate();
  const {
    profile,
    store,
    onboardingData,
    kycSteps,
    isCriticalSetupDone,
    isKycApproved = false,
    isKycRejected = false,
    refreshSellerData,
    saveOnboardingStep
  } = useSeller();
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Always pull fresh status from PostgreSQL when Application Tracker opens
  useEffect(() => {
    if (refreshSellerData) {
      refreshSellerData(true);
    }
  }, [refreshSellerData]);

  const rawKycStatus = String(profile?.kyc_status || 'DRAFT').trim().toUpperCase();
  const isApproved = Boolean(isKycApproved || rawKycStatus === 'APPROVED');
  const isRejected = Boolean(
    !isApproved && (isKycRejected || ['REJECTED', 'DENIED', 'DECLINED'].includes(rawKycStatus))
  );
  const isSubmitted = Boolean(
    isApproved ||
    (!isRejected && kycSteps?.step7 && (rawKycStatus === 'SUBMITTED' || rawKycStatus === 'UNDER_REVIEW')) ||
    (!isRejected && !profile?.submitted_at && (rawKycStatus === 'SUBMITTED' || rawKycStatus === 'UNDER_REVIEW'))
  );
  const needsResubmission = Boolean(
    isCriticalSetupDone && !kycSteps?.step7 && profile?.submitted_at && !isApproved && !isRejected
  );

  const completedCount = [1, 2, 3, 4, 5].filter((s) => Boolean(kycSteps?.[`step${s}`])).length;
  const completedPct = Math.round((completedCount / 5) * 100);

  const storeTitle = store?.store_name || profile?.legal_name || 'Your Store';
  const reqIdSuffix = String(profile?.seller_profile_id || profile?.id || '8941')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-6)
    .toUpperCase();
  const reqId = `#REQ-${reqIdSuffix}`;

  const formattedSubmitTime = profile?.submitted_at
    ? new Date(profile.submitted_at).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  // Dynamic Hero Status Config
  let statusConfig = {
    badgeText: 'Draft • Not Submitted',
    badgeClass: 'bg-gray-100 text-gray-800 border border-gray-300',
    iconClass: 'fa-file-pen',
    iconBoxClass: 'bg-gray-100 text-gray-700'
  };

  if (isApproved) {
    statusConfig = {
      badgeText: 'Verified Merchant',
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      iconClass: 'fa-circle-check',
      iconBoxClass: 'bg-emerald-100 text-emerald-700'
    };
  } else if (isRejected) {
    statusConfig = {
      badgeText: 'KYC Rejected',
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300',
      iconClass: 'fa-circle-xmark',
      iconBoxClass: 'bg-rose-100 text-rose-700'
    };
  } else if (needsResubmission) {
    statusConfig = {
      badgeText: 'Resubmission Required',
      badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300',
      iconClass: 'fa-rotate-right',
      iconBoxClass: 'bg-amber-100 text-amber-700'
    };
  } else if (isSubmitted) {
    statusConfig = {
      badgeText: 'Under Admin Review',
      badgeClass: 'badge-pending bg-blue-100 text-blue-800 border border-blue-200',
      iconClass: 'fa-clock',
      iconBoxClass: 'bg-blue-100 text-blue-700'
    };
  }

  const handleRefresh = async () => {
    if (!refreshSellerData) return;
    setRefreshing(true);
    try {
      await refreshSellerData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (!isCriticalSetupDone) {
      setErrorMsg('Please complete Critical Steps 1 (Store Profile) and 2 (KYC & Tax) before submitting.');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('Please agree to the merchant declaration below before submitting your application.');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    try {
      await saveOnboardingStep(7, {});
      if (refreshSellerData) {
        await refreshSellerData(true);
      }
      setToastMsg('Application submitted for Admin Verification!');
      setTimeout(() => setToastMsg(''), 3500);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to submit application';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const bank = onboardingData?.bankAccount || null;
  const deliveryCfg = onboardingData?.deliveryConfig || {};
  const creditCfg = onboardingData?.creditConfig || {};

  return (
    <section id="sec-regstatus" className="space-y-5">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2">
          <i className="fa-solid fa-circle-check text-emerald-400"></i>
          <span>{toastMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
          <i className="fa-solid fa-triangle-exclamation text-rose-600"></i>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Status Card Header */}
      <div className="card p-6 bg-white border border-gray-200 shadow-sm" id="regStatusHeroCard">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              id="regStatusIconBox"
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${statusConfig.iconBoxClass}`}
            >
              <i className={`fa-solid ${statusConfig.iconClass}`}></i>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-gray-900" id="regStatusStoreTitle">
                  {storeTitle}
                </h1>
                <span
                  id="regStatusBadge"
                  className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold ${statusConfig.badgeClass}`}
                >
                  {statusConfig.badgeText}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Application ID: <strong id="regStatusReqId" className="font-mono text-gray-800">{reqId}</strong>
                {' • '}
                <span id="regStatusSubmitTime">
                  {formattedSubmitTime
                    ? `${needsResubmission || isRejected ? 'Last submitted on' : 'Submitted on'} ${formattedSubmitTime}`
                    : isApproved
                    ? 'Verified by Admin'
                    : isRejected
                    ? 'Rejected by Admin'
                    : 'Not submitted yet'}
                </span>
                {' • '}
                <span className="font-bold text-emerald-700">{completedCount}/5 KYC Modules Saved ({completedPct}%)</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {isRejected && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitApplication}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition disabled:opacity-60"
              >
                <i className={`fa-solid ${submitting ? 'fa-spinner animate-spin' : 'fa-rotate-right'}`}></i>
                {submitting ? 'Submitting...' : 'Resubmit Application'}
              </button>
            )}
            {!isApproved && !isRejected && isCriticalSetupDone && !kycSteps?.step7 && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitApplication}
                className={`px-3.5 py-2 rounded-xl text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition disabled:opacity-60 ${
                  needsResubmission
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-green-700 hover:bg-green-800'
                }`}
              >
                <i className={`fa-solid ${submitting ? 'fa-spinner animate-spin' : needsResubmission ? 'fa-rotate-right' : 'fa-paper-plane'}`}></i>
                {submitting ? 'Submitting...' : needsResubmission ? 'Resubmit Application' : 'Submit Application'}
              </button>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-soft !text-xs !py-2 !px-3"
            >
              <i className={`fa-solid fa-arrows-rotate mr-1 ${refreshing ? 'animate-spin' : ''}`}></i>
              {refreshing ? 'Refreshing...' : 'Refresh Status'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="btn-soft !text-xs !py-2 !px-3 font-bold"
            >
              <i className="fa-solid fa-pen-to-square mr-1"></i> Edit Store KYC
            </button>
          </div>
        </div>

        {/* Dynamic Status / Action Banner */}
        {isApproved && (
          <div
            id="regApprovedBanner"
            className="mt-4 p-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold shrink-0">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <div>
                <div className="font-extrabold text-sm">Congratulations! Your store is Verified &amp; Active</div>
                <div className="text-xs text-green-100">
                  Your store is live on the ADAB Customer App and B2B Wholesale Directory.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-xl bg-white text-green-800 font-extrabold text-xs shadow-sm hover:bg-green-50 shrink-0 self-start sm:self-center"
            >
              Go to Seller Dashboard →
            </button>
          </div>
        )}

        {isRejected && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <div className="font-extrabold text-sm">Verification Rejected by Admin</div>
                <div className="text-xs text-rose-800 mt-0.5">
                  Reason: <b>{profile?.rejection_reason || 'Compliance details require correction. Please review and resubmit.'}</b>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => navigate('/onboarding')}
                className="px-3.5 py-2 rounded-xl bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 font-extrabold text-xs"
              >
                Edit KYC Steps
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitApplication}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Resubmit Now →'}
              </button>
            </div>
          </div>
        )}

        {needsResubmission && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <i className="fa-solid fa-rotate-right"></i>
              </div>
              <div>
                <div className="font-extrabold text-sm">Compliance Changes Need Resubmission</div>
                <div className="text-xs text-amber-800 mt-0.5">
                  You updated compliance details (Store Profile, Tax/GST, Bank Account, or Credit Terms) after your previous submission. Please resubmit so Admin can verify your updated records.
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitApplication}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-sm shrink-0 self-start sm:self-center disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Resubmit Application Now →'}
            </button>
          </div>
        )}

        {!isApproved && !isRejected && !needsResubmission && !kycSteps?.step7 && (
          <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <i className="fa-solid fa-paper-plane"></i>
              </div>
              <div>
                <div className="font-extrabold text-sm">Ready for Admin Verification Submission</div>
                <div className="text-xs text-blue-800 mt-0.5">
                  Your critical store &amp; tax steps are saved ({completedCount}/5 modules complete). Submit your application below to send it to the Admin verification queue.
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitApplication}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm shrink-0 self-start sm:self-center disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Application Now →'}
            </button>
          </div>
        )}

        {/* 4-Stage Verification Stepper */}
        <div className="py-6">
          <div className="text-xs font-bold text-gray-700 mb-3">Verification Progress Pipeline</div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
            {/* Stage 1: Critical KYC Saved */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                isCriticalSetupDone ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-300'
              }`}
              id="stageStep1"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${
                      isCriticalSetupDone ? 'bg-green-600' : 'bg-amber-500 animate-pulse'
                    }`}
                  >
                    <i className={`fa-solid ${isCriticalSetupDone ? 'fa-check' : 'fa-clock'}`}></i>
                  </span>
                  <span className={`text-[10px] font-extrabold ${isCriticalSetupDone ? 'text-green-800' : 'text-amber-800'}`}>
                    {isCriticalSetupDone ? 'Completed' : 'In Progress'}
                  </span>
                </div>
                <div className="font-bold text-xs text-gray-900">1. Critical KYC &amp; Profile</div>
                <p className="text-[10px] text-gray-600 mt-1">
                  Store profile, address, GSTIN ({profile?.gstin || 'Pending'}) &amp; PAN ({profile?.pan && profile.pan !== 'PENDING00P' ? profile.pan : 'Pending'}).
                </p>
              </div>
            </div>

            {/* Stage 2: Application Submission / Resubmission */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                isApproved || isSubmitted
                  ? 'bg-green-50 border-green-200'
                  : needsResubmission || isRejected
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-gray-50 border-gray-200'
              }`}
              id="stageStep2"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      isApproved || isSubmitted
                        ? 'bg-green-600 text-white'
                        : needsResubmission || isRejected
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {isApproved || isSubmitted ? (
                      <i className="fa-solid fa-check"></i>
                    ) : needsResubmission || isRejected ? (
                      <i className="fa-solid fa-rotate-right"></i>
                    ) : (
                      '2'
                    )}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold ${
                      isApproved || isSubmitted
                        ? 'text-green-800'
                        : needsResubmission || isRejected
                        ? 'text-amber-800'
                        : 'text-gray-500'
                    }`}
                  >
                    {isApproved || isSubmitted
                      ? 'Submitted'
                      : needsResubmission || isRejected
                      ? 'Resubmit Needed'
                      : 'Not Submitted'}
                  </span>
                </div>
                <div className="font-bold text-xs text-gray-900">2. Application Submission</div>
                <p className="text-[10px] text-gray-600 mt-1">
                  {isApproved || isSubmitted
                    ? `Submitted to Admin queue (${completedCount}/5 modules).`
                    : isRejected
                    ? 'Application rejected by Admin — please update & resubmit.'
                    : needsResubmission
                    ? 'Compliance step modified — requires resubmission.'
                    : 'Awaiting merchant declaration & submission.'}
                </p>
              </div>
            </div>

            {/* Stage 3: Admin Compliance Audit */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                isApproved
                  ? 'bg-green-50 border-green-200'
                  : isRejected
                  ? 'bg-rose-50 border-rose-300'
                  : isSubmitted
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-gray-50 border-gray-200 opacity-80'
              }`}
              id="stageStep3"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      isApproved
                        ? 'bg-green-600 text-white'
                        : isRejected
                        ? 'bg-rose-600 text-white'
                        : isSubmitted
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {isApproved ? (
                      <i className="fa-solid fa-check"></i>
                    ) : isRejected ? (
                      <i className="fa-solid fa-xmark"></i>
                    ) : isSubmitted ? (
                      <i className="fa-solid fa-clock"></i>
                    ) : (
                      '3'
                    )}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold ${
                      isApproved
                        ? 'text-green-800'
                        : isRejected
                        ? 'text-rose-800'
                        : isSubmitted
                        ? 'text-amber-800'
                        : 'text-gray-500'
                    }`}
                  >
                    {isApproved
                      ? 'Verified'
                      : isRejected
                      ? 'Rejected'
                      : isSubmitted
                      ? 'In Progress'
                      : 'Waiting'}
                  </span>
                </div>
                <div className="font-bold text-xs text-gray-900">3. Admin Compliance Review</div>
                <p className="text-[10px] text-gray-600 mt-1">
                  {isApproved
                    ? 'All compliance & tax credentials verified by Admin.'
                    : isRejected
                    ? profile?.rejection_reason || 'Verification rejected.'
                    : isSubmitted
                    ? 'Admin is auditing Profile, GSTIN/PAN, Bank & Credit.'
                    : 'Starts once your application is submitted.'}
                </p>
              </div>
            </div>

            {/* Stage 4: Live on ADAB App */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                isApproved ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 opacity-80'
              }`}
              id="stageStep4"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      isApproved ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {isApproved ? <i className="fa-solid fa-check"></i> : '4'}
                  </span>
                  <span className={`text-[10px] font-extrabold ${isApproved ? 'text-green-800' : 'text-gray-500'}`}>
                    {isApproved ? 'Live' : 'Pending'}
                  </span>
                </div>
                <div className="font-bold text-xs text-gray-900">4. Live on ADAB App</div>
                <p className="text-[10px] text-gray-600 mt-1">
                  {isApproved
                    ? 'Store catalogue & settlements active across ADAB.'
                    : 'Unlocks full Verified Merchant badge upon Admin approval.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic 5-Module KYC Summary Grid */}
        <div className="mt-2 pt-4 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
            <div className="text-xs font-extrabold text-gray-800">
              Saved KYC Modules ({completedCount} of 5 Completed)
            </div>
            <span className="text-[11px] text-gray-500">
              <i className="fa-solid fa-shield-halved text-amber-600 mr-1"></i>
              Editing Compliance modules (1, 2, 3, 5) requires resubmission
            </span>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            {/* Module 1: Store & Owner Profile */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    1. Store Profile • Compliance
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      kycSteps?.step1 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {kycSteps?.step1 ? 'Saved ✓' : 'Required'}
                  </span>
                </div>
                <div className="font-extrabold text-gray-900 truncate" id="statusRecapShop">
                  {store?.store_name || 'Not set'}
                </div>
                <div className="text-gray-600 text-[11px] truncate">
                  {profile?.full_name || 'Owner not set'} • {profile?.phone || store?.phone || ''}
                </div>
                <div className="text-gray-500 text-[11px] truncate mt-0.5">
                  {store?.address_line
                    ? `${store.address_line}, ${store.city || ''}, ${store.state || ''} - ${store.pincode || ''}`
                    : 'Address not set'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/onboarding?step=1')}
                className="text-[11px] font-extrabold text-green-700 hover:underline self-start"
              >
                Edit Step 1 →
              </button>
            </div>

            {/* Module 2: Business KYC & GST */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    2. KYC &amp; Tax • Compliance
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      kycSteps?.step2 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {kycSteps?.step2 ? 'Saved ✓' : 'Required'}
                  </span>
                </div>
                <div className="font-mono font-bold text-gray-900 text-[11px]" id="statusRecapGstin">
                  GSTIN: {profile?.gstin || 'Pending'}
                </div>
                <div className="font-mono text-gray-600 text-[11px]">
                  PAN: {profile?.pan && profile.pan !== 'PENDING00P' ? profile.pan : 'Pending'}
                </div>
                <div className="text-gray-500 text-[11px] truncate mt-0.5">
                  FSSAI: {profile?.fssai_license || '—'} • MSME: {profile?.udhyam_msme || '—'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/onboarding?step=2')}
                className="text-[11px] font-extrabold text-green-700 hover:underline self-start"
              >
                Edit Step 2 →
              </button>
            </div>

            {/* Module 3: Bank Account & Settlement */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    3. Bank Account • Compliance
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      kycSteps?.step3 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {kycSteps?.step3 ? 'Saved ✓' : 'Skipped'}
                  </span>
                </div>
                <div className="font-extrabold text-gray-900 truncate" id="statusRecapBank">
                  {kycSteps?.step3 && bank?.account_number
                    ? `${bank.bank_name} • A/C ...${String(bank.account_number).slice(-4)}`
                    : 'No Bank Account Linked'}
                </div>
                <div className="text-gray-600 font-mono text-[11px]">
                  {kycSteps?.step3 && bank?.ifsc_code
                    ? `IFSC: ${bank.ifsc_code} (${bank.account_type || 'CURRENT'})`
                    : 'Unlocks Payouts & Finance'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/onboarding?step=3')}
                className="text-[11px] font-extrabold text-green-700 hover:underline self-start"
              >
                {kycSteps?.step3 ? 'Edit Step 3 →' : 'Add Bank Account →'}
              </button>
            </div>

            {/* Module 4: Store Hours & Delivery */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    4. Delivery &amp; Hours • Ops
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      kycSteps?.step4 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {kycSteps?.step4 ? 'Saved ✓' : 'Skipped'}
                  </span>
                </div>
                <div className="font-extrabold text-gray-900" id="statusRecapZone">
                  {kycSteps?.step4
                    ? `${Math.round(Number(store?.delivery_radius_km ?? deliveryCfg?.delivery_radius_km ?? 10))} km radius • ${store?.city || 'Surat'}`
                    : 'Delivery Logistics Skipped'}
                </div>
                <div className="text-gray-600 text-[11px]">
                  {kycSteps?.step4
                    ? `Hours: ${String(store?.open_time || '08:00').slice(0, 5)} – ${String(store?.close_time || '22:00').slice(0, 5)} (${deliveryCfg?.fleet || 'SELF'} Fleet)`
                    : 'Unlocks Delivery Fleet & Zones'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/onboarding?step=4')}
                className="text-[11px] font-extrabold text-green-700 hover:underline self-start"
              >
                {kycSteps?.step4 ? 'Edit Step 4 →' : 'Configure Delivery →'}
              </button>
            </div>

            {/* Module 5: B2B Wholesale & Credit */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    5. B2B Credit • Compliance
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      kycSteps?.step5 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {kycSteps?.step5 ? 'Saved ✓' : 'Skipped'}
                  </span>
                </div>
                <div className="font-extrabold text-gray-900">
                  {kycSteps?.step5
                    ? `${creditCfg?.creditDays || 14} Days Credit • ₹${Number(creditCfg?.creditLimit || 50000).toLocaleString('en-IN')} Limit`
                    : 'B2B Credit Terms Skipped'}
                </div>
                <div className="text-gray-600 text-[11px]">
                  {kycSteps?.step5
                    ? `Min Order: ₹${Number(creditCfg?.creditMinOrder || 5000).toLocaleString('en-IN')}`
                    : 'Unlocks Credit Line & Trade Rules'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/onboarding?step=5')}
                className="text-[11px] font-extrabold text-green-700 hover:underline self-start"
              >
                {kycSteps?.step5 ? 'Edit Step 5 →' : 'Setup Credit Terms →'}
              </button>
            </div>
          </div>
        </div>

        {/* Merchant Declaration & Final Application Submit Section */}
        {!isApproved && (
          <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
            {(!isSubmitted || needsResubmission || isRejected) && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-xs text-green-900">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I hereby certify that all provided GSTIN, PAN, and merchant details are authentic. I agree to ADAB platform merchant terms and settlement guidelines.
                  </span>
                </label>
              </div>
            )}

            <button
              type="button"
              disabled={submitting || !isCriticalSetupDone || (isSubmitted && !needsResubmission && !isRejected)}
              onClick={handleSubmitApplication}
              id="regStatusSubmitBtn"
              className={`w-full py-3.5 rounded-xl text-base font-extrabold shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed ${
                isSubmitted && !needsResubmission && !isRejected
                  ? 'bg-blue-600 text-white'
                  : isRejected
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : needsResubmission
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'btn-primary'
              }`}
            >
              <i
                className={`fa-solid ${
                  submitting
                    ? 'fa-spinner animate-spin'
                    : isSubmitted && !needsResubmission && !isRejected
                    ? 'fa-clock'
                    : isRejected || needsResubmission
                    ? 'fa-rotate-right'
                    : 'fa-paper-plane'
                }`}
              ></i>
              {submitting
                ? 'Submitting Application...'
                : isSubmitted && !needsResubmission && !isRejected
                ? 'Application Submitted — Under Admin Review'
                : isRejected || needsResubmission
                ? 'Resubmit Store for Admin Verification'
                : 'Submit Store for Admin Verification'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
