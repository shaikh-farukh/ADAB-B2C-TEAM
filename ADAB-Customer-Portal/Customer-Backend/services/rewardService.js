const pool = require('../db');
const customerService = require('./customerService');
const { notifyPointsEarned, notifyPointsRedeemed } = require('./notificationService');

const VALID_TRANSACTION_TYPES = ['EARN_ORDER', 'EARN_POS', 'REDEEM_ORDER', 'SIGNUP_BONUS'];

/**
 * Determine loyalty tier from lifetime earned points
 */
function calculateTier(lifetimeEarned) {
  if (lifetimeEarned >= 2000) return 'GOLD';
  if (lifetimeEarned >= 500) return 'SILVER';
  return 'BRONZE';
}

/**
 * Get tier metadata & progression info
 */
function getTierInfo(tier, lifetimeEarned) {
  switch (tier) {
    case 'GOLD':
      return {
        name: 'GOLD',
        multiplier: '1.5x',
        free_delivery_threshold: 0,
        next_tier: null,
        points_to_next_tier: 0,
        perks: ['1.5x Points Multiplier', 'Free Delivery on All Orders', 'Priority Support', 'Exclusive VIP Access']
      };
    case 'SILVER':
      return {
        name: 'SILVER',
        multiplier: '1.25x',
        free_delivery_threshold: 299,
        next_tier: 'GOLD',
        points_to_next_tier: Math.max(0, 2000 - lifetimeEarned),
        perks: ['1.25x Points Multiplier', 'Free Delivery above ₹299', 'Early Access to Sales']
      };
    case 'BRONZE':
    default:
      return {
        name: 'BRONZE',
        multiplier: '1.0x',
        free_delivery_threshold: 499,
        next_tier: 'SILVER',
        points_to_next_tier: Math.max(0, 500 - lifetimeEarned),
        perks: ['1.0x Points Multiplier', 'Free Delivery above ₹499', 'Birthday Treat Coupon']
      };
  }
}

/**
 * Ensure customer has a rewards account record, auto-initializing with existing points or welcome bonus
 */
