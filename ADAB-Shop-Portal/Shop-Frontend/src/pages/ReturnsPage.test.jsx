/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import ReturnsPage from './ReturnsPage';
import { sellerApi } from '../api/sellerApi';

vi.mock('../api/sellerApi', () => ({
  sellerApi: {
    getOrders: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getReturns: vi.fn(),
    updateReturnStatus: vi.fn()
  }
}));

describe('ReturnsPage Component', () => {
  const sampleReturn = {
    id: '#RET-E2E1',
    returnUuid: 'ret-uuid-1001',
    orderId: '#ORD-E2E-101',
    customer: 'Aarav Patel',
    customerPhone: '9898989898',
    deliveryAddress: {
      full_name: 'Aarav Patel',
      address_line: 'Vesu Main Road',
      city: 'Surat',
      pincode: '395007'
    },
    items: [
      {
        return_item_id: 'ri-1',
        product_name: 'Premium Basmati Rice 5kg',
        quantity: 2,
        unit_price: 500,
        total_price: 1000,
        reason: 'Ordered wrong pack size by mistake',
        item_condition: 'UNOPENED',
        current_listing_stock: 18
      },
      {
        return_item_id: 'ri-2',
        product_name: 'Cold Pressed Mustard Oil 1L',
        quantity: 1,
        unit_price: 220,
        total_price: 220,
        reason: 'Ordered wrong pack size by mistake',
        item_condition: 'UNOPENED',
        current_listing_stock: 9
      }
    ],
    quantity: 3,
    reason: 'Ordered wrong pack size by mistake',
    amount: 1220,
    paymentMethod: 'UPI',
    paymentStatus: 'PAID',
    paymentRecordStatus: 'COMPLETED',
    status: 'pending',
    rawStatus: 'REQUESTED',
    requested_at: '2026-10-11T10:00:00.000Z'
  };

  beforeEach(() => {
    vi.resetAllMocks();
    sellerApi.getOrders.mockResolvedValue({ success: true, data: [] });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders return rows and opens multi-product ReturnDetailModal when clicking a table row', async () => {
    sellerApi.getReturns.mockResolvedValue({
      success: true,
      data: [sampleReturn]
    });

    render(<ReturnsPage />);

    await waitFor(() => {
      expect(screen.getByText('#RET-E2E1')).toBeDefined();
      expect(screen.getByText('#ORD-E2E-101')).toBeDefined();
      expect(screen.getByText('Aarav Patel')).toBeDefined();
    });

    // Click the row to open ReturnDetailModal
    fireEvent.click(screen.getByText('#RET-E2E1').closest('tr'));

    await waitFor(() => {
      expect(screen.getByText(/Return Detail • #RET-E2E1/i)).toBeDefined();
      expect(screen.getAllByText('Premium Basmati Rice 5kg').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Cold Pressed Mustard Oil 1L').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Vesu Main Road, Surat/i)).toBeDefined();
    });
  });

  it('executes the 2-step return flow: Step 1 Approve (Refunds payment) -> Step 2 Add Back (Restocks listing)', async () => {
    sellerApi.getReturns.mockResolvedValue({
      success: true,
      data: [sampleReturn]
    });

    sellerApi.updateReturnStatus
      .mockResolvedValueOnce({
        success: true,
        data: {
          status: 'approved',
          rawStatus: 'APPROVED',
          refundAmount: 1220,
          paymentStatus: 'REFUNDED',
          paymentRecordStatus: 'REFUNDED'
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          status: 'restocked',
          rawStatus: 'COMPLETED',
          itemCondition: 'RESTOCKED',
          restockedQty: 3,
          currentListingStock: 21
        }
      });

    render(<ReturnsPage />);

    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeDefined();
    });

    // Step 1: Click Approve
    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(sellerApi.updateReturnStatus).toHaveBeenCalledWith('ret-uuid-1001', 'approved', null);
      expect(screen.getByText('AWAITING ITEM')).toBeDefined();
      expect(screen.getByText(/Add Back \(\+3\)/i)).toBeDefined();
      expect(screen.getByText('Discard')).toBeDefined();
    });

    // Step 2: Click Add Back (+3)
    fireEvent.click(screen.getByText(/Add Back \(\+3\)/i).closest('button'));

    await waitFor(() => {
      expect(sellerApi.updateReturnStatus).toHaveBeenCalledWith('ret-uuid-1001', 'restocked', null);
      expect(screen.getAllByText('RESTOCKED').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Added to Catalog \(\+3\)/i)).toBeDefined();
    });
  });

  it('allows seller to regulate refund amount with partial deduction in the ReturnDetailModal', async () => {
    sellerApi.getReturns.mockResolvedValue({
      success: true,
      data: [sampleReturn]
    });

    sellerApi.updateReturnStatus.mockResolvedValueOnce({
      success: true,
      data: {
        status: 'approved',
        rawStatus: 'APPROVED',
        refundAmount: 976,
        refundPercentage: 80,
        paymentStatus: 'REFUNDED',
        paymentRecordStatus: 'REFUNDED'
      }
    });

    render(<ReturnsPage />);

    await waitFor(() => {
      expect(screen.getByText('#RET-E2E1')).toBeDefined();
    });

    // Click row to open modal
    fireEvent.click(screen.getByText('#RET-E2E1').closest('tr'));

    await waitFor(() => {
      expect(screen.getByText('Regulate Customer Refund Amount')).toBeDefined();
      expect(screen.getByText('80%')).toBeDefined();
    });

    // Click the 80% button to apply 20% restocking deduction
    fireEvent.click(screen.getByText('80%'));

    await waitFor(() => {
      expect(screen.getByText(/Deduction \/ Restocking: ₹244.00/i)).toBeDefined();
      expect(screen.getByText('Approved Refund: ₹976.00')).toBeDefined();
    });

    // Click Approve Refund button inside the modal
    const approveBtn = screen.getByRole('button', { name: /Approve Refund \(₹976\)/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(sellerApi.updateReturnStatus).toHaveBeenCalledWith('ret-uuid-1001', 'approved', null, 976);
    });
  });

  it('renders Original Order Summary with delivery fee (non-refundable) and Returned Item Value in the ReturnDetailModal', async () => {
    const multiItemOrderReturn = {
      ...sampleReturn,
      orderSummary: {
        orderNumber: '#ORD-MULTI-99',
        grandTotal: 1550,
        itemsSubtotal: 1500,
        deliveryFee: 50,
        paymentMethod: 'CARD',
        paymentStatus: 'PAID'
      },
      deliveryFee: 50
    };

    sellerApi.getReturns.mockResolvedValueOnce({
      success: true,
      data: [multiItemOrderReturn]
    });

    render(<ReturnsPage />);

    await waitFor(() => {
      expect(screen.getByText('#RET-E2E1')).toBeDefined();
    });

    fireEvent.click(screen.getByText('#RET-E2E1').closest('tr'));

    await waitFor(() => {
      expect(screen.getByText('Original Order Summary')).toBeDefined();
      expect(screen.getAllByText('#ORD-MULTI-99').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Non-refundable')).toBeDefined();
      expect(screen.getByText('Returned Item Value')).toBeDefined();
    });
  });
});
