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
