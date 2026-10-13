const pool = require('../../db');
const eventService = require('../services/eventService');

function computePriceWaterfall(listing, activePromos = [], activeCoupons = []) {
  const baseSellPrice = parseFloat(listing.sell_price) || 0;
  const mrp = parseFloat(listing.mrp) || baseSellPrice;

  // 1. Promo / Flash Sale discount
  const listingPromos = activePromos.filter(p => String(p.listing_id) === String(listing.id));
  let promoPrice = null;
  let promoTitle = null;
  let promoType = null;
  let promoDiscount = 0;

  if (listingPromos.length > 0) {
    listingPromos.sort((a, b) => parseFloat(a.promo_price) - parseFloat(b.promo_price));
    const bestPromo = listingPromos[0];
    const candidatePrice = parseFloat(bestPromo.promo_price);
    if (!isNaN(candidatePrice) && candidatePrice < baseSellPrice) {
      promoPrice = candidatePrice;
      promoTitle = bestPromo.promo_title;
      promoType = bestPromo.promo_type;
      promoDiscount = Math.max(0, baseSellPrice - promoPrice);
    }
  }

  const priceAfterPromo = promoPrice !== null ? promoPrice : baseSellPrice;

  // 2. Active Coupons
  const applicableCoupons = activeCoupons.filter(c => {
    if (c.applies_to === 'ENTIRE_SHOP') return true;
    if (c.applies_to === 'SPECIFIC_PRODUCTS' && String(c.target_value) === String(listing.id)) return true;
    return false;
  });

  let bestCoupon = null;
  let maxCouponDiscount = 0;

  for (const c of applicableCoupons) {
    const minOrder = parseFloat(c.min_order_value) || 0;
    if (minOrder > 0 && priceAfterPromo < minOrder) {
      continue;
    }

    const val = parseFloat(c.discount_value) || 0;
    let discount = 0;
    if (c.discount_type === 'PERCENTAGE') {
      discount = (priceAfterPromo * val) / 100;
    } else {
      discount = val;
    }

    if (c.max_discount_cap && parseFloat(c.max_discount_cap) > 0) {
      discount = Math.min(discount, parseFloat(c.max_discount_cap));
    }

    discount = Math.min(discount, priceAfterPromo);

    if (discount > maxCouponDiscount) {
      maxCouponDiscount = discount;
      bestCoupon = c;
    }
  }

  const finalCustomerPrice = Math.max(0, priceAfterPromo - maxCouponDiscount);
  const totalDiscount = Math.max(0, baseSellPrice - finalCustomerPrice);
  const totalDiscountPct = baseSellPrice > 0 ? ((totalDiscount / baseSellPrice) * 100).toFixed(1) : '0';

  return {
    listing_id: listing.id,
    sku: listing.sku,
    title: listing.title,
    mrp: mrp.toFixed(2),
    base_sell_price: baseSellPrice.toFixed(2),
    promo_title: promoTitle,
    promo_type: promoType,
    promo_price: promoPrice !== null ? promoPrice.toFixed(2) : null,
    promo_discount: promoDiscount.toFixed(2),
    coupon_code: bestCoupon ? bestCoupon.code : null,
    coupon_type: bestCoupon ? bestCoupon.discount_type : null,
    coupon_value: bestCoupon ? bestCoupon.discount_value : null,
    coupon_discount: maxCouponDiscount.toFixed(2),
    final_customer_price: finalCustomerPrice.toFixed(2),
    seller_realized_price: finalCustomerPrice.toFixed(2), // Realized revenue (stops before platform fees)
    total_discount_amount: totalDiscount.toFixed(2),
    total_discount_pct: totalDiscountPct,
    has_offers: promoPrice !== null || maxCouponDiscount > 0
  };
}

