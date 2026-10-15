import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import OrderStatusView from '../components/OrderStatusView.jsx';

describe('Day 6 Frontend Task 2: Live Tracking & Milestone Stepper Telemetry (#sec-track)', () => {
  const sampleOrder = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    order_number: 'ORD-20261015-LIVE',
    order_status: 'OUT_FOR_DELIVERY',
    delivery_mode: 'DELIVERY',
    grand_total: 850,
    delivery_fee: 30,
    total_mrp: 820,
    total_discount: 0,
    payment_method: 'UPI',
    payment_status: 'PAID',
    eta_minutes: 18,
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    delivery_address: {
      full_name: 'Pooja Sharma',
      phone: '+91 98765 43210',
      address_line: 'Flat 402, Green Valley Apt, Ring Road',
      city: 'Surat',
      pincode: '395002',
      latitude: 21.1950,
      longitude: 72.8190
    },
    seller_orders: [
      {
        id: 'so-1',
        store_id: 'store-1',
        store_name: 'Amul Fresh & Grocery',
        status: 'OUT_FOR_DELIVERY',
        subtotal: 550,
        items: [
          {
            id: 'it-1',
            product_name: 'Organic Milk 1L',
            quantity: 2,
            unit_price: 65,
            total_price: 130
          },
          {
            id: 'it-2',
            product_name: 'Desi Butter 500g',
            quantity: 1,
            unit_price: 420,
            total_price: 420
          }
        ]
      },
      {
        id: 'so-2',
        store_id: 'store-2',
        store_name: 'Surat Daily Veggies',
        status: 'OUT_FOR_DELIVERY',
        subtotal: 300,
        items: [
          {
            id: 'it-3',
            product_name: 'Farm Tomatoes 1kg',
            quantity: 2,
            unit_price: 50,
            total_price: 100
          },
          {
            id: 'it-4',
            product_name: 'Fresh Spinach 500g',
            quantity: 1,
            unit_price: 200,
            total_price: 200
          }
        ]
      }
    ],
    items: [
      {
        id: 'it-1',
        product_name: 'Organic Milk 1L',
        quantity: 2,
        unit_price: 65,
        total_price: 130,
        store_name: 'Amul Fresh & Grocery'
      },
      {
        id: 'it-2',
        product_name: 'Desi Butter 500g',
        quantity: 1,
        unit_price: 420,
        total_price: 420,
        store_name: 'Amul Fresh & Grocery'
      },
      {
        id: 'it-3',
        product_name: 'Farm Tomatoes 1kg',
        quantity: 2,
        unit_price: 50,
        total_price: 100,
        store_name: 'Surat Daily Veggies'
      },
      {
        id: 'it-4',
        product_name: 'Fresh Spinach 500g',
        quantity: 1,
        unit_price: 200,
        total_price: 200,
        store_name: 'Surat Daily Veggies'
      }
    ]
  };

  it('1. Renders #sec-track with Hero ETA Header and Order Identification', () => {
    const html = renderToString(
      <OrderStatusView order={sampleOrder} onBackToOrders={() => {}} />
    );

    expect(html).toContain('id="sec-track"');
    expect(html).toContain('18 min');
    expect(html).toContain('ORD-20261015-LIVE');
    expect(html).toContain('Amul Fresh &amp; Grocery');
  });

  it('2. Renders Leaflet Map container #trackMap for live rider GPS telemetry', () => {
    const html = renderToString(
      <OrderStatusView order={sampleOrder} onBackToOrders={() => {}} />
    );

    expect(html).toContain('id="trackMap"');
    expect(html).toContain('Live GPS');
    expect(html).toContain('Flat 402, Green Valley Apt, Ring Road');
  });

  it('3. Renders Rider & Store 3-Column Meta Card and Call Rider button (.green-btn)', () => {
    const html = renderToString(
      <OrderStatusView order={sampleOrder} onBackToOrders={() => {}} />
    );

    expect(html).toContain('Rider');
    expect(html).toContain('Store');
    expect(html).toContain('Items');
    expect(html).toContain('6 items'); // 2 + 1 + 2 + 1
    expect(html).toContain('green-btn');
    expect(html).toContain('Call rider');
  });

  it('4. Updates 4-stage stepper (ACCEPTED → PACKED → OUT_FOR_DELIVERY → DELIVERED)', () => {
    const html = renderToString(
      <OrderStatusView order={sampleOrder} onBackToOrders={() => {}} />
    );

    expect(html).toContain('Order Progress Timeline');
    expect(html).toContain('OUT_FOR_DELIVERY');
    expect(html).toContain('ACCEPTED');
    expect(html).toContain('PACKED');
    expect(html).toContain('DELIVERED');
  });

  it('5. Renders Multi-Seller ordered items split per store', () => {
    const html = renderToString(
      <OrderStatusView order={sampleOrder} onBackToOrders={() => {}} />
    );

    expect(html).toContain('Multi-Seller Order Breakdown');
    expect(html).toContain('Amul Fresh &amp; Grocery');
    expect(html).toContain('Organic Milk 1L');
    expect(html).toContain('Surat Daily Veggies');
    expect(html).toContain('Farm Tomatoes 1kg');
  });

  it('6. Renders "Download / View Tax Invoice" button', () => {
    const html = renderToString(
      <OrderStatusView order={sampleOrder} onBackToOrders={() => {}} />
    );

    expect(html).toContain('Download / View Tax Invoice');
  });

  it('7. Handles Delivered state with return/replacement action and delivered banner', () => {
    const deliveredOrder = {
      ...sampleOrder,
      order_status: 'DELIVERED',
      delivered_at: new Date().toISOString()
    };

    const html = renderToString(
      <OrderStatusView
        order={deliveredOrder}
        onBackToOrders={() => {}}
        onRequestReturn={() => {}}
      />
    );

    expect(html).toContain('Order Delivered ✓');
    expect(html).toContain('Request Return / Replacement');
  });
});
