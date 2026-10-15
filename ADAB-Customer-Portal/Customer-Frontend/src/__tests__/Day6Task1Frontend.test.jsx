import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import OrderSuccessView from '../components/OrderSuccessView.jsx';

describe('Day 6 Frontend Task 1: Live Checkout & Real Order Placement Handshake', () => {
  const sampleMultiSellerOrder = {
    id: 'b87d55f0-6c92-4ec9-8d14-38c29188d3e1',
    order_number: 'ORD-20261015-8899',
    order_status: 'CONFIRMED',
    grand_total: 1250,
    payment_method: 'RAZORPAY',
    payment_status: 'PAID',
    delivery_speed: 'EXPRESS',
    delivery_address: {
      id: 'addr-001',
      label: 'Home',
      full_name: 'Pooja Sharma',
      phone: '+91 98765 43210',
      address_line: '402, Shivam Residency, Adajan Ring Road',
      landmark: 'Near Star Bazaar',
      city: 'Surat',
      state: 'Gujarat',
      pincode: '395009',
      latitude: 21.195924,
      longitude: 72.793318
    },
    seller_orders: [
      {
        id: 'so-001',
        store_id: 'store-surat-organics',
        store_name: 'Surat Organics & Farm Produce',
        status: 'CONFIRMED',
        subtotal: 750,
        items: [
          {
            id: 'item-1',
            product_name: 'Organic Desi Cow Ghee 500g',
            quantity: 1,
            unit_price: 550,
            total_price: 550
          },
          {
            id: 'item-2',
            product_name: 'Fresh Farm Spinach 250g',
            quantity: 2,
            unit_price: 100,
            total_price: 200
          }
        ]
      },
      {
        id: 'so-002',
        store_id: 'store-gujarat-spices',
        store_name: 'Gujarat Traditional Spices',
        status: 'CONFIRMED',
        subtotal: 500,
        items: [
          {
            id: 'item-3',
            product_name: 'Unpolished Cumin Seeds 200g',
            quantity: 2,
            unit_price: 250,
            total_price: 500
          }
        ]
      }
    ],
    items: [
      {
        id: 'item-1',
        seller_order_id: 'so-001',
        product_name: 'Organic Desi Cow Ghee 500g',
        quantity: 1,
        unit_price: 550,
        total_price: 550,
        store_name: 'Surat Organics & Farm Produce'
      },
      {
        id: 'item-2',
        seller_order_id: 'so-001',
        product_name: 'Fresh Farm Spinach 250g',
        quantity: 2,
        unit_price: 100,
        total_price: 200,
        store_name: 'Surat Organics & Farm Produce'
      },
      {
        id: 'item-3',
        seller_order_id: 'so-002',
        product_name: 'Unpolished Cumin Seeds 200g',
        quantity: 2,
        unit_price: 250,
        total_price: 500,
        store_name: 'Gujarat Traditional Spices'
      }
    ]
  };

  const sampleCodOrder = {
    id: 'f93a11b0-22c3-4aa9-9d55-12a44188b772',
    order_number: 'ORD-20261015-COD1',
    order_status: 'CONFIRMED',
    grand_total: 450,
    payment_method: 'CASH_ON_DELIVERY',
    payment_status: 'PENDING',
    delivery_address: {
      full_name: 'Amit Patel',
      phone: '+91 91234 56789',
      address_line: 'B-12, Green City, Vesu',
      city: 'Surat',
      pincode: '395007',
      latitude: 21.1418,
      longitude: 72.7709
    },
    items: [
      {
        id: 'it-single',
        product_name: 'Whole Wheat Atta 5kg',
        quantity: 1,
        unit_price: 450,
        total_price: 450,
        store_name: 'Surat Supermarket'
      }
    ]
  };

  it('1. Renders container section #sec-order-success with celebration hero banner', () => {
    const html = renderToString(
      <OrderSuccessView order={sampleMultiSellerOrder} />
    );

    expect(html).toContain('id="sec-order-success"');
    expect(html).toContain('Order Placed Successfully!');
    expect(html).toContain('Estimated Delivery');
  });

  it('2. Displays generated order reference ID and UUID reference', () => {
    const html = renderToString(
      <OrderSuccessView order={sampleMultiSellerOrder} />
    );

    expect(html).toContain('ORD-20261015-8899');
    expect(html).toContain('Order Reference ID');
    expect(html).toContain('b87d55f0-6c92-4ec9-8d14-38c29188d3e1');
  });

  it('3. Displays delivery address summary with verified geocoded GPS coordinates', () => {
    const html = renderToString(
      <OrderSuccessView order={sampleMultiSellerOrder} />
    );

    expect(html).toContain('Pooja Sharma');
    expect(html).toContain('+91 98765 43210');
    expect(html).toContain('402, Shivam Residency, Adajan Ring Road');
    expect(html).toContain('Near Star Bazaar');
    expect(html).toContain('Surat');
    expect(html).toContain('395009');
    // Geocoded coordinates pill
    expect(html).toContain('Geocoded Coordinates:');
    expect(html).toContain('21.195924');
    expect(html).toContain('72.793318');
  });

  it('4. Displays multi-seller child orders item breakdown split per store', () => {
    const html = renderToString(
      <OrderSuccessView order={sampleMultiSellerOrder} />
    );

    // Multi-Seller Items heading
    expect(html).toContain('Multi-Seller Ordered Items');

    // Store 1
    expect(html).toContain('Surat Organics &amp; Farm Produce');
    expect(html).toContain('Organic Desi Cow Ghee 500g');
    expect(html).toContain('Fresh Farm Spinach 250g');
    expect(html).toContain('550.00');

    // Store 2
    expect(html).toContain('Gujarat Traditional Spices');
    expect(html).toContain('Unpolished Cumin Seeds 200g');
    expect(html).toContain('500.00');

    // Total Amount
    expect(html).toContain('1250.00');
  });

  it('5. Correctly renders payment confirmation handshake for Paid Online (UPI/Card)', () => {
    const html = renderToString(
      <OrderSuccessView order={sampleMultiSellerOrder} />
    );

    expect(html).toContain('PAID ONLINE');
    expect(html).toContain('Payment verified and transaction settled');
    expect(html).toContain('RAZORPAY');
  });

  it('6. Correctly renders payment confirmation handshake for Cash on Delivery', () => {
    const html = renderToString(
      <OrderSuccessView order={sampleCodOrder} />
    );

    expect(html).toContain('PAY ON DELIVERY');
    expect(html).toContain('Please keep exact cash ready upon delivery');
    expect(html).toContain('CASH ON DELIVERY');
    expect(html).toContain('Whole Wheat Atta 5kg');
  });

  it('7. Renders action buttons for live tracking, order history, and continuing shopping', () => {
    const html = renderToString(
      <OrderSuccessView
        order={sampleMultiSellerOrder}
        onTrackOrder={() => {}}
        onViewOrders={() => {}}
        onContinueShopping={() => {}}
      />
    );

    expect(html).toContain('Track Live Delivery');
    expect(html).toContain('View All Orders');
    expect(html).toContain('Continue Shopping');
  });
});
