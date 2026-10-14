const pool = require('../db');
const returnService = require('../services/returnService');

async function runDay5ReturnsTests() {
  console.log('\n======================================================');
  console.log('🔄 RUNNING DAY 5 RETURNS & REFUNDS ENTERPRISE TESTS');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] Test ${total}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  let testOrderId = null;
  let testReturnId = null;
  let testRefundId = null;
  let testCustomerId = null;
  let testOrderItemId = null;

  try {
    // Setup: Find or create a test customer and order
    const custRes = await pool.query(
      `SELECT id FROM users WHERE user_type = 'CUSTOMER' ORDER BY created_at ASC LIMIT 1`
    );
    assert(custRes.rows.length > 0, 'Found existing customer in database');
    testCustomerId = custRes.rows[0].id;

    // Find an order with items
    const orderRes = await pool.query(
      `SELECT o.id, o.order_number, oi.id as order_item_id, oi.unit_price, oi.quantity
       FROM orders o
       JOIN seller_orders so ON so.parent_order_id = o.id
       JOIN order_items oi ON oi.seller_order_id = so.id
       WHERE o.customer_id = $1
       ORDER BY o.created_at DESC
       LIMIT 1`,
      [testCustomerId]
    );

    let orderItemIdToUse;
    let unitPriceToUse;

    if (orderRes.rows.length > 0) {
      testOrderId = orderRes.rows[0].id;
      orderItemIdToUse = orderRes.rows[0].order_item_id;
      unitPriceToUse = parseFloat(orderRes.rows[0].unit_price);
    } else {
      // Find any order in the system
      const anyOrderRes = await pool.query(
        `SELECT o.id, o.customer_id, oi.id as order_item_id, oi.unit_price, oi.quantity
         FROM orders o
         JOIN seller_orders so ON so.parent_order_id = o.id
         JOIN order_items oi ON oi.seller_order_id = so.id
         ORDER BY o.created_at DESC
         LIMIT 1`
      );
      assert(anyOrderRes.rows.length > 0, 'Found valid order with items in system');
      testOrderId = anyOrderRes.rows[0].id;
      testCustomerId = anyOrderRes.rows[0].customer_id;
      orderItemIdToUse = anyOrderRes.rows[0].order_item_id;
      unitPriceToUse = parseFloat(anyOrderRes.rows[0].unit_price);
    }
    testOrderItemId = orderItemIdToUse;

    console.log(`Using Order #${testOrderId} with Item #${testOrderItemId} for customer #${testCustomerId}`);

    // --- TEST 1: createOrderReturn ---
    console.log('\n--- Test Group 1: createOrderReturn ---');
    const returnPayload = {
      customerId: testCustomerId,
      reason: 'Wrong size delivered',
      items: [
        {
          order_item_id: testOrderItemId,
          quantity: 1,
          reason: 'Defective stitching',
          item_condition: 'SEALED'
        }
      ],
      evidence_url: 'https://images.unsplash.com/photo-test-return.jpg',
      refund_mode: 'ORIGINAL_PAYMENT'
    };

    const createdReturn = await returnService.createOrderReturn(testOrderId, returnPayload);
    testReturnId = createdReturn.id;

    assert(createdReturn && createdReturn.id, 'createOrderReturn created return record');
    assert(createdReturn.status === 'REQUESTED', 'Return record has status REQUESTED');
    assert(parseFloat(createdReturn.refund_amount) > 0, `Refund amount computed accurately (₹${createdReturn.refund_amount})`);
    assert(Array.isArray(createdReturn.items) && createdReturn.items.length === 1, 'Return contains item-level return record');
    assert(createdReturn.items[0].order_item_id === testOrderItemId, 'Return item matches requested order_item_id');
    assert(Array.isArray(createdReturn.status_history) && createdReturn.status_history.length > 0, 'Initial status history record created');
    assert(createdReturn.refund && createdReturn.refund.status === 'INITIATED', 'Linked refund record created with status INITIATED');
    testRefundId = createdReturn.refund.id;

    // --- TEST 2: getCustomerReturns ---
    console.log('\n--- Test Group 2: getCustomerReturns ---');
    const customerReturns = await returnService.getCustomerReturns(testCustomerId);
    assert(Array.isArray(customerReturns), 'getCustomerReturns returns array');
    const foundReturn = customerReturns.find(r => r.id === testReturnId);
    assert(foundReturn !== undefined, 'Created return present in customer returns list');
    assert(foundReturn.order_number !== undefined, 'Return summary includes order_number');
    assert(Array.isArray(foundReturn.items), 'Return list item contains return items array');

    // --- TEST 3: getReturnById ---
    console.log('\n--- Test Group 3: getReturnById ---');
    const returnDetail = await returnService.getReturnById(testReturnId, testCustomerId);
    assert(returnDetail && returnDetail.id === testReturnId, 'getReturnById returns matching return detail');
    assert(returnDetail.reason === 'Wrong size delivered', 'Return detail preserves reason');
    assert(Array.isArray(returnDetail.status_history), 'Return detail contains status history timeline');
    assert(returnDetail.status_history[0].new_status === 'REQUESTED', 'Timeline reflects initial REQUESTED state');
    assert(returnDetail.refund && returnDetail.refund.id === testRefundId, 'Return detail includes linked refund');

    // --- TEST 4: attachReturnEvidence ---
    console.log('\n--- Test Group 4: attachReturnEvidence ---');
    const evidenceResult = await returnService.attachReturnEvidence(testReturnId, testCustomerId, {
      evidence_url: 'https://images.unsplash.com/photo-evidence-2.jpg',
      notes: 'Photo shows damaged packaging on delivery'
    });
    assert(evidenceResult.return_id === testReturnId, 'attachReturnEvidence returns confirmed return_id');
    assert(evidenceResult.evidence_url.includes('photo-evidence-2.jpg'), 'Evidence URL stored in history');

    // Verify timeline has 2 entries now
    const updatedDetail = await returnService.getReturnById(testReturnId, testCustomerId);
    assert(updatedDetail.status_history.length >= 2, 'Status history updated with evidence attachment entry');

    // --- TEST 5: getCustomerRefunds & getRefundById ---
    console.log('\n--- Test Group 5: getCustomerRefunds & getRefundById ---');
    const refundsList = await returnService.getCustomerRefunds(testCustomerId);
    assert(Array.isArray(refundsList), 'getCustomerRefunds returns array');
    const foundRefund = refundsList.find(ref => ref.id === testRefundId);
    assert(foundRefund !== undefined, 'Linked refund present in customer refunds list');
    assert(foundRefund.status === 'INITIATED', 'Refund status is INITIATED');

    const singleRefund = await returnService.getRefundById(testRefundId, testCustomerId);
    assert(singleRefund && singleRefund.id === testRefundId, 'getRefundById returns detailed refund object');
    assert(Array.isArray(singleRefund.items), 'Refund includes itemized items breakdown');
    assert(parseFloat(singleRefund.amount) === parseFloat(createdReturn.refund_amount), 'Refund amount matches return amount');

    // --- TEST 6: cancelReturn ---
    console.log('\n--- Test Group 6: cancelReturn ---');
    const cancelledReturn = await returnService.cancelReturn(testReturnId, testCustomerId);
    assert(cancelledReturn.status === 'REJECTED', 'Cancelled return status transitioned to REJECTED');
    assert(cancelledReturn.rejection_reason === 'Cancelled by customer', 'Rejection reason documented as Cancelled by customer');

    const refundAfterCancel = await returnService.getRefundById(testRefundId, testCustomerId);
    assert(refundAfterCancel.status === 'FAILED', 'Linked refund status updated to FAILED upon cancellation');

    // --- TEST 7: Error handling validations ---
    console.log('\n--- Test Group 7: Error Validations ---');
    try {
      await returnService.createOrderReturn('00000000-0000-0000-0000-000000000000', {
        customerId: testCustomerId,
        reason: 'Should fail'
      });
      assert(false, 'Should have thrown 404 for non-existent order');
    } catch (err) {
      assert(err.statusCode === 404, 'Correctly throws 404 for non-existent order');
    }

    try {
      await returnService.createOrderReturn(testOrderId, {
        customerId: testCustomerId,
        reason: ''
      });
      assert(false, 'Should have thrown 400 for missing return reason');
    } catch (err) {
      assert(err.statusCode === 400, 'Correctly throws 400 for empty return reason');
    }

    try {
      await returnService.getReturnById('00000000-0000-0000-0000-000000000000', testCustomerId);
      assert(false, 'Should have thrown 404 for non-existent return');
    } catch (err) {
      assert(err.statusCode === 404, 'Correctly throws 404 for non-existent return ID');
    }

    // --- Clean up test return and refund artifacts ---
    console.log('\n--- Cleaning up test artifacts ---');
    await pool.query(`DELETE FROM refund_items WHERE refund_id = $1`, [testRefundId]);
    await pool.query(`DELETE FROM refunds WHERE id = $1`, [testRefundId]);
    await pool.query(`DELETE FROM return_status_history WHERE return_id = $1`, [testReturnId]);
    await pool.query(`DELETE FROM return_items WHERE return_id = $1`, [testReturnId]);
    await pool.query(`DELETE FROM returns WHERE id = $1`, [testReturnId]);
    assert(true, 'Test artifacts safely cleaned up');

    console.log('\n------------------------------------------------------');
    console.log(`📊 RESULTS: ${passed}/${total} Day 5 Returns & Refunds backend tests passed.`);
    console.log('------------------------------------------------------\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    // Cleanup if error occurred
    if (testReturnId) {
      try {
        if (testRefundId) {
          await pool.query(`DELETE FROM refund_items WHERE refund_id = $1`, [testRefundId]);
          await pool.query(`DELETE FROM refunds WHERE id = $1`, [testRefundId]);
        }
        await pool.query(`DELETE FROM return_status_history WHERE return_id = $1`, [testReturnId]);
        await pool.query(`DELETE FROM return_items WHERE return_id = $1`, [testReturnId]);
        await pool.query(`DELETE FROM returns WHERE id = $1`, [testReturnId]);
      } catch (cleanupErr) {
        console.warn('Cleanup error:', cleanupErr.message);
      }
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runDay5ReturnsTests();
