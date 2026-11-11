import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductDetailPage from './ProductDetailPage';
import { sellerApi } from '../api/sellerApi';
import { LanguageProvider } from '../context/LanguageContext';

vi.mock('../api/sellerApi', () => ({
  sellerApi: {
    getMasterProductById: vi.fn(),
    adoptMasterCatalogItem: vi.fn(),
    orderRestockCases: vi.fn(),
    bulkOrderRestockCases: vi.fn()
  }
}));

const mockProduct = {
  id: 4,
  product_name: 'Milk Soap',
  brand_name: 'Shabbir Labour Group',
  category_name: 'Personal Care',
  sub_category: 'Soaps & Body Wash',
  description: 'Rich creamy milk soap for smooth skin.',
  printed_mrp: 35.0,
  wholesale_price: 25.0,
  retailer_margin_pct: '28.6',
  profit_per_unit: 10.0,
  case_size: 24,
  case_mrp: 840.0,
  case_wholesale_price: 600.0,
  case_retailer_profit: 240.0,
  packaging_type: 'Shipper Carton',
  net_weight: 500,
  weight_unit: 'g',
  standard_unit: 'Piece',
  default_image_url: null,
  barcode: '8901262010057',
  fssai_license_no: '10012011000145',
  shelf_life_days: 100,
  storage_condition: 'Ambient',
  attributes: {
    fraganace: 'smoky',
    hair_skin_type: 'Normal',
    key_active_ingredient: 'milk protein'
  },
  distributor_name: 'Apex City Stockists',
  lead_time_hours: 12,
  already_in_store: false
};

const renderWithProviders = (initialRoute = '/catalog/4') => {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/catalog/:id" element={<ProductDetailPage />} />
          <Route path="/catalog" element={<div>Catalog Index</div>} />
          <Route path="/products" element={<div>Store Inventory</div>} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>
  );
};

describe('ProductDetailPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Amazon-style Product Detail Page with full FMCG specs & profit breakdown', async () => {
    sellerApi.getMasterProductById.mockResolvedValue({
      data: {
        success: true,
        data: {
          product: mockProduct,
          storePincode: '400001'
        }
      }
    });

    renderWithProviders();

    expect(await screen.findByRole('heading', { level: 1, name: 'Milk Soap' })).toBeInTheDocument();
    expect(screen.getByText('Shabbir Labour Group')).toBeInTheDocument();
    expect(screen.getByText(/Rich creamy milk soap/i)).toBeInTheDocument();

    // Check Barcode & FSSAI
    expect(screen.getByText('8901262010057')).toBeInTheDocument();
    expect(screen.getByText('10012011000145')).toBeInTheDocument();
    expect(screen.getByText(/100 Days from Mfg/i)).toBeInTheDocument();

    // Check Profit & Economics
    expect(screen.getByText('₹25.00')).toBeInTheDocument();
    expect(screen.getByText(/\+28.6% \(\+₹10.00 \/ Piece\)/i)).toBeInTheDocument();
    expect(screen.getByText(/\+₹240.00 per carton/i)).toBeInTheDocument();
    expect(screen.getByText(/Apex City Stockists/i)).toBeInTheDocument();

    // Action buttons visible
    expect(screen.getByText(/Put on My Shop Shelf/i)).toBeInTheDocument();
    expect(screen.getByText(/Add to Restock Cart/i)).toBeInTheDocument();
  });

  it('opens Put on My Shop Shelf modal and calls adoptMasterCatalogItem on submit', async () => {
    sellerApi.getMasterProductById.mockResolvedValue({
      data: {
        success: true,
        data: { product: mockProduct, storePincode: '400001' }
      }
    });

    sellerApi.adoptMasterCatalogItem.mockResolvedValue({
      data: { success: true, data: { adopted: true } }
    });

    renderWithProviders();

    const adoptBtn = await screen.findByText(/Put on My Shop Shelf/i);
    fireEvent.click(adoptBtn);

    // Modal opens
    expect(screen.getByText(/Your Retail Selling Price/i)).toBeInTheDocument();

    const publishBtn = screen.getByText('Publish to Store');
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(sellerApi.adoptMasterCatalogItem).toHaveBeenCalledWith(
        expect.objectContaining({
          masterCatalogId: 4,
          sellPrice: 35,
          stockQty: 20
        })
      );
    });
  });
});

