/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import OrdersPage from './OrdersPage';
import { sellerApi } from '../api/sellerApi';

vi.mock('../api/sellerApi', () => ({
  sellerApi: {
    getOrders: vi.fn(),
    updateOrderStatus: vi.fn()
  }
}));

describe('OrdersPage Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders orders fetched from the backend API', async () => {
    sellerApi.getOrders.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'ORD-6840',
          customer: 'Pooja Sharma',
          distance: '4.8',
          delivery_mode: 'express_30m',
          items: 'Rice, Oil, Salt',
          amount: 1015,
          status: 'new'
        },
        {
          id: 'ORD-7532',
          customer: 'Anita Desai',
          distance: '2.0',
          delivery_mode: 'same_day',
          items: 'Ghee, Paneer',
          amount: 44,
          status: 'new'
        }
      ]
    });

    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Loading orders from server/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('#ORD-6840')).toBeDefined();
      expect(screen.getByText('Pooja Sharma')).toBeDefined();
      expect(screen.getByText('₹1015')).toBeDefined();
      expect(screen.getByText('#ORD-7532')).toBeDefined();
      expect(screen.getByText('Anita Desai')).toBeDefined();
    });
  });

  it('opens itemized breakdown modal when items pill button is clicked', async () => {
    sellerApi.getOrders.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'ORD-6840',
          customer: 'Pooja Sharma',
          items: [
            { name: 'banana chip', quantity: 1, unit_price: 15, total_price: 15 },
            { name: 'Game controller', quantity: 1, unit_price: 1000, total_price: 1000 }
          ],
          amount: 1015,
          status: 'new'
        }
      ]
    });

    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('2 items')).toBeDefined();
    });

    // Click on the 2 items pill button
    fireEvent.click(screen.getByText('2 items').closest('button'));

    await waitFor(() => {
      expect(screen.getByText('banana chip')).toBeDefined();
      expect(screen.getByText('Game controller')).toBeDefined();
    });
  });

  it('opens delivery map modal when map icon button is clicked', async () => {
    sellerApi.getOrders.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'ORD-6840',
          customer: 'Pooja Sharma',
          distance: '4.8',
          delivery_address: {
            full_name: 'Pooja Sharma',
            address_line: 'Ring Road',
            city: 'Surat'
          },
          items: [],
          amount: 1015,
          status: 'new'
        }
      ]
    });

    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTitle('View on Map')).toBeDefined();
    });

    fireEvent.click(screen.getByTitle('View on Map'));

    await waitFor(() => {
      expect(screen.getByText(/Customer Location • #ORD-6840/i)).toBeDefined();
      expect(screen.getByText(/4.8 km away/i)).toBeDefined();
      expect(screen.getByText(/Within Zone \(10 km\)/i)).toBeDefined();
    });
  });

  it('accepts order from within the map modal and updates status', async () => {
    sellerApi.getOrders.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'ORD-6840',
          customer: 'Pooja Sharma',
          distance: '4.8',
          delivery_address: { address_line: 'Ring Road', city: 'Surat' },
          items: [],
          amount: 1015,
          status: 'new'
        }
      ]
    });
    sellerApi.updateOrderStatus.mockResolvedValue({ success: true });

    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTitle('View on Map')).toBeDefined();
    });

    fireEvent.click(screen.getByTitle('View on Map'));

    await waitFor(() => {
      expect(screen.getByText('Accept Order')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Accept Order'));

    await waitFor(() => {
      expect(sellerApi.updateOrderStatus).toHaveBeenCalledWith('ORD-6840', 'packing');
    });
  });

  it('opens decline modal when Decline button is clicked and confirms cancellation', async () => {
    sellerApi.getOrders.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'ORD-6840',
          customer: 'Pooja Sharma',
          distance: '4.8',
          items: [],
          amount: 1015,
          status: 'new'
        }
      ]
    });
    sellerApi.updateOrderStatus.mockResolvedValue({ success: true });

    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTitle('Decline Order')).toBeDefined();
    });

    fireEvent.click(screen.getByTitle('Decline Order'));

    await waitFor(() => {
      expect(screen.getByText(/Decline Order • #ORD-6840/i)).toBeDefined();
      expect(screen.getByText('Confirm Decline')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Confirm Decline'));

    await waitFor(() => {
      expect(sellerApi.updateOrderStatus).toHaveBeenCalledWith('ORD-6840', 'cancelled');
    });
  });

  it('renders Status column and updates status badge and shows toast when Accept button is clicked', async () => {
    sellerApi.getOrders.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'ORD-6840',
          customer: 'Pooja Sharma',
          distance: '4.8',
          items: [],
          amount: 1015,
          status: 'new'
        }
      ]
    });
    sellerApi.updateOrderStatus.mockResolvedValue({ success: true });

    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );

    // Verify Status column header
    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeDefined();
      expect(screen.getByText('New')).toBeDefined();
      expect(screen.getByTitle('Accept Order')).toBeDefined();
    });

    // Click Accept button directly in table row
    fireEvent.click(screen.getByTitle('Accept Order'));

    await waitFor(() => {
      expect(sellerApi.updateOrderStatus).toHaveBeenCalledWith('ORD-6840', 'packing');
      // Status badge updates to Packing in table cell
      expect(screen.getByText('Packing', { selector: 'span' })).toBeDefined();
      // Action button updates to Send
      expect(screen.getByTitle('Dispatch / Send Package')).toBeDefined();
      // Toast message is displayed
      expect(screen.getByText(/Order #ORD-6840 status updated to Packing/i)).toBeDefined();
    });
  });
});
