import apiClient, { handleApiError } from './apiClient';

/**
 * Responsibility: Payout & Settlement Ledger service.
 * Wraps all payout-related API calls for the Manufacturer Financial Dashboard.
 */

export interface PayoutSummary {
  totalGrossAmount: number;
  totalCommission: number;
  totalNetPayout: number;
  pendingPayouts: number;
  completedPayouts: number;
}

export interface SettlementRecord {
  id: number;
  settlementNumber: string;
  manufacturerId: number;
  totalInvoiceAmount: number;
  totalCollected: number;
  commission: number;
  pgCharges: number;
  returnsAmount: number;
  tds: number;
  netPayable: number;
  status: string;
  createdAt: string;
  modifiedAt: string;
}

export interface PayoutRecord {
  id: number;
  settlementId: number;
  amount: number;
  status: string;
  transactionRef: string | null;
  failureReason: string | null;
  createdAt: string;
}

const payoutService = {
  /**
   * Fetch all settlements for the logged-in manufacturer
   * and compute payout summary metrics.
   */
  async getPayoutDashboardData() {
    try {
      const profileRes = await apiClient.get('/auth/profile');
      const profile = profileRes.data.data;
      const manufacturerId = profile.id;

      const settlementsRes = await apiClient.get(`/settlements?manufacturer_id=${manufacturerId}`);
      const rawSettlements: any[] = settlementsRes.data.data || [];

      // Map settlements into typed records
      const settlements: SettlementRecord[] = rawSettlements.map((s: any) => ({
        id: s.id,
        settlementNumber: s.settlementNumber || s.settlement_number || `STL-${s.id}`,
        manufacturerId: s.manufacturer_id || s.manufacturerId,
        totalInvoiceAmount: Number(s.totalInvoiceAmount || s.total_invoice_amount || 0),
        totalCollected: Number(s.totalCollected || s.total_collected || 0),
        commission: Number(s.commission || 0),
        pgCharges: Number(s.pgCharges || s.pg_charges || 0),
        returnsAmount: Number(s.returnsAmount || s.returns_amount || 0),
        tds: Number(s.tdsAmount || s.tds || 0),
        netPayable: Number(s.netPayable || s.net_payable || 0),
        status: s.status || 'pending',
        createdAt: s.createdAt || s.created_at,
        modifiedAt: s.modifiedAt || s.modified_at || s.createdAt || s.created_at,
      }));

      // Compute summary
      const totalGrossAmount = settlements.reduce((sum, s) => sum + s.totalCollected, 0);
      const totalCommission = settlements.reduce((sum, s) => sum + s.commission + s.pgCharges + s.tds, 0);
      const totalNetPayout = settlements.reduce((sum, s) => sum + s.netPayable, 0);
      const pendingPayouts = settlements.filter(s => s.status === 'pending' || s.status === 'processing').length;
      const completedPayouts = settlements.filter(s => s.status === 'completed').length;

      const summary: PayoutSummary = {
        totalGrossAmount,
        totalCommission,
        totalNetPayout,
        pendingPayouts,
        completedPayouts,
      };

      return {
        success: true as const,
        data: {
          manufacturer: {
            id: String(manufacturerId),
            companyName: profile.company_name || 'Manufacturer',
            bankAccount: profile.bank_account_number || 'XXXX-XXXX-1234',
            bankName: profile.bank_name || 'ADAB Partner Bank',
            ifsc: profile.ifsc_code || 'ADAB0001234',
          },
          summary,
          settlements,
        },
      };
    } catch (error: any) {
      console.error('getPayoutDashboardData failed', error);
      return handleApiError(error, 'Failed to load payout dashboard data.');
    }
  },

  /**
   * Trigger a new settlement generation for the logged-in manufacturer.
   */
  async generateSettlement() {
    try {
      const profileRes = await apiClient.get('/auth/profile');
      const manufacturerId = profileRes.data.data.id;

      const res = await apiClient.post('/settlements/generate', { manufacturer_id: manufacturerId });
      return {
        success: true as const,
        message: res.data.message || 'Settlement generated successfully.',
        data: res.data.data,
      };
    } catch (error: any) {
      console.error('generateSettlement failed', error);
      return handleApiError(error, 'Failed to generate settlement.');
    }
  },

  /**
   * Create a payout record for a given settlement.
   */
  async createPayout(settlementId: number) {
    try {
      const res = await apiClient.post('/payouts', { settlement_id: settlementId });
      return {
        success: true as const,
        message: res.data.message || 'Payout created.',
        data: res.data.data,
      };
    } catch (error: any) {
      console.error('createPayout failed', error);
      return handleApiError(error, 'Failed to create payout.');
    }
  },

  /**
   * Get deduction breakdown for a specific settlement.
   */
  async getSettlementDeductions(settlementId: number) {
    try {
      const res = await apiClient.get(`/settlements/${settlementId}/deductions`);
      return {
        success: true as const,
        data: res.data.data,
      };
    } catch (error: any) {
      console.error('getSettlementDeductions failed', error);
      return handleApiError(error, 'Failed to load deductions.');
    }
  },
};

export default payoutService;
