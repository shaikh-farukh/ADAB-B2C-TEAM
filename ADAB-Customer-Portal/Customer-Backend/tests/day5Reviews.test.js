const pool = require('../db');
const reviewService = require('../services/reviewService');

async function runDay5ReviewsTests() {
  console.log('\n======================================================');
  console.log('⭐ RUNNING DAY 5 VERIFIED REVIEWS ENTERPRISE TESTS');
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
  let testDeliveredOrderId = null;
  let testListingId = null;
  let testReviewId = null;
  let testMediaId = null;
  let createdDeliveredOrder = false;

  try {
    // 1. Setup: Resolve active customer
    const custRes = await pool.query(
      `SELECT id FROM users WHERE user_type = 'CUSTOMER' ORDER BY created_at ASC LIMIT 1`
    );
    assert(custRes.rows.length > 0, 'Found existing customer in database');
    testCustomerId = custRes.rows[0].id;

    // 2. Find a DELIVERED order for this customer with order_items
    let deliveredOrderRes = await pool.query(
      `SELECT o.id, o.order_number, oi.id as order_item_id, oi.listing_id
       FROM orders o
       JOIN seller_orders so ON so.parent_order_id = o.id
       JOIN order_items oi ON oi.seller_order_id = so.id
       WHERE o.customer_id = $1 AND o.order_status = 'DELIVERED'
       ORDER BY o.created_at DESC
       LIMIT 1`,
      [testCustomerId]
    );

    if (deliveredOrderRes.rows.length > 0) {
      testDeliveredOrderId = deliveredOrderRes.rows[0].id;
      testListingId = deliveredOrderRes.rows[0].listing_id;
    } else {
      // Find an active listing and create a delivered order for testing
      const listingRes = await pool.query(
        `SELECT sl.id, sl.store_id, sl.sell_price, sl.title
         FROM seller_listings sl
         WHERE sl.is_active = true
         LIMIT 1`
      );
      assert(listingRes.rows.length > 0, 'Found active seller listing');
      testListingId = listingRes.rows[0].id;
      const storeId = listingRes.rows[0].store_id;
      const price = parseFloat(listingRes.rows[0].sell_price) || 50;

      // Create test delivered order
      const ordRes = await pool.query(
        `INSERT INTO orders (
          order_number, customer_id, delivery_address, delivery_mode,
          total_mrp, total_discount, delivery_fee, grand_total,
          payment_method, payment_status, order_status, eta_minutes, created_at, updated_at
        ) VALUES (
          'ORD-TEST-DELIV-1', $1, '{"address":"Test Delivery St"}', 'EXPRESS_30M',
          $2, 0, 0, $2, 'CARD', 'PAID', 'DELIVERED', 0, NOW(), NOW()
        ) RETURNING id`,
        [testCustomerId, price]
      );
      testDeliveredOrderId = ordRes.rows[0].id;

      const soRes = await pool.query(
        `INSERT INTO seller_orders (parent_order_id, store_id, subtotal, seller_payout_amount, status, created_at)
         VALUES ($1, $2, $3, $3, 'DELIVERED', NOW())
         RETURNING id`,
        [testDeliveredOrderId, storeId, price]
      );

      await pool.query(
        `INSERT INTO order_items (seller_order_id, listing_id, product_name, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, 1, $4, $4)`,
        [soRes.rows[0].id, testListingId, listingRes.rows[0].title, price]
      );

      createdDeliveredOrder = true;
    }

    console.log(`Using Customer #${testCustomerId}, Delivered Order #${testDeliveredOrderId}, Listing #${testListingId}`);

    // --- TEST 1: getPendingReviews ---
    console.log('\n--- Test Group 1: getPendingReviews ---');
    const pendingList = await reviewService.getPendingReviews(testCustomerId);
    assert(Array.isArray(pendingList), 'getPendingReviews returns array');
    const itemPending = pendingList.find(p => p.order_id === testDeliveredOrderId && p.listing_id === testListingId);
    assert(itemPending !== undefined, 'Delivered order item appears in pending reviews list');
    assert(itemPending.product_name !== undefined, 'Pending review includes product name');

    // --- TEST 2: createVerifiedReview ---
    console.log('\n--- Test Group 2: createVerifiedReview ---');
    const reviewPayload = {
      customerId: testCustomerId,
      order_id: testDeliveredOrderId,
      rating: 5,
      title: 'Outstanding quality and fast delivery!',
      comment: 'The product exceeded expectations. Fresh and securely packed.',
      media_urls: ['https://images.unsplash.com/photo-review-1.jpg']
    };

    const createdReview = await reviewService.createVerifiedReview(testListingId, reviewPayload);
    testReviewId = createdReview.id;

    assert(createdReview && createdReview.id, 'createVerifiedReview created review record');
    assert(createdReview.rating === 5, 'Review rating saved as 5');
    assert(createdReview.verified_purchase === true, 'Review marked as verified purchase');
    assert(Array.isArray(createdReview.media) && createdReview.media.length === 1, 'Review media attached successfully');

    // Verify item is NO LONGER in pending reviews list
    const pendingAfterReview = await reviewService.getPendingReviews(testCustomerId);
    const itemStillPending = pendingAfterReview.find(p => p.order_id === testDeliveredOrderId && p.listing_id === testListingId);
    assert(itemStillPending === undefined, 'Reviewed item automatically removed from pending reviews list');

    // --- TEST 3: getProductReviews ---
    console.log('\n--- Test Group 3: getProductReviews ---');
    const productReviews = await reviewService.getProductReviews(testListingId);
    assert(Array.isArray(productReviews.reviews), 'getProductReviews returns reviews array');
    const foundReview = productReviews.reviews.find(r => r.id === testReviewId);
    assert(foundReview !== undefined, 'Created review present in product reviews list');
    assert(foundReview.customer_name !== undefined, 'Review includes customer name');
    assert(foundReview.is_verified_purchase === true, 'Review displays verified purchase badge');
    assert(Array.isArray(foundReview.media), 'Review includes attached media');
    assert(productReviews.summary && productReviews.summary.total_reviews >= 1, 'Summary contains total_reviews count');
    assert(productReviews.summary.average_rating > 0, `Summary contains average rating (${productReviews.summary.average_rating})`);
    assert(productReviews.summary.breakdown && productReviews.summary.breakdown[5] >= 1, 'Summary breakdown shows 5-star count');

    // --- TEST 4: updateReview ---
    console.log('\n--- Test Group 4: updateReview ---');
    const updatedReview = await reviewService.updateReview(testReviewId, testCustomerId, {
      rating: 4,
      title: 'Very good product overall',
      comment: 'Updated review: great fabric quality, slightly delayed courier.'
    });
    assert(updatedReview.id === testReviewId, 'updateReview returns matching review record');
    assert(updatedReview.rating === 4, 'Review rating updated to 4');
    assert(updatedReview.title === 'Very good product overall', 'Review title updated');

    // --- TEST 5: addReviewMedia ---
    console.log('\n--- Test Group 5: addReviewMedia ---');
    const addedMedia = await reviewService.addReviewMedia(testReviewId, testCustomerId, {
      media_url: 'https://images.unsplash.com/photo-review-unboxing.jpg',
      media_type: 'IMAGE'
    });
    testMediaId = addedMedia.id;
    assert(addedMedia && addedMedia.id, 'addReviewMedia inserted media record in review_media');
    assert(addedMedia.media_url.includes('photo-review-unboxing.jpg'), 'Media URL matches submitted image');

    // Verify review now has 2 media items
    const reviewsWithMedia = await reviewService.getProductReviews(testListingId);
    const revWithMedia = reviewsWithMedia.reviews.find(r => r.id === testReviewId);
    assert(revWithMedia && revWithMedia.media.length >= 2, 'Review reflects multiple media attachments');

    // --- TEST 6: getCustomerReviews ---
    console.log('\n--- Test Group 6: getCustomerReviews ---');
    const myReviews = await reviewService.getCustomerReviews(testCustomerId);
    assert(Array.isArray(myReviews), 'getCustomerReviews returns customer reviews array');
    const myRev = myReviews.find(r => r.id === testReviewId);
    assert(myRev !== undefined, 'Customer reviews list contains created review');
    assert(myRev.product_name !== undefined, 'Customer review summary includes product name');

    // --- TEST 7: Error handling validations ---
    console.log('\n--- Test Group 7: Error Validations ---');
    // Test: Missing order_id
    try {
      await reviewService.createVerifiedReview(testListingId, {
        customerId: testCustomerId,
        rating: 5
      });
      assert(false, 'Should have failed with missing order_id');
    } catch (err) {
      assert(err.statusCode === 400, 'Correctly throws 400 for missing order_id');
    }

    // Test: Invalid rating (out of bounds)
    try {
      await reviewService.createVerifiedReview(testListingId, {
        customerId: testCustomerId,
        order_id: testDeliveredOrderId,
        rating: 6
      });
      assert(false, 'Should have failed with rating > 5');
    } catch (err) {
      assert(err.statusCode === 400, 'Correctly throws 400 for rating > 5');
    }

    // Test: Non-delivered order
    const nonDelivOrd = await pool.query(
      `INSERT INTO orders (
        order_number, customer_id, delivery_address, delivery_mode,
        total_mrp, total_discount, delivery_fee, grand_total,
        payment_method, payment_status, order_status, eta_minutes, created_at
      ) VALUES (
        'ORD-TEST-PLACED', $1, '{"address":"Test"}', 'EXPRESS_30M',
        100, 0, 0, 100, 'UPI', 'PENDING', 'PLACED', 25, NOW()
      ) RETURNING id`,
      [testCustomerId]
    );

    try {
      await reviewService.createVerifiedReview(testListingId, {
        customerId: testCustomerId,
        order_id: nonDelivOrd.rows[0].id,
        rating: 5
      });
      assert(false, 'Should have rejected review on non-delivered order');
    } catch (err) {
      assert(err.statusCode === 400, 'Correctly rejects review on non-delivered (PLACED) order');
    }

    // Clean up nonDelivOrd
    await pool.query(`DELETE FROM orders WHERE id = $1`, [nonDelivOrd.rows[0].id]);

    // Clean up test review artifacts
    console.log('\n--- Cleaning up test review artifacts ---');
    if (testReviewId) {
      await pool.query(`DELETE FROM review_media WHERE review_id = $1`, [testReviewId]);
      await pool.query(`DELETE FROM reviews WHERE id = $1`, [testReviewId]);
    }
    if (createdDeliveredOrder && testDeliveredOrderId) {
      await pool.query(`DELETE FROM order_items WHERE seller_order_id IN (SELECT id FROM seller_orders WHERE parent_order_id = $1)`, [testDeliveredOrderId]);
      await pool.query(`DELETE FROM seller_orders WHERE parent_order_id = $1`, [testDeliveredOrderId]);
      await pool.query(`DELETE FROM orders WHERE id = $1`, [testDeliveredOrderId]);
    }
    assert(true, 'Test review artifacts safely cleaned up');

    console.log('\n------------------------------------------------------');
    console.log(`📊 RESULTS: ${passed}/${total} Day 5 Verified Reviews backend tests passed.`);
    console.log('------------------------------------------------------\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    if (testReviewId) {
      try {
        await pool.query(`DELETE FROM review_media WHERE review_id = $1`, [testReviewId]);
        await pool.query(`DELETE FROM reviews WHERE id = $1`, [testReviewId]);
      } catch (cleanupErr) {
        console.warn('Cleanup error:', cleanupErr.message);
      }
    }
    if (createdDeliveredOrder && testDeliveredOrderId) {
      try {
        await pool.query(`DELETE FROM order_items WHERE seller_order_id IN (SELECT id FROM seller_orders WHERE parent_order_id = $1)`, [testDeliveredOrderId]);
        await pool.query(`DELETE FROM seller_orders WHERE parent_order_id = $1`, [testDeliveredOrderId]);
        await pool.query(`DELETE FROM orders WHERE id = $1`, [testDeliveredOrderId]);
      } catch (cleanupErr) {
        console.warn('Cleanup error:', cleanupErr.message);
      }
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runDay5ReviewsTests();
