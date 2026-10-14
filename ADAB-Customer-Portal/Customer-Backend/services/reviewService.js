const pool = require('../db');
const { resolveCustomerUserId } = require('./customerService');

/**
 * Review Service
 * Manages verified customer reviews, store replies, and review media
 * utilizing canonical PostgreSQL tables:
 * - reviews
 * - review_replies
 * - review_media
 * - seller_listings
 * - orders / order_items
 */

/**
 * List delivered order items awaiting customer review
 */
async function getPendingReviews(customerId, { limit = 50, offset = 0 } = {}) {
  const userId = await resolveCustomerUserId(customerId);

  const res = await pool.query(
    `SELECT 
       oi.id AS order_item_id,
       oi.listing_id,
       oi.product_name,
       oi.unit_price,
       oi.quantity,
       o.id AS order_id,
       o.order_number,
       o.created_at AS order_date,
       so.id AS seller_order_id,
       s.store_name,
       sl.title AS listing_title,
       sl.rating AS listing_rating,
       sl.review_count AS listing_review_count
     FROM orders o
     JOIN seller_orders so ON so.parent_order_id = o.id
     JOIN order_items oi ON oi.seller_order_id = so.id
     LEFT JOIN seller_listings sl ON oi.listing_id = sl.id
     LEFT JOIN stores s ON so.store_id = s.id
     LEFT JOIN reviews r ON r.order_id = o.id 
                        AND r.listing_id = oi.listing_id 
                        AND r.customer_id = o.customer_id
     WHERE o.customer_id = $1
       AND o.order_status = 'DELIVERED'
       AND r.id IS NULL
     ORDER BY o.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return res.rows;
}

/**
 * Submit verified review
 * Verifies that the order exists, belongs to user, and was DELIVERED
 */
async function createVerifiedReview(productIdOrListingId, { customerId, order_id, rating, title = '', comment = '', media_urls = [] } = {}) {
  if (!productIdOrListingId) {
    const err = new Error('Product or Listing ID is required');
    err.statusCode = 400;
    throw err;
  }

  const numRating = parseInt(rating, 10);
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    const err = new Error('Rating must be an integer between 1 and 5');
    err.statusCode = 400;
    throw err;
  }

  if (!order_id) {
    const err = new Error('order_id is required to submit a verified purchase review');
    err.statusCode = 400;
    throw err;
  }

  const userId = await resolveCustomerUserId(customerId);

  // 1. Resolve listing_id
  let targetListingId = productIdOrListingId;
  const listingCheck = await pool.query(
    `SELECT id, master_catalog_id, title FROM seller_listings WHERE id = $1 LIMIT 1`,
    [productIdOrListingId]
  );

  if (listingCheck.rows.length === 0) {
    // Check if ID is master_catalog_items.id
    const catalogCheck = await pool.query(
      `SELECT id FROM seller_listings WHERE master_catalog_id = $1 LIMIT 1`,
      [productIdOrListingId]
    );
    if (catalogCheck.rows.length > 0) {
      targetListingId = catalogCheck.rows[0].id;
    } else {
      const err = new Error(`Listing or Product #${productIdOrListingId} not found`);
      err.statusCode = 404;
      throw err;
    }
  }

  // 2. Verify order exists and belongs to customer
  const orderRes = await pool.query(
    `SELECT id, order_number, order_status, customer_id FROM orders WHERE id = $1 LIMIT 1`,
    [order_id]
  );

  if (orderRes.rows.length === 0) {
    const err = new Error(`Order #${order_id} not found`);
    err.statusCode = 404;
    throw err;
  }

  const order = orderRes.rows[0];
  if (order.customer_id !== userId) {
    const err = new Error(`Order #${order_id} does not belong to the authenticated customer`);
    err.statusCode = 403;
    throw err;
  }

  // 3. Verify order was DELIVERED
  if (order.order_status !== 'DELIVERED') {
    const err = new Error(`Only delivered orders can be reviewed. Current order status is '${order.order_status}'`);
    err.statusCode = 400;
    throw err;
  }

  // 4. Verify item was in the order
  const orderItemRes = await pool.query(
    `SELECT oi.id, oi.listing_id, oi.product_name
     FROM order_items oi
     JOIN seller_orders so ON oi.seller_order_id = so.id
     WHERE so.parent_order_id = $1 AND oi.listing_id = $2
     LIMIT 1`,
    [order_id, targetListingId]
  );

  if (orderItemRes.rows.length === 0) {
    const err = new Error(`Product #${productIdOrListingId} was not part of order #${order.order_number}`);
    err.statusCode = 400;
    throw err;
  }

  // 5. Check for duplicate review on the same order & listing
  const existingReview = await pool.query(
    `SELECT id FROM reviews WHERE order_id = $1 AND listing_id = $2 AND customer_id = $3 LIMIT 1`,
    [order_id, targetListingId, userId]
  );

  let reviewRecord;
  if (existingReview.rows.length > 0) {
    // Update existing review
    const updateRes = await pool.query(
      `UPDATE reviews
       SET rating = $1, title = $2, comment = $3, created_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [numRating, (title || '').trim(), (comment || '').trim(), existingReview.rows[0].id]
    );
    reviewRecord = updateRes.rows[0];
  } else {
    // Insert new review
    const insertRes = await pool.query(
      `INSERT INTO reviews (
        listing_id, customer_id, order_id, rating, title, comment, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *`,
      [targetListingId, userId, order_id, numRating, (title || '').trim(), (comment || '').trim()]
    );
    reviewRecord = insertRes.rows[0];
  }

  // 6. Handle media URLs if provided
  const savedMedia = [];
  if (Array.isArray(media_urls) && media_urls.length > 0) {
    for (const url of media_urls) {
      if (url && typeof url === 'string') {
        const mediaRes = await pool.query(
          `INSERT INTO review_media (review_id, media_url, media_type, created_at)
           VALUES ($1, $2, 'IMAGE', NOW())
           RETURNING *`,
          [reviewRecord.id, url.trim()]
        );
        savedMedia.push(mediaRes.rows[0]);
      }
    }
  }

  // 7. Update seller listing average rating & count
  await pool.query(
    `UPDATE seller_listings
     SET rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE listing_id = $1),
         review_count = (SELECT COUNT(*)::int FROM reviews WHERE listing_id = $1)
     WHERE id = $1`,
    [targetListingId]
  );

  return {
    ...reviewRecord,
    verified_purchase: true,
    media: savedMedia
  };
}

/**
 * Fetch paginated reviews for a listing/product
 */
async function getProductReviews(productIdOrListingId, { limit = 20, offset = 0, sort = 'newest' } = {}) {
  if (!productIdOrListingId) {
    const err = new Error('Product or Listing ID is required');
    err.statusCode = 400;
    throw err;
  }

  let orderBy = 'r.created_at DESC';
  if (sort === 'highest') orderBy = 'r.rating DESC, r.created_at DESC';
  if (sort === 'lowest') orderBy = 'r.rating ASC, r.created_at DESC';

  const reviewsRes = await pool.query(
    `SELECT 
       r.*,
       u.full_name AS customer_name,
       u.avatar_url AS customer_avatar,
       (CASE WHEN r.order_id IS NOT NULL THEN true ELSE false END) AS is_verified_purchase
     FROM reviews r
     JOIN users u ON r.customer_id = u.id
     WHERE r.listing_id = $1 OR r.listing_id IN (
       SELECT id FROM seller_listings WHERE master_catalog_id = $1
     )
     ORDER BY ${orderBy}
     LIMIT $2 OFFSET $3`,
    [productIdOrListingId, limit, offset]
  );

  const reviews = [];
  for (const rev of reviewsRes.rows) {
    // Attach media
    const mediaRes = await pool.query(
      `SELECT id, media_url, media_type, created_at FROM review_media WHERE review_id = $1`,
      [rev.id]
    );

    // Attach store replies
    const repliesRes = await pool.query(
      `SELECT rr.*, s.store_name, s.id as store_id
       FROM review_replies rr
       LEFT JOIN stores s ON rr.store_id = s.id
       WHERE rr.review_id = $1
       ORDER BY rr.created_at ASC`,
      [rev.id]
    );

    reviews.push({
      ...rev,
      media: mediaRes.rows,
      replies: repliesRes.rows
    });
  }

  // Summary aggregation
  const summaryRes = await pool.query(
    `SELECT 
       COUNT(*)::int AS total_reviews,
       COALESCE(ROUND(AVG(rating)::numeric, 2), 5.00) AS average_rating,
       COUNT(*) FILTER (WHERE rating = 5)::int AS stars_5,
       COUNT(*) FILTER (WHERE rating = 4)::int AS stars_4,
       COUNT(*) FILTER (WHERE rating = 3)::int AS stars_3,
       COUNT(*) FILTER (WHERE rating = 2)::int AS stars_2,
       COUNT(*) FILTER (WHERE rating = 1)::int AS stars_1
     FROM reviews
     WHERE listing_id = $1 OR listing_id IN (
       SELECT id FROM seller_listings WHERE master_catalog_id = $1
     )`,
    [productIdOrListingId]
  );

  const summary = summaryRes.rows[0] || {
    total_reviews: 0,
    average_rating: 5.0,
    stars_5: 0,
    stars_4: 0,
    stars_3: 0,
    stars_2: 0,
    stars_1: 0
  };

  return {
    reviews,
    summary: {
      total_reviews: summary.total_reviews,
      average_rating: parseFloat(summary.average_rating),
      breakdown: {
        5: summary.stars_5,
        4: summary.stars_4,
        3: summary.stars_3,
        2: summary.stars_2,
        1: summary.stars_1
      }
    }
  };
}

/**
 * Update existing customer review
 */
async function updateReview(reviewId, customerId, { rating, title, comment } = {}) {
  if (!reviewId) {
    const err = new Error('Review ID is required');
    err.statusCode = 400;
    throw err;
  }

  const userId = await resolveCustomerUserId(customerId);

  const existingRes = await pool.query(
    `SELECT * FROM reviews WHERE id = $1 AND customer_id = $2 LIMIT 1`,
    [reviewId, userId]
  );

  if (existingRes.rows.length === 0) {
    const checkExists = await pool.query(`SELECT id FROM reviews WHERE id = $1`, [reviewId]);
    if (checkExists.rows.length === 0) {
      const err = new Error(`Review #${reviewId} not found`);
      err.statusCode = 404;
      throw err;
    } else {
      const err = new Error(`Unauthorized access to review #${reviewId}`);
      err.statusCode = 403;
      throw err;
    }
  }

  let numRating = undefined;
  if (rating !== undefined && rating !== null) {
    numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      const err = new Error('Rating must be an integer between 1 and 5');
      err.statusCode = 400;
      throw err;
    }
  }

  const updateRes = await pool.query(
    `UPDATE reviews
     SET rating = COALESCE($1, rating),
         title = COALESCE($2, title),
         comment = COALESCE($3, comment)
     WHERE id = $4
     RETURNING *`,
    [numRating, title !== undefined ? title.trim() : null, comment !== undefined ? comment.trim() : null, reviewId]
  );

  const updatedReview = updateRes.rows[0];

  // Recalculate listing rating
  await pool.query(
    `UPDATE seller_listings
     SET rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE listing_id = $1)
     WHERE id = $1`,
    [updatedReview.listing_id]
  );

  return updatedReview;
}

