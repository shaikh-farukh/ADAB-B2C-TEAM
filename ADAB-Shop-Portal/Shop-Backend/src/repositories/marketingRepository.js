const pool = require('../../db'); 
const eventService = require('../services/eventService');

module.exports = {
  getPromotionsByStore: async (storeId) => {
    const res = await pool.query("SELECT * FROM promotions WHERE store_id = $1 AND promo_type != 'PRICE_SCHEDULE' ORDER BY created_at DESC", [storeId]);
    return res.rows;
  },
  createPromotion: async (storeId, data) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO promotions (store_id, title, promo_type, start_date, end_date, banner_url, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [storeId, data.title, data.promo_type, data.start_date, data.end_date, data.banner_url || null, true]
      );
      await eventService.emitEvent('promotion', res.rows[0].id, 'PROMOTION_CHANGED', res.rows[0], client);
      await client.query('COMMIT');
      return res.rows[0];
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
             is_active = COALESCE($5, is_active)
         WHERE id = $6 AND store_id = $7 RETURNING *`,
        [
          data.title === undefined ? null : data.title, 
          data.promo_type === undefined ? null : data.promo_type, 
          data.start_date === undefined ? null : data.start_date, 
          data.end_date === undefined ? null : data.end_date, 
          data.is_active === undefined ? null : data.is_active, 
          id, 
          storeId
        ]
      );
      if (res.rows.length > 0) {
        await eventService.emitEvent('promotion', res.rows[0].id, 'PROMOTION_CHANGED', res.rows[0], client);
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
      const res = await client.query(
        `UPDATE coupons 
         SET is_active = COALESCE($1, is_active),
             discount_value = COALESCE($2, discount_value),
             min_order_value = COALESCE($3, min_order_value),
             max_discount_cap = COALESCE($4, max_discount_cap),
             usage_limit = COALESCE($5, usage_limit),
             valid_until = COALESCE($6, valid_until),
             applies_to = COALESCE($7, applies_to),
             target_value = COALESCE($8, target_value),
             target_audience = COALESCE($9, target_audience)
         WHERE id = $10 AND store_id = $11 RETURNING *`,
        [
          data.is_active === undefined ? null : data.is_active, 
          data.discount_value === undefined ? null : data.discount_value, 
          (data.min_order_value === '' || data.min_order_value === undefined) ? null : data.min_order_value, 
          (data.max_discount_cap === '' || data.max_discount_cap === undefined) ? null : data.max_discount_cap, 
          (data.usage_limit === '' || data.usage_limit === undefined) ? null : data.usage_limit, 
          data.valid_until === undefined ? null : data.valid_until, 
          data.applies_to === undefined ? null : data.applies_to,
          data.target_value === undefined ? null : data.target_value,
          data.target_audience === undefined ? null : data.target_audience,
          id, 
          storeId
        ]
      );
      if (res.rows.length > 0) {
        await eventService.emitEvent('coupon', res.rows[0].id, 'PROMOTION_CHANGED', res.rows[0], client);
      }
      await client.query('COMMIT');
      return res.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
};
