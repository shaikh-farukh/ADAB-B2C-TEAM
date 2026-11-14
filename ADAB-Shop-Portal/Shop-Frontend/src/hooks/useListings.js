import { useState, useEffect, useCallback } from 'react';
import { listingApi } from '../api/listingApi';

// Module-level stats cache to prevent re-fetching 10k rows on frequent tab navigation
let cachedGlobalStats = null;
let lastStatsFetchTime = 0;

export const useListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('All stock');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [buyerFilter, setBuyerFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
  // Debounce search input by 300ms to eliminate per-keystroke API flooding
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [globalStats, setGlobalStats] = useState({ total: 0, ownBrand: 0, loose: 0, packed: 0, food: 0, lowStock: 0, outOfStock: 0 });

  // Decoupled global stats query: runs once on mount and on mutations (NOT on every search keystroke)
  const fetchGlobalStats = useCallback(async (force = false) => {
    try {
      const now = Date.now();
      if (!force && cachedGlobalStats && now - lastStatsFetchTime < 120000) {
        setGlobalStats(cachedGlobalStats);
        return;
      }
      const statsRes = await listingApi.fetchListings({ limit: 10000 });
      const all = statsRes.data || [];
      const computed = {
        total: all.length,
        ownBrand: all.filter(l => l.product_type === 'OWN_BRAND').length,
        loose: all.filter(l => l.product_type === 'LOOSE_WEIGHT').length,
        packed: all.filter(l => l.product_type === 'PACKED_ITEM').length,
        food: all.filter(l => l.product_type === 'FOOD').length,
        lowStock: all.filter(l => (parseFloat(l.stock_qty) || 0) > 0 && (parseFloat(l.stock_qty) || 0) <= 10).length,
        outOfStock: all.filter(l => (parseFloat(l.stock_qty) || 0) <= 0).length
      };
      cachedGlobalStats = computed;
      lastStatsFetchTime = now;
      setGlobalStats(computed);
    } catch (e) {
      console.error("Global stats fetch failed", e);
    }
  }, []);

  useEffect(() => {
    fetchGlobalStats();
  }, [fetchGlobalStats]);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const stock = stockFilter === 'In stock' ? 'in_stock' : stockFilter === 'Out of stock' ? 'out_of_stock' : 'all';
      const queryFilters = {
        search: debouncedSearch,
        stock: stock,
        type: typeFilter,
        buyer: buyerFilter,
        category_id: categoryFilter,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage
      };
      
      const res = await listingApi.fetchListings(queryFilters);
      
      // The API returns { data, total }
      setListings(res.data || []);
      setTotalItems(res.total || 0);
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, stockFilter, typeFilter, buyerFilter, categoryFilter, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const createListing = async (data) => {
    const res = await listingApi.createListing(data);
    fetchGlobalStats(true);
    fetchListings();
    return res;
  };

  const updateListing = async (id, data) => {
    const res = await listingApi.updateListing(id, data);
    fetchGlobalStats(true);
    fetchListings();
    return res;
  };

  const deleteListing = async (id) => {
    const res = await listingApi.deleteListing(id);
    fetchGlobalStats(true);
    fetchListings();
    return res;
  };

  const batchDeleteListings = async (ids) => {
    const res = await listingApi.batchDeleteListings(ids);
    fetchGlobalStats(true);
    fetchListings();
    return res;
  };

  const submitListing = async (id) => {
    return await listingApi.submitListing(id);
  };

  const publishListing = async (id) => {
    return await listingApi.publishListing(id);
  };

  const bulkUpload = async (formData) => {
    return await listingApi.bulkUpload(formData);
  };

  const checkUploadStatus = async (jobId) => {
    return await listingApi.checkUploadStatus(jobId);
  };

  const bulkExport = async () => {
    return await listingApi.bulkExport();
  };

  const checkExportStatus = async (jobId) => {
    return await listingApi.checkExportStatus(jobId);
  };

  return {
    listings,
    setListings,
    loading,
    error,
    filters: {
      searchQuery, setSearchQuery,
      stockFilter, setStockFilter,
      typeFilter, setTypeFilter,
      buyerFilter, setBuyerFilter,
      categoryFilter, setCategoryFilter
    },
    pagination: {
      currentPage, setCurrentPage,
      itemsPerPage, setItemsPerPage,
      totalItems
    },
    globalStats,
    createListing,
    updateListing,
    deleteListing,
    batchDeleteListings,
    submitListing,
    publishListing,
    bulkUpload,
    checkUploadStatus,
    bulkExport,
    checkExportStatus,
    uploadImage: listingApi.uploadImage,
    refresh: () => { fetchListings(); fetchGlobalStats(); }
  };
};
