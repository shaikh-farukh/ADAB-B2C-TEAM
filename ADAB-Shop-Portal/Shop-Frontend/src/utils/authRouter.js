/**
 * Post-Authentication Routing Utility
 * Routes the seller to the appropriate destination based on KYC and approval status.
 */
export const routeAfterAuth = (data, navigate) => {
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
};
