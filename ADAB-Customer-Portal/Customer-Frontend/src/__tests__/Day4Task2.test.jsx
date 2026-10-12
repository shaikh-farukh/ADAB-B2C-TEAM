import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import OrderStatusView from '../components/OrderStatusView.jsx';

describe('Day 4 Frontend Task 2: Order Detail & Live Shipment Tracking (sec-track)', () => {
  const sampleOrder = {
    id: 'ord-test-9021',
    order_number: '9021',
    order_status: 'OUT_FOR_DELIVERY',
    grand_total: 840,
    eta_minutes: 18,
    delivery_fee: 0,
    total_mrp: 840,
    payment_method: 'UPI',
    payment_status: 'PAID',
    customer_name: 'Pooja Sharma',
    customer_phone: '+91 98765 12340',
    delivery_address: {
      recipient_name: 'Pooja Sharma',
      phone: '+91 98765 12340',
      address_line: 'Flat 402, Ring Road, Surat',
      city: 'Surat',
      pincode: '395002',
      label: 'Home'
    },
    seller_orders: [
      {
        id: 'so-1',
        store_id: 'store-balaji',
        store_name: 'Balaji Store',
        status: 'OUT_FOR_DELIVERY',
        subtotal: 840,
        items: [
          { id: 'it-1', product_name: 'Rice 5kg', quantity: 1, unit_price: 340, total_price: 340 },
          { id: 'it-2', product_name: 'Sunflower Oil 1L', quantity: 2, unit_price: 200, total_price: 400 },
          { id: 'it-3', product_name: 'Salt 1kg', quantity: 1, unit_price: 100, total_price: 100 }
        ]
      }
    ],
    items: [
      { id: 'it-1', product_name: 'Rice 5kg', quantity: 1, unit_price: 340, total_price: 340, store_name: 'Balaji Store' },
      { id: 'it-2', product_name: 'Sunflower Oil 1L', quantity: 2, unit_price: 200, total_price: 400, store_name: 'Balaji Store' },
      { id: 'it-3', product_name: 'Salt 1kg', quantity: 1, unit_price: 100, total_price: 100, store_name: 'Balaji Store' }
    ]
  };

  it('1. Renders Hero ETA Header with large display and rider message', () => {
    const html = renderToString(
      <OrderStatusView
        order={sampleOrder}
        onBackToOrders={() => {}}
      />
    );

    // Section container
    expect(html).toContain('id="sec-track"');

    // Hero ETA Header
    expect(html).toContain('18 min');
    expect(html).toContain('Ramesh is on the way with your order');
  });

  it('2. Renders Leaflet Map Integration container (#trackMap)', () => {
    const html = renderToString(
      <OrderStatusView
        order={sampleOrder}
        onBackToOrders={() => {}}
      />
    );

    expect(html).toContain('id="trackMap"');
  });

  it('3. Renders Rider & Store 3-Column Meta Card and Call rider button (.green-btn)', () => {
    const html = renderToString(
      <OrderStatusView
        order={sampleOrder}
        onBackToOrders={() => {}}
      />
    );

    // 3-tile grid
    expect(html).toContain('Rider');
    expect(html).toContain('Ramesh');
    expect(html).toContain('Store');
    expect(html).toContain('Balaji Store');
    expect(html).toContain('Items');
    expect(html).toContain('4 items');

    // Action button
    expect(html).toContain('class="green-btn"');
    expect(html).toContain('Call rider');
  });

  it('4. Renders Milestone Stepper Timeline with all 4 progressive stages', () => {
    const html = renderToString(
      <OrderStatusView
        order={sampleOrder}
        onBackToOrders={() => {}}
      />
    );

    // 4 progressive stages
    expect(html).toContain('ACCEPTED');
    expect(html).toContain('PACKED');
    expect(html).toContain('OUT_FOR_DELIVERY');
    expect(html).toContain('DELIVERED');
  });

  it('5. Renders Multi-Seller Breakdown and Download / View Tax Invoice button', () => {
    const html = renderToString(
      <OrderStatusView
        order={sampleOrder}
        onBackToOrders={() => {}}
      />
    );

    // Multi-seller details
    expect(html).toContain('Multi-Seller Order Breakdown');
    expect(html).toContain('Balaji Store');
    expect(html).toContain('Rice 5kg');
    expect(html).toContain('Sunflower Oil 1L');
    expect(html).toContain('Salt 1kg');

    // Bill summary
    expect(html).toContain('Grand Total');
    expect(html).toContain('₹840.00');

    // Tax Invoice button
    expect(html).toContain('Download / View Tax Invoice');
  });

  it('6. Handles empty / null order gracefully with view orders CTA', () => {
    const html = renderToString(
      <OrderStatusView
        order={null}
        onBackToOrders={() => {}}
      />
    );

    expect(html).toContain('No Order Selected');
    expect(html).toContain('View Orders');
  });
});
