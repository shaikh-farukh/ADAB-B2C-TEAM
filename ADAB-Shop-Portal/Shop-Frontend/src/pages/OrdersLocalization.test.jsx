/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import OrdersPage from './OrdersPage';
import { sellerApi } from '../api/sellerApi';
import * as SellerContextModule from '../context/SellerContext';

vi.mock('../api/sellerApi', () => ({
  sellerApi: {
    getOrders: vi.fn(),
    updateOrderStatus: vi.fn()
  }
}));

vi.mock('../context/SellerContext', () => ({
  useSeller: vi.fn()
}));

const mockStoreData = {
  store: {
    store_name: 'Mahadev Supermart',
    delivery_radius_km: 15
  }
};

const sampleOrders = [
  {
    id: 'ORD-101',
    customer: 'Pooja Sharma',
    distance: '3.5',
    delivery_mode: 'fast',
    items: [
      { name: 'Basmati Rice 5kg', quantity: 1, unit_price: 450, total_price: 450 }
    ],
    amount: 450,
    status: 'new'
  }
];

describe('OrdersPage Localization (English, Hindi, Gujarati)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'en';
    vi.resetAllMocks();
    vi.mocked(SellerContextModule.useSeller).mockReturnValue(mockStoreData);
    sellerApi.getOrders.mockResolvedValue({
      success: true,
      data: sampleOrders
    });
    sellerApi.updateOrderStatus.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Orders page in English', async () => {
    localStorage.setItem('adabLang', 'en');
    render(
      <MemoryRouter>
        <LanguageProvider>
          <OrdersPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('#ORD-101')).toBeDefined();
    });

    expect(screen.getByText('App Orders')).toBeDefined();
    expect(screen.getByText('(Nearby Only)')).toBeDefined();
    expect(screen.getByText('Edit Zone')).toBeDefined();
    expect(screen.getByText('All')).toBeDefined();
    expect(screen.getAllByText('New').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('1 Fast')).toBeDefined();
    expect(screen.getByPlaceholderText('Search order, customer, items...')).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Order' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Customer' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Action' })).toBeDefined();
    expect(screen.getByText('Accept')).toBeDefined();
    expect(screen.getByText('Decline')).toBeDefined();
    expect(screen.getByText('Manage Delivery Zone')).toBeDefined();
  });

  it('renders Orders page in Hindi', async () => {
    localStorage.setItem('adabLang', 'hi');
    render(
      <MemoryRouter>
        <LanguageProvider>
          <OrdersPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('#ORD-101')).toBeDefined();
    });

    // Header & Zone
    expect(screen.getByText('ऐप ऑर्डर')).toBeDefined();
    expect(screen.getByText('(केवल नजदीकी)')).toBeDefined();
    expect(screen.getByText('दायरा बदलें')).toBeDefined();

    // Tabs
    expect(screen.getByText('सभी')).toBeDefined();
    expect(screen.getByText('नए')).toBeDefined();

    // Pills
    expect(screen.getByText('1 तेज़')).toBeDefined();

    // Search placeholder
    expect(screen.getByPlaceholderText('ऑर्डर, ग्राहक, सामान खोजें...')).toBeDefined();

    // Table Headers
    expect(screen.getByRole('columnheader', { name: 'ऑर्डर' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'ग्राहक' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'स्थिति' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'कार्रवाई' })).toBeDefined();

    // Action buttons
    expect(screen.getByText('स्वीकार करें')).toBeDefined();
    expect(screen.getByText('अस्वीकार करें')).toBeDefined();

    // Bottom banner button
    expect(screen.getByText('डिलीवरी क्षेत्र प्रबंधित करें')).toBeDefined();
  });

  it('renders Orders page in Gujarati', async () => {
    localStorage.setItem('adabLang', 'gu');
    render(
      <MemoryRouter>
        <LanguageProvider>
          <OrdersPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('#ORD-101')).toBeDefined();
    });

    // Header & Zone
    expect(screen.getByText('એપ ઓર્ડર્સ')).toBeDefined();
    expect(screen.getByText('(ફક્ત નજીકમાં)')).toBeDefined();
    expect(screen.getByText('ઝોન સંપાદિત કરો')).toBeDefined();

    // Tabs
    expect(screen.getByText('બધા')).toBeDefined();
    expect(screen.getByText('નવા')).toBeDefined();

    // Pills
    expect(screen.getByText('1 ઝડપી')).toBeDefined();

    // Search placeholder
    expect(screen.getByPlaceholderText('ઓર્ડર, ગ્રાહક, વસ્તુઓ શોધો...')).toBeDefined();

    // Table Headers
    expect(screen.getByRole('columnheader', { name: 'ઓર્ડર' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'ગ્રાહક' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'સ્થિતિ' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'કાર્યવાહી' })).toBeDefined();

    // Action buttons
    expect(screen.getByText('સ્વીકારો')).toBeDefined();
    expect(screen.getByText('નકારો')).toBeDefined();

    // Bottom banner button
    expect(screen.getByText('ડિલિવરી ઝોન મેનેજ કરો')).toBeDefined();
  });

  it('renders Itemized Breakdown modal in Hindi', async () => {
    localStorage.setItem('adabLang', 'hi');
    render(
      <MemoryRouter>
        <LanguageProvider>
          <OrdersPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('#ORD-101')).toBeDefined();
    });

    // Click items button to open OrderItemsModal
    const itemsBtn = screen.getByTitle('ऑर्डर किए गए सभी सामान देखने के लिए क्लिक करें');
    fireEvent.click(itemsBtn);

    await waitFor(() => {
      expect(screen.getByText(/ऑर्डर विवरण • #ORD-101/i)).toBeDefined();
      expect(screen.getByText('डिलीवरी का पता')).toBeDefined();
      expect(screen.getAllByRole('columnheader', { name: 'सामान' }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('columnheader', { name: 'मात्रा' })).toBeDefined();
      expect(screen.getByRole('columnheader', { name: 'इकाई मूल्य' })).toBeDefined();
      expect(screen.getAllByRole('columnheader', { name: 'कुल' }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('कुल योग (1 सामान)')).toBeDefined();
      expect(screen.getByText('ऑर्डर स्वीकार करें')).toBeDefined();
    });
  });

  it('renders Decline Order modal in Gujarati', async () => {
    localStorage.setItem('adabLang', 'gu');
    render(
      <MemoryRouter>
        <LanguageProvider>
          <OrdersPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('#ORD-101')).toBeDefined();
    });

    // Click Decline button
    const declineBtn = screen.getByText('નકારો');
    fireEvent.click(declineBtn);

    await waitFor(() => {
      expect(screen.getByText(/ઓર્ડર અસ્વીકાર કરો • #ORD-101/i)).toBeDefined();
      expect(screen.getByText('કૃપા કરીને આ ઓર્ડર અસ્વીકાર કરવાનું કારણ પસંદ કરો:')).toBeDefined();
      expect(screen.getByText('વસ્તુઓ સ્ટોકમાં નથી')).toBeDefined();
      expect(screen.getByText('ઓર્ડર રાખો')).toBeDefined();
      expect(screen.getByText('અસ્વીકારની પુષ્ટિ કરો')).toBeDefined();
    });
  });
});
