import { useState, useEffect, useCallback } from 'react';
import { listingApi } from '../api/listingApi';

export const useListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('All stock');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [buyerFilter, setBuyerFilter] = useState('ALL');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const stock = stockFilter === 'In stock' ? 'in_stock' : stockFilter === 'Out of stock' ? 'out_of_stock' : 'all';
      const queryFilters = {
        search: searchQuery,
        stock: stock,
        type: typeFilter,
        buyer: buyerFilter,
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
  }, [searchQuery, stockFilter, typeFilter, buyerFilter, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const createListing = async (data) => {
    return await listingApi.createListing(data);
  };

  const updateListing = async (id, data) => {
    return await listingApi.updateListing(id, data);
  };

  const deleteListing = async (id) => {
    return await listingApi.deleteListing(id);
  };

  const submitListing = async (id) => {
    return await listingApi.submitListing(id);
  };

  return {
    listings,
    loading,
    error,
    filters: {
      searchQuery, setSearchQuery,
      stockFilter, setStockFilter,
      typeFilter, setTypeFilter,
      buyerFilter, setBuyerFilter
    },
    pagination: {
      currentPage, setCurrentPage,
      itemsPerPage, setItemsPerPage,
      totalItems
    },
    createListing,
    updateListing,
    deleteListing,
    submitListing,
    refresh: fetchListings
  };
};
