/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import HomePage from './HomePage';
import * as SellerContextModule from '../context/SellerContext';
import * as OrdersHookModule from '../hooks/useOrders';

vi.mock('../context/SellerContext', () => ({
  useSeller: vi.fn()
}));

vi.mock('../hooks/useOrders', () => ({
  useOrders: vi.fn()
}));

vi.mock('../api/sellerApi', () => ({
  sellerApi: {
    getAnalytics: vi.fn().mockResolvedValue({
      data: {
        summary: { total_orders: 15, total_revenue: 125000 },
        chartData: [
          { name: '10 Oct', revenue: 25000, orders: 3 },
          { name: '11 Oct', revenue: 35000, orders: 5 }
        ]
      }
    })
  }
}));

const mockSellerData = {
  profile: {
    seller_profile_id: 'test-1234',
    full_name: 'Rajesh Patel',
    legal_name: 'Mahadev Supermart Enterprises',
    gstin: '24AAACP7890A1Z5',
    kyc_status: 'APPROVED'
  },
  store: {
    store_name: 'Mahadev Supermart',
    city: 'Surat',
    delivery_radius_km: 12
  },
  dashboardMetrics: {
    total_revenue: 125000,
    total_orders: 15,
    pending_orders: 2,
    total_products: 42
  },
  storeTiming: {
    isOpen: true
  }
};

const mockOrdersData = {
  orders: [
    { id: 'ord-1', status: 'new', delivery_mode: 'fast' },
    { id: 'ord-2', status: 'pending', delivery_mode: 'same' }
  ]
};

describe('HomePage Localization (English, Hindi, Gujarati)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'en';
    vi.mocked(SellerContextModule.useSeller).mockReturnValue(mockSellerData);
    vi.mocked(OrdersHookModule.useOrders).mockReturnValue(mockOrdersData);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Easy Mode and Pro Mode in English', () => {
    localStorage.setItem('adabLang', 'en');
    render(
      <MemoryRouter>
        <LanguageProvider>
          <HomePage />
        </LanguageProvider>
      </MemoryRouter>
    );

    // Easy mode checks
    expect(screen.getByText('Quick Bill Counter')).toBeDefined();
    expect(screen.getByText('1-CLICK BILL')).toBeDefined();
    expect(screen.getByText('Customer Orders')).toBeDefined();
    expect(screen.getByText('3 Simple Steps')).toBeDefined();
    expect(screen.getByText('App Orders = Nearby Only')).toBeDefined();

    // Toggle to Pro Mode
    const proBtn = screen.getByRole('button', { name: /Advanced \(Pro\)/i });
    fireEvent.click(proBtn);

    expect(screen.getByText('Welcome back')).toBeDefined();
    expect(screen.getByText('Lifetime customer orders')).toBeDefined();
    expect(screen.getByText('Store Verification Status')).toBeDefined();
    expect(screen.getByText('Open (Online)')).toBeDefined();
  });

  it('renders Easy Mode and Pro Mode in Hindi', () => {
    localStorage.setItem('adabLang', 'hi');
    render(
      <MemoryRouter>
        <LanguageProvider>
          <HomePage />
        </LanguageProvider>
      </MemoryRouter>
    );

    // Easy mode checks
    expect(screen.getByText('त्वरित बिल काउंटर')).toBeDefined();
    expect(screen.getByText('1-क्लिक बिल')).toBeDefined();
    expect(screen.getByText('ग्राहक ऑर्डर')).toBeDefined();
    expect(screen.getByText('3 सरल चरण')).toBeDefined();
    expect(screen.getByText('ऐप ऑर्डर = केवल नजदीकी')).toBeDefined();

    // Toggle to Pro Mode
    const proBtn = screen.getByRole('button', { name: /एडवांस्ड \(प्रो\)/i });
    fireEvent.click(proBtn);

    expect(screen.getByText('वापसी पर स्वागत है')).toBeDefined();
    expect(screen.getByText('आजीवन ग्राहक ऑर्डर')).toBeDefined();
    expect(screen.getByText('दुकान सत्यापन स्थिति')).toBeDefined();
    expect(screen.getByText('खुली है (ऑनलाइन)')).toBeDefined();
  });

  it('renders Easy Mode and Pro Mode in Gujarati', () => {
    localStorage.setItem('adabLang', 'gu');
    render(
      <MemoryRouter>
        <LanguageProvider>
          <HomePage />
        </LanguageProvider>
      </MemoryRouter>
    );

    // Easy mode checks
    expect(screen.getByText('ઝડપી બિલ કાઉન્ટર')).toBeDefined();
    expect(screen.getByText('1-ક્લિક બિલ')).toBeDefined();
    expect(screen.getByText('ગ્રાહક ઓર્ડર્સ')).toBeDefined();
    expect(screen.getByText('3 સરળ પગલાં')).toBeDefined();
    expect(screen.getByText('એપ ઓર્ડર = ફક્ત નજીકમાં')).toBeDefined();

    // Toggle to Pro Mode
    const proBtn = screen.getByRole('button', { name: /એડવાન્સ્ડ \(પ્રો\)/i });
    fireEvent.click(proBtn);

    expect(screen.getByText('પાછા ફરવા બદલ સ્વાગત છે')).toBeDefined();
    expect(screen.getByText('આજીવન ગ્રાહક ઓર્ડર')).toBeDefined();
    expect(screen.getByText('દુકાન વેરિફિકેશન સ્થિતિ')).toBeDefined();
    expect(screen.getByText('ખુલ્લી છે (ઓનલાઇન)')).toBeDefined();
  });
});
