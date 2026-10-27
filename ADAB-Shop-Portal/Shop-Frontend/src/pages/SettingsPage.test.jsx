import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from './SettingsPage';
import { SellerProvider } from '../context/SellerContext';
import { LanguageProvider } from '../context/LanguageContext';
import sellerService from '../services/sellerService';
import * as audioAlert from '../utils/audioAlert';

// Mock sellerService
vi.mock('../services/sellerService', () => ({
  default: {
    getProfile: vi.fn().mockResolvedValue({
      data: { legal_name: 'Test Owner', gstin: '24AAAAA0000A1Z5', pan: 'AAAAA0000A', kyc_status: 'VERIFIED' }
    }),
    getStore: vi.fn().mockResolvedValue({
      data: { id: 'store-123', store_name: 'Test Mart', phone: '9876543210', address_line: 'Surat', is_online: true }
    }),
    getOnboardingSteps: vi.fn().mockResolvedValue({ data: {} }),
    getDashboardMetrics: vi.fn().mockResolvedValue({ data: {} }),
    getSettings: vi.fn().mockResolvedValue({
      data: {
        soundbox_enabled: true,
        open_time: '08:00',
        close_time: '22:00',
        delivery_radius_km: 12,
        is_online: true
      }
    }),
    updateStore: vi.fn().mockResolvedValue({ success: true }),
    updateProfile: vi.fn().mockResolvedValue({ success: true }),
    updateSettings: vi.fn().mockResolvedValue({ success: true })
  }
}));

// Mock audio alert
vi.spyOn(audioAlert, 'playNotificationChime').mockImplementation(() => {});

describe('SettingsPage Component (Module 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <LanguageProvider>
        <SellerProvider>
          <SettingsPage />
        </SellerProvider>
      </LanguageProvider>
    );
  };

  it('renders all 4 settings cards properly (Profile, Compliance, Operations, Hardware)', async () => {
    renderComponent();

    expect(screen.getByText(/Store Settings/i)).toBeInTheDocument();
    expect(screen.getByText(/Store Profile & Branding/i)).toBeInTheDocument();
    expect(screen.getByText(/Business & Tax Compliance/i)).toBeInTheDocument();
    expect(screen.getByText(/Store Operations & Hours/i)).toBeInTheDocument();
    expect(screen.getByText(/POS & Hardware Preferences/i)).toBeInTheDocument();
  });

  it('saves store profile to database via sellerService.updateStore', async () => {
    renderComponent();

    const storeNameInput = screen.getByLabelText(/Store Name/i);
    fireEvent.change(storeNameInput, { target: { value: 'Gujarat Mega Mart' } });

    const saveProfileBtn = screen.getByRole('button', { name: /Save Store Profile/i });
    fireEvent.click(saveProfileBtn);

    await waitFor(() => {
      expect(sellerService.updateStore).toHaveBeenCalledWith(
        expect.objectContaining({
          store_name: 'Gujarat Mega Mart'
        })
      );
    });
  });

  it('saves operations and timings via sellerService.updateSettings', async () => {
    renderComponent();

    const saveOpsBtn = screen.getByRole('button', { name: /Save Operations & Hours/i });
    fireEvent.click(saveOpsBtn);

    await waitFor(() => {
      expect(sellerService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          open_time: expect.any(String),
          close_time: expect.any(String)
        })
      );
    });
  });

  it('allows merchant to toggle POS thermal receipt width and test audio chime', async () => {
    renderComponent();

    // Select 80mm roll width
    const roll80Btn = screen.getByText(/80mm/i);
    fireEvent.click(roll80Btn);
    expect(localStorage.getItem('adab_pos_paper_size')).toBe('80mm');

    // Click test sound button
    const testSoundBtn = screen.getByRole('button', { name: /Test Sound/i });
    fireEvent.click(testSoundBtn);

    expect(audioAlert.playNotificationChime).toHaveBeenCalledWith(true);

    // Save preferences
    const savePrefsBtn = screen.getByRole('button', { name: /Save Hardware & Notifications/i });
    fireEvent.click(savePrefsBtn);

    await waitFor(() => {
      expect(sellerService.updateSettings).toHaveBeenCalled();
    });
  });
});
