import apiClient, { handleApiError } from './apiClient';
export interface PaymentInvoice {
  id: string;
  orderId: string;
  orderNumber: string;
  distributorId: string;
  distributorName: string;
  manufacturerId: string;
  manufacturerName: string;
  invoiceNumber: string;
  totalAmount: number;
  gstAmount: number;
  dueDate: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  distributorId: string;
  amount: number;
  paymentMode: 'UPI' | 'NEFT' | 'Card' | 'Bank Transfer';
  referenceId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'success';
  createdAt: string;
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  allocatedAmount: number;
}

export interface LedgerEntry {
  id: string;
  distributorId: string;
  type: 'invoice' | 'payment' | 'credit_note' | 'wallet_adjustment';
  referenceId: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  createdAt: string;
}

export interface CreditNote {
  id: string;
  invoiceId: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface SettlementBatch {
  id: string;
  manufacturerId: string;
  manufacturerName: string;
  invoiceIds: string[];
  commissionRate: number;
  pgChargeRate: number;
  tdsAmount: number;
  status: 'pending' | 'processing' | 'completed';
  createdAt: string;
}

export interface PayoutRecord {
  id: string;
  settlementId: string;
  manufacturerId: string;
  amount: number;
  status: 'processing' | 'completed';
  transactionRef: string;
  createdAt: string;
}

export interface PaymentSeedData {
  distributor: {
    id: string;
    name: string;
    creditLimit: number;
    usedCredit: number;
    walletBalance: number;
  };
  manufacturers: Array<{
    id: string;
    name: string;
    bankAccount: string;
    gstNumber: string;
  }>;
  invoices: PaymentInvoice[];
  payments: PaymentRecord[];
  allocations: PaymentAllocation[];
  ledgerEntries: LedgerEntry[];
  creditNotes: CreditNote[];
  settlements: SettlementBatch[];
  payouts: PayoutRecord[];
}

export type PaymentMode = PaymentRecord['paymentMode'];

interface RecordPaymentPayload {
  amount: number;
  paymentMode: PaymentMode;
  referenceId: string;
  autoAllocate?: boolean;
  invoiceIds?: string[];
}

const paymentService = {
  async getDistributorPaymentData() {
    try {
      // 1. Get logged in user profile to find distributor ID
      const profileRes = await apiClient.get('/auth/profile');
      const profile = profileRes.data.data;
      const distributorId = profile.id;

      // 2. Fetch invoices, payments, ledger entries and credits
      const [invoicesRes, paymentsRes, ledgerRes, creditsRes, agingRes] = await Promise.all([
        apiClient.get(`/invoices?distributor_id=${distributorId}`),
        apiClient.get(`/payments?distributor_id=${distributorId}`),
        apiClient.get(`/ledger?distributor_id=${distributorId}`),
        apiClient.get('/credits'),
        apiClient.get(`/invoices/aging?distributor_id=${distributorId}`),
      ]);

      const rawInvoices = invoicesRes.data.data || [];
      const rawPayments = paymentsRes.data.data || [];
      const rawLedger = ledgerRes.data.data || [];
      const creditsData = creditsRes.data.data || { received_credits: [] };
      const agingData = agingRes.data.data || {};

      // 3. Map Invoices
      const invoices = rawInvoices.map((inv: any) => {
        const totalAmount = Number(inv.total_amount);
        const paidAmount = Number(inv.paid_amount);
        const creditedAmount = Number(inv.credited_amount);
        const balanceAmount = Math.max(totalAmount - paidAmount - creditedAmount, 0);
        let status: 'issued' | 'partial' | 'paid' = 'issued';
        if (balanceAmount === 0) status = 'paid';
        else if (paidAmount > 0 || creditedAmount > 0) status = 'partial';

        return {
          id: String(inv.id),
          invoiceNumber: inv.invoice_number,
          orderNumber: inv.order_number || `ORD-${inv.order_id}`,
          totalAmount,
          paidAmount,
          creditedAmount,
          balanceAmount,
          netDue: Math.max(totalAmount - creditedAmount, 0),
          dueDate: inv.due_date || new Date().toISOString(),
          status,
        };
      });

      // 4. Map Payments
      const payments = rawPayments.map((p: any) => ({
        id: String(p.id),
        distributorId: String(p.distributor_id),
        amount: Number(p.amount),
        paymentMode: p.payment_mode,
        referenceId: p.reference_id,
        status: p.status,
        createdAt: p.received_at || p.created_at,
      }));

      // 5. Map Ledger Entries
      const ledgerEntries = rawLedger.map((l: any) => ({
        id: String(l.id),
        distributorId: String(l.distributor_id),
        type: l.type,
        referenceId: l.reference_id || '',
        description: l.description || '',
        debit: Number(l.debit),
        credit: Number(l.credit),
        balance: Number(l.balance),
        createdAt: l.created_at,
      }));

      // Calculate summaries
      const totalOutstanding = invoices.reduce((sum: number, inv: any) => sum + inv.balanceAmount, 0);
      const totalInvoiced = invoices.reduce((sum: number, inv: any) => sum + inv.totalAmount, 0);
      const totalPaid = invoices.reduce((sum: number, inv: any) => sum + inv.paidAmount, 0);
      const totalCredits = invoices.reduce((sum: number, inv: any) => sum + inv.creditedAmount, 0);
      const lastPayment = payments[0]; // Already sorted descending in API

      const receivedCredits = creditsData.received_credits || [];
      const creditLimit = receivedCredits.reduce((sum: number, c: any) => sum + Number(c.credit_limit), 0) || 200000;
      const usedCredit = receivedCredits.reduce((sum: number, c: any) => sum + Number(c.outstanding_amount), 0) || totalOutstanding;

      const walletBalance = ledgerEntries
        .filter((e: any) => e.type === 'overpayment_wallet' || e.type === 'wallet_adjustment')
        .reduce((sum: number, e: any) => sum + (e.credit - e.debit), 0);

      return {
        success: true as const,
        data: {
          distributor: {
            id: String(distributorId),
            companyName: profile.company_name,
            creditLimit,
            usedCredit,
            walletBalance: Math.max(walletBalance, 0),
            availableCredit: Math.max(creditLimit - usedCredit, 0),
          },
          summary: {
            totalOutstanding,
            totalInvoiced,
            totalPaid,
            totalCredits,
            overdueCount: invoices.filter((inv: any) => inv.balanceAmount > 0 && new Date(inv.dueDate) < new Date()).length,
            openInvoiceCount: invoices.filter((inv: any) => inv.balanceAmount > 0).length,
            lastPaymentAt: lastPayment?.createdAt || null,
          },
          invoices,
          payments,
          ledgerEntries,
          agingReport: agingData,
          scenarios: [
            { title: 'Partial Payment', detail: 'Partial payment reduces outstanding balance and updates ledger.' },
            { title: 'Overpayment', detail: 'Overpayment gets parked in the wallet for future invoice matching.' },
            { title: 'Returns Credit', detail: 'Credit notes are applied to reduce the invoice net due amount.' },
            { title: 'FIFO Allocation', detail: 'Unallocated payments are auto-distributed using FIFO logic.' },
          ],
        },
      };
    } catch (error: any) {
      console.error('getDistributorPaymentData failed', error);
      return { success: false, message: 'Failed to load distributor payment dashboard data' };
    }
  },

  async createLedgerCheckout(amount: number, invoiceId?: number | string) {
    try {
      const res = await apiClient.post('/payments/razorpay/create-ledger-order', { amount, invoice_id: invoiceId });
      return { success: true as const, data: res.data.data };
    } catch (error: any) {
      console.error('createLedgerCheckout failed', error);
      return handleApiError(error, 'Failed to initiate Razorpay checkout');
    }
  },

  async verifyRazorpayPayment(payload: any) {
    try {
      const response = await apiClient.post('/payments/razorpay/verify', payload);
      return { success: true as const, message: response.data.message || 'Payment verified', data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Payment verification failed');
    }
  },

  async recordPayment(payload: RecordPaymentPayload) {
    try {
      const profileRes = await apiClient.get('/auth/profile');
      const profile = profileRes.data.data;
      const distributorId = profile.id;

      const body: any = {
        distributor_id: distributorId,
        amount: Number(payload.amount),
        mode: payload.paymentMode,
        reference_id: payload.referenceId.trim(),
      };

      if (payload.autoAllocate === false && payload.invoiceIds && payload.invoiceIds.length > 0) {
        body.invoice_id = Number(payload.invoiceIds[0]);
      }

      const res = await apiClient.post('/payments', body);
      return {
        success: true as const,
        message: res.data.message || 'Payment recorded successfully.',
        data: res.data.data,
      };
    } catch (error: any) {
      console.error('recordPayment failed', error);
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async getManufacturerSettlementData(params?: any) {
    try {
      const profileRes = await apiClient.get('/auth/profile');
      const profile = profileRes.data.data;
      const manufacturerId = profile.id;

      const queryParams = { manufacturer_id: manufacturerId, ...params };

      const [settlementsRes, creditRes] = await Promise.all([
        apiClient.get('/settlements', { params: queryParams }),
        apiClient.get('/credits'),
      ]);

      const settlements = settlementsRes.data.data || [];

      // Calculate totals across settlements
      const totalCollected = settlements.reduce((sum: number, s: any) => sum + (s.totalCollected || 0), 0);
      const pendingNetPayable = settlements
        .filter((s: any) => s.status !== 'completed')
        .reduce((sum: number, s: any) => sum + (s.netPayable || 0), 0);
      const totalReturns = settlements.reduce((sum: number, s: any) => sum + (s.returnsAmount || 0), 0);
      const activePayouts = settlements.filter((s: any) => s.payout && s.payout.status === 'processing').length;

      return {
        success: true as const,
        data: {
          manufacturer: {
            id: String(manufacturerId),
            companyName: profile.company_name,
            bankAccount: 'ADAB Bank - XXXX1234',
          },
          summary: {
            totalCollected,
            pendingNetPayable,
            totalReturns,
            activePayouts,
          },
          settlements,
        },
      };
    } catch (error: any) {
      console.error('getManufacturerSettlementData failed', error);
      return { success: false, message: 'Failed to load manufacturer settlements.' };
    }
  },

  async generateSettlement() {
    try {
      const profileRes = await apiClient.get('/auth/profile');
      const profile = profileRes.data.data;
      const manufacturerId = profile.id;

      const res = await apiClient.post('/settlements/generate', { manufacturer_id: manufacturerId });
      return {
        success: true as const,
        message: res.data.message || 'Settlement generated successfully.',
        data: res.data.data,
      };
    } catch (error: any) {
      console.error('generateSettlement failed', error);
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async updateSettlementStatus(settlementId: string | number, status: string) {
    try {
      const actualId = String(settlementId).replace('stl-', ''); // Remove stl- prefix if present
      const res = await apiClient.patch(`/settlements/${actualId}/status`, { status });
      return {
        success: true as const,
        message: res.data.message || `Settlement marked as ${status}.`,
        data: res.data.data,
      };
    } catch (error: any) {
      console.error('updateSettlementStatus failed', error);
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  /**
   * Record a payment from the manufacturer's order detail page.
   * Accepts distributor_id directly instead of fetching from profile.
   */
  async recordPaymentForOrder(payload: {
    distributor_id: number | string;
    amount: number;
    paymentMode: PaymentMode;
    referenceId: string;
    invoiceId?: number | string;
  }) {
    try {
      const body: any = {
        distributor_id: Number(payload.distributor_id),
        amount: Number(payload.amount),
        mode: payload.paymentMode,
        reference_id: (payload.referenceId || '').trim(),
      };

      if (payload.invoiceId) {
        body.invoice_id = Number(payload.invoiceId);
      }

      const res = await apiClient.post('/payments', body);
      return {
        success: true as const,
        message: res.data.message || 'Payment recorded successfully.',
        data: res.data.data,
      };
    } catch (error: any) {
      console.error('recordPaymentForOrder failed', error);
      return handleApiError(error, 'Failed to record payment.');
    }
  },

  async applyCreditNote(payload: { invoice_id: number | string; amount: number; reason: string }) {
    try {
      const res = await apiClient.post('/credit-notes', payload);
      return { success: true as const, message: res.data.message || 'Credit note applied successfully', data: res.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async getInvoices(params?: any) {
    try {
      const res = await apiClient.get('/invoices', { params });
      return { success: true as const, data: res.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async getSettlements(params?: any) {
    try {
      const res = await apiClient.get('/settlements', { params });
      return { success: true as const, data: res.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async getAgingReport(params?: any) {
    try {
      const res = await apiClient.get('/invoices/aging', { params });
      return { success: true as const, data: res.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async getLedgerEntries(params?: any) {
    try {
      const res = await apiClient.get('/ledger', { params });
      return { success: true as const, data: res.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async getReconciliationDashboard() {
    try {
      // Aggregate summary for manufacturer finance
      const profileRes = await apiClient.get('/auth/profile');
      const manufacturerId = profileRes.data.data.id;

      const [invoicesRes, settlementsRes, creditsRes] = await Promise.all([
        apiClient.get(`/invoices?manufacturer_id=${manufacturerId}`),
        apiClient.get(`/settlements?manufacturer_id=${manufacturerId}`),
        apiClient.get('/credits') // Assume manufacturer gets their given credits
      ]);

      const invoices = invoicesRes.data?.data || [];
      const settlements = settlementsRes.data?.data || [];

      return {
        success: true as const,
        data: {
          totalInvoices: invoices.length,
          paidInvoices: invoices.filter((i:any) => i.status === 'paid').length,
          partialInvoices: invoices.filter((i:any) => i.status === 'partially_paid').length,
          outstandingAmount: invoices.reduce((sum:number, i:any) => sum + Math.max(parseFloat(i.total_amount) - parseFloat(i.paid_amount || 0), 0), 0),
          creditNotes: 0, // Should be fetched from an endpoint or inferred
          settlementsPending: settlements.filter((s:any) => s.status === 'pending').length
        }
      };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  }
};

export default paymentService;
