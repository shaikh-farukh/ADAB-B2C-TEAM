const pool = require('../../db');
const eventService = require('../services/eventService');

module.exports = {
  getPromotionsByStore: async (storeId) => {
    const res = await pool.query(
      `SELECT p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'listing_id', pp.listing_id,
              'promo_price', pp.promo_price,
              'title', sl.title,
              'mrp', sl.mrp,
              'sell_price', sl.sell_price
            )
          ) FILTER (WHERE pp.listing_id IS NOT NULL),
          '[]'
        ) AS products
       FROM promotions p
       LEFT JOIN promotion_products pp ON p.id = pp.promotion_id
       LEFT JOIN seller_listings sl ON pp.listing_id = sl.id
       WHERE p.store_id = $1 AND p.promo_type != 'PRICE_SCHEDULE'
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [storeId]
    );
    return res.rows;
  },
  checkOverlappingDeals: async (storeId, listingIds, startDate, endDate, excludePromoId = null) => {
    if (!listingIds || listingIds.length === 0) return [];
    const query = `
      SELECT pp.listing_id, sl.title, p.id as promo_id, p.title as promo_title, p.promo_type, p.start_date, p.end_date, pp.promo_price
      FROM promotion_products pp
      JOIN promotions p ON pp.promotion_id = p.id
      JOIN seller_listings sl ON pp.listing_id = sl.id
      WHERE p.store_id = $1
        AND p.is_active = true
        AND pp.listing_id = ANY($2::uuid[])
        AND ($3::uuid IS NULL OR p.id != $3::uuid)
        AND (p.start_date < $5 AND p.end_date > $4)
    `;
    const res = await pool.query(query, [storeId, listingIds, excludePromoId, startDate, endDate]);
    return res.rows;
  },
  createPromotion: async (storeId, data) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO promotions (store_id, title, promo_type, start_date, end_date, banner_url, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [storeId, data.title, data.promo_type, data.start_date, data.end_date, data.banner_url || null, data.is_active !== undefined ? data.is_active : true]
      );
      const promo = res.rows[0];

      if (Array.isArray(data.products) && data.products.length > 0) {
        for (const item of data.products) {
          if (item.listing_id && item.promo_price !== undefined) {
            await client.query(
              `INSERT INTO promotion_products (promotion_id, listing_id, promo_price)
               VALUES ($1, $2, $3)
               ON CONFLICT (promotion_id, listing_id) DO UPDATE SET promo_price = EXCLUDED.promo_price`,
              [promo.id, item.listing_id, parseFloat(item.promo_price)]
            );
          }
        }
      }

      await eventService.emitEvent('promotion', promo.id, 'PROMOTION_CHANGED', promo, client);
      await client.query('COMMIT');
      return promo;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
  updatePromotion: async (storeId, id, data) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `UPDATE promotions 
         SET title = COALESCE($1, title), 
             promo_type = COALESCE($2, promo_type), 
             start_date = COALESCE($3, start_date), 
             end_date = COALESCE($4, end_date), 
             banner_url = COALESCE($5, banner_url),
             is_active = COALESCE($6, is_active)
         WHERE id = $7 AND store_id = $8 RETURNING *`,
        [
          data.title === undefined ? null : data.title,
          data.promo_type === undefined ? null : data.promo_type,
          data.start_date === undefined ? null : data.start_date,
          data.end_date === undefined ? null : data.end_date,
          data.banner_url === undefined ? null : data.banner_url,
          data.is_active === undefined ? null : data.is_active,
          id,
          storeId
        ]
      );
      if (res.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const promo = res.rows[0];

      if (Array.isArray(data.products)) {
        await client.query('DELETE FROM promotion_products WHERE promotion_id = $1', [id]);
        for (const item of data.products) {
          if (item.listing_id && item.promo_price !== undefined) {
            await client.query(
              `INSERT INTO promotion_products (promotion_id, listing_id, promo_price)
               VALUES ($1, $2, $3)`,
              [id, item.listing_id, parseFloat(item.promo_price)]
            );
          }
        }
      }

      await eventService.emitEvent('promotion', promo.id, 'PROMOTION_CHANGED', promo, client);
      await client.query('COMMIT');
      return promo;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
  deletePromotion: async (storeId, id) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM promotions WHERE id = $1 AND store_id = $2', [id, storeId]);
      await eventService.emitEvent('promotion', id, 'PROMOTION_DELETED', { id, storeId }, client);
      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
  getCouponsByStore: async (storeId) => {
    const res = await pool.query('SELECT * FROM coupons WHERE store_id = $1 ORDER BY created_at DESC', [storeId]);
    return res.rows;
  },
  createCoupon: async (storeId, data) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO coupons (store_id, code, discount_type, discount_value, min_order_value, max_discount_cap, usage_limit, valid_from, valid_until, applies_to, target_value, target_audience, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [
          storeId,
          data.code,
          data.discount_type,
          data.discount_value,
          (data.min_order_value === '' || data.min_order_value === undefined) ? 0 : data.min_order_value,
          (data.max_discount_cap === '' || data.max_discount_cap === undefined) ? null : data.max_discount_cap,
          (data.usage_limit === '' || data.usage_limit === undefined) ? null : data.usage_limit,
          data.valid_from,
          data.valid_until,
          data.applies_to || 'ENTIRE_SHOP',
          data.target_value || null,
          data.target_audience || 'CUSTOMERS',
          true
        ]
      );
      await eventService.emitEvent('coupon', res.rows[0].id, 'PROMOTION_CHANGED', res.rows[0], client);
      await client.query('COMMIT');
      return res.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
  updateCoupon: async (storeId, id, data) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fields = [];
      const values = [];
      let idx = 1;

      if (data.code !== undefined) {
        fields.push(`code = $${idx++}`);
        values.push(String(data.code).trim().toUpperCase());
      }
      if (data.discount_type !== undefined) {
        fields.push(`discount_type = $${idx++}`);
        values.push(String(data.discount_type).toUpperCase());
      }
      if (data.discount_value !== undefined) {
        fields.push(`discount_value = $${idx++}`);
        values.push(data.discount_value);
      }
      if (data.min_order_value !== undefined) {
        fields.push(`min_order_value = $${idx++}`);
        values.push(data.min_order_value === '' || data.min_order_value === null ? 0 : data.min_order_value);
      }
      if (data.max_discount_cap !== undefined) {
        fields.push(`max_discount_cap = $${idx++}`);
        values.push(data.max_discount_cap === '' || data.max_discount_cap === null ? null : data.max_discount_cap);
      }
      if (data.usage_limit !== undefined) {
        fields.push(`usage_limit = $${idx++}`);
        values.push(data.usage_limit === '' || data.usage_limit === null ? null : data.usage_limit);
      }
      if (data.valid_from !== undefined) {
        fields.push(`valid_from = $${idx++}`);
        values.push(data.valid_from);
      }
      if (data.valid_until !== undefined) {
        fields.push(`valid_until = $${idx++}`);
        values.push(data.valid_until);
      }
      if (data.applies_to !== undefined) {
        fields.push(`applies_to = $${idx++}`);
        values.push(data.applies_to);
      }
      if (data.target_value !== undefined) {
        fields.push(`target_value = $${idx++}`);
        values.push(data.target_value === '' ? null : data.target_value);
      }
      if (data.target_audience !== undefined) {
        fields.push(`target_audience = $${idx++}`);
        values.push(data.target_audience);
      }
      if (data.is_active !== undefined) {
        fields.push(`is_active = $${idx++}`);
        values.push(Boolean(data.is_active));
      }

      let updatedCoupon;
      if (fields.length > 0) {
        values.push(id, storeId);
        const query = `
          UPDATE coupons 
          SET ${fields.join(', ')}
          WHERE id = $${idx++} AND store_id = $${idx++} 
          RETURNING *;
        `;
        const res = await client.query(query, values);
        if (res.rows.length === 0) {
          throw new Error('Coupon not found or access denied');
        }
        updatedCoupon = res.rows[0];
        await eventService.emitEvent('coupon', updatedCoupon.id, 'PROMOTION_CHANGED', updatedCoupon, client);
      } else {
        const existing = await client.query('SELECT * FROM coupons WHERE id = $1 AND store_id = $2', [id, storeId]);
        updatedCoupon = existing.rows[0];
      }

      await client.query('COMMIT');
      return updatedCoupon;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
};
