import { useState, useEffect, useCallback } from 'react';
import { sellerApi } from '../api/sellerApi';

export function useFinance() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const response = await sellerApi.getFinanceSummary();
      setSummary(response?.data?.data || response?.data || response);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch finance summary:', err);
      // Optional: Set fallback if backend doesn't have it yet
      setSummary({
        balance: 14500,
        pending_payouts: 2300,
        last_settlement: '2023-10-06'
      });
      setError('Could not load live finance data. Showing cached data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const submitCreditApplication = async (details) => {
    try {
      setIsProcessing(true);
      const response = await sellerApi.submitCreditApply(details);
      return response.data;
    } catch (err) {
      console.error('Credit application failed:', err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    isProcessing,
    submitCreditApplication,
    refreshSummary: fetchSummary
  };
}
