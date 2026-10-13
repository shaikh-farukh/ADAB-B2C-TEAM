import { useState, useEffect, useCallback } from 'react';
import { marketingApi } from '../api/marketingApi';

export const useMarketing = () => {
  const [promotions, setPromotions] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMarketingData = useCallback(async () => {
    try {
      setLoading(true);
      const [promosRes, couponsRes] = await Promise.allSettled([
        marketingApi.fetchPromotions(),
        marketingApi.fetchCoupons()
      ]);
      if (promosRes.status === 'fulfilled') {
        setPromotions(promosRes.value || []);
      }
      if (couponsRes.status === 'fulfilled') {
        setCoupons(couponsRes.value || []);
      }
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketingData();
  }, [fetchMarketingData]);

  const addPromotion = async (data) => {
    await marketingApi.createPromotion(data);
    await fetchMarketingData();
  };

  const updatePromotion = async (id, data) => {
    await marketingApi.updatePromotion(id, data);
    await fetchMarketingData();
  };

  const deletePromotion = async (id) => {
    await marketingApi.deletePromotion(id);
    await fetchMarketingData();
  };

  const addCoupon = async (data) => {
    await marketingApi.createCoupon(data);
    await fetchMarketingData();
  };

  const updateCoupon = async (id, data) => {
    await marketingApi.updateCoupon(id, data);
    await fetchMarketingData();
  };

  return {
    promotions,
    coupons,
    loading,
    error,
    addPromotion,
    updatePromotion,
    deletePromotion,
    addCoupon,
    updateCoupon,
    refresh: fetchMarketingData
  };
};
