/**
 * Day 5 Backend Task 4: Rewards Ledger & Loyalty Enterprise Integration Tests
 * Validates canonical rewards_accounts and reward_ledger workflows
 */

const assert = require('assert');
const pool = require('../db');
const customerService = require('../services/customerService');
const rewardService = require('../services/rewardService');

let testPassed = 0;
let testFailed = 0;
let testUserId = null;
let initialBalance = 0;
let initialLifetime = 0;

function pass(msg) {
  testPassed++;
  console.log(`✅ [PASS] Test ${testPassed}: ${msg}`);
}

function fail(msg, err) {
  testFailed++;
  console.error(`❌ [FAIL]: ${msg}`, err);
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🏆 RUNNING DAY 5 REWARDS LEDGER ENTERPRISE TESTS');
  console.log('======================================================\n');

  try {
    // 1. Connection & Customer Resolution
    const health = await pool.query('SELECT NOW() as db_time');
    assert(health.rows[0].db_time, 'Database must be connected');
    pass('Database connection established');

    testUserId = await customerService.resolveCustomerUserId();
    assert(testUserId, 'Must resolve a valid customer ID');
    pass(`Resolved customer ID: ${testUserId}`);

    // Snapshot current rewards account for test customer
    const snapAcc = await pool.query(`SELECT * FROM rewards_accounts WHERE user_id = $1`, [testUserId]);
    if (snapAcc.rows.length > 0) {
      initialBalance = snapAcc.rows[0].points_balance || 0;
      initialLifetime = snapAcc.rows[0].lifetime_earned || 0;
    }

    // --- Test Group 1: Tier Calculation & Progression ---
    console.log('\n--- Test Group 1: Tier Progression Logic ---');
    assert.strictEqual(rewardService.calculateTier(0), 'BRONZE');
    pass('0 points correctly classified as BRONZE');

    assert.strictEqual(rewardService.calculateTier(499), 'BRONZE');
    pass('499 points correctly classified as BRONZE');

    assert.strictEqual(rewardService.calculateTier(500), 'SILVER');
    pass('500 points correctly classified as SILVER');

    assert.strictEqual(rewardService.calculateTier(1999), 'SILVER');
    pass('1999 points correctly classified as SILVER');

    assert.strictEqual(rewardService.calculateTier(2000), 'GOLD');
    pass('2000 points correctly classified as GOLD');

    assert.strictEqual(rewardService.calculateTier(10000), 'GOLD');
    pass('10000 points correctly classified as GOLD');

    const bronzeInfo = rewardService.getTierInfo('BRONZE', 100);
    assert.strictEqual(bronzeInfo.points_to_next_tier, 400);
    pass('BRONZE tier correctly computes 400 points to next tier (SILVER)');

    const silverInfo = rewardService.getTierInfo('SILVER', 1200);
    assert.strictEqual(silverInfo.points_to_next_tier, 800);
    pass('SILVER tier correctly computes 800 points to next tier (GOLD)');

    const goldInfo = rewardService.getTierInfo('GOLD', 3000);
    assert.strictEqual(goldInfo.next_tier, null);
    assert.strictEqual(goldInfo.points_to_next_tier, 0);
    pass('GOLD tier is highest tier with 0 points to next tier');

    // --- Test Group 2: getRewardsSummary ---
    console.log('\n--- Test Group 2: getRewardsSummary ---');
    const summary = await rewardService.getRewardsSummary(testUserId);
    assert(summary && summary.id, 'Summary must return account ID');
    pass('getRewardsSummary returns rewards account record');

    assert(typeof summary.points_balance === 'number', 'points_balance must be a number');
    pass(`Active points balance: ${summary.points_balance} pts`);

    assert(typeof summary.lifetime_earned === 'number', 'lifetime_earned must be a number');
    pass(`Lifetime earned points: ${summary.lifetime_earned} pts`);

    assert(['BRONZE', 'SILVER', 'GOLD'].includes(summary.tier), 'tier must be valid enum');
    pass(`Customer loyalty tier: ${summary.tier}`);

    assert(summary.rupee_value !== undefined, 'Rupee value must be computed');
    pass(`Points monetary value: ₹${summary.rupee_value}`);

    assert(summary.tier_benefits && summary.tier_benefits.multiplier, 'Tier benefits included');
    pass(`Tier benefits include multiplier (${summary.tier_benefits.multiplier}) and threshold`);

    assert(Array.isArray(summary.recent_activity), 'recent_activity must be an array');
    pass('Recent activity ledger preview returned');

    // --- Test Group 3: addRewardPoints ---
    console.log('\n--- Test Group 3: addRewardPoints ---');
    const creditResult = await rewardService.addRewardPoints(testUserId, {
      points: 200,
      transaction_type: 'EARN_ORDER',
      reference_id: 'ORD-TEST-001'
    });
    assert(creditResult.account && creditResult.account.points_balance >= 200);
    pass('addRewardPoints successfully credited 200 points to balance');

    assert.strictEqual(creditResult.ledger.transaction_type, 'EARN_ORDER');
    pass('Ledger recorded transaction_type EARN_ORDER');

    assert.strictEqual(creditResult.ledger.points_change, 200);
    pass('Ledger recorded points_change +200');

    assert.strictEqual(creditResult.ledger.reference_id, 'ORD-TEST-001');
    pass('Ledger recorded reference_id');

    // --- Test Group 4: getRewardsLedger ---
    console.log('\n--- Test Group 4: getRewardsLedger ---');
    const ledgerList = await rewardService.getRewardsLedger(testUserId, { limit: 10 });
    assert(Array.isArray(ledgerList.ledger), 'ledger must be an array');
    pass('getRewardsLedger returns audit trail array');

    const foundEntry = ledgerList.ledger.find((e) => e.reference_id === 'ORD-TEST-001');
    assert(foundEntry, 'Credited order points entry found in audit trail');
    pass('Credited order points verified in customer ledger');

    assert(ledgerList.pagination && ledgerList.pagination.total >= 1, 'Pagination metadata returned');
    pass(`Pagination metadata returned (total: ${ledgerList.pagination.total})`);

    // Filter by transaction_type
    const earnEntries = await rewardService.getRewardsLedger(testUserId, { transaction_type: 'EARN_ORDER' });
    assert(earnEntries.ledger.every((e) => e.transaction_type === 'EARN_ORDER'), 'All entries have EARN_ORDER');
    pass('Filter by transaction_type (EARN_ORDER) successfully applied');

    // --- Test Group 5: redeemRewardPoints ---
    console.log('\n--- Test Group 5: redeemRewardPoints ---');
    const preRedeemSummary = await rewardService.getRewardsSummary(testUserId);
    const balanceBefore = preRedeemSummary.points_balance;

    const redeemResult = await rewardService.redeemRewardPoints(testUserId, {
      points: 50,
      order_id: 'ORD-TEST-CHECKOUT',
      order_amount: 500.00
    });

    assert(redeemResult.success === true, 'Redemption must succeed');
    pass('redeemRewardPoints succeeded');

    assert.strictEqual(redeemResult.redeemed_points, 50, 'redeemed_points matches 50');
    pass('Redeemed points confirmed as 50');

    assert.strictEqual(redeemResult.discount_amount, 50.00, 'Discount amount computed as ₹50.00');
    pass('Discount amount computed as ₹50.00');

    assert.strictEqual(redeemResult.remaining_points, balanceBefore - 50, 'Remaining balance deducted accurately');
    pass(`Balance reduced from ${balanceBefore} to ${redeemResult.remaining_points}`);

    assert.strictEqual(redeemResult.ledger_entry.transaction_type, 'REDEEM_ORDER');
    pass('Ledger transaction recorded as REDEEM_ORDER');

    assert.strictEqual(redeemResult.ledger_entry.points_change, -50);
    pass('Ledger points_change recorded as negative (-50)');

    // Verify balance in DB matches
    const postRedeemSummary = await rewardService.getRewardsSummary(testUserId);
    assert.strictEqual(postRedeemSummary.points_balance, balanceBefore - 50);
    pass('Database rewards_accounts points_balance strictly matches ledger deduction');

    // --- Test Group 6: Error Validations ---
    console.log('\n--- Test Group 6: Error Validations ---');

    // Non-positive points
    let errZero = null;
    try {
      await rewardService.redeemRewardPoints(testUserId, { points: 0 });
    } catch (e) {
      errZero = e;
    }
    assert(errZero && errZero.statusCode === 400, 'Must throw 400 for points <= 0');
    pass('Correctly throws 400 for points <= 0');

    // Negative points
    let errNeg = null;
    try {
      await rewardService.redeemRewardPoints(testUserId, { points: -25 });
    } catch (e) {
      errNeg = e;
    }
    assert(errNeg && errNeg.statusCode === 400, 'Must throw 400 for negative points');
    pass('Correctly throws 400 for negative points');

    // Points exceeding balance
    let errExceed = null;
    try {
      await rewardService.redeemRewardPoints(testUserId, { points: 999999 });
    } catch (e) {
      errExceed = e;
    }
    assert(errExceed && errExceed.statusCode === 400, 'Must throw 400 for points exceeding balance');
    pass('Correctly throws 400 for redemption exceeding active points balance');

    // Points exceeding order amount
    let errOrderAmt = null;
    try {
      await rewardService.redeemRewardPoints(testUserId, { points: 100, order_amount: 40 });
    } catch (e) {
      errOrderAmt = e;
    }
    assert(errOrderAmt && errOrderAmt.statusCode === 400, 'Must throw 400 when points exceed order total');
    pass('Correctly throws 400 when redemption points exceed order total');

    // --- Cleanup Test Transactions ---
    console.log('\n--- Cleaning up test ledger artifacts ---');
    await pool.query(
      `DELETE FROM reward_ledger WHERE user_id = $1 AND reference_id IN ('ORD-TEST-001', 'ORD-TEST-CHECKOUT')`,
      [testUserId]
    );
    // Restore original balance
    await pool.query(
      `UPDATE rewards_accounts 
       SET points_balance = $1, lifetime_earned = $2, tier = $3, updated_at = NOW()
       WHERE user_id = $4`,
      [initialBalance, initialLifetime, rewardService.calculateTier(initialLifetime), testUserId]
    );
    pass('Test ledger records cleaned and account balance restored');

    console.log('\n------------------------------------------------------');
    console.log(`📊 RESULTS: ${testPassed}/${testPassed + testFailed} Day 5 Rewards Ledger backend tests passed.`);
    console.log('------------------------------------------------------\n');
  } catch (error) {
    fail('Unexpected failure during test execution', error);
  } finally {
    process.exit(testFailed > 0 ? 1 : 0);
  }
}

runTests();
