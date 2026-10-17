/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider, useTranslation } from '../context/LanguageContext';
import OnboardingPage, { getStepTitles } from './OnboardingPage';
import RegStatusPage from './RegStatusPage';
import * as SellerContextModule from '../context/SellerContext';

vi.mock('../context/SellerContext', () => ({
  useSeller: vi.fn()
}));

const mockSellerBase = {
  profile: {
    seller_profile_id: 'test-1234',
    full_name: 'Rajesh Patel',
    legal_name: 'Mahadev Supermart Enterprises',
    phone: '9876543210',
    email: 'mahadev@adab.in',
    entity_type: 'Sole Proprietorship',
    gstin: '24AAACP7890A1Z5',
    pan: 'AAACP7890A',
    fssai_license: '10723026007890',
    udhyam_msme: 'UDYAM-GJ-22-0017890',
    kyc_status: 'DRAFT',
    submitted_at: null
  },
  store: {
    store_name: 'Mahadev Supermart',
    category: 'Grocery & Supermarket',
    address_line: 'Shop 14, Ring Road',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395007',
    open_time: '08:00',
    close_time: '22:00',
    delivery_radius_km: 10
  },
  onboardingData: {
    bankAccount: {
      bank_name: 'HDFC Bank',
      account_holder_name: 'Mahadev Supermart Enterprises',
      account_number: '50200048297890',
      ifsc_code: 'HDFC0001234',
      account_type: 'CURRENT'
    },
    deliveryConfig: {
      delivery_radius_km: 10,
      delivFast: true,
      delivSame: true,
      delivScheduled: true,
      delivPickup: true,
      fleet: 'SELF'
    },
    creditConfig: {
      enableCredit: true,
      creditDays: 14,
      creditLimit: 50000,
      creditMinOrder: 5000
    }
  },
  kycSteps: {
    step1: true,
    step2: true,
    step3: false,
    step4: false,
    step5: false,
    step7: false
  },
  isCriticalSetupDone: true,
  isApplicationSubmitted: false,
  isKycApproved: false,
  isKycRejected: false,
  refreshSellerData: vi.fn(),
  saveOnboardingStep: vi.fn()
};

function TestTitleHarness({ lang, onTitles }) {
  localStorage.setItem('adabLang', lang);
  function Child() {
    const { t } = useTranslation();
    const titles = getStepTitles(t);
    onTitles(titles);
    return null;
  }
  return (
    <LanguageProvider>
      <Child />
    </LanguageProvider>
  );
}

