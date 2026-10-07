import { useState, useEffect, useCallback } from 'react';
import { sellerApi } from '../api/sellerApi';

export function useB2B() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      // Optional: Add getPurchaseOrders to sellerApi if not there yet
      // const response = await sellerApi.getPurchaseOrders();
      // setOrders(response.data.data);
      setOrders([
        { id: 'B2B-1001', store: 'Surat Traders', amount: 45000, status: 'Pending' },
        { id: 'B2B-1002', store: 'Gujarat Wholesale', amount: 12000, status: 'Shipped' }
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, error, refreshOrders: fetchOrders };
}
