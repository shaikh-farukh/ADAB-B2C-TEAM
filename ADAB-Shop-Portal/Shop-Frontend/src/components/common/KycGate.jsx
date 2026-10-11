import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSeller } from '../../context/SellerContext';

export default function KycGate({ requiredSteps = [], featureName = 'this feature', children }) {
  const { kycSteps, loading } = useSeller();
  const location = useLocation();

  if (loading) {
    return children;
  }

  for (const stepNum of requiredSteps) {
    const key = `step${stepNum}`;
    if (kycSteps && kycSteps[key] === false) {
      const params = new URLSearchParams({
        step: String(stepNum),
        from: location.pathname,
        feature: featureName
      });
      return <Navigate to={`/onboarding?${params.toString()}`} replace />;
    }
  }

  return children;
}