describe('KYC Localization (English, Hindi, Gujarati)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'en';
    vi.mocked(SellerContextModule.useSeller).mockReturnValue(mockSellerBase);
  });

  afterEach(() => {
    cleanup();
  });

  describe('getStepTitles helper', () => {
    it('returns step titles in English by default', () => {
      let titles = [];
      render(<TestTitleHarness lang="en" onTitles={(res) => { titles = res; }} />);
      expect(titles[0]).toBe('Store & Owner Profile');
      expect(titles[1]).toBe('KYC & GST Compliance');
      expect(titles[2]).toBe('Bank Account Details');
      expect(titles[3]).toBe('Store Operations & Delivery');
      expect(titles[4]).toBe('B2B Wholesale & Credit');
    });

    it('returns step titles in Hindi when lang is hi', () => {
      let titles = [];
      render(<TestTitleHarness lang="hi" onTitles={(res) => { titles = res; }} />);
      expect(titles[0]).toBe('दुकान एवं मालिक प्रोफाइल');
      expect(titles[1]).toBe('केवाईसी एवं जीएसटी अनुपालन');
      expect(titles[2]).toBe('बैंक खाता विवरण');
      expect(titles[3]).toBe('दुकान संचालन एवं डिलीवरी');
      expect(titles[4]).toBe('बी2बी थोक एवं क्रेडिट');
    });

    it('returns step titles in Gujarati when lang is gu', () => {
      let titles = [];
      render(<TestTitleHarness lang="gu" onTitles={(res) => { titles = res; }} />);
      expect(titles[0]).toBe('દુકાન અને માલિક પ્રોફાઇલ');
      expect(titles[1]).toBe('કેવાયસી અને જીએસટી પાલન');
      expect(titles[2]).toBe('બેંક ખાતાની વિગતો');
      expect(titles[3]).toBe('દુકાન સંચાલન અને ડિલિવરી');
      expect(titles[4]).toBe('બી2બી જથ્થાબંધ અને ક્રેડિટ');
    });
  });

  describe('OnboardingPage localization', () => {
    it('renders OnboardingPage in English', () => {
      localStorage.setItem('adabLang', 'en');
      render(
        <MemoryRouter initialEntries={['/onboarding?step=1']}>
          <LanguageProvider>
            <OnboardingPage />
          </LanguageProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Store Registration & KYC Verification')).toBeDefined();
      expect(screen.getByText('ADAB Verified Merchant Onboarding')).toBeDefined();
      expect(screen.getByText('Critical Step')).toBeDefined();
      expect(screen.getByText('Critical info required for store activation')).toBeDefined();
      expect(screen.getByText(/Save & Continue/i)).toBeDefined();
    });

    it('renders OnboardingPage in Hindi', () => {
      localStorage.setItem('adabLang', 'hi');
      render(
        <MemoryRouter initialEntries={['/onboarding?step=1']}>
          <LanguageProvider>
            <OnboardingPage />
          </LanguageProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('दुकान पंजीकरण एवं केवाईसी सत्यापन')).toBeDefined();
      expect(screen.getByText('अदब सत्यापित व्यापारी ऑनबोर्डिंग')).toBeDefined();
      expect(screen.getByText('महत्वपूर्ण चरण')).toBeDefined();
      expect(screen.getByText('दुकान सक्रिय करने के लिए आवश्यक महत्वपूर्ण जानकारी')).toBeDefined();
      expect(screen.getByText(/सहेजें और आगे बढ़ें/i)).toBeDefined();
    });

    it('renders OnboardingPage in Gujarati', () => {
      localStorage.setItem('adabLang', 'gu');
      render(
        <MemoryRouter initialEntries={['/onboarding?step=1']}>
          <LanguageProvider>
            <OnboardingPage />
          </LanguageProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('દુકાન નોંધણી અને કેવાયસી વેરિફિકેશન')).toBeDefined();
      expect(screen.getByText('અદબ વેરિફાઇડ વેપારી ઓનબોર્ડિંગ')).toBeDefined();
      expect(screen.getByText('મહત્વપૂર્ણ પગલું')).toBeDefined();
      expect(screen.getByText('દુકાન સક્રિય કરવા માટે જરૂરી મહત્વપૂર્ણ માહિતી')).toBeDefined();
      expect(screen.getByText(/સાચવો અને આગળ વધો/i)).toBeDefined();
    });
  });

  describe('RegStatusPage localization', () => {
    it('renders RegStatusPage in English', () => {
      localStorage.setItem('adabLang', 'en');
      render(
        <MemoryRouter initialEntries={['/regstatus']}>
          <LanguageProvider>
            <RegStatusPage />
          </LanguageProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Draft • Not Submitted')).toBeDefined();
      expect(screen.getByText('Verification Progress Pipeline')).toBeDefined();
      expect(screen.getByText('Submit Store for Admin Verification')).toBeDefined();
      expect(screen.getByText(/I hereby certify that all provided GSTIN/i)).toBeDefined();
    });

    it('renders RegStatusPage in Hindi', () => {
      localStorage.setItem('adabLang', 'hi');
      render(
        <MemoryRouter initialEntries={['/regstatus']}>
          <LanguageProvider>
            <RegStatusPage />
          </LanguageProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('ड्राफ्ट • अभी जमा नहीं हुआ')).toBeDefined();
      expect(screen.getByText('सत्यापन प्रगति पाइपलाइन')).toBeDefined();
      expect(screen.getByText('व्यवस्थापक सत्यापन के लिए दुकान जमा करें')).toBeDefined();
      expect(screen.getByText(/मैं प्रमाणित करता\/करती हूँ कि प्रदान किए गए सभी जीएसटी/i)).toBeDefined();
    });

    it('renders RegStatusPage in Gujarati', () => {
      localStorage.setItem('adabLang', 'gu');
      render(
        <MemoryRouter initialEntries={['/regstatus']}>
          <LanguageProvider>
            <RegStatusPage />
          </LanguageProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('ડ્રાફ્ટ • હજુ સબમિટ નથી થયું')).toBeDefined();
      expect(screen.getByText('વેરિફિકેશન પ્રગતિ પાઇપલાઇન')).toBeDefined();
      expect(screen.getByText('એડમિન વેરિફિકેશન માટે દુકાન સબમિટ કરો')).toBeDefined();
      expect(screen.getByText(/હું પ્રમાણિત કરું છું કે આપેલ તમામ જીએસટીઆઈએન/i)).toBeDefined();
    });
  });
});
