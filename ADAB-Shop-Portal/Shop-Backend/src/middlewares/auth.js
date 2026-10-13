const { verifyToken } = require('../utils/jwt');
const pool = require('../../db');

async function requireSellerAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication token required'
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Malformed authorization header'
    });
  }

  const token = authHeader.slice(7).trim();
  const decoded = verifyToken(token);
  const authUserId = decoded?.userId || decoded?.id;
  if (!decoded || !authUserId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired authentication token'
    });
  }

  try {
    // Resolve trusted seller identity from database
    const userRes = await pool.query(`
      SELECT u.id as user_id, u.user_type, u.status as user_status,
             sp.id as seller_profile_id, sp.kyc_status,
             s.id as store_id
      FROM users u
      LEFT JOIN seller_profiles sp ON sp.user_id = u.id
      LEFT JOIN stores s ON s.seller_id = sp.id
      WHERE u.id = $1
    `, [authUserId]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User account not found'
      });
    }

    const user = userRes.rows[0];

    // Check account status
    if (user.user_status && ['BLOCKED', 'SUSPENDED', 'DEACTIVATED'].includes(String(user.user_status).toUpperCase())) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Account has been suspended or deactivated'
      });
    }

    // Check role / user_type
    if (user.user_type && user.user_type !== 'SELLER') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only seller accounts are authorized to access this portal'
      });
    }

    // Trusted identity resolution:
    // store_id and seller_profile_id are resolved securely from the DB
    const storeId = user.store_id || decoded.storeId || null;
    const sellerProfileId = user.seller_profile_id || null;

    req.sellerContext = {
      userId: user.user_id || user.id || authUserId,
      sellerProfileId: sellerProfileId,
      storeId: storeId,
      kycStatus: user.kyc_status,
      userType: user.user_type
    };

    next();
  } catch (err) {
    console.error('requireSellerAuth error:', err);
    return res.status(500).json({ success: false, error: 'Internal authentication error' });
  }
}

/**
 * Extracts the authenticated seller context from the request.
 * Use this in controllers instead of reading headers directly.
 */
function getAuthenticatedSellerContext(req) {
  if (!req.sellerContext || !req.sellerContext.userId) {
    throw new Error("Seller context not initialized. Ensure requireSellerAuth middleware is applied.");
  }
  return req.sellerContext;
}

module.exports = {
  requireSellerAuth,
  getAuthenticatedSellerContext
};
