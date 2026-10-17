import { useState, useEffect, useCallback, useRef } from 'react';
import { sellerApi } from '../api/sellerApi';

export function useOrders() {
  const [orders, setOrders] = useState(() => {
    try {
      const cached = localStorage.getItem('seller_orders_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingIds, setUpdatingIds] = useState({});
  const inFlightRef = useRef(new Set());

  const persistOrdersCache = (list) => {
    try {
      if (Array.isArray(list)) {
        localStorage.setItem('seller_orders_cache', JSON.stringify(list));
      }
    } catch (e) {}
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await sellerApi.getOrders();
      const raw = res?.data !== undefined ? res.data : res;
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      setOrders(list);
      persistOrdersCache(list);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('adab-orders-updated', { detail: { count: list.length, orders: list } }));
      }
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
    const cleanId = orderId ? orderId.toString().replace(/^#/, '') : orderId;
    if (!cleanId || inFlightRef.current.has(cleanId)) {
      return false;
    }

    inFlightRef.current.add(cleanId);
    setUpdatingIds(prev => ({ ...prev, [cleanId]: true, [orderId]: true }));

    try {
      await sellerApi.updateOrderStatus(cleanId, newStatus);
      // Update state only after DB has confirmed the change
      setOrders(prev => {
        const next = prev.map(o => {
          const oClean = o.id ? o.id.toString().replace(/^#/, '') : o.id;
          const matches = oClean === cleanId || o.id === orderId || o.real_id === orderId || o.real_id === cleanId;
          return matches ? { ...o, status: newStatus } : o;
        });
        persistOrdersCache(next);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('adab-orders-updated', { detail: { count: next.length, orders: next } }));
        }
        return next;
      });
      return true;
    } catch (err) {
      console.error('Failed to update order status:', err);
      return false;
    } finally {
      inFlightRef.current.delete(cleanId);
      setUpdatingIds(prev => {
        const next = { ...prev };
        delete next[cleanId];
        delete next[orderId];
        return next;
      });
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    updatingIds,
    refreshOrders: fetchOrders,
    updateStatus
  };
}

