import { useState, useEffect, useCallback } from 'react';
import { sellerApi } from '../api/sellerApi';

export function useB2B() {
  const [orders, setOrders] = useState(() => {
    try {
      const cached = localStorage.getItem('seller_b2b_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await sellerApi.getB2BOrders();
      const raw = response?.data !== undefined ? response.data : response;
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      setOrders(list);
      try {
        localStorage.setItem('seller_b2b_cache', JSON.stringify(list));
      } catch (e) {}
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('adab-b2b-updated', { detail: { count: list.length, orders: list } }));
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch B2B orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStatus = useCallback(async (orderId, status, metadata = {}) => {
    try {
      const res = await sellerApi.updateB2BOrderStatus(orderId, status, metadata);
      // Optimistically or after fetch update list
      await fetchOrders();
      return res?.data?.data || res?.data || res;
    } catch (err) {
      console.error('Failed to update B2B order status:', err);
      throw err;
    }
  }, [fetchOrders]);

  return { orders, loading, error, refreshOrders: fetchOrders, updateStatus };
}
