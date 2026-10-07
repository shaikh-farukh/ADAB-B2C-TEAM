import { useState, useEffect, useCallback } from 'react';
import { pricingApi } from '../api/pricingApi';

export const usePricing = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pricingApi.fetchPricing();
      setSchedules(res || []);
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const updateBulkPricing = async (data) => {
    await pricingApi.updateBulkPricing(data);
    await fetchSchedules();
  };

  const schedulePricing = async (listingId, data) => {
    await pricingApi.schedulePricing(listingId, data);
    await fetchSchedules();
  };

  const deleteSchedule = async (listingId) => {
    await pricingApi.deleteSchedule(listingId);
    await fetchSchedules();
  };

  const updateBasePricing = async (listingId, data) => {
    await pricingApi.updateListingPricing(listingId, data);
    await fetchSchedules();
  };

  return {
    schedules,
    loading,
    error,
    updateBulkPricing,
    schedulePricing,
    deleteSchedule,
    updateBasePricing,
    refresh: fetchSchedules
  };
};
