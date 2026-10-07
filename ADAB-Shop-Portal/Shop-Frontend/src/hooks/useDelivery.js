import { useState, useEffect, useCallback } from 'react';
import { sellerApi } from '../api/sellerApi';

export function useDelivery() {
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFleet = useCallback(async () => {
    try {
      setLoading(true);
      setFleet([
        { id: 'D1', name: 'Ramesh Patel', status: 'Active', deliveries: 12 },
        { id: 'D2', name: 'Suresh Kumar', status: 'Offline', deliveries: 0 }
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleet();
  }, [fetchFleet]);

  return { fleet, loading, error, refreshFleet: fetchFleet };
}
