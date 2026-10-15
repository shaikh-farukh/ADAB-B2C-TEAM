const pool = require('../db');
const returnService = require('../services/returnService');

async function runDay6Task3Tests() {
  console.log('\n======================================================');
  console.log('🔄 RUNNING DAY 6 BACKEND TASK 3: RETURNS & REFUNDS SYNC');
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

  let testCustomerId = null;
  let testOrderId = null;
  let testOrderItemId = null;
  let testReturnId = null;
  let testRefundId = null;
  let testSecondReturnId = null;
  let testSecondRefundId = null;

  try {
    // 1. Setup: Resolve active customer
    const custRes = await pool.query(
      `SELECT id FROM users WHERE user_type = 'CUSTOMER' ORDER BY created_at ASC LIMIT 1`
    );
    assert(custRes.rows.length > 0, 'Active customer found in database');
    testCustomerId = custRes.rows[0].id;

    // 2. Find an existing delivered/completed or placed order with items
    const orderRes = await pool.query(
      `SELECT o.id, o.order_number, oi.id as order_item_id, oi.unit_price, oi.quantity
       FROM orders o
       JOIN seller_orders so ON so.parent_order_id = o.id
       JOIN order_items oi ON oi.seller_order_id = so.id
       ORDER BY o.created_at DESC
       LIMIT 1`
    );
    assert(orderRes.rows.length > 0, 'Found valid order with items in system');
    testOrderId = orderRes.rows[0].id;
    testOrderItemId = orderRes.rows[0].order_item_id;
    const unitPrice = parseFloat(orderRes.rows[0].unit_price);

    console.log(`Using Order #${testOrderId} with Item #${testOrderItemId}`);

    // --- TEST GROUP 1: Return Submission & Persistent Records ---
    console.log('\n--- Test Group 1: Return Submission & Persistent Records ---');
    const returnPayload = {
      customerId: testCustomerId,
      reason: 'Product damaged in transit',
      items: [
        {
          order_item_id: testOrderItemId,
          quantity: 1,
          reason: 'Broken seal and dented bottle',
          item_condition: 'DAMAGED'
        }
      ],
      evidence_url: 'https://images.unsplash.com/photo-damaged-pack.jpg',
      refund_mode: 'ORIGINAL_PAYMENT'
    };

    const createdReturn = await returnService.createOrderReturn(testOrderId, returnPayload);
    testReturnId = createdReturn.id;

    assert(createdReturn && createdReturn.id, 'createOrderReturn created persistent return record');
    assert(createdReturn.status === 'REQUESTED', 'Return initial status is REQUESTED');
    assert(parseFloat(createdReturn.refund_amount) > 0, `Refund amount computed accurately (₹${createdReturn.refund_amount})`);

    // Verify return_items in DB
    const itemsDbRes = await pool.query(
      `SELECT * FROM return_items WHERE return_id = $1`,
      [testReturnId]
    );
    assert(itemsDbRes.rows.length === 1, 'return_items record persisted in database');
    assert(itemsDbRes.rows[0].order_item_id === testOrderItemId, 'return_items matches order_item_id');
    assert(itemsDbRes.rows[0].item_condition === 'DAMAGED', 'return_items preserves item_condition');

    // Verify return_status_history in DB
    const historyDbRes = await pool.query(
      `SELECT * FROM return_status_history WHERE return_id = $1 ORDER BY changed_at ASC`,
      [testReturnId]
    );
    assert(historyDbRes.rows.length === 1, 'Initial return_status_history record created');
    assert(historyDbRes.rows[0].new_status === 'REQUESTED', 'Initial history new_status is REQUESTED');
    assert(historyDbRes.rows[0].previous_status === 'NONE', 'Initial history previous_status is NONE');
    assert(historyDbRes.rows[0].notes.includes('Product damaged in transit'), 'History notes record reason');

    // Verify refunds table entry
    const refundDbRes = await pool.query(
      `SELECT * FROM refunds WHERE return_id = $1`,
      [testReturnId]
    );
    assert(refundDbRes.rows.length === 1, 'Initial refund record persisted in refunds table');
    assert(refundDbRes.rows[0].status === 'INITIATED', 'Initial refund status is INITIATED');
    assert(refundDbRes.rows[0].processed_at === null, 'Initial refund processed_at is null');
    assert(parseFloat(refundDbRes.rows[0].amount) === parseFloat(createdReturn.refund_amount), 'Refund amount matches return amount');
    testRefundId = refundDbRes.rows[0].id;

    // Verify refund_items table entry
    const refundItemsRes = await pool.query(
      `SELECT * FROM refund_items WHERE refund_id = $1`,
      [testRefundId]
    );
    assert(refundItemsRes.rows.length === 1, 'refund_items record created');

    // --- TEST GROUP 2: Initial Refund Tracking Endpoint ---
    console.log('\n--- Test Group 2: Initial Refund Tracking Endpoint ---');
    const initialRefund = await returnService.getRefundById(testRefundId, testCustomerId);
    assert(initialRefund && initialRefund.id === testRefundId, 'getRefundById returns matching refund');
    assert(initialRefund.status === 'INITIATED', 'Refund tracking reflects INITIATED status');
    assert(initialRefund.return_status === 'REQUESTED', 'Refund tracking embeds linked return status REQUESTED');
    assert(Array.isArray(initialRefund.items) && initialRefund.items.length === 1, 'Refund tracking embeds itemized items');
    assert(Array.isArray(initialRefund.status_history) && initialRefund.status_history.length >= 1, 'Refund tracking embeds status history timeline');

    // Test querying by return_id directly
    const refundByReturnId = await returnService.getRefundById(testReturnId, testCustomerId);
    assert(refundByReturnId && refundByReturnId.id === testRefundId, 'getRefundById resolves seamlessly when passed return_id');

    // --- TEST GROUP 3: Seller/Admin Approval & Refund Synchronization ---
    console.log('\n--- Test Group 3: Seller/Admin Approval & Refund Synchronization ---');
    console.log('Transitioning return to APPROVED...');
    const approvedReturn = await returnService.updateReturnStatus(testReturnId, 'APPROVED', {
      notes: 'Damaged item photo verified by seller. Full refund approved.'
    });

    assert(approvedReturn.status === 'APPROVED', 'Return status transitioned to APPROVED');

    // Verify return_status_history
    const historyAfterApproval = await pool.query(
      `SELECT * FROM return_status_history WHERE return_id = $1 ORDER BY changed_at ASC`,
      [testReturnId]
    );
    assert(historyAfterApproval.rows.length === 2, 'return_status_history appended APPROVED milestone');
    assert(historyAfterApproval.rows[1].previous_status === 'REQUESTED', 'Milestone records previous_status REQUESTED');
    assert(historyAfterApproval.rows[1].new_status === 'APPROVED', 'Milestone records new_status APPROVED');

    // Verify refunds table transitioned to PROCESSED
    const refundAfterApproval = await returnService.getRefundById(testRefundId, testCustomerId);
    assert(refundAfterApproval.status === 'PROCESSED', 'Linked refund status transitioned from INITIATED -> PROCESSED');
    assert(refundAfterApproval.processed_at !== null, 'Refund processed_at timestamp populated');
    assert(refundAfterApproval.gateway_refund_id !== null, `Refund gateway_refund_id populated (${refundAfterApproval.gateway_refund_id})`);
    assert(refundAfterApproval.return_status === 'APPROVED', 'Refund detail reflects updated return_status APPROVED');

    // Verify notification was sent
    const notifRes = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [testCustomerId]
    );
    assert(notifRes.rows.length > 0, 'Notification generated for customer');
    assert(notifRes.rows[0].title.includes('Return Approved'), 'Notification title confirms Return Approved');

    // --- TEST GROUP 4: Item Picked & Completed Lifecycle ---
    console.log('\n--- Test Group 4: Item Picked & Completed Lifecycle ---');
    console.log('Transitioning return to ITEM_PICKED...');
    const pickedReturn = await returnService.updateReturnStatus(testReturnId, 'ITEM_PICKED', {
      notes: 'Rider picked up parcel from customer'
    });
    assert(pickedReturn.status === 'ITEM_PICKED', 'Return status transitioned to ITEM_PICKED');

    console.log('Transitioning return to COMPLETED...');
    const completedReturn = await returnService.updateReturnStatus(testReturnId, 'COMPLETED', {
      notes: 'Warehouse received and inspected item'
    });
    assert(completedReturn.status === 'COMPLETED', 'Return status transitioned to COMPLETED');
    assert(completedReturn.resolved_at !== null, 'Return resolved_at timestamp populated');

    // Verify final history timeline
    const finalHistoryRes = await pool.query(
      `SELECT * FROM return_status_history WHERE return_id = $1 ORDER BY changed_at ASC`,
      [testReturnId]
    );
    assert(finalHistoryRes.rows.length === 4, 'Complete return_status_history timeline recorded (4 milestones)');
    assert(finalHistoryRes.rows[0].new_status === 'REQUESTED', 'Timeline milestone 1: REQUESTED');
    assert(finalHistoryRes.rows[1].new_status === 'APPROVED', 'Timeline milestone 2: APPROVED');
    assert(finalHistoryRes.rows[2].new_status === 'ITEM_PICKED', 'Timeline milestone 3: ITEM_PICKED');
    assert(finalHistoryRes.rows[3].new_status === 'COMPLETED', 'Timeline milestone 4: COMPLETED');

    const finalRefund = await returnService.getRefundById(testRefundId, testCustomerId);
    assert(finalRefund.status === 'PROCESSED', 'Refund status remains PROCESSED');
    assert(finalRefund.return_status === 'COMPLETED', 'Refund tracking reflects COMPLETED return');

    // --- TEST GROUP 5: Rejection Lifecycle & FAILED Refund ---
    console.log('\n--- Test Group 5: Rejection Lifecycle & FAILED Refund ---');
    // Create a second return to test rejection
    const secondReturnPayload = {
      customerId: testCustomerId,
      reason: 'No longer needed',
      items: [
        {
          order_item_id: testOrderItemId,
          quantity: 1,
          reason: 'Changed mind',
          item_condition: 'OPENED'
        }
      ],
      refund_mode: 'ORIGINAL_PAYMENT'
    };

    const secondReturn = await returnService.createOrderReturn(testOrderId, secondReturnPayload);
    testSecondReturnId = secondReturn.id;
    testSecondRefundId = secondReturn.refund.id;

    assert(secondReturn.status === 'REQUESTED', 'Second return created with status REQUESTED');
    assert(secondReturn.refund.status === 'INITIATED', 'Second refund created with status INITIATED');

    console.log('Transitioning second return to REJECTED...');
    const rejectedReturn = await returnService.updateReturnStatus(testSecondReturnId, 'REJECTED', {
      rejection_reason: 'Return policy period expired'
    });

    assert(rejectedReturn.status === 'REJECTED', 'Return status transitioned to REJECTED');
    assert(rejectedReturn.rejection_reason === 'Return policy period expired', 'Rejection reason documented');
    assert(rejectedReturn.resolved_at !== null, 'Rejection resolved_at timestamp recorded');

    const rejectedRefund = await returnService.getRefundById(testSecondRefundId, testCustomerId);
    assert(rejectedRefund.status === 'FAILED', 'Linked refund status transitioned to FAILED upon rejection');

    // --- TEST GROUP 6: Idempotency Verification ---
    console.log('\n--- Test Group 6: Idempotency Verification ---');
    const historyCountBefore = (await pool.query(
      `SELECT count(*) FROM return_status_history WHERE return_id = $1`,
      [testReturnId]
    )).rows[0].count;

    const idempotentReturn = await returnService.updateReturnStatus(testReturnId, 'COMPLETED');
    assert(idempotentReturn.status === 'COMPLETED', 'Idempotent update preserves COMPLETED status');

    const historyCountAfter = (await pool.query(
      `SELECT count(*) FROM return_status_history WHERE return_id = $1`,
      [testReturnId]
    )).rows[0].count;

    assert(historyCountBefore === historyCountAfter, 'Idempotent call did not create duplicate return_status_history record');

    // --- TEST GROUP 7: Error Validations ---
    console.log('\n--- Test Group 7: Error Validations ---');
    try {
      await returnService.updateReturnStatus(testReturnId, 'INVALID_STATUS');
      assert(false, 'Should have failed with invalid status');
    } catch (err) {
      assert(err.statusCode === 400, 'Throws 400 for invalid return status');
    }

    try {
      await returnService.updateReturnStatus('00000000-0000-0000-0000-000000000000', 'APPROVED');
      assert(false, 'Should have failed with non-existent return ID');
    } catch (err) {
      assert(err.statusCode === 404, 'Throws 404 for non-existent return ID');
    }

    try {
      await returnService.getRefundById('00000000-0000-0000-0000-000000000000', testCustomerId);
      assert(false, 'Should have failed with non-existent refund ID');
    } catch (err) {
      assert(err.statusCode === 404, 'Throws 404 for non-existent refund ID');
    }

    // --- Cleaning up test artifacts ---
    console.log('\n--- Cleaning up test artifacts ---');
    await pool.query(`DELETE FROM refund_items WHERE refund_id IN ($1, $2)`, [testRefundId, testSecondRefundId]);
    await pool.query(`DELETE FROM refunds WHERE id IN ($1, $2)`, [testRefundId, testSecondRefundId]);
    await pool.query(`DELETE FROM return_status_history WHERE return_id IN ($1, $2)`, [testReturnId, testSecondReturnId]);
    await pool.query(`DELETE FROM return_items WHERE return_id IN ($1, $2)`, [testReturnId, testSecondReturnId]);
    await pool.query(`DELETE FROM returns WHERE id IN ($1, $2)`, [testReturnId, testSecondReturnId]);
    assert(true, 'Test artifacts safely cleaned up');

    console.log('\n------------------------------------------------------');
    console.log(`📊 RESULTS: All ${passed}/${total} Day 6 Backend Task 3 tests passed!`);
    console.log('------------------------------------------------------\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    // Cleanup if error occurred
    try {
      const idsToClean = [testRefundId, testSecondRefundId].filter(Boolean);
      const retIdsToClean = [testReturnId, testSecondReturnId].filter(Boolean);
      if (idsToClean.length > 0) {
        await pool.query(`DELETE FROM refund_items WHERE refund_id = ANY($1::uuid[])`, [idsToClean]);
        await pool.query(`DELETE FROM refunds WHERE id = ANY($1::uuid[])`, [idsToClean]);
      }
      if (retIdsToClean.length > 0) {
        await pool.query(`DELETE FROM return_status_history WHERE return_id = ANY($1::uuid[])`, [retIdsToClean]);
        await pool.query(`DELETE FROM return_items WHERE return_id = ANY($1::uuid[])`, [retIdsToClean]);
        await pool.query(`DELETE FROM returns WHERE id = ANY($1::uuid[])`, [retIdsToClean]);
      }
    } catch (cleanupErr) {
      console.warn('Cleanup error:', cleanupErr.message);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runDay6Task3Tests();
