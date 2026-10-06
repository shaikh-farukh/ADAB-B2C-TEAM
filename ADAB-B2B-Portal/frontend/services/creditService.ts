import apiClient from './apiClient';

export interface CreditInvoice {
  id: number;
  order_number: string;
  manufacturer_name: string;
  total_amount: string;
  net_30_due_date: string;
}

export interface CreditBalanceResponse {
  data: {
    totalLimit: number;
    usedBalance: number;
    availableCredit: number;
    hasOverdueInvoices: boolean;
    invoices: CreditInvoice[];
  };
}

const creditService = {
  setCredit: async (payload: { debtor_id: number; debtor_type: 'distributor' | 'shop'; credit_limit: number; credit_days: number }) => {
    try {
      const response = await apiClient.post('/credits', payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCredits: async () => {
    try {
      const response = await apiClient.get('/credits');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCreditBalance: async (): Promise<CreditBalanceResponse> => {
    try {
      const response = await apiClient.get('/credits/balance');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default creditService;

