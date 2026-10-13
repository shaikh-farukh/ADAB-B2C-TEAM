import { useState, useEffect, useCallback } from 'react';
import { pricingApi } from '../api/pricingApi';

export const usePricing = () => {
  const [schedules, setSchedules] = useState([]);
  const [previewsData, setPreviewsData] = useState({ previews: {}, activeCoupons: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPricingData = useCallback(async () => {
    try {
      setLoading(true);
      const [schedulesRes, previewsRes] = await Promise.allSettled([
        pricingApi.fetchPricing(),
        pricingApi.getAllPreviews()
      ]);
      if (schedulesRes.status === 'fulfilled') {
        setSchedules(schedulesRes.value || []);
      }
      if (previewsRes.status === 'fulfilled') {
        setPreviewsData(previewsRes.value || { previews: {}, activeCoupons: [] });
      }
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPricingData();
  }, [fetchPricingData]);

  const updateBulkPricing = async (data) => {
    await pricingApi.updateBulkPricing(data);
    await fetchPricingData();
  };

  const schedulePricing = async (listingId, data) => {
    await pricingApi.schedulePricing(listingId, data);
    await fetchPricingData();
  };

  const deleteSchedule = async (listingId) => {
    await pricingApi.deleteSchedule(listingId);
    await fetchPricingData();
  };

  const updateBasePricing = async (listingId, data) => {
    await pricingApi.updateListingPricing(listingId, data);
    await fetchPricingData();
  };

  return {
    schedules,
    previews: previewsData.previews || {},
    activeCoupons: previewsData.activeCoupons || [],
    loading,
    error,
    updateBulkPricing,
    schedulePricing,
    deleteSchedule,
    updateBasePricing,
    refresh: fetchPricingData
  };
};
