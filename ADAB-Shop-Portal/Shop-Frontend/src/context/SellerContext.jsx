import React, { createContext, useContext, useState, useEffect } from 'react';
import sellerService from '../services/sellerService';

const SellerContext = createContext();

export function SellerProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [store, setStore] = useState(null);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSellerData = async () => {
    try {
      setLoading(true);
      const [profileRes, storeRes, metricsRes] = await Promise.all([
        sellerService.getProfile().catch(() => ({ data: null })),
        sellerService.getStore().catch(() => ({ data: null })),
        sellerService.getDashboardMetrics().catch(() => ({ data: null }))
      ]);
      setProfile(profileRes?.data || null);
      setStore(storeRes?.data || null);
      setDashboardMetrics(metricsRes?.data || null);
    } catch (err) {
      console.error('Failed to load seller context:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerData();
  }, []);

  return (
    <SellerContext.Provider value={{ profile, store, dashboardMetrics, loading, refreshSellerData: fetchSellerData }}>
      {children}
    </SellerContext.Provider>
  );
}

export function useSeller() {
  const context = useContext(SellerContext);
  if (!context) {
    return { profile: null, store: null, loading: false, refreshSellerData: () => {} };
  }
  return context;
}
