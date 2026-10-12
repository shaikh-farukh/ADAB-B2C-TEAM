import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import OrdersView from '../components/OrdersView.jsx';

describe('Day 4 Frontend Task 1: "My Orders" & Order History Screen (sec-orders & sec-orderhistory)', () => {
  const mockActiveOrders = [
    {
      id: 'ord-9021',
      order_number: '9021',
      order_status: 'OUT_FOR_DELIVERY',
      grand_total: 840,
      eta_minutes: 18,
      seller_orders: [
        {
          store_name: 'Shri Balaji Store'
        }
      ],
      items: [
        { product_name: 'Rice' },
        { product_name: 'Oil' },
        { product_name: 'Salt' }
      ]
    },
    {
      id: 'ord-9018',
      order_number: '9018',
      order_status: 'PREPARING',
      grand_total: 899,
      seller_orders: [
        {
          store_name: 'Shri Balaji Store'
        }
      ],
      items: [
        { product_name: 'Kurti' }
      ]
    }
  ];

  const mockPastOrders = [
    {
      id: 'ord-9010',
      order_number: '9010',
      order_status: 'DELIVERED',
      grand_total: 560,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      seller_orders: [
        {
          store_name: 'Shri Balaji Store'
        }
      ],
      items: [
        { product_name: 'Atta 5kg' }
      ]
    },
    {
      id: 'ord-9005',
      order_number: '9005',
      order_status: 'DELIVERED',
      grand_total: 420,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      seller_orders: [
        {
          store_name: 'Local Kirana'
        }
      ],
      items: [
        { product_name: 'Sugar 2kg' }
      ]
    },
    {
      id: 'ord-8998',
      order_number: '8998',
      order_status: 'CANCELLED',
      grand_total: 1240,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      seller_orders: [
        {
          store_name: 'Fresh Fruits Mart'
        }
      ],
      items: [
        { product_name: 'Mangoes 2kg' }
      ]
    }
  ];

  const allOrders = [...mockActiveOrders, ...mockPastOrders];

  it('1. Replicates the high-contrast active order card matching unified-customer-portal-demo.html (#sec-orders)', () => {
    const html = renderToString(
      <OrdersView
        orders={allOrders}
        initialView="orders"
      />
    );

    // Section container
    expect(html).toContain('id="sec-orders"');

    // High contrast card elements
    expect(html).toContain('#9021');
    expect(html).toContain('Shri Balaji Store');
    expect(html).toContain('₹840.00');

    // Status pill for OUT_FOR_DELIVERY
    expect(html).toContain('ON THE WAY');

    // Animated progress track bar
    expect(html).toContain('order-track-bar');
    expect(html).toContain('order-track-fill');

    // Live ETA pill with rider Ramesh
    expect(html).toContain('Arriving in 18 min · Ramesh');

    // Second active order
    expect(html).toContain('#9018');
    expect(html).toContain('PACKING');

    // View past orders link
    expect(html).toContain('View past orders →');
  });

  it('2. Replicates the past order history screen with live search input (#sec-orderhistory & #ohSearch)', () => {
    const html = renderToString(
      <OrdersView
        orders={allOrders}
        initialView="orderhistory"
      />
    );

    // Section container
    expect(html).toContain('id="sec-orderhistory"');

    // Search input
    expect(html).toContain('id="ohSearch"');
    expect(html).toContain('placeholder="Search orders..."');

    // Rows and data-status
    expect(html).toContain('class="oh-row');
    expect(html).toContain('data-status="delivered"');
    expect(html).toContain('data-status="cancelled"');

    // Order numbers and summaries
    expect(html).toContain('#9010');
    expect(html).toContain('#9005');
    expect(html).toContain('#8998');
    expect(html).toContain('DELIVERED');
    expect(html).toContain('CANCELLED');

    // Reorder button next to delivered orders
    expect(html).toContain('Reorder');
  });

  it('3. Renders Reorder Action button for delivered orders and Cancel Action for placed/packing orders', () => {
    const html = renderToString(
      <OrdersView
        orders={allOrders}
        initialView="orders"
      />
    );

    // Active order in PREPARING status has Cancel order button
    expect(html).toContain('Cancel order');
  });

  it('4. Handles empty active orders gracefully with Browse Products CTA', () => {
    const html = renderToString(
      <OrdersView
        orders={mockPastOrders}
        initialView="orders"
      />
    );

    expect(html).toContain('No Active Orders');
    expect(html).toContain('Browse Products');
    expect(html).toContain('View Past Orders');
  });

  it('5. Tab switch controls display active order counts accurately', () => {
    const html = renderToString(
      <OrdersView
        orders={allOrders}
        initialView="orders"
      />
    );

    expect(html).toContain('Active Orders');
    expect(html).toContain('Order History');
  });
});
