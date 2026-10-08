import { useState, useEffect, useCallback } from 'react';
import { sellerApi } from '../api/sellerApi';

export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await sellerApi.getOrders();
      const raw = res?.data !== undefined ? res.data : res;
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      setOrders(list);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      const reason = err.response?.data?.message || err.response?.data?.error || err.message || 'Unknown network error';
      setError(`Could not load orders: ${reason}`);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await sellerApi.updateOrderStatus(orderId, newStatus);
      // Optimistically update local state
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ));
      return true;
    } catch (err) {
      console.error('Failed to update order status:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    refreshOrders: fetchOrders,
    updateStatus
  };
}
