const jwt = require('jsonwebtoken');
const rewardService = require('../services/rewardService');
const { formatError } = require('../utils/errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'adab_customer_portal_jwt_secret_2026';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getCustomerId = (req) => {
  if (req.userId) return req.userId;
  if (req.user && (req.user.id || req.user.userId)) return req.user.id || req.user.userId;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.id || decoded.userId || decoded.customerId || decoded.sub;
      } catch (err) {
        return null;
      }
    }
  }

  const rawId = req.headers['x-user-id'] ||
    req.headers['x-customer-id'] ||
    (req.query && req.query.customer_id) ||
    (req.body && req.body.customer_id) ||
    null;
  if (!rawId) return null;
  return UUID_REGEX.test(rawId) ? rawId : null;
};

/**
 * Fetch customer's active points balance, tier, and lifetime earned
 * GET /api/v1/customers/me/rewards
 * GET /api/v1/rewards
 */
async function getRewardsSummary(req, res) {
  try {
    const customerId = getCustomerId(req);
    const summary = await rewardService.getRewardsSummary(customerId);

    return res.json({
      status: 'success',
      data: summary
    });
  } catch (error) {
    console.error('Error fetching rewards summary:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

/**
 * Fetch chronological points audit log
 * GET /api/v1/customers/me/rewards/ledger
 * GET /api/v1/rewards/ledger
 */
async function getRewardsLedger(req, res) {
  try {
    const customerId = getCustomerId(req);
    const { transaction_type, limit, page } = req.query || {};

    const result = await rewardService.getRewardsLedger(customerId, {
      transaction_type,
      limit,
      page
    });

    return res.json({
      status: 'success',
      data: result.ledger,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching rewards ledger:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

/**
 * Validate & apply reward points to checkout/order discount
 * POST /api/v1/customers/me/rewards/redeem
 * POST /api/v1/rewards/redeem
 */
async function redeemRewardPoints(req, res) {
  try {
    const customerId = getCustomerId(req);
    const { points, order_id, order_amount } = req.body || {};

    const redemption = await rewardService.redeemRewardPoints(customerId, {
      points,
      order_id,
      order_amount
    });

    return res.status(200).json({
      status: 'success',
      message: 'Reward points redeemed successfully',
      data: redemption
    });
  } catch (error) {
    console.error('Error redeeming reward points:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

module.exports = {
  getRewardsSummary,
  getRewardsLedger,
  redeemRewardPoints
};