async function getOrCreateRewardsAccount(userId) {
  const existing = await pool.query(
    `SELECT * FROM rewards_accounts WHERE user_id = $1`,
    [userId]
  );

  if (existing.rows.length > 0) {
    const acc = existing.rows[0];
    const correctTier = calculateTier(acc.lifetime_earned || 0);
    if (acc.tier !== correctTier) {
      const updated = await pool.query(
        `UPDATE rewards_accounts SET tier = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [correctTier, acc.id]
      );
      return updated.rows[0];
    }
    return acc;
  }

  // Calculate existing points from past non-cancelled orders if any
  const orderPointsRes = await pool.query(
    `SELECT COALESCE(SUM(FLOOR(grand_total / 100)), 0)::int as points 
     FROM orders 
     WHERE customer_id = $1 AND order_status != 'CANCELLED'`,
    [userId]
  );
  const earnedFromOrders = orderPointsRes.rows[0]?.points || 0;

  const initialPoints = earnedFromOrders > 0 ? earnedFromOrders : 50; // 50 pts welcome bonus
  const transactionType = earnedFromOrders > 0 ? 'EARN_ORDER' : 'SIGNUP_BONUS';
  const reference = earnedFromOrders > 0 ? 'ORDERS_HISTORY' : 'WELCOME_BONUS';
  const tier = calculateTier(initialPoints);

  const insertRes = await pool.query(
    `INSERT INTO rewards_accounts (user_id, points_balance, lifetime_earned, tier, updated_at)
     VALUES ($1, $2, $2, $3, NOW())
     ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [userId, initialPoints, tier]
  );

  const account = insertRes.rows[0];

  // Log initial ledger entry
  await pool.query(
    `INSERT INTO reward_ledger (user_id, points_change, transaction_type, reference_id, balance_after, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [userId, initialPoints, transactionType, reference, initialPoints]
  );
  try {
    await pool.query(
      `INSERT INTO rewards_ledger (user_id, points_change, transaction_type, reference_id, balance_after, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, initialPoints, transactionType, reference, initialPoints]
    );
  } catch (mirrorErr) {}

  return account;
}

/**
 * Fetch customer's active points balance, tier, and lifetime earned
 * GET /api/v1/customers/me/rewards
 */
async function getRewardsSummary(rawCustomerId) {
  const userId = await customerService.resolveCustomerUserId(rawCustomerId);
  if (!userId) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }

  const account = await getOrCreateRewardsAccount(userId);
  const tierInfo = getTierInfo(account.tier, account.lifetime_earned);

  // Recent 5 transactions preview
  const recentLedger = await pool.query(
    `SELECT id, points_change, transaction_type, reference_id, balance_after, created_at
     FROM reward_ledger
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [userId]
  );

  return {
    id: account.id,
    user_id: account.user_id,
    points_balance: account.points_balance,
    lifetime_earned: account.lifetime_earned,
    tier: account.tier,
    rupee_value: Number(account.points_balance * 1.0).toFixed(2), // 1 Pt = ₹1
    conversion_rate: {
      points_per_rupee: 1,
      min_redeem_points: 10
    },
    tier_benefits: tierInfo,
    recent_activity: recentLedger.rows,
    updated_at: account.updated_at
  };
}

/**
 * Fetch chronological points audit log
 * GET /api/v1/customers/me/rewards/ledger
 */
async function getRewardsLedger(rawCustomerId, query = {}) {
  const userId = await customerService.resolveCustomerUserId(rawCustomerId);
  if (!userId) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }

  // Ensure account exists
  await getOrCreateRewardsAccount(userId);

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const conditions = ['user_id = $1'];
  const params = [userId];
  let paramIdx = 2;

  if (query.transaction_type && query.transaction_type.trim()) {
    const normType = query.transaction_type.trim().toUpperCase();
    if (VALID_TRANSACTION_TYPES.includes(normType)) {
      conditions.push(`transaction_type = $${paramIdx}`);
      params.push(normType);
      paramIdx++;
    }
  }

  const whereClause = conditions.join(' AND ');

  const countQuery = `SELECT COUNT(*)::int as total FROM reward_ledger WHERE ${whereClause}`;
  const countRes = await pool.query(countQuery, params);
  const total = countRes.rows[0]?.total || 0;

  const dataQuery = `
    SELECT 
      id,
      user_id,
      points_change,
      transaction_type,
      reference_id,
      balance_after,
      created_at
    FROM reward_ledger
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  params.push(limit, offset);
  const dataRes = await pool.query(dataQuery, params);

  return {
    ledger: dataRes.rows,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
}

/**
 * Validate & apply reward points to checkout/order discount
 * POST /api/v1/customers/me/rewards/redeem
 */
async function redeemRewardPoints(rawCustomerId, redemptionData = {}) {
  const userId = await customerService.resolveCustomerUserId(rawCustomerId);
  if (!userId) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }

  const { points, order_id, order_amount } = redemptionData;

  const numPoints = parseInt(points, 10);
  if (isNaN(numPoints) || numPoints <= 0) {
    const err = new Error('Points must be a positive integer greater than 0');
    err.statusCode = 400;
    throw err;
  }

  // Use transaction to ensure balance integrity
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch account with row lock
    let accRes = await client.query(
      `SELECT * FROM rewards_accounts WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );

    let account;
    if (accRes.rows.length === 0) {
      // Create account within transaction if missing
      const insertRes = await client.query(
        `INSERT INTO rewards_accounts (user_id, points_balance, lifetime_earned, tier)
         VALUES ($1, 0, 0, 'BRONZE')
         RETURNING *`,
        [userId]
      );
      account = insertRes.rows[0];
    } else {
      account = accRes.rows[0];
    }

    if (account.points_balance < numPoints) {
      const err = new Error(
        `Insufficient reward points balance. You requested ${numPoints} points, but have only ${account.points_balance} points available.`
      );
      err.statusCode = 400;
      throw err;
    }

    // Idempotency check: if order_id is provided and already redeemed, return existing transaction safely
    if (order_id) {
      let existingTx = await client.query(
        `SELECT * FROM reward_ledger WHERE user_id = $1 AND transaction_type = 'REDEEM_ORDER' AND reference_id = $2 LIMIT 1`,
        [userId, String(order_id)]
      );

      // If not found directly, check cross-reference with orders table (matching order UUID or order_number)
      if (existingTx.rows.length === 0) {
        try {
          const ordRes = await client.query(
            `SELECT id, order_number FROM orders WHERE id::text = $1 OR order_number = $1 LIMIT 1`,
            [String(order_id)]
          );
          if (ordRes.rows.length > 0) {
            const ord = ordRes.rows[0];
            existingTx = await client.query(
              `SELECT * FROM reward_ledger 
               WHERE user_id = $1 AND transaction_type = 'REDEEM_ORDER' AND (reference_id = $2 OR reference_id = $3)
               LIMIT 1`,
              [userId, String(ord.id), String(ord.order_number)]
            );
          }
        } catch {}
      }

      if (existingTx.rows.length > 0) {
        await client.query('COMMIT');
        return {
          success: true,
          redeemed_points: Math.abs(existingTx.rows[0].points_change),
          discount_amount: Math.abs(existingTx.rows[0].points_change),
          remaining_points: existingTx.rows[0].balance_after,
          tier: account.tier,
          ledger_entry: existingTx.rows[0],
          is_idempotent: true
        };
      }
    }

    // Optional validation against order amount
    if (order_amount !== undefined && order_amount !== null) {
      const numOrderAmount = Number(order_amount);
      if (!isNaN(numOrderAmount) && numOrderAmount > 0 && numPoints > numOrderAmount) {
        const err = new Error(`Cannot redeem more points (${numPoints}) than the order total (₹${numOrderAmount.toFixed(2)})`);
        err.statusCode = 400;
        throw err;
      }
    }

    const newBalance = account.points_balance - numPoints;
    const discountAmount = numPoints * 1.0; // 1 point = ₹1
    const reference = order_id ? String(order_id) : 'CHECKOUT_REDEEM';

    // 1. Update account balance
    const updatedAccRes = await client.query(
      `UPDATE rewards_accounts
       SET points_balance = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newBalance, account.id]
    );

    // 2. Insert audit record in reward_ledger
    const ledgerRes = await client.query(
      `INSERT INTO reward_ledger (
        user_id,
        points_change,
        transaction_type,
        reference_id,
        balance_after,
        created_at
      ) VALUES ($1, $2, 'REDEEM_ORDER', $3, $4, NOW())
      RETURNING *`,
      [userId, -numPoints, reference, newBalance]
    );

    // Also mirror into rewards_ledger table
    try {
      await client.query(
        `INSERT INTO rewards_ledger (
          user_id,
          points_change,
          transaction_type,
          reference_id,
          balance_after,
          created_at
        ) VALUES ($1, $2, 'REDEEM_ORDER', $3, $4, NOW())`,
        [userId, -numPoints, reference, newBalance]
      );
    } catch (mirrorErr) {}

    await client.query('COMMIT');

    // Real-Time Notification: POINTS_REDEEMED
    try {
      await notifyPointsRedeemed(userId, {
        points: numPoints,
        newBalance,
        discountAmount
      });
    } catch (notifErr) {
      console.warn('Non-blocking points redemption notification error:', notifErr.message);
    }

    return {
      success: true,
      redeemed_points: numPoints,
      discount_amount: discountAmount,
      remaining_points: newBalance,
      tier: updatedAccRes.rows[0].tier,
      ledger_entry: ledgerRes.rows[0]
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Enterprise utility to credit reward points (e.g. upon order delivery or POS purchase)
 */
async function addRewardPoints(userId, { points, transaction_type = 'EARN_ORDER', reference_id }) {
  const numPoints = parseInt(points, 10);
  if (isNaN(numPoints) || numPoints <= 0) {
    throw new Error('Points must be a positive integer');
  }

  if (!VALID_TRANSACTION_TYPES.includes(transaction_type)) {
    throw new Error(`Invalid transaction_type. Allowed: ${VALID_TRANSACTION_TYPES.join(', ')}`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const accRes = await client.query(
      `SELECT * FROM rewards_accounts WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );

    let account;
    if (accRes.rows.length === 0) {
      const tier = calculateTier(numPoints);
      const ins = await client.query(
        `INSERT INTO rewards_accounts (user_id, points_balance, lifetime_earned, tier)
         VALUES ($1, $2, $2, $3)
         RETURNING *`,
        [userId, numPoints, tier]
      );
      account = ins.rows[0];
    } else {
      const current = accRes.rows[0];
      const newBal = current.points_balance + numPoints;
      const newLife = current.lifetime_earned + numPoints;
      const newTier = calculateTier(newLife);
      const upd = await client.query(
        `UPDATE rewards_accounts 
         SET points_balance = $1, lifetime_earned = $2, tier = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [newBal, newLife, newTier, current.id]
      );
      account = upd.rows[0];
    }

    const ledgerRes = await client.query(
      `INSERT INTO reward_ledger (
        user_id,
        points_change,
        transaction_type,
        reference_id,
        balance_after,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *`,
      [userId, numPoints, transaction_type, reference_id || 'ORDER_COMPLETION', account.points_balance]
    );

    // Also mirror into rewards_ledger table
    try {
      await client.query(
        `INSERT INTO rewards_ledger (
          user_id,
          points_change,
          transaction_type,
          reference_id,
          balance_after,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [userId, numPoints, transaction_type, reference_id || 'ORDER_COMPLETION', account.points_balance]
      );
    } catch (mirrorErr) {}

    await client.query('COMMIT');

    // Real-Time Notification: POINTS_EARNED
    try {
      await notifyPointsEarned(userId, {
        points: numPoints,
        newBalance: account.points_balance,
        reason: transaction_type === 'EARN_ORDER' ? 'your recent order' : 'your purchase'
      });
    } catch (notifErr) {
      console.warn('Non-blocking points earned notification error:', notifErr.message);
    }

    return {
      account,
      ledger: ledgerRes.rows[0]
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  calculateTier,
  getTierInfo,
  getOrCreateRewardsAccount,
  getRewardsSummary,
  getRewardsLedger,
  redeemRewardPoints,
  addRewardPoints
};
