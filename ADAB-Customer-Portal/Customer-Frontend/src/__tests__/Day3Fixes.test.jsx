import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import OrderStatusView from '../components/OrderStatusView.jsx';
import AddressModal from '../components/AddressModal.jsx';

describe('User Feedback Fixes Validation', () => {
  const sampleOrder = {
    id: '7cc23c71-8f42-40be-a180-a80bce16d608',
    order_number: 'ORD-042539-111',
    customer_name: 'Pooja Sharma',
    customer_phone: '+91 98765 12340',
    delivery_address: {
      id: 'bd26c676-b2e0-4b4b-872e-f75aa2d8cb72',
      city: 'Surat',
      label: 'Home',
      phone: '+91 98765 12340',
      state: 'Gujarat',
      pincode: '395002',
      landmark: 'Near Textile Market',
      recipient_name: 'Pooja Sharma',
      address_line: 'Flat 402, Green Valley Apt, Ring Road'
    },
    delivery_mode: 'EXPRESS_30M',
    total_mrp: '1000.00',
    total_discount: '0.00',
    delivery_fee: '0.00',
    grand_total: '1000.00',
    payment_method: 'UPI',
    payment_status: 'PAID',
    order_status: 'PLACED',
    eta_minutes: 25,
    created_at: '2026-10-10T06:34:02.818Z',
    seller_orders: [
      {
        id: 'b4313e2f-8712-4ca3-b0af-dbeaab4454eb',
        store_name: 'Shabbir Grocery Shop',
        subtotal: '1000.00'
      }
    ],
    items: [
      {
        id: 'be96acec-2bbe-4c38-a354-13eed2ab8486',
        product_name: 'Game controller',
        quantity: '1.00',
        unit_price: '1000.00',
        total_price: '1000.00',
        store_name: 'Shabbir Grocery Shop'
      }
    ]
  };

  it('1. OrderStatusView renders complete order details including items, bill breakdown, payment, and destination', () => {
    const html = renderToString(
      <OrderStatusView
        order={sampleOrder}
        onBackToOrders={() => {}}
        showToast={() => {}}
      />
    );

    // Order number and ETA
    expect(html).toContain('ORD-042539-111');
    expect(html).toContain('min');
    expect(html).toContain('Ramesh is on the way with your order');

    // Ordered items breakdown
    expect(html).toContain('Ordered Items');
    expect(html).toContain('Game controller');
    expect(html).toContain('Qty:');
    expect(html).toContain('1000.00');
    expect(html).toContain('Shabbir Grocery Shop');

    // Bill breakdown & Payment
    expect(html).toContain('Bill Breakdown');
    expect(html).toContain('Items Subtotal');
    expect(html).toContain('Delivery Fee');
    expect(html).toContain('FREE');
    expect(html).toContain('Total Paid');
    expect(html).toContain('PAID');
    expect(html).toContain('UPI');

    // Delivery destination & Recipient details
    expect(html).toContain('Delivery Destination');
    expect(html).toContain('Pooja Sharma');
    expect(html).toContain('+91 98765 12340');
    expect(html).toContain('Flat 402, Green Valley Apt, Ring Road');
    expect(html).toContain('Surat');
    expect(html).toContain('395002');
    expect(html).toContain('Express Delivery (14–45 mins)');

    // Actions
    expect(html).toContain('Call Rider Ramesh');
    expect(html).toContain('Download Order Receipt');
    expect(html).toContain('Back to Orders');
  });

  it('2. OrderStatusView handles empty order state gracefully', () => {
    const html = renderToString(
      <OrderStatusView
        order={null}
        onBackToOrders={() => {}}
        showToast={() => {}}
      />
    );

    expect(html).toContain('No Order Selected');
    expect(html).toContain('View Orders');
  });

  it('3. AddressModal renders country code dropdown and 10-digit mobile number input', () => {
    const html = renderToString(
      <AddressModal
        isOpen={true}
        initialView="add"
        onClose={() => {}}
        onSelectAddress={() => {}}
      />
    );

    expect(html).toContain('id="countryCodeSelect"');
    expect(html).toContain('+91');
    expect(html).toContain('+971');
    expect(html).toContain('+1');
    expect(html).toContain('id="phoneNumberInput"');
    expect(html.toLowerCase()).toContain('maxlength="10"');
    expect(html).toContain('placeholder="9876512340"');
    expect(html).toContain('10-digit mobile number');
  });

  it('4. OrderStatusView renders centered progress timeline with real status mapping and stage timestamps', () => {
    const html = renderToString(
      <OrderStatusView
        order={sampleOrder}
        onBackToOrders={() => {}}
        showToast={() => {}}
      />
    );

    // Timeline title & badges
    expect(html).toContain('Order Progress Timeline');
    expect(html).toContain('PLACED');

    // Centered per-column timeline track
    expect(html).toContain('right-1/2');
    expect(html).toContain('w-full');

    // Stage milestones
    expect(html).toContain('Accepted');
    expect(html).toContain('Verified');
    expect(html).toContain('Out for Delivery');
    expect(html).toContain('Delivered');

    // Real timestamp for placement and estimated timestamps for future stages
    expect(html).toContain('12:04 pm');
    expect(html).toContain('Est.');
  });
});
