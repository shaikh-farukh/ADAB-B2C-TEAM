/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import FinancePage from './FinancePage';
import { sellerApi } from '../api/sellerApi';

vi.mock('../api/sellerApi', () => ({
  sellerApi: {
    getFinanceSummary: vi.fn(),
    getFinanceTransactions: vi.fn(),
    getFinanceSettlements: vi.fn(),
    withdrawToBank: vi.fn(),
    getKhata: vi.fn(),
    payKhataOrder: vi.fn()
  }
}));

describe('FinancePage Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    sellerApi.getFinanceSummary.mockResolvedValue({
      success: true,
      data: {
        balance: 950,
        unsettled_orders_count: 1,
        total_orders: 1,
        gross_sales: 1000,
        total_commission: 50,
        net_earnings: 950,
        total_refunded: 0,
        refunded_count: 0,
        settled_amount: 2400,
        pending_settlement_amount: 0,
        settlements_count: 1,
        sanctioned_limit: 50000,
        utilized_credit: 10000,
        available_credit: 40000,
        receivables: 0,
        payables: 3200
      }
    });

    sellerApi.getFinanceTransactions.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'so-101',
          order_id: 'ord-101',
          order_number: '#ORD-101',
          customer: 'Aarav Patel',
          created_at: '2026-10-11T10:00:00.000Z',
          order_status: 'DELIVERED',
          payment_method: 'UPI',
          payment_status: 'PAID',
          gross_amount: 1000,
          commission_fee: 50,
          commission_rate_pct: 5,
          refund_deduction: 0,
          net_payout: 950,
          settlement_status: 'UNSETTLED'
        }
      ]
    });

    sellerApi.getFinanceSettlements.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'stl-1',
          settlement_cycle: 'STL-20261011-0001',
          total_sales: 2500,
          total_commission: 100,
          total_tax_deducted: 0,
          net_payable: 2400,
          status: 'PAID',
          settled_at: '2026-10-11T09:00:00.000Z',
          items_count: 1,
          items: [
            {
              id: 'si-1',
              seller_order_id: 'so-100',
              order_number: 'ORD-100',
              gross_subtotal: 2500,
              commission_fee: 100,
              amount: 2400,
              order_status: 'DELIVERED'
            }
          ]
        }
      ]
    });

    sellerApi.getKhata.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'po-khata-1',
          po_number: 'PO-901',
          store: 'Surat Agro Wholesale',
          they_owe: 0,
          you_owe: 3200,
          total_amount: 3200,
          payment_terms: 'CREDIT_14D',
          due_date: '2026-10-25',
          status: 'DELIVERED'
        }
      ]
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders DB-backed finance summary, order earnings ledger, and settlement batches', async () => {
    render(
      <BrowserRouter>
        <FinancePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('#ORD-101')).toBeDefined();
      expect(screen.getByText('Aarav Patel')).toBeDefined();
    });

    // Switch to Settlements tab
    fireEvent.click(screen.getByText(/Settlements \(1\)/i).closest('button'));

    await waitFor(() => {
      expect(screen.getByText('STL-20261011-0001')).toBeDefined();
      expect(screen.getByText('View Breakdown')).toBeDefined();
    });

    // Click View Breakdown to open SettlementDetailModal
    fireEvent.click(screen.getByText('View Breakdown'));

    await waitFor(() => {
      expect(screen.getByText(/Settlement Breakdown • STL-20261011-0001/i)).toBeDefined();
    });
  });

  it('processes bank withdrawal and Khata payment via API with toast notifications', async () => {
    sellerApi.withdrawToBank.mockResolvedValue({
      success: true,
      data: {
        id: 'stl-2',
        settlement_cycle: 'STL-20261012-9999',
        net_payable: 950,
        items_count: 1,
        status: 'PAID'
      }
    });
    sellerApi.payKhataOrder.mockResolvedValue({
      success: true,
      data: { id: 'po-khata-1', payment_terms: 'ADVANCE_UPI' }
    });

    render(
      <BrowserRouter>
        <FinancePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Withdraw to Bank/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Withdraw to Bank/i).closest('button'));

    await waitFor(() => {
      expect(sellerApi.withdrawToBank).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/STL-20261012-9999/i)).toBeDefined();
    });

    // Switch to B2B Credit Khata tab
    fireEvent.click(screen.getByText(/B2B Credit Khata \(1\)/i).closest('button'));

    await waitFor(() => {
      expect(screen.getByText('Surat Agro Wholesale')).toBeDefined();
      expect(screen.getByText('Mark Paid')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Mark Paid'));

    await waitFor(() => {
      expect(sellerApi.payKhataOrder).toHaveBeenCalledWith('po-khata-1');
    });
  });
});
