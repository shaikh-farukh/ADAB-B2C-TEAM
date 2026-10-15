const pool = require('../db');
const customerService = require('../services/customerService');
const orderService = require('../services/orderService');
const returnService = require('../services/returnService');
const rewardService = require('../services/rewardService');
const notificationService = require('../services/notificationService');

async function runDay6Task4Tests() {
  console.log('\n======================================================');
  console.log('🔔 RUNNING DAY 6 BACKEND TASK 4: REAL-TIME NOTIFICATIONS');
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
  let testReturnId = null;
  let testRefundId = null;
  let createdNotificationIds = [];

  try {
    // 1. Setup: Resolve customer
    const custRes = await pool.query(
      `SELECT id FROM users WHERE user_type = 'CUSTOMER' ORDER BY created_at ASC LIMIT 1`
    );
    assert(custRes.rows.length > 0, 'Active customer found in database');
    testCustomerId = custRes.rows[0].id;

    // Record baseline unread count
    const baselineUnread = await customerService.getUnreadNotificationCount(testCustomerId);
    console.log(`Baseline unread notifications count: ${baselineUnread}`);

    // --- TEST GROUP 1: Order Placement & Confirmation Notification (ORDER_PLACED) ---
    console.log('\n--- Test Group 1: Order Placement Notification (ORDER_PLACED) ---');
    const orderNotif = await notificationService.notifyOrderPlaced(testCustomerId, {
      order_number: 'ORD-TEST-998811',
      grand_total: '129.50'
    });
    createdNotificationIds.push(orderNotif.id);

    assert(orderNotif && orderNotif.id, 'notifyOrderPlaced created notification record');
    assert(orderNotif.title.includes('Order Placed'), 'Title reflects Order Placed');
    assert(orderNotif.message.includes('ORD-TEST-998811'), 'Message includes order number');
    assert(orderNotif.message.includes('129.50'), 'Message includes grand total');
    assert(orderNotif.type === 'ORDER_STATUS', 'Notification type is ORDER_STATUS');
    assert(orderNotif.is_read === false, 'Notification is_read is false initially');

    // Real-Time Sync Check: unread count must increment by 1 immediately
    const unreadAfterOrder = await customerService.getUnreadNotificationCount(testCustomerId);
    assert(unreadAfterOrder === baselineUnread + 1, `Unread count updated immediately (${baselineUnread} -> ${unreadAfterOrder})`);

    // --- TEST GROUP 2: Shipment Status Changes (OUT_FOR_DELIVERY, DELIVERED) ---
    console.log('\n--- Test Group 2: Shipment Telemetry Notifications (OUT_FOR_DELIVERY & DELIVERED) ---');
    const outForDeliveryNotif = await notificationService.notifyShipmentStatus(testCustomerId, {
      orderNumber: 'ORD-TEST-998811',
      status: 'OUT_FOR_DELIVERY',
      courierName: 'Ramesh Patel (Courier)',
      trackingNumber: 'TRK-998811'
    });
    createdNotificationIds.push(outForDeliveryNotif.id);

    assert(outForDeliveryNotif.title.includes('Out For Delivery'), 'Title reflects Out For Delivery');
    assert(outForDeliveryNotif.message.includes('Ramesh Patel'), 'Message includes courier name');
    assert(outForDeliveryNotif.type === 'ORDER_STATUS', 'Type is ORDER_STATUS');

    const deliveredNotif = await notificationService.notifyShipmentStatus(testCustomerId, {
      orderNumber: 'ORD-TEST-998811',
      status: 'DELIVERED'
    });
    createdNotificationIds.push(deliveredNotif.id);

    assert(deliveredNotif.title.includes('Order Delivered'), 'Title reflects Order Delivered');
    assert(deliveredNotif.message.includes('delivered successfully'), 'Message includes delivery confirmation');

    const unreadAfterShipments = await customerService.getUnreadNotificationCount(testCustomerId);
    assert(unreadAfterShipments === baselineUnread + 3, `Unread count updated to ${unreadAfterShipments} (+3)`);

    // --- TEST GROUP 3: Return & Refund Status Notifications (REFUND_PROCESSED) ---
    console.log('\n--- Test Group 3: Return & Refund Notifications (REFUND_PROCESSED) ---');
    const refundNotif = await notificationService.notifyReturnRefundStatus(testCustomerId, {
      orderNumber: 'ORD-TEST-998811',
      status: 'APPROVED',
      refundAmount: '129.50'
    });
    createdNotificationIds.push(refundNotif.id);

    assert(refundNotif.title.includes('Refund Processed'), 'Title confirms Refund Processed');
    assert(refundNotif.message.includes('129.50'), 'Message includes refund amount (₹129.50)');
    assert(refundNotif.action_url === '/returns', 'Action URL points to /returns');

    const unreadAfterRefund = await customerService.getUnreadNotificationCount(testCustomerId);
    assert(unreadAfterRefund === baselineUnread + 4, `Unread count updated to ${unreadAfterRefund} (+4)`);

    // --- TEST GROUP 4: Reward Points Earned & Redeemed (POINTS_EARNED & POINTS_REDEEMED) ---
    console.log('\n--- Test Group 4: Reward Points Notifications ---');
    // Test direct notification methods
    const earnedNotif = await notificationService.notifyPointsEarned(testCustomerId, {
      points: 75,
      newBalance: 325,
      reason: 'order completion'
    });
    createdNotificationIds.push(earnedNotif.id);

    assert(earnedNotif.title.includes('Points Earned'), 'Title confirms Points Earned (+75 Pts)');
    assert(earnedNotif.message.includes('325 pts'), 'Message includes updated balance (325 pts)');
    assert(earnedNotif.type === 'GENERAL', 'Type is GENERAL for points notifications');
    assert(earnedNotif.action_url === '/rewards', 'Action URL points to /rewards');

    const redeemedNotif = await notificationService.notifyPointsRedeemed(testCustomerId, {
      points: 25,
      newBalance: 300,
      discountAmount: 25.00
    });
    createdNotificationIds.push(redeemedNotif.id);

    assert(redeemedNotif.title.includes('Points Redeemed'), 'Title confirms Points Redeemed (-25 Pts)');
    assert(redeemedNotif.message.includes('300 pts'), 'Message includes remaining balance (300 pts)');

    const unreadAfterPoints = await customerService.getUnreadNotificationCount(testCustomerId);
    assert(unreadAfterPoints === baselineUnread + 6, `Unread count updated to ${unreadAfterPoints} (+6)`);

    // --- TEST GROUP 5: Live Reward Service Integration (rewardService.addRewardPoints & redeemRewardPoints) ---
    console.log('\n--- Test Group 5: Reward Service Integration Auto-Notification ---');
    const addPointsResult = await rewardService.addRewardPoints(testCustomerId, {
      points: 50,
      transaction_type: 'EARN_ORDER',
      reference_id: 'TEST_INTEGRATION_EARN'
    });
    assert(addPointsResult && addPointsResult.account, 'rewardService.addRewardPoints executed');

    // Verify notification was auto-generated
    const latestNotif = (await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [testCustomerId]
    )).rows[0];
    createdNotificationIds.push(latestNotif.id);

    assert(latestNotif.title.includes('Points Earned'), 'addRewardPoints auto-dispatched Points Earned notification');
    assert(latestNotif.message.includes('50 reward points'), 'Notification message mentions 50 points');

    // Test redeemRewardPoints auto-notification
    const redeemResult = await rewardService.redeemRewardPoints(testCustomerId, {
      points: 20,
      order_amount: 100
    });
    assert(redeemResult.success === true, 'rewardService.redeemRewardPoints executed');

    const latestRedeemNotif = (await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [testCustomerId]
    )).rows[0];
    createdNotificationIds.push(latestRedeemNotif.id);

    assert(latestRedeemNotif.title.includes('Points Redeemed'), 'redeemRewardPoints auto-dispatched Points Redeemed notification');

    // --- TEST GROUP 6: Real-Time Mark Read & Bulk Read Synchronization ---
    console.log('\n--- Test Group 6: Mark Read & Count Synchronization ---');
    const unreadBeforeRead = await customerService.getUnreadNotificationCount(testCustomerId);
    assert(unreadBeforeRead > 0, 'Unread count is positive before reading');

    // Mark single notification read
    const markedSingle = await customerService.markNotificationRead(testCustomerId, latestRedeemNotif.id);
    assert(markedSingle.is_read === true, 'markNotificationRead marked record is_read = true');

    const unreadAfterSingleRead = await customerService.getUnreadNotificationCount(testCustomerId);
    assert(unreadAfterSingleRead === unreadBeforeRead - 1, `Unread count decremented immediately (${unreadBeforeRead} -> ${unreadAfterSingleRead})`);

    // Fetch list and verify is_read status
    const notificationsList = await customerService.getNotifications(testCustomerId, { limit: 10 });
    const targetInList = notificationsList.find(n => n.id === latestRedeemNotif.id);
    assert(targetInList && targetInList.is_read === true, 'Notification list reflects updated is_read state');

    // Mark all read
    const bulkResult = await customerService.markAllNotificationsRead(testCustomerId);
    assert(bulkResult.updated_count >= 0, `markAllNotificationsRead updated ${bulkResult.updated_count} notifications`);

    const unreadAfterBulk = await customerService.getUnreadNotificationCount(testCustomerId);
    assert(unreadAfterBulk === 0, `Unread count dropped to 0 after markAllNotificationsRead`);

    // --- TEST GROUP 7: Error Validations & Constraints ---
    console.log('\n--- Test Group 7: Error Validations ---');
    try {
      await notificationService.createNotification(testCustomerId, { title: '', message: 'Test' });
      assert(false, 'Should throw for empty title');
    } catch (err) {
      assert(err.message.includes('title is required'), 'Throws validation error for empty title');
    }

    try {
      await notificationService.createNotification(testCustomerId, { title: 'Test', message: '' });
      assert(false, 'Should throw for empty message');
    } catch (err) {
      assert(err.message.includes('message is required'), 'Throws validation error for empty message');
    }

    try {
      await customerService.markNotificationRead(testCustomerId, '00000000-0000-0000-0000-000000000000');
      assert(false, 'Should throw 404 for non-existent notification');
    } catch (err) {
      assert(err.statusCode === 404, 'Throws 404 for non-existent notification ID');
    }

    // --- Cleaning up test artifacts ---
    console.log('\n--- Cleaning up test artifacts ---');
    if (createdNotificationIds.length > 0) {
      await pool.query(
        `DELETE FROM notifications WHERE id = ANY($1::uuid[])`,
        [createdNotificationIds]
      );
    }
    // Clean up test ledger entries for rewards
    await pool.query(
      `DELETE FROM reward_ledger WHERE reference_id IN ('TEST_INTEGRATION_EARN', 'CHECKOUT_REDEEM') AND user_id = $1`,
      [testCustomerId]
    );
    assert(true, 'Test notification artifacts safely cleaned up');

    console.log('\n------------------------------------------------------');
    console.log(`📊 RESULTS: All ${passed}/${total} Day 6 Backend Task 4 tests passed!`);
    console.log('------------------------------------------------------\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    try {
      if (createdNotificationIds.length > 0) {
        await pool.query(
          `DELETE FROM notifications WHERE id = ANY($1::uuid[])`,
          [createdNotificationIds]
        );
      }
    } catch (cleanupErr) {
      console.warn('Cleanup error:', cleanupErr.message);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runDay6Task4Tests();
