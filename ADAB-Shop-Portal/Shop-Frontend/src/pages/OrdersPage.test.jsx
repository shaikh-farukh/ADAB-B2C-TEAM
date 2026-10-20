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

    // Click on the 2 items pill
    fireEvent.click(screen.getByText('2 items'));

    await waitFor(() => {
      expect(screen.getByText('banana chip')).toBeDefined();
      expect(screen.getByText('Game controller')).toBeDefined();
    });
  });

  it('opens order popup with delivery map on the left side when order is clicked', async () => {
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
      expect(screen.getByText('Pooja Sharma')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Pooja Sharma'));

    await waitFor(() => {
      expect(screen.getByText(/Customer Location • #ORD-6840/i)).toBeDefined();
      expect(screen.getByText(/4.8 km away/i)).toBeDefined();
      expect(screen.getByText(/Ring Road, Surat/i)).toBeDefined();
    });
  });

  it('accepts order from within the order popup and updates status', async () => {
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
      expect(screen.getByText('Pooja Sharma')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Pooja Sharma'));

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

  it('renders Status column and progresses through Accept -> Pack -> Send -> Delivered with toast feedback', async () => {
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
      expect(screen.getAllByText('New').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTitle('Accept Order')).toBeDefined();
    });

    // Step 1: Click Accept button directly in table row
    fireEvent.click(screen.getByTitle('Accept Order'));

    await waitFor(() => {
      expect(sellerApi.updateOrderStatus).toHaveBeenCalledWith('ORD-6840', 'packing');
      expect(screen.getByText('Packing', { selector: 'span' })).toBeDefined();
      expect(screen.getByTitle('Mark Order Packed')).toBeDefined();
      expect(screen.queryByTitle('Dispatch / Send Package')).toBeNull();
      expect(screen.getByTitle('Decline Order')).toBeDefined();
      expect(screen.getByText(/Order #ORD-6840 accepted \(ORDER_ACCEPTED\)/i)).toBeDefined();
    });

    // Step 2: Click Pack button
    fireEvent.click(screen.getByTitle('Mark Order Packed'));

    await waitFor(() => {
      expect(sellerApi.updateOrderStatus).toHaveBeenCalledWith('ORD-6840', 'packed');
      expect(screen.getByText('Packed', { selector: 'span' })).toBeDefined();
      expect(screen.getByTitle('Dispatch / Send Package')).toBeDefined();
      expect(screen.getByTitle('Decline Order')).toBeDefined();
    });

    // Step 3: Click Send button
    fireEvent.click(screen.getByTitle('Dispatch / Send Package'));

    await waitFor(() => {
      expect(sellerApi.updateOrderStatus).toHaveBeenCalledWith('ORD-6840', 'dispatched');
      expect(screen.getByText('Dispatched', { selector: 'span' })).toBeDefined();
      expect(screen.getByTitle('Mark Delivered')).toBeDefined();
    });

    // Step 4: Click Delivered button
    fireEvent.click(screen.getByTitle('Mark Delivered'));

    await waitFor(() => {
      expect(sellerApi.updateOrderStatus).toHaveBeenCalledWith('ORD-6840', 'delivered');
      expect(screen.getAllByText('Delivered').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('opens order modal when the entire order row is clicked, displaying GST and invoice information', async () => {
    sellerApi.getOrders.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'ORD-9999',
          customer: 'Vikram Patel',
          customer_phone: '9876543210',
          distance: '3.2',
          delivery_mode: 'normal',
          items: [
            { name: 'Organic Honey', quantity: 2, unit_price: 250, total_price: 500 }
          ],
          amount: 500,
          tax_amount: 23.81,
          invoice_number: 'INV-ORD-9999-5432',
          invoice_pdf_url: '/api/v1/orders/123/invoice/pdf',
          invoice_date: '2026-10-18T10:00:00Z',
          status: 'new'
        }
      ]
    });

    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );

    // Verify invoice number and tax included badge appear on the table row
    await waitFor(() => {
      expect(screen.getByText('INV-ORD-9999-5432')).toBeDefined();
      expect(screen.getByText(/Incl. ₹23.81 GST/i)).toBeDefined();
    });

    // Click on the order table row (not specifically the items pill)
    const customerCell = screen.getByText('Vikram Patel');
    fireEvent.click(customerCell);

    // Verify modal opens with full GST tax breakdown & invoice badge
    await waitFor(() => {
      expect(screen.getByText(/Order Detail/i)).toBeDefined();
      expect(screen.getAllByText(/#ORD-9999/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Taxable Amount (Excl. Tax)')).toBeDefined();
      expect(screen.getByText('CGST (2.5%)')).toBeDefined();
      expect(screen.getByText('SGST (2.5%)')).toBeDefined();
      expect(screen.getByText(/Total GST \(5% Inclusive\)/i)).toBeDefined();
      expect(screen.getByText('Invoice Verified')).toBeDefined();
      expect(screen.getByText('Invoice PDF')).toBeDefined();
    });
  });

  it('exports filtered orders to a CSV file when Export button is clicked', async () => {
    sellerApi.getOrders.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'ORD-7001',
          customer: 'Suresh Raina',
          customer_phone: '9820011223',
          distance: '2.5',
          delivery_mode: 'fast',
          items: [
            { name: 'Organic Almonds', quantity: 2, unit_price: 350, total_price: 700 }
          ],
          amount: 700,
          tax_amount: 33.33,
          invoice_number: 'INV-ORD-7001',
          status: 'new'
        }
      ]
    });

    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-csv-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    let clickedAnchor = null;
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = vi.fn(function() {
      clickedAnchor = this;
    });

    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('#ORD-7001')).toBeDefined();
    });

    const exportBtn = screen.getByRole('button', { name: /Export/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(createObjectURLMock).toHaveBeenCalled();
      expect(clickedAnchor).not.toBeNull();
      expect(clickedAnchor.getAttribute('download')).toMatch(/^orders_export_\d{4}-\d{2}-\d{2}\.csv$/);
      expect(screen.getByText(/Exported 1 orders to CSV/i)).toBeDefined();
    });

    const blobArg = createObjectURLMock.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
    const buf = await blobArg.arrayBuffer();
    const bytes = new Uint8Array(buf);
    expect(bytes[0]).toBe(0xEF); // UTF-8 BOM byte 1
    expect(bytes[1]).toBe(0xBB); // UTF-8 BOM byte 2
    expect(bytes[2]).toBe(0xBF); // UTF-8 BOM byte 3

    const blobText = await blobArg.text();
    expect(blobText).toContain('Order ID');
    expect(blobText).toContain('Invoice Number');
    expect(blobText).toContain('Grand Total (INR)');
    expect(blobText).toContain('#ORD-7001');
    expect(blobText).toContain('Suresh Raina');
    expect(blobText).toContain('9820011223');
    expect(blobText).toContain('Organic Almonds (x2 - ₹700)');

    HTMLAnchorElement.prototype.click = originalClick;
  });
});