/**
 * Save review media links (photos/videos)
 */
async function addReviewMedia(reviewId, customerId, { media_url, media_type = 'IMAGE' } = {}) {
  if (!reviewId) {
    const err = new Error('Review ID is required');
    err.statusCode = 400;
    throw err;
  }

  if (!media_url || !media_url.trim()) {
    const err = new Error('media_url is required');
    err.statusCode = 400;
    throw err;
  }

  const userId = await resolveCustomerUserId(customerId);

  const reviewRes = await pool.query(
    `SELECT id FROM reviews WHERE id = $1 AND customer_id = $2 LIMIT 1`,
    [reviewId, userId]
  );

  if (reviewRes.rows.length === 0) {
    const checkExists = await pool.query(`SELECT id FROM reviews WHERE id = $1`, [reviewId]);
    if (checkExists.rows.length === 0) {
      const err = new Error(`Review #${reviewId} not found`);
      err.statusCode = 404;
      throw err;
    } else {
      const err = new Error(`Unauthorized access to review #${reviewId}`);
      err.statusCode = 403;
      throw err;
    }
  }

  const validMediaType = media_type && media_type.toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE';

  const insertRes = await pool.query(
    `INSERT INTO review_media (review_id, media_url, media_type, created_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING *`,
    [reviewId, media_url.trim(), validMediaType]
  );

  return insertRes.rows[0];
}

