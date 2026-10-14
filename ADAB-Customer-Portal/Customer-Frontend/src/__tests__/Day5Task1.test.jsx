import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import ReturnsView from '../components/ReturnsView.jsx';

describe('Day 5 Frontend Task 1: Returns & Replacements (sec-returns)', () => {
  const sampleOrder = {
    id: 'ord-test-delivered-101',
    order_number: '101',
    order_status: 'DELIVERED',
    grand_total: 650,
    items: [
      { id: 'it-1', product_name: 'Cotton Kurti', quantity: 1, unit_price: 450 },
      { id: 'it-2', product_name: 'Mustard Oil 1L', quantity: 2, unit_price: 100 }
    ]
  };

  it('1. Renders container section #sec-returns matching unified-customer-portal-demo.html', () => {
    const html = renderToString(
      <ReturnsView onBack={() => {}} />
    );

    expect(html).toContain('id="sec-returns"');
    expect(html).toContain('Returns &amp; Replacements');
  });

  it('2. Renders "+ New return request" action button with class green-btn', () => {
    const html = renderToString(
      <ReturnsView onBack={() => {}} />
    );

    expect(html).toContain('green-btn');
    expect(html).toContain('New return request');
  });

  it('3. Renders Returns and Refunds Tracker tabs', () => {
    const html = renderToString(
      <ReturnsView onBack={() => {}} />
    );

    expect(html).toContain('Returns (');
    expect(html).toContain('Refunds Tracker (');
  });

  it('4. Renders New Return Modal when preselectedOrder is provided', () => {
    const html = renderToString(
      <ReturnsView
        onBack={() => {}}
        preselectedOrder={sampleOrder}
      />
    );

    // Modal title
    expect(html).toContain('Request Return / Replacement');
    // Pre-selected order reference
    expect(html).toContain('Cotton Kurti');
    expect(html).toContain('Mustard Oil 1L');
    // Reason dropdown
    expect(html).toContain('-- Choose reason --');
    expect(html).toContain('Wrong size or product received');
    expect(html).toContain('Defective / Broken / Damaged item');
    // Item condition options
    expect(html).toContain('Unopened (Original Box)');
    expect(html).toContain('Opened (Unused)');
    // Pickup slot options
    expect(html).toContain('Tomorrow 9 AM – 1 PM');
    // Submit button
    expect(html).toContain('Submit Return Request');
  });

  it('5. Renders photo evidence input with helper text for instant approval', () => {
    const html = renderToString(
      <ReturnsView
        onBack={() => {}}
        preselectedOrder={sampleOrder}
      />
    );

    expect(html).toContain('Photo Evidence (Optional)');
    expect(html).toContain('Helps instant approval');
    expect(html).toContain('https://example.com/photos/item_damage.jpg');
  });

  it('6. Renders Refund Preference options (UPI, Wallet, Card)', () => {
    const html = renderToString(
      <ReturnsView
        onBack={() => {}}
        preselectedOrder={sampleOrder}
      />
    );

    expect(html).toContain('UPI (Fastest · 2-4 hrs)');
    expect(html).toContain('ADAB Wallet (Instant)');
    expect(html).toContain('Original Payment Card');
  });
});
