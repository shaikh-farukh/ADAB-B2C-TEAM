const pool = require('../../db');
const eventService = require('../services/eventService');

module.exports = {
  getPricingSchedules: async (storeId) => {
    const res = await pool.query(
      `SELECT p.id as promotion_id, pp.listing_id, pp.promo_price as scheduled_price, p.start_date, p.end_date, 
       'PENDING' as status, sl.sku, sl.title, p.created_at
       FROM promotions p
       JOIN promotion_products pp ON p.id = pp.promotion_id
       JOIN seller_listings sl ON pp.listing_id = sl.id
       WHERE p.store_id = $1 AND p.promo_type = 'PRICE_SCHEDULE'
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

  previewPricing: async (storeId, listingId) => {
    // Return the final customer-visible price considering active promotions and seller_listings sell_price
    const res = await pool.query(
      `SELECT 
         sl.mrp, 
         sl.sell_price as base_sell_price,
         p.title as promo_title,
         pp.promo_price as active_promo_price,
         c.code as coupon_code,
         c.discount_value as active_coupon_discount,
         c.discount_type as active_coupon_type
       FROM seller_listings sl
       LEFT JOIN promotion_products pp ON sl.id = pp.listing_id
       LEFT JOIN promotions p ON pp.promotion_id = p.id 
         AND p.store_id = $1 
         AND p.is_active = true 
         AND (p.start_date IS NULL OR p.start_date <= NOW())
         AND (p.end_date IS NULL OR p.end_date >= NOW())
       LEFT JOIN coupons c ON c.store_id = $1
         AND c.is_active = true
         AND (c.applies_to = 'ENTIRE_SHOP' OR c.target_value = $2)
         AND (c.valid_from IS NULL OR c.valid_from <= NOW())
         AND (c.valid_until IS NULL OR c.valid_until >= NOW())
       WHERE sl.id = $2 AND sl.store_id = $1
       ORDER BY pp.promo_price ASC, c.discount_value DESC
       LIMIT 1`,
      [storeId, listingId]
    );

    const row = res.rows[0];
    if (!row) return null;

    let finalPrice = row.active_promo_price ? parseFloat(row.active_promo_price) : parseFloat(row.base_sell_price);

    // Apply coupon
    if (row.active_coupon_discount) {
      const discount = parseFloat(row.active_coupon_discount);
      if (row.active_coupon_type === 'PERCENTAGE') {
        finalPrice = finalPrice - (finalPrice * (discount / 100));
      } else {
        finalPrice = finalPrice - discount;
      }
    }

    if (finalPrice < 0) finalPrice = 0;

    return {
      mrp: row.mrp,
      base_sell_price: row.base_sell_price,
      active_promo_price: row.active_promo_price || null,
      promo_title: row.promo_title || null,
      coupon_code: row.coupon_code || null,
      coupon_discount: row.active_coupon_discount || null,
      coupon_type: row.active_coupon_type || null,
      final_price: finalPrice.toFixed(2)
    };
  },

  schedulePricing: async (storeId, listingId, data) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
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
      return { listing_id: listingId, scheduled_price: data.scheduled_price, start_date: data.start_date, end_date: data.end_date, status: 'PENDING' };
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
