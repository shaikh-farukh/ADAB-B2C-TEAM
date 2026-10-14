import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import PointsView from '../components/PointsView.jsx';

describe('Day 5 Frontend Task 4: Reward Points & Ledger (sec-points)', () => {
  const sampleSummary = {
    id: 'acc-test-101',
    user_id: 'user-cust-1',
    points_balance: 2840,
    lifetime_earned: 2840,
    tier: 'GOLD',
    rupee_value: '2840.00',
    conversion_rate: {
      points_per_rupee: 1,
      min_redeem_points: 10
    },
    tier_benefits: {
      name: 'GOLD',
      multiplier: '1.5x',
      points_to_next_tier: 0,
      perks: ['1.5x Points Multiplier', 'Free Delivery on All Orders', 'Priority Support']
    }
  };

  const sampleLedger = [
    {
      id: 'tx-1',
      points_change: 56,
      transaction_type: 'EARN_ORDER',
      reference_id: 'ORD-9010',
      balance_after: 2840,
      created_at: '2026-10-14T12:00:00.000Z'
    },
    {
      id: 'tx-2',
      points_change: -180,
      transaction_type: 'REDEEM_ORDER',
      reference_id: 'ORD-9005',
      balance_after: 2784,
      created_at: '2026-10-13T15:30:00.000Z'
    },
    {
      id: 'tx-3',
      points_change: 50,
      transaction_type: 'SIGNUP_BONUS',
      reference_id: 'WELCOME_BONUS',
      balance_after: 50,
      created_at: '2026-10-01T09:00:00.000Z'
    }
  ];

  it('1. Renders container section #sec-points matching unified-customer-portal-demo.html', () => {
    const html = renderToString(
      <PointsView onBack={() => {}} />
    );

    expect(html).toContain('id="sec-points"');
    expect(html).toContain('Reward Points &amp; Loyalty Ledger');
  });

  it('2. Renders Points Balance Banner with high-contrast gradient and redemption rule', () => {
    const html = renderToString(
      <PointsView
        onBack={() => {}}
        initialSummary={sampleSummary}
        initialLedger={sampleLedger}
      />
    );

    // High contrast gradient card
    expect(html).toContain('bg-gradient-to-br from-amber-400 to-orange-500');
    // Available points label & big counter id
    expect(html).toContain('Available points');
    expect(html).toContain('id="pointsBig"');
    expect(html).toContain('2,840');
    // Redemption rule matching demo
    expect(html).toContain('1 point = ₹1 off · Max 50% per order');
  });

  it('3. Renders loyalty tier pill and progression status', () => {
    const html = renderToString(
      <PointsView
        onBack={() => {}}
        initialSummary={sampleSummary}
        initialLedger={sampleLedger}
      />
    );

    expect(html).toContain('GOLD TIER · 1.5x');
    expect(html).toContain('Worth ₹2,840.00');
    expect(html).toContain('Tier Progress');
  });

  it('4. Renders Points Ledger with positive earned points and negative discounts', () => {
    const html = renderToString(
      <PointsView
        onBack={() => {}}
        initialSummary={sampleSummary}
        initialLedger={sampleLedger}
      />
    );

    // Positive points from order
    expect(html).toContain('+ Order #ORD-9010');
    expect(html).toContain('+56');
    expect(html).toContain('text-green-700');

    // Negative checkout discount
    expect(html).toContain('- Checkout discount');
    expect(html).toContain('-180');
    expect(html).toContain('text-orange-600');

    // Welcome bonus
    expect(html).toContain('+ Welcome bonus points');
    expect(html).toContain('+50');
  });

  it('5. Renders transaction filter chips', () => {
    const html = renderToString(
      <PointsView
        onBack={() => {}}
        initialSummary={sampleSummary}
        initialLedger={sampleLedger}
      />
    );

    expect(html).toContain('All Transactions');
    expect(html).toContain('Orders Earned');
    expect(html).toContain('Discounts Used');
    expect(html).toContain('Bonuses');
  });

  it('6. Renders How ADAB Loyalty Points Work rules guide', () => {
    const html = renderToString(
      <PointsView onBack={() => {}} />
    );

    expect(html).toContain('How ADAB Loyalty Points Work');
    expect(html).toContain('Earn on Every Purchase:');
    expect(html).toContain('1 reward point = ₹1 direct reduction');
    expect(html).toContain('Instant Redemption:');
    expect(html).toContain('Tier Progression:');
  });
});
