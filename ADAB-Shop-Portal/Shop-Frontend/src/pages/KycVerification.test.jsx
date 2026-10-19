/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import OnboardingPage from './OnboardingPage';
import * as SellerContextModule from '../context/SellerContext';
import sellerService from '../services/sellerService';

vi.mock('../context/SellerContext', () => ({
  useSeller: vi.fn()
}));

vi.mock('../services/sellerService', () => ({
  default: {
    sendOtp: vi.fn(),
    verifyOtp: vi.fn()
  }
}));

const mockSellerState = {
  profile: {
    seller_profile_id: 'test-1234',
    full_name: 'Rajesh Patel',
    legal_name: 'Mahadev Supermart Enterprises',
    phone: '',
    email: '',
    entity_type: 'Sole Proprietorship',
    is_phone_verified: false,
    is_email_verified: false,
    kyc_status: 'DRAFT'
  },
  store: {
    store_name: 'Mahadev Supermart',
    category: 'Grocery & Supermarket',
    address_line: 'Shop 14, Ring Road',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395007'
  },
  kycSteps: { step1: false },
  onboardingData: {},
  refreshSellerData: vi.fn(),
  saveOnboardingStep: vi.fn().mockResolvedValue({ success: true, kycSteps: { step1: true } })
};

describe('KYC Contact Verification (Phone & Email)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('adabLang', 'en');
    vi.clearAllMocks();
    SellerContextModule.useSeller.mockReturnValue(mockSellerState);
  });

  it('renders side-by-side phone and email fields with Verify buttons', () => {
    render(
      <MemoryRouter initialEntries={['/onboarding?step=1']}>
        <LanguageProvider>
          <OnboardingPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    // Verify buttons for both phone and email
    const verifyButtons = screen.getAllByText('Verify');
    expect(verifyButtons.length).toBe(2);

    // Inputs present
    const phoneInput = screen.getByPlaceholderText('9876543210');
    const emailInput = screen.getByPlaceholderText('e.g. store@adab.in');
    expect(phoneInput).toBeDefined();
    expect(emailInput).toBeDefined();
  });

  it('shows error when saving step 1 without verifying phone or email', async () => {
    render(
      <MemoryRouter initialEntries={['/onboarding?step=1']}>
        <LanguageProvider>
          <OnboardingPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    const phoneInput = screen.getByPlaceholderText('9876543210');
    fireEvent.change(phoneInput, { target: { value: '9876543210' } });

    // Click Save & Continue
    const saveButton = screen.getByText(/Save & Continue/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Please verify either your Mobile Number or Business Email with OTP before continuing/i)).toBeDefined();
    });
  });

  it('opens popup modal, sends OTP for phone and confirms verification', async () => {
    sellerService.sendOtp.mockResolvedValue({
      data: {
        success: true,
        data: {
          otp: '482910',
          isSimulated: true
        }
      }
    });
    sellerService.verifyOtp.mockResolvedValue({
      data: {
        success: true,
        message: 'OTP verified successfully'
      }
    });

    render(
      <MemoryRouter initialEntries={['/onboarding?step=1']}>
        <LanguageProvider>
          <OnboardingPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    const phoneInput = screen.getByPlaceholderText('9876543210');
    fireEvent.change(phoneInput, { target: { value: '9876543210' } });

    // Click Verify button for Phone
    const verifyPhoneBtn = screen.getAllByText('Verify')[0];
    fireEvent.click(verifyPhoneBtn);

    await waitFor(() => {
      expect(sellerService.sendOtp).toHaveBeenCalledWith({ phone: '9876543210', idMode: 'phone' });
      // Modal should be open with OTP Hint and prompt
      expect(screen.getByText(/OTP Hint:/i)).toBeDefined();
      expect(screen.getByText('482910')).toBeDefined();
      expect(screen.getByText(/Enter OTP sent to \+91 9876543210:/i)).toBeDefined();
    });

    // Enter OTP in the modal input and Confirm
    const otpInput = screen.getByPlaceholderText('• • • • • •');
    fireEvent.change(otpInput, { target: { value: '482910' } });

    const confirmOtpBtn = screen.getByText('Confirm OTP');
    fireEvent.click(confirmOtpBtn);

    await waitFor(() => {
      // Modal should close and OTP Verified badge should appear on the field
      expect(screen.getAllByText('OTP Verified').length).toBeGreaterThan(0);
      expect(screen.queryByPlaceholderText('• • • • • •')).toBeNull();
    });
  });

  it('marks phone pre-verified if logged in via phone', () => {
    localStorage.setItem('seller_auth_mode', 'phone');
    localStorage.setItem('seller_login_phone', '9876543210');

    render(
      <MemoryRouter initialEntries={['/onboarding?step=1']}>
        <LanguageProvider>
          <OnboardingPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getAllByText('OTP Verified').length).toBeGreaterThan(0);
  });

  it('allows changing a pre-verified login phone number and requires re-verification', async () => {
    localStorage.setItem('seller_auth_mode', 'phone');
    localStorage.setItem('seller_login_phone', '9876543210');

    sellerService.sendOtp.mockResolvedValue({
      data: {
        success: true,
        data: {
          otp: '998877',
          isSimulated: true
        }
      }
    });
    sellerService.verifyOtp.mockResolvedValue({
      data: {
        success: true,
        message: 'OTP verified successfully'
      }
    });

    render(
      <MemoryRouter initialEntries={['/onboarding?step=1']}>
        <LanguageProvider>
          <OnboardingPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    // Initial state: phone is pre-verified
    expect(screen.getAllByText('OTP Verified').length).toBeGreaterThan(0);

    // Directly edit phone number without needing any Change button: turns badge into Verify button
    const phoneInput = screen.getByPlaceholderText('9876543210');
    fireEvent.change(phoneInput, { target: { value: '9123456789' } });
    expect(screen.getAllByText('Verify').length).toBe(2);

    // Saving without re-verifying triggers error
    const saveButton = screen.getByText(/Save & Continue/i);
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(screen.getByText(/Please verify either your Mobile Number or Business Email with OTP before continuing/i)).toBeDefined();
    });

    // Verify the new phone number
    const verifyBtn = screen.getAllByText('Verify')[0];
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(sellerService.sendOtp).toHaveBeenCalledWith({ phone: '9123456789', idMode: 'phone' });
      expect(screen.getByText('998877')).toBeDefined();
    });

    // Enter OTP and confirm
    const otpInput = screen.getByPlaceholderText('• • • • • •');
    fireEvent.change(otpInput, { target: { value: '998877' } });
    fireEvent.click(screen.getByText('Confirm OTP'));

    await waitFor(() => {
      expect(screen.getAllByText('OTP Verified').length).toBeGreaterThan(0);
    });
  });
});
