import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HelpSupportPage from './help/HelpSupportPage';
import HelpTicketListPage from './help/HelpTicketListPage';
import TermsAndConditionsPage from './legal/TermsAndConditionsPage';
import PrivacyPolicyPage from './legal/PrivacyPolicyPage';
import ContactUsPage from './contact/ContactUsPage';
import MarketCoveragePage from './MarketCoveragePage';
import KYBUploadPage from './KYBUploadPage';

/**
 * Responsibility: Shared pages used by all user types (e.g., Profile,
 * Settings, Help Center, 404).
 */
const CommonPages: React.FC = () => {
  return (
    <Routes>
      <Route path="help" element={<HelpSupportPage />} />
      <Route path="tickets" element={<HelpTicketListPage />} />
      <Route path="terms" element={<TermsAndConditionsPage />} />
      <Route path="privacy" element={<PrivacyPolicyPage />} />
      <Route path="contact" element={<ContactUsPage />} />
      <Route path="market-coverage" element={<MarketCoveragePage />} />
      <Route path="kyb-verification" element={<KYBUploadPage />} />
      <Route path="*" element={<Navigate to="help" replace />} />
    </Routes>
  );
};

export default CommonPages;