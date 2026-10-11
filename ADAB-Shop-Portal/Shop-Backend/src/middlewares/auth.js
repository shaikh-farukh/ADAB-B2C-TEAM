/**
 * TEMPORARY DEVELOPMENT AUTHENTICATION
 * NOT PRODUCTION AUTHENTICATION
 * 
 * This middleware acts as a temporary abstraction for the identity layer.
 * Final Seller Login/Auth integration is pending.
 */
const { verifyToken } = require('../utils/jwt');

function requireSellerAuth(req, res, next) {
  let sellerId = req.headers['x-user-id'] || null;
  let storeId = req.headers['x-store-id'] || null;

  const authHeader = req.headers['authorization'];
  if (authHeader) {
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Malformed authorization header' });
    }
    const token = authHeader.slice(7).trim();
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired authentication token' });
    }
    sellerId = decoded.userId;
    if (decoded.storeId) storeId = decoded.storeId;
  }

  if (!sellerId) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Authentication credentials required' });
  }

  req.sellerContext = {
    userId: sellerId,
    storeId: storeId
  };

  next();
}

/**
 * Extracts the authenticated seller context from the request.
 * Use this in controllers instead of reading headers directly.
 */
function getAuthenticatedSellerContext(req) {
  if (!req.sellerContext) {
    throw new Error("Seller context not initialized. Ensure requireSellerAuth middleware is applied.");
  }
  return req.sellerContext;
}

module.exports = {
  requireSellerAuth,
  getAuthenticatedSellerContext
};
