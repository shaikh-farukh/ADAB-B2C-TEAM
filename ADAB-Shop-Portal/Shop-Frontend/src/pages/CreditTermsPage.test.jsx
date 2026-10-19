import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CreditTermsPage from './CreditTermsPage';
import { LanguageProvider } from '../context/LanguageContext';
import { sellerApi } from '../api/sellerApi';

vi.mock('../api/sellerApi', () => ({
  sellerApi: {
    getCreditTerms: vi.fn(),
    updateCreditGiveTerms: vi.fn(),
    updateCreditBuyLimits: vi.fn()
  }
}));

const mockCreditData = {
  rules: {
    id: 'rule-123',
    store_id: 'store-123',
    enable_credit: true,
    credit_days: 14,
    min_order_amount: 5000,
    max_limit_per_store: 50000,
    max_stores_count: 10,
    total_exposure_cap: 300000,
    buy_max_shops: 5,
    buy_max_per_shop: 25000
  },
  give_metrics: {
    stores_count: 2,
    max_stores: 10,
    exposure_used: 39400,
    total_cap: 300000,
    stores_on_credit: [
      {
        store_id: 'store-vesu',
        store_name: 'Vesu Grocery Mart',
        amount_owed: 31000,
        days_left: 5,
        credit_days: 14
      },
      {
        store_id: 'store-ring',
        store_name: 'Ring Road Kirana',
        amount_owed: 8400,
        days_left: 12,
        credit_days: 14
      }
    ]
  },
  receive_metrics: {
    active_shops_count: 3,
    max_shops: 5,
    total_owed: 18200,
    seller_credits: [
      {
        store_id: 'supplier-1',
        store_name: 'Gujarat Agro Mill',
        credit_days: 14,
        limit: 25000,
        amount_owed: 5600
      },
      {
        store_id: 'supplier-2',
        store_name: 'Spice Traders',
        credit_days: 7,
        limit: 15000,
        amount_owed: 2100
      }
    ]
  },
  adab_line: {
    total_limit: 250000,
    utilized_amount: 18200,
    available_amount: 231800,
    interest: '0% for 14 days',
    gstin_verified: true,
    status: 'Active'
  }
};

const renderWithProviders = (lang = 'en') => {
  localStorage.setItem('adabLang', lang);
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <CreditTermsPage />
      </LanguageProvider>
    </MemoryRouter>
  );
};

describe('CreditTermsPage Dynamic Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sellerApi.getCreditTerms.mockResolvedValue({
      data: { success: true, data: mockCreditData }
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('loads and renders live store credit rules and metrics from database', async () => {
    const { container } = renderWithProviders('en');

    expect(sellerApi.getCreditTerms).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText('Store Credit Terms')).toBeInTheDocument();
      expect(screen.getByText('Credit You GIVE')).toBeInTheDocument();
      expect(screen.getByText('Credit from OTHER Shops')).toBeInTheDocument();
      expect(screen.getByText('ADAB Credit Line')).toBeInTheDocument();
    });

    // Check dynamic metrics for "Credit You GIVE"
    expect(screen.getByText('Vesu Grocery Mart')).toBeInTheDocument();
    expect(screen.getByText('Ring Road Kirana')).toBeInTheDocument();
    expect(container.querySelector('#creditGiveShopCount').textContent).toContain('2 / 10');

    // Check dynamic metrics for "Credit from OTHER Shops"
    expect(screen.getByText('Gujarat Agro Mill')).toBeInTheDocument();
    expect(screen.getByText('Spice Traders')).toBeInTheDocument();
    expect(container.querySelector('#creditGetShopCount').textContent).toContain('3 / 5');
    expect(screen.getAllByText('₹18,200').length).toBeGreaterThanOrEqual(1);
  });

  it('updates and saves Credit You Give terms dynamically', async () => {
    sellerApi.updateCreditGiveTerms.mockResolvedValue({
      data: {
        success: true,
        data: {
          ...mockCreditData,
          rules: {
            ...mockCreditData.rules,
            credit_days: 21,
            min_order_amount: 10000
          }
        }
      }
    });

    const { container } = renderWithProviders('en');

    await waitFor(() => {
      expect(screen.getByText('Store Credit Terms')).toBeInTheDocument();
    });

    const daysSelect = container.querySelector('#inpCreditDaysGive');
    fireEvent.change(daysSelect, { target: { value: '21' } });

    const minInput = container.querySelector('#inpCreditMinGive');
    fireEvent.change(minInput, { target: { value: '10000' } });

    const saveTermsBtn = screen.getByText('Save Terms');
    fireEvent.click(saveTermsBtn);

    await waitFor(() => {
      expect(sellerApi.updateCreditGiveTerms).toHaveBeenCalledWith(
        expect.objectContaining({
          credit_days: 21,
          min_order_amount: 10000
        })
      );
      expect(screen.getByText(/saved and synced successfully/i)).toBeInTheDocument();
    });
  });

  it('updates and saves Credit from OTHER Shops limits dynamically', async () => {
    sellerApi.updateCreditBuyLimits.mockResolvedValue({
      data: {
        success: true,
        data: {
          ...mockCreditData,
          rules: {
            ...mockCreditData.rules,
            buy_max_shops: 8,
            buy_max_per_shop: 40000
          }
        }
      }
    });

    const { container } = renderWithProviders('en');

    await waitFor(() => {
      expect(screen.getByText('Store Credit Terms')).toBeInTheDocument();
    });

    const maxShopsInput = container.querySelector('#inpBuyMaxShops');
    fireEvent.change(maxShopsInput, { target: { value: '8' } });

    const saveLimitsBtn = screen.getByText('Save Buying Limits');
    fireEvent.click(saveLimitsBtn);

    await waitFor(() => {
      expect(sellerApi.updateCreditBuyLimits).toHaveBeenCalledWith(
        expect.objectContaining({
          buy_max_shops: 8
        })
      );
      expect(screen.getByText(/saved and synced successfully/i)).toBeInTheDocument();
    });
  });

  it('renders correctly in Hindi and Gujarati', async () => {
    const hiRender = renderWithProviders('hi');
    await waitFor(() => {
      expect(hiRender.getByText('दुकान क्रेडिट शर्तें')).toBeInTheDocument();
      expect(hiRender.getByText('आपके द्वारा दिया जाने वाला उधार')).toBeInTheDocument();
    });
    hiRender.unmount();

    const guRender = renderWithProviders('gu');
    await waitFor(() => {
      expect(guRender.getByText('સ્ટોર ક્રેડિટ શરતો')).toBeInTheDocument();
      expect(guRender.getByText('તમે આપેલ ઉધાર')).toBeInTheDocument();
    });
    guRender.unmount();
  });
});
