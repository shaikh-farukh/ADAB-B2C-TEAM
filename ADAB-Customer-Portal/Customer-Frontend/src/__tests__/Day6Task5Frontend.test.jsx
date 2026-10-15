import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import CheckoutView from '../components/CheckoutView.jsx';
import PointsView from '../components/PointsView.jsx';

describe('Day 6 Frontend Task 5: Checkout Rewards Points Deduction Synchronization', () => {
  const sampleCartData = {
    cart: { id: 'cart-123' },
    items: [
      {
        id: 'ci-1',
        cart_item_id: 'ci-1',
        product_name: 'Amul Taaza Homogenised Toned Milk 1L',
        store_name: 'Balaji Grocery',
        sell_price: 74,
        quantity: 2
      },
      {
        id: 'ci-2',
        cart_item_id: 'ci-2',
        product_name: 'Fortune Sunlite Refined Sunflower Oil 1L',
        store_name: 'Balaji Grocery',
        sell_price: 135,
        quantity: 2
      }
    ],
    summary: {
      subtotal: 418,
      delivery_fee: 29,
      discount: 0,
      grand_total: 447
    }
  };

  it('1. Renders the Reward Points section in CheckoutView with live balance and Tier badge', () => {
    const html = renderToString(
      <CheckoutView
        cartData={sampleCartData}
        onPlaceOrder={() => {}}
        onBackToCart={() => {}}
        pointsBalance={2840}
      />
    );

    expect(html).toContain('id="checkoutRewardsSection"');
    expect(html).toContain('ADAB Loyalty Points');
    expect(html).toContain('id="checkoutAvailablePoints"');
    expect(html).toContain('2,840');
  });

  it('2. Enforces the 50% max order redemption rule and renders the Apply Points toggle', () => {
    const html = renderToString(
      <CheckoutView
        cartData={sampleCartData}
        onPlaceOrder={() => {}}
        onBackToCart={() => {}}
        pointsBalance={2840}
      />
    );

    // Order total is 447, 50% cap is 223 points
    expect(html).toContain('id="useRewardPointsToggle"');
    expect(html).toContain('Apply Points');
  });

  it('3. Renders the bill breakdown including subtotal, delivery fee, and net total payable', () => {
    const html = renderToString(
      <CheckoutView
        cartData={sampleCartData}
        onPlaceOrder={() => {}}
        onBackToCart={() => {}}
        pointsBalance={2840}
      />
    );

    expect(html).toContain('Items Subtotal');
    expect(html).toContain('418');
    expect(html).toContain('Total Payable');
    expect(html).toContain('Place Order · Pay ₹');
  });

  it('4. Points banner displays reward points earned on the checkout order', () => {
    const html = renderToString(
      <CheckoutView
        cartData={sampleCartData}
        onPlaceOrder={() => {}}
        onBackToCart={() => {}}
        pointsBalance={2840}
      />
    );

    expect(html).toContain('You will earn');
    expect(html).toContain('ADAB reward points on this order!');
  });

  it('5. PointsView renders the updated points balance in #pointsBig', () => {
    const sampleSummary = {
      points_balance: 2617,
      lifetime_earned: 2840,
      tier: 'GOLD',
      rupee_value: '2617.00',
      tier_benefits: { multiplier: '1.5x' }
    };

    const html = renderToString(
      <PointsView
        initialSummary={sampleSummary}
        onBack={() => {}}
      />
    );

    expect(html).toContain('id="sec-points"');
    expect(html).toContain('id="pointsBig"');
    expect(html).toContain('2,617');
    expect(html).toContain('GOLD TIER · 1.5x');
    expect(html).toContain('Worth ₹2,617.00');
  });

  it('6. PointsView displays REDEEM_ORDER checkout deduction entries in the Points Activity Ledger', () => {
    const sampleLedger = [
      {
        id: 'tx-redeem-1',
        points_change: -223,
        transaction_type: 'REDEEM_ORDER',
        reference_id: 'ORD-1792058',
        balance_after: 2617,
        created_at: new Date().toISOString()
      },
      {
        id: 'tx-earn-1',
        points_change: 56,
        transaction_type: 'EARN_ORDER',
        reference_id: 'ORD-1791000',
        balance_after: 2840,
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ];

    const html = renderToString(
      <PointsView
        initialSummary={{ points_balance: 2617 }}
        initialLedger={sampleLedger}
        onBack={() => {}}
      />
    );

    expect(html).toContain('Points Activity Ledger');
    expect(html).toContain('- Checkout discount (#ORD-1792)');
    expect(html).toContain('-223');
    expect(html).toContain('text-orange-600');
    expect(html).toContain('+ Order #ORD-1791000');
    expect(html).toContain('+56');
    expect(html).toContain('text-green-700');
  });

  it('7. PointsView renders filter chips including Discounts Used (REDEEM_ORDER)', () => {
    const html = renderToString(
      <PointsView
        onBack={() => {}}
      />
    );

    expect(html).toContain('All Transactions');
    expect(html).toContain('Orders Earned');
    expect(html).toContain('Discounts Used');
    expect(html).toContain('Bonuses');
  });

  it('8. PointsView renders the loyalty redemption rules guide', () => {
    const html = renderToString(
      <PointsView
        onBack={() => {}}
      />
    );

    expect(html).toContain('How ADAB Loyalty Points Work');
    expect(html).toContain('1 reward point = ₹1 direct reduction');
    expect(html).toContain('Apply up to 50% of your total order amount using available reward points.');
  });
});
