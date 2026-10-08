/**
 * TEMPORARY DEVELOPMENT AUTHENTICATION
 * NOT PRODUCTION AUTHENTICATION
 * 
 * This middleware acts as a temporary abstraction for the identity layer.
 * Final Seller Login/Auth integration is pending.
 */
function requireSellerAuth(req, res, next) {
  let sellerId = req.headers['x-user-id'];
  let storeId = req.headers['x-store-id'];

  if (!sellerId && !storeId) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing Seller Context' });
  }

  // Temporary mock fallback for legacy Day 2/Day 3 frontend clients that only send store-id
  if (!sellerId) sellerId = '00000000-0000-0000-0000-000000000001';
  if (!storeId) storeId = '00000000-0000-0000-0000-000000000001';

  // Set the authenticated context on the request object.
  // When real auth is integrated, ONLY this file needs to change 
  // (e.g. decoding a JWT to set req.sellerContext).
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
