import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CatalogPage from './CatalogPage';
import { sellerApi } from '../api/sellerApi';
import listingService from '../services/listingService';
import { LanguageProvider } from '../context/LanguageContext';

vi.mock('../api/sellerApi', () => ({
  sellerApi: {
    getMasterCatalog: vi.fn(),
    adoptMasterCatalogItem: vi.fn()
  }
}));

vi.mock('../services/listingService', () => ({
  default: {
    getCategories: vi.fn()
  }
}));

const mockCategories = [
  { id: 2, name: 'Dairy & Eggs' },
  { id: 4, name: 'Snacks & Packaged Food' }
];

const mockMasterProducts = [
  {
    id: 'fmcg-1',
    product_name: 'Amul Butter 500g',
    brand_name: 'Amul',
    barcode: '8901262010057',
    category_id: 2,
    category_name: 'Dairy & Eggs',
    printed_mrp: '275.00',
    standard_unit: 'pack',
    already_in_store: false
  },
  {
    id: 'fmcg-2',
    product_name: 'Maggi 2-Minute Noodles 280g',
    brand_name: 'Maggi',
    barcode: '8901058852333',
    category_id: 4,
    category_name: 'Snacks & Packaged Food',
    printed_mrp: '56.00',
    standard_unit: 'pack',
    already_in_store: true
  }
];

function renderWithProviders(ui) {
  return render(
    <BrowserRouter>
      <LanguageProvider>
        {ui}
      </LanguageProvider>
    </BrowserRouter>
  );
}

describe('CatalogPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listingService.getCategories.mockResolvedValue({ success: true, data: mockCategories });
    sellerApi.getMasterCatalog.mockResolvedValue({
      success: true,
      data: { items: mockMasterProducts, total: 2 }
    });
  });

  it('renders National FMCG Catalog with live products from master catalog', async () => {
    renderWithProviders(<CatalogPage />);

    expect(await screen.findByText('National FMCG Catalog')).toBeInTheDocument();
    expect(await screen.findByText('Amul Butter 500g')).toBeInTheDocument();
    expect(await screen.findByText('Maggi 2-Minute Noodles 280g')).toBeInTheDocument();
    expect(screen.getByText('Amul')).toBeInTheDocument();
    expect(screen.getByText('Maggi')).toBeInTheDocument();
    expect(screen.getByText('In Store')).toBeInTheDocument();
    expect(screen.getByText('Add to Store')).toBeInTheDocument();
  });

  it('opens Adopt modal and calls adoptMasterCatalogItem on confirm', async () => {
    sellerApi.adoptMasterCatalogItem.mockResolvedValue({
      success: true,
      data: { adopted: true }
    });

    renderWithProviders(<CatalogPage />);

    const addButton = await screen.findByText('Add to Store');
    fireEvent.click(addButton);

    // Verify modal is open
    expect(screen.getByText('Add to Store Inventory')).toBeInTheDocument();
    expect(screen.getByText(/Your Selling Price/i)).toBeInTheDocument();

    const publishBtn = screen.getByText('Publish to Store');
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(sellerApi.adoptMasterCatalogItem).toHaveBeenCalledWith(
        expect.objectContaining({
          masterCatalogId: 'fmcg-1',
          sellPrice: 275,
          stockQty: 20
        })
      );
    });
  });
});
