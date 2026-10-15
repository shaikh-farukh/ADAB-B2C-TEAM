import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import ReturnsView, { RETURN_MILESTONE_STEPS, getReturnStepIndex } from '../components/ReturnsView.jsx';

describe('Day 6 Frontend Task 3: Cross-Portal Return Tracking UI (#sec-returns)', () => {
  const sampleDeliveredOrder = {
    id: 'ord-test-delivered-101',
    order_number: '101',
    order_status: 'DELIVERED',
    grand_total: 650,
    items: [
      { id: 'it-1', product_name: 'Cotton Kurti', quantity: 1, unit_price: 450, price_at_order: 450 },
      { id: 'it-2', product_name: 'Mustard Oil 1L', quantity: 2, unit_price: 100, price_at_order: 100 }
    ]
  };

  const sampleReturnsList = [
    {
      id: 'ret-101-requested',
      order_id: 'ord-test-delivered-101',
      order_number: '101',
      status: 'REQUESTED',
      refund_amount: 450.00,
      reason: 'Wrong size received · Condition: UNOPENED',
      items: [
        { id: 'ri-1', product_name: 'Cotton Kurti', quantity: 1, refund_amount: 450.00 }
      ],
      refund: {
        id: 'ref-101',
        amount: 450.00,
        refund_status: 'INITIATED',
        refund_mode: 'UPI',
        gateway_refund_id: 'rfnd_upi_test_001',
        created_at: new Date().toISOString()
      }
    },
    {
      id: 'ret-102-approved',
      order_id: 'ord-test-delivered-102',
      order_number: '102',
      status: 'APPROVED',
      refund_amount: 320.00,
      reason: 'Defective item',
      items: [
        { id: 'ri-2', product_name: 'Silk Dupatta', quantity: 1, refund_amount: 320.00 }
      ],
      refund: {
        id: 'ref-102',
        amount: 320.00,
        refund_status: 'INITIATED',
        refund_mode: 'WALLET',
        gateway_refund_id: 'rfnd_wal_test_002',
        created_at: new Date().toISOString()
      }
    },
    {
      id: 'ret-103-pickup',
      order_id: 'ord-test-delivered-103',
      order_number: '103',
      status: 'PICKUP_SCHEDULED',
      refund_amount: 150.00,
      reason: 'Quality issue',
      items: [
        { id: 'ri-3', product_name: 'Organic Honey', quantity: 1, refund_amount: 150.00 }
      ],
      refund: {
        id: 'ref-103',
        amount: 150.00,
        refund_status: 'INITIATED',
        refund_mode: 'UPI',
        created_at: new Date().toISOString()
      }
    },
    {
      id: 'ret-104-refunded',
      order_id: 'ord-test-delivered-104',
      order_number: '104',
      status: 'REFUNDED',
      refund_amount: 890.00,
      reason: 'Item broken during transit',
      items: [
        { id: 'ri-4', product_name: 'Ceramic Dinner Set', quantity: 1, refund_amount: 890.00 }
      ],
      refund: {
        id: 'ref-104',
        amount: 890.00,
        refund_status: 'PROCESSED',
        refund_mode: 'ORIGINAL_PAYMENT',
        gateway_refund_id: 'rfnd_bank_settled_99',
        processed_at: new Date().toISOString()
      }
    }
  ];

  const sampleRefundsList = [
    {
      id: 'ref-999-alpha',
      order_id: 'ord-test-delivered-104',
      order_number: '104',
      return_id: 'ret-104-refunded',
      amount: 890.00,
      refund_status: 'PROCESSED',
      refund_mode: 'UPI',
      gateway_refund_id: 'rfnd_gw_success_888',
      created_at: new Date().toISOString(),
      processed_at: new Date().toISOString()
    },
    {
      id: 'ref-998-beta',
      order_id: 'ord-test-delivered-101',
      order_number: '101',
      return_id: 'ret-101-requested',
      amount: 450.00,
      refund_status: 'INITIATED',
      refund_mode: 'WALLET',
      created_at: new Date().toISOString()
    }
  ];

  it('1. Renders the #sec-returns container with segmented tabs matching design parity', () => {
    const html = renderToString(<ReturnsView onBack={() => {}} />);

    expect(html).toContain('id="sec-returns"');
    expect(html).toContain('Returns &amp; Replacements');
    expect(html).toContain('Track return requests, pickup slots, and refund status');
    expect(html).toContain('Returns (');
    expect(html).toContain('Refunds Tracker (');
  });

  it('2. Initiating return request from completed/delivered orders opens modal with item breakdown', () => {
    const html = renderToString(
      <ReturnsView onBack={() => {}} preselectedOrder={sampleDeliveredOrder} />
    );

    // Modal renders
    expect(html).toContain('Request Return / Replacement');
    // Preselected delivered order reference
    expect(html).toContain('Select Items to Return from Order #101');
    expect(html).toContain('Cotton Kurti');
    expect(html).toContain('Mustard Oil 1L');
    expect(html).toContain('450.00');
    expect(html).toContain('100.00');
    // Reason, condition, slot and refund preferences
    expect(html).toContain('Reason for Return');
    expect(html).toContain('Wrong size or product received');
    expect(html).toContain('Defective / Broken / Damaged item');
    expect(html).toContain('Item Condition');
    expect(html).toContain('Unopened (Original Box)');
    expect(html).toContain('Refund Preference');
    expect(html).toContain('UPI (Fastest · 2-4 hrs)');
    expect(html).toContain('Submit Return Request');
  });

  it('3. Computes 4-stage lifecycle milestones (REQUESTED → APPROVED → PICKUP_SCHEDULED → REFUNDED)', () => {
    // Stage 0: REQUESTED
    expect(getReturnStepIndex('REQUESTED')).toBe(0);
    // Stage 1: APPROVED
    expect(getReturnStepIndex('APPROVED')).toBe(1);
    // Stage 2: PICKUP_SCHEDULED & ITEM_PICKED
    expect(getReturnStepIndex('PICKUP_SCHEDULED')).toBe(2);
    expect(getReturnStepIndex('ITEM_PICKED')).toBe(2);
    // Stage 3: REFUNDED & COMPLETED
    expect(getReturnStepIndex('REFUNDED')).toBe(3);
    expect(getReturnStepIndex('COMPLETED')).toBe(3);
    // Terminal rejected/cancelled
    expect(getReturnStepIndex('REJECTED')).toBe(-1);

    expect(RETURN_MILESTONE_STEPS.map((s) => s.key)).toEqual([
      'REQUESTED',
      'APPROVED',
      'PICKUP_SCHEDULED',
      'REFUNDED'
    ]);
  });

  it('4. Renders 4-stage milestone steppers on return cards matching real status updates', () => {
    const html = renderToString(
      <ReturnsView
        onBack={() => {}}
        initialReturnsList={sampleReturnsList}
      />
    );

    // Returns count rendered
    expect(html).toContain('Returns (<!-- -->4<!-- -->)');
    // 4 milestone stepper containers rendered
    expect(html).toContain('data-testid="return-milestone-stepper"');
    expect(html).toContain('data-current-step="0"'); // REQUESTED
    expect(html).toContain('data-current-step="1"'); // APPROVED
    expect(html).toContain('data-current-step="2"'); // PICKUP_SCHEDULED
    expect(html).toContain('data-current-step="3"'); // REFUNDED

    // Step labels rendered
    expect(html).toContain('Requested');
    expect(html).toContain('Approved');
    expect(html).toContain('Pickup Scheduled');
    expect(html).toContain('Refunded');

    // Stage subtitle
    expect(html).toContain('Stage');
    expect(html).toContain('of 4:');
  });

  it('5. Displays real status pills matching backend status transitions', () => {
    const html = renderToString(
      <ReturnsView
        onBack={() => {}}
        initialReturnsList={sampleReturnsList}
      />
    );

    // Status pills
    expect(html).toContain('Requested');
    expect(html).toContain('Approved');
    expect(html).toContain('Pickup Scheduled');
    expect(html).toContain('Refunded');
  });

  it('6. Displays linked refund amounts and states matching backend refunds table', () => {
    const html = renderToString(
      <ReturnsView
        onBack={() => {}}
        initialReturnsList={sampleReturnsList}
      />
    );

    // Linked refund amounts
    expect(html).toContain('450.00');
    expect(html).toContain('320.00');
    expect(html).toContain('150.00');
    expect(html).toContain('890.00');

    // Linked refund states
    expect(html).toContain('INITIATED');
    expect(html).toContain('PROCESSED');

    // Linked refund modes
    expect(html).toContain('UPI');
    expect(html).toContain('WALLET');
    expect(html).toContain('ORIGINAL_PAYMENT');

    // Gateway reference
    expect(html).toContain('rfnd_upi_test_001');
    expect(html).toContain('rfnd_bank_settled_99');
  });

  it('7. Renders the Refunds Tracker tab with linked return IDs and order numbers', () => {
    const html = renderToString(
      <ReturnsView
        onBack={() => {}}
        initialRefundsList={sampleRefundsList}
        initialActiveTab="refunds"
      />
    );

    // Tab active
    expect(html).toContain('Refunds Tracker');
    // Refund IDs
    expect(html).toContain('REF-999-');
    expect(html).toContain('REF-998-');
    // Linked return codes
    expect(html).toContain('#R-RET-');
    // Linked orders
    expect(html).toContain('104');
    expect(html).toContain('101');
    // Status pills
    expect(html).toContain('Refunded');
    expect(html).toContain('Refund Initiated');
    // Amounts
    expect(html).toContain('890.00');
    expect(html).toContain('450.00');
  });
});
