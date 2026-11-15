const jwt = require('jsonwebtoken');
const reviewService = require('../services/reviewService');
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
 * List delivered order items awaiting customer review
 * GET /api/v1/customers/me/reviews/pending
 */
async function getPendingReviews(req, res) {
  try {
    const customerId = getCustomerId(req);
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const pending = await reviewService.getPendingReviews(customerId, { limit, offset });

    return res.json({
      status: 'success',
      data: pending
    });
  } catch (error) {
    console.error('Error fetching pending reviews:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

/**
 * Submit verified review
 * POST /api/v1/products/:id/reviews
 */
async function createVerifiedReview(req, res) {
  try {
    const { id } = req.params;
    const customerId = getCustomerId(req);
    const { order_id, rating, title, comment, media_urls } = req.body || {};

    const review = await reviewService.createVerifiedReview(id, {
      customerId,
      order_id,
      rating,
      title,
      comment,
      media_urls
    });

    return res.status(201).json({
      status: 'success',
      message: 'Verified review submitted successfully',
      data: review
    });
  } catch (error) {
    console.error('Error creating verified review:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

/**
 * Fetch paginated reviews for a listing/product
 * GET /api/v1/products/:id/reviews
 */
async function getProductReviews(req, res) {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const sort = req.query.sort || 'newest';

    const result = await reviewService.getProductReviews(id, { limit, offset, sort });

    return res.json({
      status: 'success',
      data: result.reviews,
      summary: result.summary
    });
  } catch (error) {
    console.error('Error fetching product reviews:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

/**
 * Update existing customer review
 * PATCH /api/v1/reviews/:id
 */
async function updateReview(req, res) {
  try {
    const { id } = req.params;
    const customerId = getCustomerId(req);
    const { rating, title, comment } = req.body || {};

    const updated = await reviewService.updateReview(id, customerId, { rating, title, comment });

    return res.json({
      status: 'success',
      message: 'Review updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error updating review:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

/**
 * Save review media links (photos/videos)
 * POST /api/v1/customers/me/reviews/:id/media
 */
async function uploadReviewMedia(req, res) {
  try {
    const { id } = req.params;
    const customerId = getCustomerId(req);
    const { media_url, media_type } = req.body || {};

    const media = await reviewService.addReviewMedia(id, customerId, { media_url, media_type });

    return res.status(201).json({
      status: 'success',
      message: 'Review media attached successfully',
      data: media
    });
  } catch (error) {
    console.error('Error saving review media:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

/**
 * List reviews submitted by authenticated customer
 * GET /api/v1/customers/me/reviews
 */
async function getCustomerReviews(req, res) {
  try {
    const customerId = getCustomerId(req);
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const reviews = await reviewService.getCustomerReviews(customerId, { limit, offset });

    return res.json({
      status: 'success',
      data: reviews
    });
  } catch (error) {
    console.error('Error fetching customer reviews:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

module.exports = {
  getPendingReviews,
  createVerifiedReview,
  getProductReviews,
  updateReview,
  uploadReviewMedia,
  getCustomerReviews
};