/**
 * List all reviews created by authenticated customer
 */
async function getCustomerReviews(customerId, { limit = 50, offset = 0 } = {}) {
  const userId = await resolveCustomerUserId(customerId);

  const res = await pool.query(
    `SELECT 
       r.*,
       sl.title AS product_name,
       sl.sell_price,
       s.store_name,
       o.order_number
     FROM reviews r
     JOIN seller_listings sl ON r.listing_id = sl.id
     LEFT JOIN stores s ON sl.store_id = s.id
     LEFT JOIN orders o ON r.order_id = o.id
     WHERE r.customer_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const reviews = [];
  for (const rev of res.rows) {
    const mediaRes = await pool.query(
      `SELECT id, media_url, media_type FROM review_media WHERE review_id = $1`,
      [rev.id]
    );
    const repliesRes = await pool.query(
      `SELECT rr.*, s.store_name, s.id as store_id
       FROM review_replies rr
       LEFT JOIN stores s ON rr.store_id = s.id
       WHERE rr.review_id = $1
       ORDER BY rr.created_at ASC`,
      [rev.id]
    );
    reviews.push({
      ...rev,
      media: mediaRes.rows,
      replies: repliesRes.rows
    });
  }

  return reviews;
}

module.exports = {
  getPendingReviews,
  createVerifiedReview,
  getProductReviews,
  updateReview,
  addReviewMedia,
  getCustomerReviews
};
