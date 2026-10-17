/**
 * @vitest-environment jsdom
 */
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider, useTranslation } from '../context/LanguageContext';
import POSPage from './POSPage';
import Products from './Products';
import listingService from '../services/listingService';

vi.mock('../services/listingService', () => ({
  default: {
    getListings: vi.fn(),
    getCategories: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getListingIssues: vi.fn().mockResolvedValue({ success: true, data: [] })
  }
}));

vi.mock('../hooks/usePOS', () => ({
  usePOS: () => ({
    cart: [],
    addToCart: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    cartTotal: 0,
    checkout: vi.fn(),
    isProcessing: false
  })
}));

vi.mock('../hooks/useListings', () => ({
  useListings: () => ({
    listings: [
      {
        id: 1,
        title: 'Tata Salt 1kg',
        product_type: 'PACKED_ITEM',
        sell_price: 25,
        stock_qty: 100,
        allowed_buyers: 'ALL',
        approval_status: 'PUBLISHED'
      }
    ],
    loading: false,
    filters: {
      searchQuery: '',
      setSearchQuery: vi.fn(),
      stockFilter: 'All stock',
      setStockFilter: vi.fn(),
      typeFilter: 'ALL',
      setTypeFilter: vi.fn(),
      buyerFilter: 'ALL',
      setBuyerFilter: vi.fn()
    },
    pagination: {
      currentPage: 1,
      setCurrentPage: vi.fn(),
      itemsPerPage: 10,
      setItemsPerPage: vi.fn(),
      totalItems: 1
    },
    globalStats: {
      total: 1,
      ownBrand: 0,
      lowStock: 0,
      outOfStock: 0,
      loose: 0,
      food: 0
    },
    createListing: vi.fn(),
    updateListing: vi.fn(),
    deleteListing: vi.fn(),
    batchDeleteListings: vi.fn(),
    submitListing: vi.fn(),
    bulkUpload: vi.fn(),
    checkUploadStatus: vi.fn(),
    bulkExport: vi.fn(),
    checkExportStatus: vi.fn(),
    uploadImage: vi.fn(),
    refresh: vi.fn()
  })
}));

vi.mock('../context/SellerContext', () => ({
  useSeller: () => ({
    uploadJobs: [],
    setUploadJobs: vi.fn()
  })
}));

const LanguageSwitcher = ({ targetLang }) => {
  const { setLanguage } = useTranslation();
  React.useEffect(() => {
    setLanguage(targetLang);
  }, [targetLang, setLanguage]);
  return null;
};

const renderWithLang = (component, lang = 'en') => {
  localStorage.setItem('adab_shop_language', lang);
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <LanguageSwitcher targetLang={lang} />
        {component}
      </LanguageProvider>
    </MemoryRouter>
  );
};

describe('POS and Products Localization (en, hi, gu)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    listingService.getListings.mockResolvedValue({
      data: [
        { id: 101, title: 'Amul Milk 500ml', sell_price: 32, stock_qty: 45, product_type: 'Dairy' }
      ]
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders POSPage in English, Hindi, and Gujarati', async () => {
    // English
    const { unmount: unmountEn } = renderWithLang(<POSPage />, 'en');
    await waitFor(() => {
      expect(screen.getByText('Bill Counter')).toBeDefined();
      expect(screen.getByText('Current Bill')).toBeDefined();
      expect(screen.getByText('All')).toBeDefined();
      expect(screen.getByText('Grocery')).toBeDefined();
    });
    unmountEn();

    // Hindi
    const { unmount: unmountHi } = renderWithLang(<POSPage />, 'hi');
    await waitFor(() => {
      expect(screen.getByText('बिल काउंटर')).toBeDefined();
      expect(screen.getByText('वर्तमान बिल')).toBeDefined();
      expect(screen.getByText('सभी')).toBeDefined();
      expect(screen.getByText('किराना')).toBeDefined();
    });
    unmountHi();

    // Gujarati
    const { unmount: unmountGu } = renderWithLang(<POSPage />, 'gu');
    await waitFor(() => {
      expect(screen.getByText('બિલ કાઉન્ટર')).toBeDefined();
      expect(screen.getByText('વર્તમાન બિલ')).toBeDefined();
      expect(screen.getByText('બધા')).toBeDefined();
      expect(screen.getByText('કરિયાણું')).toBeDefined();
    });
    unmountGu();
  });

  it('renders Products in English, Hindi, and Gujarati', async () => {
    // English
    const { unmount: unmountEn } = renderWithLang(<Products />, 'en');
    await waitFor(() => {
      expect(screen.getByText('My Products')).toBeDefined();
      expect(screen.getByText('Export CSV')).toBeDefined();
      expect(screen.getByText('Total SKUs')).toBeDefined();
      expect(screen.getByText('Selling to:')).toBeDefined();
      expect(screen.getByText('All buyers')).toBeDefined();
    });
    unmountEn();

    // Hindi
    const { unmount: unmountHi } = renderWithLang(<Products />, 'hi');
    await waitFor(() => {
      expect(screen.getByText('मेरे प्रोडक्ट्स')).toBeDefined();
      expect(screen.getByText('CSV एक्सपोर्ट करें')).toBeDefined();
      expect(screen.getByText('कुल SKU')).toBeDefined();
      expect(screen.getByText('किसे बेच रहे हैं:')).toBeDefined();
      expect(screen.getByText('सभी खरीदार')).toBeDefined();
    });
    unmountHi();

    // Gujarati
    const { unmount: unmountGu } = renderWithLang(<Products />, 'gu');
    await waitFor(() => {
      expect(screen.getByText('મારા પ્રોડક્ટ્સ')).toBeDefined();
      expect(screen.getByText('CSV એક્સપોર્ટ કરો')).toBeDefined();
      expect(screen.getByText('કુલ SKU')).toBeDefined();
      expect(screen.getByText('કોને વેચી રહ્યા છો:')).toBeDefined();
      expect(screen.getByText('બધા ખરીદદારો')).toBeDefined();
    });
    unmountGu();
  });
});
