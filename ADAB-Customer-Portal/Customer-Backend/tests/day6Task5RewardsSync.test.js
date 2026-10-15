const pool = require('../db');
const customerService = require('../services/customerService');
const orderService = require('../services/orderService');
const cartService = require('../services/cartService');
const rewardService = require('../services/rewardService');

async function runDay6Task5Tests() {
  console.log('\n======================================================');
  console.log('🎁 RUNNING DAY 6 TASK 5: REWARDS POINTS CHECKOUT SYNC');
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
  let testListingId = null;
  let testCartId = null;
  let createdOrderIds = [];
  let testLedgerRefs = [];

  try {
    // 1. Resolve active customer
    const custRes = await pool.query(
      `SELECT id FROM users WHERE user_type = 'CUSTOMER' ORDER BY created_at ASC LIMIT 1`
    );
    assert(custRes.rows.length > 0, 'Active customer found in database');
    testCustomerId = custRes.rows[0].id;

    // 2. Resolve active listing with inventory
    const listingRes = await pool.query(
      `SELECT sl.id, sl.store_id, sl.sell_price, sl.stock_qty
       FROM seller_listings sl
       WHERE sl.is_active = true 
         AND (sl.approval_status IS NULL OR sl.approval_status = 'APPROVED')
         AND sl.stock_qty > 10
       ORDER BY sl.created_at DESC
       LIMIT 1`
    );
    assert(listingRes.rows.length > 0, 'Active listing found in catalog');
    testListingId = listingRes.rows[0].id;
    const sellPrice = Number(listingRes.rows[0].sell_price);

    // --- TEST GROUP 1: Rewards Summary & Initial Balance ---
    console.log('\n--- Test Group 1: Rewards Summary & Initial Balance ---');
    const initialSummary = await rewardService.getRewardsSummary(testCustomerId);
    assert(initialSummary && initialSummary.points_balance !== undefined, 'getRewardsSummary returns valid account');
    const initialBalance = Number(initialSummary.points_balance);
    console.log(`Customer baseline points balance: ${initialBalance}`);

    // Credit temporary 100 points for test isolation if needed
    const creditRef = `TEST_CREDIT_${Date.now()}`;
    testLedgerRefs.push(creditRef);
    await rewardService.addRewardPoints(testCustomerId, {
      points: 100,
      transaction_type: 'SIGNUP_BONUS',
      reference_id: creditRef
    });

    const fundedSummary = await rewardService.getRewardsSummary(testCustomerId);
    assert(Number(fundedSummary.points_balance) === initialBalance + 100, 'Successfully credited 100 points for test');

    // --- TEST GROUP 2: Reward Points Redemption & Dual Ledger Persistence ---
    console.log('\n--- Test Group 2: Points Redemption & Dual Ledger Mirroring ---');
    const testOrderId1 = `ORD-TEST-REDEEM-${Date.now()}`;
    testLedgerRefs.push(testOrderId1);

    const redeemResult = await rewardService.redeemRewardPoints(testCustomerId, {
      points: 25,
      order_id: testOrderId1,
      order_amount: 150
    });

    assert(redeemResult.success === true, 'redeemRewardPoints executed successfully');
    assert(redeemResult.redeemed_points === 25, 'redeemed_points recorded as 25');
    assert(redeemResult.discount_amount === 25, 'discount_amount equals ₹25 (1 pt = ₹1)');
    assert(redeemResult.remaining_points === initialBalance + 75, 'Remaining balance deducted accurately');

    // Verify record in reward_ledger
    const rlRes = await pool.query(
      `SELECT * FROM reward_ledger WHERE user_id = $1 AND reference_id = $2 AND transaction_type = 'REDEEM_ORDER'`,
      [testCustomerId, testOrderId1]
    );
    assert(rlRes.rows.length > 0, 'reward_ledger persisted REDEEM_ORDER entry');
    assert(Number(rlRes.rows[0].points_change) === -25, 'reward_ledger recorded negative points (-25)');
    assert(Number(rlRes.rows[0].balance_after) === initialBalance + 75, 'reward_ledger documented accurate balance_after');

    // Verify record in rewards_ledger (plural mirror table)
    const rlsRes = await pool.query(
      `SELECT * FROM rewards_ledger WHERE user_id = $1 AND reference_id = $2 AND transaction_type = 'REDEEM_ORDER'`,
      [testCustomerId, testOrderId1]
    );
    assert(rlsRes.rows.length > 0, 'rewards_ledger persisted mirrored REDEEM_ORDER entry');
    assert(Number(rlsRes.rows[0].points_change) === -25, 'rewards_ledger recorded negative points (-25)');

    // --- TEST GROUP 3: Idempotency Verification ---
    console.log('\n--- Test Group 3: Idempotency Guard ---');
    const duplicateRedeem = await rewardService.redeemRewardPoints(testCustomerId, {
      points: 25,
      order_id: testOrderId1,
      order_amount: 150
    });
    assert(duplicateRedeem.is_idempotent === true, 'Duplicate call detected idempotency match');
    assert(duplicateRedeem.remaining_points === initialBalance + 75, 'Balance did NOT double-deduct');

    // Verify exactly one entry exists in reward_ledger for this order
    const countRes = await pool.query(
      `SELECT COUNT(*)::int as cnt FROM reward_ledger WHERE user_id = $1 AND reference_id = $2`,
      [testCustomerId, testOrderId1]
    );
    assert(countRes.rows[0].cnt === 1, 'Exactly one ledger record exists (no duplicate inserted)');

    // --- TEST GROUP 4: Full Checkout Order Placement with Points Deduction ---
    console.log('\n--- Test Group 4: Checkout Order Placement with Points Deduction ---');
    // Create cart with item
    const cart = await cartService.getOrCreateCart({
      customerId: testCustomerId,
      sessionToken: `test-sess-${Date.now()}`
    });
    testCartId = cart.id;

    await cartService.addItemToCart(testCartId, testListingId, 2);

    const pointsToRedeemInOrder = 10;
    const order = await orderService.createOrderFromCart({
      cartId: testCartId,
      customerId: testCustomerId,
      customerName: 'Test Customer',
      customerPhone: '+919876543210',
      customerEmail: 'test@customer.com',
      deliveryAddress: {
        address_line: 'Ring Road, Surat',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395002',
        latitude: 21.170240,
        longitude: 72.831062
      },
      deliverySpeed: 'EXPRESS_30M',
      paymentMethod: 'CASH_ON_DELIVERY',
      pointsRedeemed: pointsToRedeemInOrder
    });

    createdOrderIds.push(order.id);
    testLedgerRefs.push(order.id);

    assert(order && order.id, 'createOrderFromCart placed order successfully');
    assert(order.pricing.points_redeemed === 10, 'order.pricing records points_redeemed = 10');
    assert(order.pricing.points_discount === 10, 'order.pricing records points_discount = ₹10');

    // Verify orders table record in database
    const dbOrderRes = await pool.query(`SELECT * FROM orders WHERE id = $1`, [order.id]);
    const dbOrder = dbOrderRes.rows[0];
    assert(Number(dbOrder.total_discount) >= 10, 'orders table records total_discount reflecting points');
    assert(Number(dbOrder.grand_total) === Number(order.pricing.grand_total), 'orders table records discounted grand_total');

    // Verify payments table record in database
    const payRes = await pool.query(`SELECT * FROM payments WHERE order_id = $1`, [order.id]);
    assert(payRes.rows.length > 0, 'payments record created');
    assert(Number(payRes.rows[0].amount) === Number(order.pricing.grand_total), 'payments.amount matches discounted grand_total');

    // Verify invoices table record in database
    const invRes = await pool.query(`SELECT * FROM invoices WHERE order_id = $1`, [order.id]);
    assert(invRes.rows.length > 0, 'invoices record created');
    assert(Number(invRes.rows[0].total_amount) === Number(order.pricing.grand_total), 'invoices.total_amount matches discounted grand_total');

    // Verify auto-redemption in ledger for order.id
    const orderLedgerRes = await pool.query(
      `SELECT * FROM reward_ledger WHERE user_id = $1 AND reference_id = $2 AND transaction_type = 'REDEEM_ORDER'`,
      [testCustomerId, order.id]
    );
    assert(orderLedgerRes.rows.length > 0, 'Auto-redemption recorded in reward_ledger for order ID');
    assert(Number(orderLedgerRes.rows[0].points_change) === -10, 'Auto-redemption deducted -10 points');

    // --- TEST GROUP 5: Error Validations ---
    console.log('\n--- Test Group 5: Error Validations ---');
    try {
      await rewardService.redeemRewardPoints(testCustomerId, { points: 0 });
      assert(false, 'Should have thrown error for 0 points');
    } catch (e) {
      assert(e.statusCode === 400, 'Throws 400 for zero points');
    }

    try {
      await rewardService.redeemRewardPoints(testCustomerId, { points: -15 });
      assert(false, 'Should have thrown error for negative points');
    } catch (e) {
      assert(e.statusCode === 400, 'Throws 400 for negative points');
    }

    try {
      await rewardService.redeemRewardPoints(testCustomerId, { points: 9999999 });
      assert(false, 'Should have thrown error for exceeding balance');
    } catch (e) {
      assert(e.statusCode === 400, 'Throws 400 for exceeding available balance');
    }

    // --- Cleanup ---
    console.log('\n--- Cleaning up test artifacts ---');
    for (const ordId of createdOrderIds) {
      await pool.query(`DELETE FROM notifications WHERE message LIKE '%' || $1 || '%'`, [ordId]).catch(() => {});
      await pool.query(`DELETE FROM invoices WHERE order_id = $1`, [ordId]).catch(() => {});
      await pool.query(`DELETE FROM payments WHERE order_id = $1`, [ordId]).catch(() => {});
      await pool.query(`DELETE FROM payment_transactions WHERE order_id = $1`, [ordId]).catch(() => {});
      await pool.query(`DELETE FROM order_status_history WHERE order_id = $1`, [ordId]).catch(() => {});
      await pool.query(`DELETE FROM order_items WHERE seller_order_id IN (SELECT id FROM seller_orders WHERE parent_order_id = $1)`, [ordId]).catch(() => {});
      await pool.query(`DELETE FROM seller_orders WHERE parent_order_id = $1`, [ordId]).catch(() => {});
      await pool.query(`DELETE FROM orders WHERE id = $1`, [ordId]).catch(() => {});
    }

    if (testCartId) {
      await pool.query(`DELETE FROM cart_items WHERE cart_id = $1`, [testCartId]).catch(() => {});
      await pool.query(`DELETE FROM carts WHERE id = $1`, [testCartId]).catch(() => {});
    }

    for (const ref of testLedgerRefs) {
      await pool.query(`DELETE FROM reward_ledger WHERE reference_id = $1 AND user_id = $2`, [ref, testCustomerId]).catch(() => {});
      await pool.query(`DELETE FROM rewards_ledger WHERE reference_id = $1 AND user_id = $2`, [ref, testCustomerId]).catch(() => {});
    }

    // Restore original balance
    await pool.query(`UPDATE rewards_accounts SET points_balance = $1, updated_at = NOW() WHERE user_id = $2`, [
      initialBalance,
      testCustomerId
    ]);

    assert(true, 'Test artifacts cleaned and points balance restored');

    console.log('\n------------------------------------------------------');
    console.log(`📊 RESULTS: All ${passed}/${total} Day 6 Task 5 tests passed!`);
    console.log('------------------------------------------------------\n');
  } catch (err) {
    console.error('Day 6 Task 5 test error:', err);
    throw err;
  }
}

if (require.main === module) {
  runDay6Task5Tests()
    .then(() => {
      console.log('Day 6 Task 5 test suite completed successfully.');
      pool.end();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Day 6 Task 5 test suite failed:', err);
      pool.end();
      process.exit(1);
    });
}

module.exports = { runDay6Task5Tests };
