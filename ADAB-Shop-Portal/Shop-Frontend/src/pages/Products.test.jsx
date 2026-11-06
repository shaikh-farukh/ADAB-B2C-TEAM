import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock contexts
vi.mock('../context/SellerContext', () => ({
  useSeller: () => ({
    uploadJobs: [],
    setUploadJobs: vi.fn(),
    currentStore: { id: 'store-1', name: 'Test Store' }
  })
}));

vi.mock('../context/LanguageContext', () => ({
  useTranslation: () => ({ t: (k, fallback) => fallback || k })
}));

vi.mock('../hooks/useListings', () => ({
  useListings: () => ({
    listings: [],
    setListings: vi.fn(),
    loading: false,
    filters: {
      searchQuery: '', setSearchQuery: vi.fn(),
      stockFilter: 'All stock', setStockFilter: vi.fn(),
      typeFilter: 'ALL', setTypeFilter: vi.fn(),
      buyerFilter: 'ALL', setBuyerFilter: vi.fn(),
      categoryFilter: 'ALL', setCategoryFilter: vi.fn()
    },
    pagination: {
      currentPage: 1, setCurrentPage: vi.fn(),
      itemsPerPage: 10, setItemsPerPage: vi.fn(),
      totalItems: 0
    },
    globalStats: { total: 0, ownBrand: 0, loose: 0, packed: 0, food: 0, lowStock: 0, outOfStock: 0 },
    createListing: vi.fn(),
    updateListing: vi.fn(),
    deleteListing: vi.fn(),
    batchDeleteListings: vi.fn(),
    submitListing: vi.fn(),
    publishListing: vi.fn(),
    bulkUpload: vi.fn(),
    checkUploadStatus: vi.fn(),
    bulkExport: vi.fn(),
    checkExportStatus: vi.fn(),
    uploadImage: vi.fn(),
    refresh: vi.fn()
  })
}));

vi.mock('../services/listingService', () => ({
  default: {
    getCategories: vi.fn().mockResolvedValue([]),
    getCategoryTree: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getListingIssues: vi.fn().mockResolvedValue({ success: true, data: [] })
  }
}));

import Products from './Products';

describe('Products Page Unit Test', () => {
  it('renders without throwing', () => {
    expect(() => {
      render(
        <BrowserRouter>
          <Products />
        </BrowserRouter>
      );
    }).not.toThrow();
  });
});