module.exports = {
  getPricingSchedules: async (storeId) => {
    const res = await pool.query(
      `SELECT p.id as promotion_id, pp.listing_id, pp.promo_price as scheduled_price, p.start_date, p.end_date, 
       p.promo_type, p.title as promo_title,
       CASE 
         WHEN p.end_date < NOW() THEN 'EXPIRED'
         WHEN p.start_date <= NOW() AND p.end_date >= NOW() THEN 'ACTIVE'
         ELSE 'SCHEDULED'
       END as status,
       sl.sku, sl.title, p.created_at
       FROM promotions p
       JOIN promotion_products pp ON p.id = pp.promotion_id
       JOIN seller_listings sl ON pp.listing_id = sl.id
       WHERE p.store_id = $1
       ORDER BY p.created_at DESC`,
      [storeId]
    );
    return res.rows;
  },
  
  updateBulkPricing: async (storeId, updates) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const update of updates) {
        // Update the base price of listing
        const res = await client.query(
          `UPDATE seller_listings 
           SET sell_price = $1, mrp = $2
           WHERE id = $3 AND store_id = $4 RETURNING *`,
          [update.sell_price, update.mrp, update.listing_id, storeId]
        );
        if (res.rows.length > 0) {
          results.push(res.rows[0]);
          await eventService.emitEvent('listing_price', update.listing_id, 'PRICE_CHANGED', res.rows[0], client);
        }
      }
      await client.query('COMMIT');
      return results;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  updateListingPricing: async (storeId, listingId, data) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `UPDATE seller_listings 
         SET sell_price = $1, mrp = $2
         WHERE id = $3 AND store_id = $4 RETURNING *`,
        [data.sell_price, data.mrp, listingId, storeId]
      );
      if (res.rows.length > 0) {
        await eventService.emitEvent('listing_price', listingId, 'PRICE_CHANGED', res.rows[0], client);
      }
      await client.query('COMMIT');
      return res.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  getPricingHistory: async (storeId) => {
    // Return history of pricing changes from outbox or audit table (mocking with outbox events)
    const res = await pool.query(
      `SELECT * FROM outbox_events 
       WHERE event_type = 'PRICE_CHANGED' AND payload->>'store_id' = $1 
       ORDER BY created_at DESC LIMIT 50`,
      [storeId]
    );
    return res.rows;
  },

  getAllPreviews: async (storeId) => {
    // 1. Fetch active promotions & flash sales for this store
    const promosRes = await pool.query(
      `SELECT pp.listing_id, pp.promo_price, p.title as promo_title, p.promo_type
       FROM promotion_products pp
       JOIN promotions p ON pp.promotion_id = p.id
       WHERE p.store_id = $1
         AND p.is_active = true
         AND (p.start_date IS NULL OR p.start_date <= NOW())
         AND (p.end_date IS NULL OR p.end_date >= NOW())
       ORDER BY pp.promo_price ASC`,
      [storeId]
    );

    // 2. Fetch active coupons for this store
    const couponsRes = await pool.query(
      `SELECT id, code, discount_type, discount_value, min_order_value, max_discount_cap, applies_to, target_value
       FROM coupons
       WHERE store_id = $1
         AND is_active = true
         AND (valid_from IS NULL OR valid_from <= NOW())
         AND (valid_until IS NULL OR valid_until >= NOW())
       ORDER BY discount_value DESC`,
      [storeId]
    );

    // 3. Fetch all listings for this store
    const listingsRes = await pool.query(
      `SELECT id, mrp, sell_price, title, sku
       FROM seller_listings
       WHERE store_id = $1`,
      [storeId]
    );

    const previews = {};
    for (const listing of listingsRes.rows) {
      previews[listing.id] = computePriceWaterfall(listing, promosRes.rows, couponsRes.rows);
    }

    return {
      previews,
      activeCoupons: couponsRes.rows,
      activePromosCount: promosRes.rows.length
    };
  },

  previewPricing: async (storeId, listingId) => {
    const listingRes = await pool.query(
      `SELECT id, mrp, sell_price, title, sku FROM seller_listings WHERE id = $1 AND store_id = $2`,
      [listingId, storeId]
    );
    if (!listingRes.rows[0]) return null;

    const promosRes = await pool.query(
      `SELECT pp.listing_id, pp.promo_price, p.title as promo_title, p.promo_type
       FROM promotion_products pp
       JOIN promotions p ON pp.promotion_id = p.id
       WHERE p.store_id = $1 AND pp.listing_id = $2
         AND p.is_active = true
         AND (p.start_date IS NULL OR p.start_date <= NOW())
         AND (p.end_date IS NULL OR p.end_date >= NOW())
       ORDER BY pp.promo_price ASC`,
      [storeId, listingId]
    );

    const couponsRes = await pool.query(
      `SELECT id, code, discount_type, discount_value, min_order_value, max_discount_cap, applies_to, target_value
       FROM coupons
       WHERE store_id = $1
         AND is_active = true
         AND (valid_from IS NULL OR valid_from <= NOW())
         AND (valid_until IS NULL OR valid_until >= NOW())
       ORDER BY discount_value DESC`,
      [storeId]
    );

    return computePriceWaterfall(listingRes.rows[0], promosRes.rows, couponsRes.rows);
  },

  schedulePricing: async (storeId, listingId, data) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Remove any prior price schedule for this listing to avoid overlap collisions
      await client.query(
        `DELETE FROM promotions p 
         USING promotion_products pp 
         WHERE p.id = pp.promotion_id 
         AND pp.listing_id = $1 
         AND p.store_id = $2 
         AND p.promo_type = 'PRICE_SCHEDULE'`, 
        [listingId, storeId]
      );
      
      const promoRes = await client.query(
        `INSERT INTO promotions (store_id, title, promo_type, start_date, end_date, is_active)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [storeId, 'Scheduled Price Drop', 'PRICE_SCHEDULE', data.start_date, data.end_date, true]
      );
      const promoId = promoRes.rows[0].id;
      
      await client.query(
        `INSERT INTO promotion_products (promotion_id, listing_id, promo_price)
         VALUES ($1, $2, $3)`,
        [promoId, listingId, data.scheduled_price]
      );
      
      await eventService.emitEvent('promotion', promoId, 'PROMOTION_CHANGED', { promoId, listingId, ...data }, client);
      await client.query('COMMIT');
      return { listing_id: listingId, scheduled_price: data.scheduled_price, start_date: data.start_date, end_date: data.end_date, status: 'SCHEDULED' };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  deleteSchedule: async (storeId, listingId) => {
    await pool.query(
      `DELETE FROM promotions p 
       USING promotion_products pp 
       WHERE p.id = pp.promotion_id 
       AND pp.listing_id = $1 
       AND p.store_id = $2 
       AND p.promo_type = 'PRICE_SCHEDULE'`, 
      [listingId, storeId]
    );
    return true;
  }
};
