const pool = require('../../db');
const { geocodeAddress } = require('../services/geocodingService');

class SellerRepository {
  // === Shared: Profile & Store Read (used by both Shabbir & Mayank) ===

  normalizeKycStatus(rawKycStatus, rawUserStatus) {
    const kyc = String(rawKycStatus || '').trim().toUpperCase();
    const uStatus = String(rawUserStatus || '').trim().toUpperCase();
    if (
      ['APPROVED', 'VERIFIED', 'ACTIVE'].includes(kyc) ||
      ['APPROVED', 'VERIFIED'].includes(uStatus)
    ) {
      return 'APPROVED';
    }
    if (
      ['REJECTED', 'DENIED', 'DECLINED'].includes(kyc) ||
      ['REJECTED', 'DENIED', 'DECLINED'].includes(uStatus)
    ) {
      return 'REJECTED';
    }
    if (
      ['SUBMITTED', 'UNDER_REVIEW', 'PENDING'].includes(kyc) ||
      ['SUBMITTED', 'UNDER_REVIEW', 'PENDING'].includes(uStatus)
    ) {
      return kyc === 'UNDER_REVIEW' || uStatus === 'UNDER_REVIEW' ? 'UNDER_REVIEW' : 'SUBMITTED';
    }
    return kyc || 'DRAFT';
  }

  async getProfile(sellerId) {
    const query = `
      SELECT u.id, u.full_name, u.email, u.phone, u.status, u.is_phone_verified,
             sp.legal_name, sp.entity_type, sp.gstin, sp.pan, sp.kyc_status,
             sp.submitted_at, sp.verified_at, sp.rejection_reason
      FROM users u
      LEFT JOIN seller_profiles sp ON u.id = sp.user_id
      WHERE u.id = $1
    `;
    const res = await pool.query(query, [sellerId]);
    const row = res.rows[0];
    if (row) {
      row.kyc_status = this.normalizeKycStatus(row.kyc_status, row.status);
    }
    return row;
  }

  async getStore(userId) {
    const query = `
      SELECT s.id, s.seller_id as owner_id, s.store_name, s.city, s.state, s.pincode, s.address_line, 
             s.ui_mode, s.is_online, s.delivery_radius_km, s.rating, s.phone, s.category,
             s.latitude, s.longitude
      FROM stores s
      JOIN seller_profiles sp ON s.seller_id = sp.id
      WHERE sp.user_id = $1
    `;
    const res = await pool.query(query, [userId]);
    const store = res.rows[0];

    // Lazy background geocode for existing stores with missing coordinates
    if (store && (store.latitude == null || store.longitude == null) && (store.address_line || store.city || store.pincode)) {
      geocodeAddress({
        addressLine: store.address_line,
        city: store.city,
        state: store.state,
        pincode: store.pincode
      }).then(coords => {
        if (coords) {
          pool.query(
            'UPDATE stores SET latitude = $1, longitude = $2 WHERE id = $3 AND (latitude IS NULL OR longitude IS NULL)',
            [coords.latitude, coords.longitude, store.id]
          ).catch(() => {});
        }
      }).catch(() => {});
    }

    return store;
  }

  // === Shabbir's Day 4: Profile/Store/Settings Updates & Dashboard ===

  async updateProfile(userId, data) {
    const fields = [];
    const values = [];
    let idx = 1;
    const allowedFields = ['legal_name', 'entity_type', 'gstin', 'pan', 'fssai_license', 'udhyam_msme'];
    for (const [k, v] of Object.entries(data)) {
      if (allowedFields.includes(k)) {
        fields.push(`${k} = $${idx++}`);
        values.push(v);
      }
    }
    if (fields.length === 0) return this.getProfile(userId);
    values.push(userId);
    
    // Updates seller_profiles where user_id = userId
    const query = `
      UPDATE seller_profiles
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE user_id = $${idx}
      RETURNING *;
    `;
    await pool.query(query, values);
    const notificationProducer = require('../services/notificationProducer');
    await notificationProducer.profileUpdated(userId);
    return this.getProfile(userId);
  }

  async updateStore(userId, data) {
    // We only want to update stores where the store belongs to the user
    // First find the store id
    const store = await this.getStore(userId);
    if (!store) throw new Error("Store not found");

    const allowedFields = ['store_name', 'city', 'state', 'pincode', 'address_line', 'phone', 'category', 'latitude', 'longitude'];
    const updatePayload = { ...data };

    const addressChanged = (updatePayload.address_line !== undefined && updatePayload.address_line !== store.address_line) ||
                           (updatePayload.city !== undefined && updatePayload.city !== store.city) ||
                           (updatePayload.pincode !== undefined && updatePayload.pincode !== store.pincode);

    if (addressChanged && (updatePayload.latitude === undefined || updatePayload.longitude === undefined)) {
      try {
        const coords = await geocodeAddress({
          addressLine: updatePayload.address_line !== undefined ? updatePayload.address_line : store.address_line,
          city: updatePayload.city !== undefined ? updatePayload.city : store.city,
          state: updatePayload.state !== undefined ? updatePayload.state : store.state,
          pincode: updatePayload.pincode !== undefined ? updatePayload.pincode : store.pincode
        });
        if (coords) {
          updatePayload.latitude = coords.latitude;
          updatePayload.longitude = coords.longitude;
        }
      } catch (geoErr) {}
    }

    const fields = [];
    const values = [];
    let idx = 1;
    for (const [k, v] of Object.entries(updatePayload)) {
      if (allowedFields.includes(k)) {
        fields.push(`${k} = $${idx++}`);
        values.push(v);
      }
    }
    if (fields.length === 0) return store;
    values.push(store.id);

    const query = `
      UPDATE stores
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    await pool.query(query, values);
    const notificationProducer = require('../services/notificationProducer');
    await notificationProducer.storeUpdated(userId);
    return this.getStore(userId);
  }

  async getSettings(userId) {
    // Settings are currently represented by specific canonical fields on `stores` table
    const query = `
      SELECT s.ui_mode, s.soundbox_enabled, s.is_online, s.open_time, s.close_time, s.delivery_radius_km
      FROM stores s
      JOIN seller_profiles sp ON s.seller_id = sp.id
      WHERE sp.user_id = $1
    `;
    const res = await pool.query(query, [userId]);
    return res.rows[0];
  }

  async updateSettings(userId, data) {
    const store = await this.getStore(userId);
    if (!store) throw new Error("Store not found");

    const fields = [];
    const values = [];
    let idx = 1;
    const allowedFields = ['ui_mode', 'soundbox_enabled', 'is_online', 'open_time', 'close_time', 'delivery_radius_km'];
    for (const [k, v] of Object.entries(data)) {
      if (allowedFields.includes(k)) {
        fields.push(`${k} = $${idx++}`);
        values.push(v);
      }
    }
    if (fields.length === 0) return this.getSettings(userId);
    values.push(store.id);

    const query = `
      UPDATE stores
      SET ${fields.join(', ')}
      WHERE id = $${idx}
    `;
    await pool.query(query, values);
    const notificationProducer = require('../services/notificationProducer');
    await notificationProducer.settingsChanged(userId);
    return this.getSettings(userId);
  }

  async getDashboardMetrics(userId) {
    const store = await this.getStore(userId);
    if (!store) throw new Error("Store not found");

    const query = `
      SELECT 
        (SELECT COUNT(*) FROM seller_orders WHERE store_id = $1) as total_orders,
        (SELECT COALESCE(SUM(subtotal), 0) FROM seller_orders WHERE store_id = $1) as total_revenue,
        (SELECT COUNT(*) FROM seller_listings WHERE store_id = $1) as total_products,
        (SELECT COUNT(*) FROM seller_orders WHERE store_id = $1 AND (status = 'PLACED' OR status = 'PROCESSING' OR status = 'new' OR status = 'pending')) as pending_orders
    `;
    const res = await pool.query(query, [store.id]);
    return res.rows[0];
  }

  // === Mayank's Fulfillment / Operations: Orders, Returns, B2B, Finance, etc. ===

  async getOrders(storeId, filters = {}) {
    if (!storeId) {
      const err = new Error('Unauthorized: Valid store ID is required');
      err.statusCode = 400;
      throw err;
    }
    const rawLimit = Number(filters.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;
    const rawPage = Number(filters.page);
    const rawOffset = Number(filters.offset);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0
      ? rawOffset
      : (Number.isFinite(rawPage) && rawPage > 1 ? (rawPage - 1) * limit : 0);

    const statusParam = filters.status ? String(filters.status).trim().toUpperCase() : null;
    const searchParam = filters.search ? `%${String(filters.search).trim()}%` : null;

    const query = `
      SELECT so.id as seller_order_id,
             so.parent_order_id,
             so.store_id,
             st.latitude as store_latitude,
             st.longitude as store_longitude,
             so.status as seller_order_status,
             so.subtotal as store_subtotal,
             so.commission_fee,
             so.seller_payout_amount,
             so.created_at as seller_order_created_at,
             o.id as order_id,
             o.order_number,
             o.created_at,
             o.order_status,
             o.payment_method,
             o.payment_status,
             o.delivery_mode,
             o.grand_total as amount,
             o.delivery_address,
             u.full_name as customer,
             u.phone as customer_phone,
             (
               SELECT json_agg(json_build_object(
                 'id', oi.id,
                 'listing_id', oi.listing_id,
                 'name', COALESCE(oi.product_name, 'Item'),
                 'quantity', oi.quantity,
                 'unit_price', oi.unit_price,
                 'total_price', oi.total_price
               ))
               FROM order_items oi
               WHERE oi.seller_order_id = so.id
             ) as items_list,
             COALESCE(
               (SELECT string_agg(CONCAT(COALESCE(oi.product_name, 'Item'), ' (x', oi.quantity, ')'), ', ')
                FROM order_items oi
                WHERE oi.seller_order_id = so.id),
               'Items'
             ) as item_summary
      FROM seller_orders so
      JOIN orders o ON so.parent_order_id = o.id
      LEFT JOIN stores st ON so.store_id = st.id
      LEFT JOIN users u ON o.customer_id = u.id
      WHERE so.store_id = $1::uuid
        AND ($2::text IS NULL OR UPPER(so.status) = $2::text)
        AND ($3::text IS NULL OR o.order_number ILIKE $3::text OR COALESCE(u.full_name, '') ILIKE $3::text)
      ORDER BY so.created_at DESC
      LIMIT $4::int OFFSET $5::int
    `;
    const res = await pool.query(query, [storeId, statusParam, searchParam, limit, offset]);
    return res.rows.map(r => {
      const addr = r.delivery_address;
      const hasStoreCoords = r.store_latitude != null && r.store_longitude != null;
      const hasCustomerCoords = addr && addr.latitude != null && addr.longitude != null;
      let distance = null;
      if (hasStoreCoords && hasCustomerCoords) {
        const sLat = Number(r.store_latitude);
        const sLng = Number(r.store_longitude);
        const cLat = Number(addr.latitude);
        const cLng = Number(addr.longitude);
        const R = 6371; // km
        const dLat = (cLat - sLat) * Math.PI / 180;
        const dLon = (cLng - sLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(sLat * Math.PI / 180) * Math.cos(cLat * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        distance = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
      }

      return {
        id: r.order_number || r.order_id,
        real_id: r.seller_order_id,
        parent_order_id: r.parent_order_id,
        store_id: r.store_id,
        customer: r.customer || r.delivery_address?.full_name || 'Customer',
        customer_phone: r.customer_phone || r.delivery_address?.phone || '',
        distance,
        delivery_mode: r.delivery_mode ? r.delivery_mode.toLowerCase() : null,
        delivery_address: r.delivery_address || null,
        items: r.items_list || [],
        item_summary: r.item_summary || '',
        amount: Number(r.store_subtotal ?? r.amount ?? 0),
        commission_fee: Number(r.commission_fee ?? 0),
        seller_payout_amount: Number(r.seller_payout_amount ?? 0),
        payment_method: r.payment_method || null,
        payment_status: r.payment_status || null,
        status: r.seller_order_status ? (
          r.seller_order_status === 'NEW' ? 'new' :
          r.seller_order_status === 'ACCEPTED' ? 'packing' :
          r.seller_order_status === 'PACKED' ? 'packed' :
          r.seller_order_status === 'DISPATCHED' ? 'dispatched' :
          r.seller_order_status.toLowerCase()
        ) : 'new',
        created_at: r.seller_order_created_at || r.created_at
      };
    });
  }

  async adjustListingStockForOrder(sellerOrderId, storeId, direction = 'DECREMENT') {
    const itemsRes = await pool.query(
      `SELECT id, listing_id, product_name, quantity FROM order_items WHERE seller_order_id = $1`,
      [sellerOrderId]
    );
    let totalUnitsAdjusted = 0;

    for (const item of itemsRes.rows) {
      const qtyInt = Math.max(1, Math.round(Number(item.quantity) || 1));
      const qtyNum = Number(item.quantity) || 1;
      let targetListingId = item.listing_id;

      if (!targetListingId && item.product_name && storeId) {
        const matchRes = await pool.query(
          `SELECT id FROM seller_listings WHERE store_id = $1 AND LOWER(TRIM(title)) = LOWER(TRIM($2)) LIMIT 1`,
          [storeId, item.product_name]
        );
        targetListingId = matchRes.rows[0]?.id || null;
      }

      if (targetListingId) {
        if (direction === 'DECREMENT') {
          await pool.query(
            `UPDATE seller_listings
             SET stock_qty = GREATEST(0, COALESCE(stock_qty, 0) - $1::int), updated_at = NOW()
             WHERE id = $2`,
            [qtyInt, targetListingId]
          );
          await pool.query(
            `UPDATE inventory
             SET stock_quantity = GREATEST(reserved_quantity, COALESCE(stock_quantity, 0) - $1::numeric), updated_at = NOW()
             WHERE listing_id = $2`,
            [qtyNum, targetListingId]
          );
        } else {
          await pool.query(
            `UPDATE seller_listings
             SET stock_qty = COALESCE(stock_qty, 0) + $1::int, updated_at = NOW()
             WHERE id = $2`,
            [qtyInt, targetListingId]
          );
          await pool.query(
            `UPDATE inventory
             SET stock_quantity = COALESCE(stock_quantity, 0) + $1::numeric, updated_at = NOW()
             WHERE listing_id = $2`,
            [qtyNum, targetListingId]
          );
        }
        totalUnitsAdjusted += qtyInt;
      }
    }

    return totalUnitsAdjusted;
  }

  async updateOrderStatus(orderId, status, storeId = null) {
    const cleanId = orderId ? orderId.toString().replace(/^#/, '') : orderId;
    const normalizedStatus = (status || '').toLowerCase();
    const sellerStatusMap = {
      'new': 'NEW',
      'packing': 'ACCEPTED',
      'processing': 'ACCEPTED',
      'accepted': 'ACCEPTED',
      'packed': 'PACKED',
      'dispatched': 'DISPATCHED',
      'shipped': 'DISPATCHED',
      'delivered': 'DELIVERED',
      'cancelled': 'CANCELLED',
      'declined': 'CANCELLED',
      'rejected': 'CANCELLED'
    };
    const orderStatusMap = {
      'new': 'PLACED',
      'packing': 'PREPARING',
      'processing': 'PREPARING',
      'accepted': 'CONFIRMED',
      'packed': 'PREPARING',
      'dispatched': 'OUT_FOR_DELIVERY',
      'shipped': 'OUT_FOR_DELIVERY',
      'delivered': 'DELIVERED',
      'cancelled': 'CANCELLED',
      'declined': 'CANCELLED',
      'rejected': 'CANCELLED'
    };

    if (!sellerStatusMap[normalizedStatus]) {
      const err = new Error(`Unprocessable Entity: Invalid order status '${status}'`);
      err.statusCode = 422;
      throw err;
    }

    const sStatus = sellerStatusMap[normalizedStatus];
    const oStatus = orderStatusMap[normalizedStatus];

    // Fetch existing seller_orders state before updating so we can check ownership, run stock hooks & emit domain events
    const existingRes = await pool.query(`
      SELECT so.id as seller_order_id, so.parent_order_id, so.store_id, so.status as prev_status,
             o.order_number
      FROM seller_orders so
      JOIN orders o ON so.parent_order_id = o.id
      WHERE so.id::text = $1
         OR so.parent_order_id IN (SELECT id FROM orders WHERE id::text = $1 OR order_number = $1 OR order_number = ('ORD-' || $1))
    `, [cleanId]);

    if (existingRes.rows.length === 0) {
      const err = new Error(`Order '${orderId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    if (!storeId) {
      const err = new Error('Unauthorized: Store ID is required');
      err.statusCode = 400;
      throw err;
    }

    const belongsToSeller = existingRes.rows.some(r => String(r.store_id) === String(storeId));
    if (!belongsToSeller) {
      const err = new Error('Forbidden: Cross-seller access denied for this order');
      err.statusCode = 403;
      throw err;
    }

    const targetRows = existingRes.rows.filter(r => String(r.store_id) === String(storeId));

    await pool.query(`
      UPDATE seller_orders
      SET status = $1
      WHERE (
        id::text = $2 
        OR parent_order_id IN (SELECT id FROM orders WHERE id::text = $2 OR order_number = $2 OR order_number = ('ORD-' || $2))
      )
      AND store_id = $3::uuid
    `, [sStatus, cleanId, storeId]);

    const res = await pool.query(`
      UPDATE orders
      SET order_status = $1, updated_at = NOW()
      WHERE id::text = $2 OR order_number = $2 OR order_number = ('ORD-' || $2) OR id IN (SELECT parent_order_id FROM seller_orders WHERE id::text = $2)
      RETURNING *
    `, [oStatus, cleanId]);

    const notificationProducer = require('../services/notificationProducer');
    const stockSummary = [];

    for (const so of targetRows) {
      const prev = (so.prev_status || 'NEW').toUpperCase();
      const orderNum = so.order_number || cleanId;

      // Idempotency guard: if status is already sStatus, do not run stock hooks or duplicate notifications
      if (prev === sStatus) {
        continue;
      }

      // On Acceptance: NEW -> ACCEPTED (Stock was already deducted when the customer placed the order)
      if (prev === 'NEW' && sStatus === 'ACCEPTED') {
        await notificationProducer.orderEvent(
          so.store_id,
          orderNum,
          'ORDER_ACCEPTED',
          `Order #${orderNum} accepted and moved to packing.`
        );
      }
      // On Decline / Cancellation from NEW, ACCEPTED, or PACKED -> CANCELLED => Restore listing stock
      else if (['NEW', 'ACCEPTED', 'PACKED'].includes(prev) && sStatus === 'CANCELLED') {
        const units = await this.adjustListingStockForOrder(so.seller_order_id, so.store_id, 'INCREMENT');
        stockSummary.push({ seller_order_id: so.seller_order_id, action: 'INCREMENT', units });
        await notificationProducer.orderEvent(
          so.store_id,
          orderNum,
          'ORDER_CANCELLED',
          `Order #${orderNum} ${prev === 'NEW' ? 'declined' : 'cancelled'} — ${units} unit(s) restored back to product listing stock.`
        );
      }
      // On Pack: -> PACKED
      else if (sStatus === 'PACKED' && prev !== 'PACKED') {
        await notificationProducer.orderEvent(
          so.store_id,
          orderNum,
          'ORDER_PACKED',
          `Order #${orderNum} is packed and ready for dispatch.`
        );
      }
      // On Ship / Dispatch: -> DISPATCHED
      else if (sStatus === 'DISPATCHED' && prev !== 'DISPATCHED') {
        await notificationProducer.orderEvent(
          so.store_id,
          orderNum,
          'ORDER_SHIPPED',
          `Order #${orderNum} has been dispatched for customer delivery.`
        );
      }
      // On Delivered: -> DELIVERED
      else if (sStatus === 'DELIVERED' && prev !== 'DELIVERED') {
        await notificationProducer.orderEvent(
          so.store_id,
          orderNum,
          'ORDER_DELIVERED',
          `Order #${orderNum} was marked as delivered.`
        );
      }
    }

    const updatedOrder = res.rows[0] || {};
    return {
      ...updatedOrder,
      seller_order_status: sStatus,
      stock_adjustments: stockSummary
    };
  }

  deriveReturnReasonKey(reason = '') {
    const lower = String(reason).toLowerCase();
    if (lower.includes('damage') || lower.includes('broken') || lower.includes('seal') || lower.includes('defect') || lower.includes('expired')) {
      return 'damage';
    }
    if (lower.includes('size') || lower.includes('wrong') || lower.includes('variant') || lower.includes('weight') || lower.includes('mismatch')) {
      return 'size';
    }
    return 'mind';
  }

  async getReturns(storeId, filters = {}) {
    if (!storeId) {
      const err = new Error('Unauthorized: Valid store ID is required');
      err.statusCode = 400;
      throw err;
    }

    const rawLimit = Number(filters.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;
    const rawPage = Number(filters.page);
    const rawOffset = Number(filters.offset);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0
      ? rawOffset
      : (Number.isFinite(rawPage) && rawPage > 1 ? (rawPage - 1) * limit : 0);

    const statusParam = filters.status ? String(filters.status).trim().toUpperCase() : null;
    const searchParam = filters.search ? `%${String(filters.search).trim()}%` : null;

    const query = `
      SELECT r.id,
             r.order_id,
             r.seller_order_id,
             r.customer_id,
             r.reason,
             r.status,
             r.refund_amount,
             r.rejection_reason,
             r.requested_at,
             r.resolved_at,
             so.store_id,
             so.subtotal as store_subtotal,
             o.order_number,
             o.grand_total,
             o.payment_method as order_payment_method,
             o.payment_status,
             o.delivery_address,
             u.full_name as customer_name,
             u.phone as customer_phone,
             p.id as payment_id,
             p.amount as payment_amount,
             p.currency as payment_currency,
             p.payment_method,
             p.status as payment_record_status,
             p.created_at as payment_created_at,
             ri.id as return_item_id,
             ri.order_item_id,
             ri.quantity as return_qty,
             ri.refund_amount as return_item_refund_amount,
             ri.item_condition,
             oi.listing_id,
             oi.product_name,
             oi.quantity as order_qty,
             oi.unit_price,
             oi.total_price as item_total_price,
             sl.stock_qty as current_listing_stock,
             COALESCE(
               (
                 SELECT json_agg(
                   json_build_object(
                     'return_item_id', ri_all.id,
                     'order_item_id', oi_all.id,
                     'listing_id', oi_all.listing_id,
                     'product_name', COALESCE(oi_all.product_name, 'Order Item'),
                     'quantity', COALESCE(ri_all.quantity, oi_all.quantity, 1),
                     'unit_price', oi_all.unit_price,
                     'total_price', COALESCE(ri_all.refund_amount, oi_all.total_price),
                     'reason', COALESCE(ri_all.reason, r.reason),
                     'item_condition', COALESCE(ri_all.item_condition, 'UNOPENED'),
                     'current_listing_stock', sl_all.stock_qty
                   )
                 )
                 FROM return_items ri_all
                 LEFT JOIN order_items oi_all ON ri_all.order_item_id = oi_all.id
                 LEFT JOIN seller_listings sl_all ON oi_all.listing_id = sl_all.id
                 WHERE ri_all.return_id = r.id
               ),
               (
                 SELECT json_agg(
                   json_build_object(
                     'return_item_id', NULL,
                     'order_item_id', oi_fallback.id,
                     'listing_id', oi_fallback.listing_id,
                     'product_name', COALESCE(oi_fallback.product_name, 'Order Item'),
                     'quantity', COALESCE(oi_fallback.quantity, 1),
                     'unit_price', oi_fallback.unit_price,
                     'total_price', oi_fallback.total_price,
                     'reason', r.reason,
                     'item_condition', 'UNOPENED',
                     'current_listing_stock', sl_fallback.stock_qty
                   )
                 )
                 FROM order_items oi_fallback
                 LEFT JOIN seller_listings sl_fallback ON oi_fallback.listing_id = sl_fallback.id
                 WHERE oi_fallback.seller_order_id = so.id
               ),
               '[]'::json
             ) as items_list
      FROM returns r
      JOIN seller_orders so ON r.seller_order_id = so.id
      JOIN orders o ON r.order_id = o.id
      LEFT JOIN users u ON r.customer_id = u.id
      LEFT JOIN LATERAL (
        SELECT id, amount, currency, payment_method, status, created_at
        FROM payments
        WHERE order_id = r.order_id
        ORDER BY created_at DESC
        LIMIT 1
      ) p ON true
      LEFT JOIN LATERAL (
        SELECT id, order_item_id, quantity, refund_amount, item_condition
        FROM return_items
        WHERE return_id = r.id
        LIMIT 1
      ) ri ON true
      LEFT JOIN LATERAL (
        SELECT id, listing_id, product_name, quantity, unit_price, total_price
        FROM order_items
        WHERE (ri.order_item_id IS NOT NULL AND id = ri.order_item_id)
           OR (ri.order_item_id IS NULL AND seller_order_id = so.id)
        LIMIT 1
      ) oi ON true
      LEFT JOIN seller_listings sl ON oi.listing_id = sl.id
      WHERE so.store_id = $1::uuid
        AND ($2::text IS NULL OR UPPER(r.status) = $2::text)
        AND ($3::text IS NULL OR o.order_number ILIKE $3::text OR COALESCE(u.full_name, '') ILIKE $3::text OR COALESCE(r.reason, '') ILIKE $3::text)
      ORDER BY r.requested_at DESC
      LIMIT $4::int OFFSET $5::int
    `;
    const res = await pool.query(query, [storeId, statusParam, searchParam, limit, offset]);

    return res.rows.map(r => {
      const items = Array.isArray(r.items_list) ? r.items_list : [];
      const totalReturnQty = items.length > 0
        ? items.reduce((s, it) => s + Math.max(1, Math.round(Number(it.quantity) || 1)), 0)
        : Math.max(1, Math.round(Number(r.return_qty || r.order_qty || 1)));
      const baseProduct = r.product_name || 'Order Item';
      const reasonKey = this.deriveReturnReasonKey(r.reason);
      const condition = r.item_condition || (reasonKey === 'damage' ? 'DAMAGED' : 'UNOPENED');
      const shortCode = `#RET-${String(r.id).slice(0, 4).toUpperCase()}`;
      const orderNum = r.order_number
        ? (String(r.order_number).startsWith('#') ? r.order_number : `#${r.order_number}`)
        : `#ORD-${String(r.order_id).slice(0, 4).toUpperCase()}`;

      let uiStatus = 'pending';
      if (r.status === 'APPROVED' || r.status === 'ITEM_PICKED') {
        uiStatus = 'approved'; // Approved, waiting for item to reach shop for Add Back / Discard
      } else if (r.status === 'COMPLETED') {
        uiStatus = String(r.item_condition || '').toUpperCase() === 'DISCARDED' ? 'discarded' : 'restocked';
      } else if (r.status === 'REJECTED') {
        uiStatus = 'rejected';
      }

      // Consume refund amount from return record or payment domain record (never calculate via hardcoded fallback)
      const resolvedRefundAmount = Number(
        r.refund_amount ?? r.return_item_refund_amount ?? r.payment_amount ?? r.item_total_price ?? r.grand_total ?? 0
      );

      return {
        id: shortCode,
        returnUuid: r.id,
        orderId: orderNum,
        orderUuid: r.order_id,
        sellerOrderId: r.seller_order_id,
        customer: r.customer_name || r.delivery_address?.full_name || 'Customer',
        customerPhone: r.customer_phone || r.delivery_address?.phone || '',
        deliveryAddress: r.delivery_address || null,
        items,
        product: totalReturnQty > 1 ? `${baseProduct} (x${totalReturnQty})` : baseProduct,
        productName: baseProduct,
        quantity: totalReturnQty,
        unitPrice: r.unit_price != null ? Number(r.unit_price) : null,
        itemTotalPrice: r.item_total_price != null ? Number(r.item_total_price) : null,
        listingId: r.listing_id,
        currentListingStock: r.current_listing_stock != null ? Number(r.current_listing_stock) : null,
        reason: r.reason,
        reasonKey,
        itemCondition: condition,
        amount: resolvedRefundAmount,
        status: uiStatus,
        rawStatus: r.status,
        paymentId: r.payment_id || null,
        paymentMethod: r.payment_method || r.order_payment_method || null,
        paymentAmount: r.payment_amount != null ? Number(r.payment_amount) : null,
        paymentRecordStatus: r.payment_record_status || r.payment_status || null,
        paymentStatus: r.payment_status,
        rejectionReason: r.rejection_reason || null,
        requested_at: r.requested_at,
        resolved_at: r.resolved_at
      };
    });
  }

  async updateReturnStatus(returnId, status, rejectionReason = null, storeId = null) {
    const cleanId = String(returnId || '').trim();
    const shortPrefix = cleanId.replace(/^#?RET-/i, '').toUpperCase();
    const normalized = String(status || '').toLowerCase();

    const allowedReturnStatuses = ['approved', 'rejected', 'restocked', 'addback', 'discarded', 'discard'];
    if (!allowedReturnStatuses.includes(normalized)) {
      const err = new Error(`Unprocessable Entity: Invalid return status '${status}'`);
      err.statusCode = 422;
      throw err;
    }

    const existingRes = await pool.query(`
      SELECT r.*,
             so.store_id,
             o.order_number,
             o.grand_total,
             o.payment_status,
             p.id as payment_id,
             p.amount as payment_amount,
             p.payment_method,
             p.status as payment_record_status,
             ri.id as return_item_id,
             ri.order_item_id,
             ri.quantity as return_qty,
             ri.refund_amount as return_item_refund_amount,
             ri.item_condition,
             oi.listing_id,
             oi.product_name,
             oi.quantity as order_qty,
             oi.total_price as item_total_price,
             sl.stock_qty as current_listing_stock
      FROM returns r
      JOIN seller_orders so ON r.seller_order_id = so.id
      JOIN orders o ON r.order_id = o.id
      LEFT JOIN LATERAL (
        SELECT id, amount, payment_method, status
        FROM payments
        WHERE order_id = r.order_id
        ORDER BY created_at DESC
        LIMIT 1
      ) p ON true
      LEFT JOIN LATERAL (
        SELECT id, order_item_id, quantity, refund_amount, item_condition
        FROM return_items
        WHERE return_id = r.id
        LIMIT 1
      ) ri ON true
      LEFT JOIN LATERAL (
        SELECT id, listing_id, product_name, quantity, total_price
        FROM order_items
        WHERE (ri.order_item_id IS NOT NULL AND id = ri.order_item_id)
           OR (ri.order_item_id IS NULL AND seller_order_id = so.id)
        LIMIT 1
      ) oi ON true
      LEFT JOIN seller_listings sl ON oi.listing_id = sl.id
      WHERE r.id::text = $1 OR UPPER(SUBSTRING(r.id::text, 1, 4)) = $2
      LIMIT 1
    `, [cleanId, shortPrefix]);

    const ret = existingRes.rows[0];
    if (!ret) {
      const err = new Error('Return request not found');
      err.statusCode = 404;
      throw err;
    }

    if (!storeId) {
      const err = new Error('Unauthorized: Store ID is required');
      err.statusCode = 400;
      throw err;
    }

    if (String(ret.store_id) !== String(storeId)) {
      const err = new Error('Forbidden: Cross-seller access denied for this return request');
      err.statusCode = 403;
      throw err;
    }

    const prevStatus = (ret.status || 'REQUESTED').toUpperCase();
    let restockedQty = 0;
    let updatedListingStock = ret.current_listing_stock != null ? Number(ret.current_listing_stock) : null;
    let finalUiStatus = normalized;
    let finalDbStatus = prevStatus;
    let finalCondition = ret.item_condition || 'UNOPENED';
    let finalPaymentStatus = ret.payment_status;
    let finalPaymentRecordStatus = ret.payment_record_status || ret.payment_status;

    const paymentDomainRefundAmount = Number(
      ret.refund_amount ?? ret.return_item_refund_amount ?? ret.payment_amount ?? ret.item_total_price ?? ret.grand_total ?? 0
    );

    // STEP 1A: Approve return request (REQUESTED -> APPROVED). Item has NOT reached shop yet, so do NOT restock yet.
    if (normalized === 'approved') {
      finalDbStatus = 'APPROVED';
      finalPaymentStatus = 'REFUNDED';
      finalPaymentRecordStatus = 'REFUNDED';

      await pool.query(`
        UPDATE returns
        SET status = 'APPROVED',
            refund_amount = COALESCE(refund_amount, $2),
            rejection_reason = NULL
        WHERE id = $1
      `, [ret.id, paymentDomainRefundAmount]);

      await pool.query(`
        UPDATE orders
        SET payment_status = 'REFUNDED', order_status = 'RETURNED', updated_at = NOW()
        WHERE id = $1
      `, [ret.order_id]);

      await pool.query(`
        UPDATE payments
        SET status = 'REFUNDED'
        WHERE order_id = $1
      `, [ret.order_id]);
    }
    // STEP 1B: Reject return request (REQUESTED -> REJECTED)
    else if (normalized === 'rejected') {
      finalDbStatus = 'REJECTED';
      await pool.query(`
        UPDATE returns
        SET status = 'REJECTED',
            rejection_reason = COALESCE($2, 'Return request declined after seller review'),
            resolved_at = NOW()
        WHERE id = $1
      `, [ret.id, rejectionReason]);
    }
    // STEP 2A: Item reached store & seller clicks "Add Back" (APPROVED -> COMPLETED + Restock Listing)
    else if (normalized === 'restocked' || normalized === 'addback') {
      finalDbStatus = 'COMPLETED';
      finalUiStatus = 'restocked';
      finalCondition = 'RESTOCKED';

      await pool.query(`
        UPDATE returns
        SET status = 'COMPLETED', resolved_at = NOW()
        WHERE id = $1
      `, [ret.id]);

      await pool.query(`
        UPDATE return_items
        SET item_condition = 'RESTOCKED'
        WHERE return_id = $1
      `, [ret.id]);

      // Only increment stock once (guard against duplicate clicks)
      if (prevStatus !== 'COMPLETED') {
        const allItemsRes = await pool.query(`
          SELECT COALESCE(ri.quantity, oi.quantity, 1) as qty,
                 oi.listing_id,
                 oi.product_name
          FROM return_items ri
          LEFT JOIN order_items oi ON ri.order_item_id = oi.id
          WHERE ri.return_id = $1
        `, [ret.id]);

        const rowsToRestock = allItemsRes.rows.length > 0
          ? allItemsRes.rows
          : [{ qty: ret.return_qty || ret.order_qty || 1, listing_id: ret.listing_id, product_name: ret.product_name }];

        for (const itemRow of rowsToRestock) {
          const qtyInt = Math.max(1, Math.round(Number(itemRow.qty || 1)));
          const qtyNum = Number(itemRow.qty || 1);
          let targetListingId = itemRow.listing_id;

          if (!targetListingId && itemRow.product_name && ret.store_id) {
            const matchRes = await pool.query(
              `SELECT id FROM seller_listings WHERE store_id = $1 AND LOWER(TRIM(title)) = LOWER(TRIM($2)) LIMIT 1`,
              [ret.store_id, itemRow.product_name]
            );
            targetListingId = matchRes.rows[0]?.id || null;
          }

          if (targetListingId) {
            const slUpdate = await pool.query(
              `UPDATE seller_listings
               SET stock_qty = COALESCE(stock_qty, 0) + $1::int, updated_at = NOW()
               WHERE id = $2
               RETURNING stock_qty`,
              [qtyInt, targetListingId]
            );
            await pool.query(
              `UPDATE inventory
               SET stock_quantity = COALESCE(stock_quantity, 0) + $1::numeric, updated_at = NOW()
               WHERE listing_id = $2`,
              [qtyNum, targetListingId]
            );
            restockedQty += qtyInt;
            if (slUpdate.rows[0]?.stock_qty != null) {
              updatedListingStock = Number(slUpdate.rows[0].stock_qty);
            }
          }
        }
      }
    }
    // STEP 2B: Item reached store & seller clicks "Discard" (APPROVED -> COMPLETED, Ditched from relisting)
    else if (normalized === 'discarded' || normalized === 'discard') {
      finalDbStatus = 'COMPLETED';
      finalUiStatus = 'discarded';
      finalCondition = 'DISCARDED';

      await pool.query(`
        UPDATE returns
        SET status = 'COMPLETED', resolved_at = NOW()
        WHERE id = $1
      `, [ret.id]);

      await pool.query(`
        UPDATE return_items
        SET item_condition = 'DISCARDED'
        WHERE return_id = $1
      `, [ret.id]);
    }

    // Fetch updated items list with fresh listing stock
    const updatedItemsRes = await pool.query(`
      SELECT ri_all.id as return_item_id,
             oi_all.id as order_item_id,
             oi_all.listing_id,
             COALESCE(oi_all.product_name, 'Order Item') as product_name,
             COALESCE(ri_all.quantity, oi_all.quantity, 1) as quantity,
             oi_all.unit_price,
             COALESCE(ri_all.refund_amount, oi_all.total_price) as total_price,
             COALESCE(ri_all.reason, $2) as reason,
             COALESCE(ri_all.item_condition, $3) as item_condition,
             sl_all.stock_qty as current_listing_stock
      FROM return_items ri_all
      LEFT JOIN order_items oi_all ON ri_all.order_item_id = oi_all.id
      LEFT JOIN seller_listings sl_all ON oi_all.listing_id = sl_all.id
      WHERE ri_all.return_id = $1
    `, [ret.id, ret.reason, finalCondition]);

    const notificationProducer = require('../services/notificationProducer');
    await notificationProducer.returnResolved(
      ret.store_id,
      ret.order_number,
      finalUiStatus.toUpperCase(),
      paymentDomainRefundAmount,
      restockedQty
    );

    return {
      id: `#RET-${String(ret.id).slice(0, 4).toUpperCase()}`,
      returnUuid: ret.id,
      orderId: ret.order_number ? `#${String(ret.order_number).replace(/^#/, '')}` : ret.order_id,
      status: finalUiStatus,
      rawStatus: finalDbStatus,
      itemCondition: finalCondition,
      restockedQty,
      currentListingStock: updatedListingStock,
      items: updatedItemsRes.rows,
      refundAmount: paymentDomainRefundAmount,
      paymentStatus: finalPaymentStatus,
      paymentRecordStatus: finalPaymentRecordStatus,
      rejectionReason: finalUiStatus === 'rejected' ? (rejectionReason || 'Return request declined after seller review') : null,
      resolved_at: finalDbStatus === 'COMPLETED' || finalDbStatus === 'REJECTED' ? new Date().toISOString() : ret.resolved_at
    };
  }


  async getB2BOrders(storeId = null) {
    const query = `
      SELECT bpo.id, bpo.po_number, bpo.status, bpo.total_amount, bpo.created_at,
             s.name as supplier_name,
             buyer.store_name as buyer_store_name
      FROM b2b_purchase_orders bpo
      LEFT JOIN suppliers s ON bpo.supplier_id = s.id
      LEFT JOIN stores buyer ON bpo.buyer_store_id = buyer.id
      WHERE ($1::uuid IS NULL OR bpo.buyer_store_id = $1::uuid OR bpo.supplier_store_id = $1::uuid)
      ORDER BY bpo.created_at DESC
      LIMIT 50
    `;
    try {
      const res = await pool.query(query, [storeId || null]);
      return res.rows;
    } catch (e) {
      return [];
    }
  }

  async getCoupons(storeId = null) {
    const query = `
      SELECT id, code, discount_type, discount_value, min_order_value, max_discount, 
             start_date, end_date, is_active, usage_limit, usage_count, description
      FROM coupons
      WHERE ($1::uuid IS NULL OR store_id = $1::uuid)
      ORDER BY created_at DESC
    `;
    try {
      const res = await pool.query(query, [storeId || null]);
      return res.rows;
    } catch (e) {
      return [];
    }
  }

  async getPoints(userId) {
    const query = `
      SELECT balance, total_earned, total_redeemed
      FROM loyalty_points
      WHERE user_id = $1
    `;
    try {
      const res = await pool.query(query, [userId]);
      return res.rows[0] || { balance: 0, total_earned: 0, total_redeemed: 0 };
    } catch (e) {
      return { balance: 0, total_earned: 0, total_redeemed: 0 };
    }
  }

  async getAnalytics(storeId) {
    const query = `
      SELECT 
        TO_CHAR(DATE(created_at), 'Mon DD') as name,
        COUNT(id)::int as orders,
        COALESCE(SUM(subtotal), 0)::float as revenue
      FROM seller_orders
      WHERE store_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `;
    try {
      const res = await pool.query(query, [storeId]);
      
      // Compute aggregates as well for summary
      const totals = res.rows.reduce((acc, row) => {
        acc.total_orders += row.orders;
        acc.total_revenue += row.revenue;
        return acc;
      }, { total_orders: 0, total_revenue: 0 });

      return {
        chartData: res.rows,
        summary: totals
      };
    } catch (e) {
      console.error('getAnalytics Error:', e);
      return { chartData: [], summary: { total_orders: 0, total_revenue: 0 } };
    }
  }

  async getNearbyCatalog() {
    const query = `
      SELECT p.id, COALESCE(p.name, p.title) as name, p.category, p.mrp, p.sell_price as price,
             p.min_order_qty as min_order, s.store_name, s.city,
             '3 km' as distance, 'Verified ADAB Merchant' as supplier_name
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      LIMIT 30
    `;
    try {
      const res = await pool.query(query);
      return res.rows;
    } catch (e) {
      return [];
    }
  }

  async getRecommendations() {
    const query = `
      SELECT p.id, COALESCE(p.name, p.title) as name, p.category, p.mrp, p.sell_price as price,
             COALESCE(p.stock_quantity, 100) as stock,
             '+240% searches' as badge,
             ROUND(CAST(((p.mrp - p.sell_price) / NULLIF(p.mrp, 0)) * 100 AS numeric), 0) as profit_margin
      FROM products p
      ORDER BY p.created_at DESC
      LIMIT 12
    `;
    try {
      const res = await pool.query(query);
      return res.rows;
    } catch (e) {
      return [];
    }
  }

  async getThreads(userId) {
    const query = `
      SELECT 
        t.id as thread_id,
        CASE WHEN t.participant_a = $1 THEN t.participant_b ELSE t.participant_a END as customer_id,
        COALESCE(u.full_name, 'Customer') as customer_name,
        t.subject,
        (SELECT COUNT(*) FROM messages m WHERE m.thread_id = t.id AND m.sender_id != $1 AND m.is_read = false) as unread_count,
        (SELECT m.body FROM messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) as last_message_body,
        (SELECT m.created_at FROM messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) as last_message_date
      FROM message_threads t
      LEFT JOIN users u ON u.id = CASE WHEN t.participant_a = $1 THEN t.participant_b ELSE t.participant_a END
      WHERE t.participant_a = $1 OR t.participant_b = $1
      ORDER BY last_message_date DESC NULLS LAST
    `;
    try {
      const res = await pool.query(query, [userId]);
      return res.rows;
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async getThreadMessages(userId, threadId) {
    const query = `
      SELECT 
        m.id,
        t.id as thread_id,
        CASE WHEN t.participant_a = $1 THEN t.participant_b ELSE t.participant_a END as customer_id,
        COALESCE(u.full_name, 'Customer') as customer_name,
        CASE WHEN m.sender_id = $1 THEN 'OUTBOUND' ELSE 'INBOUND' END as direction,
        m.body as content,
        m.is_read,
        m.created_at
      FROM messages m
      JOIN message_threads t ON m.thread_id = t.id
      LEFT JOIN users u ON u.id = CASE WHEN t.participant_a = $1 THEN t.participant_b ELSE t.participant_a END
      WHERE t.id = $2 AND (t.participant_a = $1 OR t.participant_b = $1)
      ORDER BY m.created_at ASC
    `;
    try {
      const res = await pool.query(query, [userId, threadId]);
      return res.rows;
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async sendThreadMessage(userId, threadId, data) {
    // Verify thread ownership
    const threadCheck = await pool.query(
      `SELECT id, participant_a, participant_b FROM message_threads WHERE id = $1 AND (participant_a = $2 OR participant_b = $2)`,
      [threadId, userId]
    );
    if (threadCheck.rows.length === 0) throw new Error("Thread not found or unauthorized");

    const t = threadCheck.rows[0];
    const customer_id = t.participant_a === userId ? t.participant_b : t.participant_a;

    // Insert message
    const msgQuery = `
      INSERT INTO messages (thread_id, sender_id, body, is_read)
      VALUES ($1, $2, $3, true)
      RETURNING id, body as content, is_read, created_at, sender_id;
    `;
    const res = await pool.query(msgQuery, [threadId, userId, data.content]);
    const inserted = res.rows[0];
    
    // Return mapped format for frontend
    return {
      id: inserted.id,
      thread_id: threadId,
      customer_id: customer_id,
      customer_name: data.customer_name || 'Customer',
      direction: 'OUTBOUND',
      content: inserted.content,
      is_read: inserted.is_read,
      created_at: inserted.created_at
    };
  }

  async markThreadRead(userId, threadId) {
    const query = `
      UPDATE messages
      SET is_read = true
      WHERE thread_id = $1 AND sender_id != $2 AND is_read = false
      RETURNING *;
    `;
    const res = await pool.query(query, [threadId, userId]);
    return { updated_count: res.rowCount };
  }

  async getFinanceSummary(storeId, userId) {
    if (!storeId) {
      const err = new Error('Unauthorized: Valid store ID is required');
      err.statusCode = 400;
      throw err;
    }

    // 1. Store-scoped sales, commission, and payout aggregates from seller_orders + returns + settlements
    const salesQuery = `
      SELECT
        COUNT(CASE WHEN so.status != 'CANCELLED' THEN 1 END)::int as total_orders,
        COALESCE(SUM(CASE WHEN so.status != 'CANCELLED' THEN so.subtotal ELSE 0 END), 0) as gross_sales,
        COALESCE(SUM(CASE WHEN so.status != 'CANCELLED' THEN so.commission_fee ELSE 0 END), 0) as total_commission,
        COALESCE(SUM(CASE WHEN so.status != 'CANCELLED' THEN so.seller_payout_amount ELSE 0 END), 0) as net_earnings,
        COUNT(CASE WHEN so.status != 'CANCELLED' AND NOT EXISTS (
          SELECT 1 FROM settlement_items si WHERE si.seller_order_id = so.id
        ) THEN 1 END)::int as unsettled_orders_count,
        COALESCE(SUM(CASE WHEN so.status != 'CANCELLED' AND NOT EXISTS (
          SELECT 1 FROM settlement_items si WHERE si.seller_order_id = so.id
        ) THEN GREATEST(0, so.seller_payout_amount - COALESCE((
          SELECT SUM(r.refund_amount)
          FROM returns r
          WHERE r.seller_order_id = so.id AND r.status IN ('APPROVED', 'ITEM_PICKED', 'COMPLETED')
        ), 0)) ELSE 0 END), 0) as unsettled_payout_balance
      FROM seller_orders so
      WHERE so.store_id = $1::uuid
    `;

    const refundsQuery = `
      SELECT
        COUNT(CASE WHEN r.status IN ('APPROVED', 'ITEM_PICKED', 'COMPLETED') THEN 1 END)::int as refunded_count,
        COALESCE(SUM(CASE WHEN r.status IN ('APPROVED', 'ITEM_PICKED', 'COMPLETED') THEN r.refund_amount ELSE 0 END), 0) as total_refunded
      FROM returns r
      JOIN seller_orders so ON r.seller_order_id = so.id
      WHERE so.store_id = $1::uuid
    `;

    const settlementsQuery = `
      SELECT
        COUNT(*)::int as settlements_count,
        COALESCE(SUM(CASE WHEN status IN ('PROCESSED', 'PAID') THEN net_payable ELSE 0 END), 0) as settled_amount,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN net_payable ELSE 0 END), 0) as pending_settlement_amount
      FROM settlements
      WHERE store_id = $1::uuid
    `;

    const creditQuery = `
      SELECT total_limit, utilized_amount, available_amount, due_date, is_locked
      FROM credit_ledgers
      WHERE ($1::uuid IS NOT NULL AND applicant_id = $1::uuid)
         OR ($2::uuid IS NOT NULL AND applicant_id = $2::uuid)
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 1
    `;

    const khataTotalsQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN supplier_store_id = $1::uuid AND status != 'CANCELLED' AND payment_terms != 'ADVANCE_UPI' THEN total_amount ELSE 0 END), 0) as receivables,
        COALESCE(SUM(CASE WHEN buyer_store_id = $1::uuid AND status != 'CANCELLED' AND payment_terms != 'ADVANCE_UPI' THEN total_amount ELSE 0 END), 0) as payables
      FROM b2b_purchase_orders
      WHERE supplier_store_id = $1::uuid OR buyer_store_id = $1::uuid
    `;

    const [salesRes, refundsRes, settlementsRes, creditRes, khataRes] = await Promise.all([
      pool.query(salesQuery, [storeId]),
      pool.query(refundsQuery, [storeId]),
      pool.query(settlementsQuery, [storeId]),
      pool.query(creditQuery, [storeId, userId || null]),
      pool.query(khataTotalsQuery, [storeId])
    ]);

    const sales = salesRes.rows[0] || {};
    const refunds = refundsRes.rows[0] || {};
    const settlements = settlementsRes.rows[0] || {};
    const credit = creditRes.rows[0] || null;
    const khata = khataRes.rows[0] || {};

    const sanctionedLimit = credit ? Number(credit.total_limit || 0) : 0;
    const utilizedCredit = credit ? Number(credit.utilized_amount || 0) : 0;
    const availableCredit = credit
      ? Number(credit.available_amount ?? Math.max(0, sanctionedLimit - utilizedCredit))
      : 0;

    return {
      balance: Number(sales.unsettled_payout_balance || 0),
      unsettled_orders_count: Number(sales.unsettled_orders_count || 0),
      total_orders: Number(sales.total_orders || 0),
      gross_sales: Number(sales.gross_sales || 0),
      total_commission: Number(sales.total_commission || 0),
      net_earnings: Number(sales.net_earnings || 0),
      total_refunded: Number(refunds.total_refunded || 0),
      refunded_count: Number(refunds.refunded_count || 0),
      settled_amount: Number(settlements.settled_amount || 0),
      pending_settlement_amount: Number(settlements.pending_settlement_amount || 0),
      settlements_count: Number(settlements.settlements_count || 0),
      sanctioned_limit: sanctionedLimit,
      utilized_credit: utilizedCredit,
      available_credit: availableCredit,
      credit_due_date: credit?.due_date || null,
      is_credit_locked: Boolean(credit?.is_locked),
      receivables: Number(khata.receivables || 0),
      payables: Number(khata.payables || 0)
    };
  }

  async getFinanceTransactions(storeId) {
    if (!storeId) {
      const err = new Error('Unauthorized: Valid store ID is required');
      err.statusCode = 400;
      throw err;
    }

    const query = `
      SELECT so.id as seller_order_id,
             so.parent_order_id as order_id,
             so.status as seller_order_status,
             so.subtotal as gross_amount,
             so.commission_fee,
             so.seller_payout_amount as net_payout,
             so.created_at,
             o.order_number,
             o.order_status,
             o.payment_method as order_payment_method,
             o.payment_status as order_payment_status,
             o.delivery_address,
             u.full_name as customer_name,
             p.id as payment_id,
             p.payment_method,
             p.amount as payment_amount,
             p.status as payment_record_status,
             r.id as return_id,
             r.status as return_status,
             r.refund_amount,
             si.settlement_id,
             s.settlement_cycle,
             s.status as settlement_status,
             s.settled_at
      FROM seller_orders so
      JOIN orders o ON so.parent_order_id = o.id
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN LATERAL (
        SELECT id, payment_method, amount, status
        FROM payments
        WHERE order_id = o.id
        ORDER BY created_at DESC
        LIMIT 1
      ) p ON true
      LEFT JOIN LATERAL (
        SELECT id, status, refund_amount
        FROM returns
        WHERE seller_order_id = so.id
          AND status IN ('APPROVED', 'ITEM_PICKED', 'COMPLETED')
        ORDER BY requested_at DESC
        LIMIT 1
      ) r ON true
      LEFT JOIN LATERAL (
        SELECT si_inner.settlement_id
        FROM settlement_items si_inner
        WHERE si_inner.seller_order_id = so.id
        LIMIT 1
      ) si ON true
      LEFT JOIN settlements s ON si.settlement_id = s.id
      WHERE so.store_id = $1::uuid
      ORDER BY so.created_at DESC
      LIMIT 100
    `;
    const res = await pool.query(query, [storeId]);

    return res.rows.map(row => {
      const gross = Number(row.gross_amount || 0);
      const commission = Number(row.commission_fee || 0);
      const basePayout = Number(row.net_payout || 0);
      const refundDeduction = Number(row.refund_amount || 0);
      const isCancelled = String(row.seller_order_status || '').toUpperCase() === 'CANCELLED';
      const effectiveNetPayout = isCancelled ? 0 : Math.max(0, basePayout - refundDeduction);
      const feeRatePct = gross > 0 ? Number(((commission / gross) * 100).toFixed(1)) : 0;

      let settlementState = 'UNSETTLED';
      if (isCancelled) {
        settlementState = 'CANCELLED';
      } else if (row.settlement_id) {
        settlementState = row.settlement_status || 'PAID';
      } else if (refundDeduction > 0 && effectiveNetPayout === 0) {
        settlementState = 'REFUNDED';
      }

      return {
        id: row.seller_order_id,
        order_id: row.order_id,
        order_number: row.order_number
          ? (String(row.order_number).startsWith('#') ? row.order_number : `#${row.order_number}`)
          : `#ORD-${String(row.order_id).slice(0, 4).toUpperCase()}`,
        customer: row.customer_name || row.delivery_address?.full_name || 'Customer',
        created_at: row.created_at,
        order_status: row.seller_order_status,
        payment_id: row.payment_id || null,
        payment_method: row.payment_method || row.order_payment_method || null,
        payment_status: row.payment_record_status || row.order_payment_status || null,
        gross_amount: gross,
        commission_fee: commission,
        commission_rate_pct: feeRatePct,
        refund_deduction: refundDeduction,
        net_payout: effectiveNetPayout,
        settlement_id: row.settlement_id || null,
        settlement_cycle: row.settlement_cycle || null,
        settlement_status: settlementState,
        settled_at: row.settled_at || null
      };
    });
  }

  async getFinanceSettlements(storeId) {
    if (!storeId) {
      const err = new Error('Unauthorized: Valid store ID is required');
      err.statusCode = 400;
      throw err;
    }

    const query = `
      SELECT s.id,
             s.store_id,
             s.settlement_cycle,
             s.total_sales,
             s.total_commission,
             s.total_tax_deducted,
             s.net_payable,
             s.status,
             s.settled_at,
             s.created_at,
             COALESCE(
               (
                 SELECT json_agg(
                   json_build_object(
                     'id', si.id,
                     'seller_order_id', si.seller_order_id,
                     'order_number', o.order_number,
                     'gross_subtotal', so.subtotal,
                     'commission_fee', so.commission_fee,
                     'amount', si.amount,
                     'order_status', so.status,
                     'created_at', so.created_at
                   ) ORDER BY so.created_at DESC
                 )
                 FROM settlement_items si
                 JOIN seller_orders so ON si.seller_order_id = so.id
                 JOIN orders o ON so.parent_order_id = o.id
                 WHERE si.settlement_id = s.id
               ),
               '[]'::json
             ) as items
      FROM settlements s
      WHERE s.store_id = $1::uuid
      ORDER BY COALESCE(s.settled_at, s.created_at) DESC
      LIMIT 50
    `;
    const res = await pool.query(query, [storeId]);
    return res.rows.map(row => {
      const items = Array.isArray(row.items) ? row.items : [];
      return {
        id: row.id,
        store_id: row.store_id,
        settlement_cycle: row.settlement_cycle,
        total_sales: Number(row.total_sales || 0),
        total_commission: Number(row.total_commission || 0),
        total_tax_deducted: Number(row.total_tax_deducted || 0),
        net_payable: Number(row.net_payable || 0),
        status: row.status,
        settled_at: row.settled_at,
        created_at: row.created_at,
        items_count: items.length,
        items
      };
    });
  }

  async createWithdrawalSettlement(storeId) {
    if (!storeId) {
      throw new Error('Store ID is required to process withdrawal settlement');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Find all unsettled, non-cancelled seller_orders for this store
      const unsettledRes = await client.query(`
        SELECT so.id as seller_order_id,
               so.subtotal,
               so.commission_fee,
               so.seller_payout_amount,
               COALESCE((
                 SELECT SUM(r.refund_amount)
                 FROM returns r
                 WHERE r.seller_order_id = so.id
                   AND r.status IN ('APPROVED', 'ITEM_PICKED', 'COMPLETED')
               ), 0) as refunded_amount
        FROM seller_orders so
        WHERE so.store_id = $1
          AND so.status != 'CANCELLED'
          AND NOT EXISTS (
            SELECT 1 FROM settlement_items si WHERE si.seller_order_id = so.id
          )
        FOR UPDATE OF so
      `, [storeId]);

      const eligibleOrders = unsettledRes.rows
        .map(r => {
          const gross = Number(r.subtotal || 0);
          const commission = Number(r.commission_fee || 0);
          const payout = Number(r.seller_payout_amount || 0);
          const refund = Number(r.refunded_amount || 0);
          const netOrderPayable = Math.max(0, payout - refund);
          return {
            seller_order_id: r.seller_order_id,
            gross,
            commission,
            netOrderPayable
          };
        })
        .filter(r => r.netOrderPayable > 0);

      if (eligibleOrders.length === 0) {
        const err = new Error('No unsettled order earnings available for withdrawal');
        err.statusCode = 422;
        throw err;
      }

      const totalSales = eligibleOrders.reduce((s, o) => s + o.gross, 0);
      const totalCommission = eligibleOrders.reduce((s, o) => s + o.commission, 0);
      const netPayable = eligibleOrders.reduce((s, o) => s + o.netOrderPayable, 0);
      const cycleCode = `STL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}`;

      const settlementInsert = await client.query(`
        INSERT INTO settlements (
          store_id, settlement_cycle, total_sales, total_commission, total_tax_deducted, net_payable, status, settled_at
        )
        VALUES ($1, $2, $3, $4, 0, $5, 'PAID', NOW())
        RETURNING *
      `, [storeId, cycleCode, totalSales, totalCommission, netPayable]);

      const settlement = settlementInsert.rows[0];

      for (const ord of eligibleOrders) {
        await client.query(`
          INSERT INTO settlement_items (settlement_id, seller_order_id, amount)
          VALUES ($1, $2, $3)
        `, [settlement.id, ord.seller_order_id, ord.netOrderPayable]);
      }

      await client.query('COMMIT');

      return {
        id: settlement.id,
        settlement_cycle: settlement.settlement_cycle,
        total_sales: Number(settlement.total_sales || 0),
        total_commission: Number(settlement.total_commission || 0),
        total_tax_deducted: Number(settlement.total_tax_deducted || 0),
        net_payable: Number(settlement.net_payable || 0),
        status: settlement.status,
        settled_at: settlement.settled_at,
        items_count: eligibleOrders.length
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getKhataLedger(storeId) {
    if (!storeId) {
      const err = new Error('Unauthorized: Valid store ID is required');
      err.statusCode = 400;
      throw err;
    }

    const query = `
      SELECT bpo.id,
             bpo.po_number,
             bpo.buyer_store_id,
             bpo.supplier_store_id,
             bpo.total_amount,
             bpo.payment_terms,
             bpo.status,
             bpo.created_at,
             buyer.store_name as buyer_store_name,
             supplier.store_name as supplier_store_name
      FROM b2b_purchase_orders bpo
      LEFT JOIN stores buyer ON bpo.buyer_store_id = buyer.id
      LEFT JOIN stores supplier ON bpo.supplier_store_id = supplier.id
      WHERE (bpo.buyer_store_id = $1::uuid OR bpo.supplier_store_id = $1::uuid)
      ORDER BY bpo.created_at DESC
      LIMIT 50
    `;
    const res = await pool.query(query, [storeId]);
    return res.rows.map(row => {
      const isSupplier = storeId && String(row.supplier_store_id) === String(storeId);
      const isSettledOrCancelled = row.status === 'CANCELLED' || row.payment_terms === 'ADVANCE_UPI';
      const amt = Number(row.total_amount || 0);

      const createdDate = row.created_at ? new Date(row.created_at) : null;
      let dueDays = 0;
      if (row.payment_terms === 'CREDIT_7D') dueDays = 7;
      else if (row.payment_terms === 'CREDIT_14D') dueDays = 14;
      else if (row.payment_terms === 'CREDIT_30D') dueDays = 30;

      let dueDateFormatted = null;
      if (createdDate && dueDays > 0) {
        const d = new Date(createdDate.getTime() + dueDays * 24 * 60 * 60 * 1000);
        dueDateFormatted = d.toISOString().slice(0, 10);
      }

      return {
        id: row.id,
        po_number: row.po_number,
        store: isSupplier
          ? (row.buyer_store_name || 'Buyer Store')
          : (row.supplier_store_name || 'Supplier Store'),
        they_owe: isSupplier && !isSettledOrCancelled ? amt : 0,
        you_owe: !isSupplier && !isSettledOrCancelled ? amt : 0,
        total_amount: amt,
        payment_terms: row.payment_terms,
        due_date: dueDateFormatted,
        status: isSettledOrCancelled ? 'PAID' : row.status,
        created_at: row.created_at
      };
    });
  }

  async payKhataOrder(storeId, poId) {
    if (!storeId) {
      const err = new Error('Unauthorized: Valid store ID is required');
      err.statusCode = 400;
      throw err;
    }

    const existingRes = await pool.query(
      `SELECT id, buyer_store_id FROM b2b_purchase_orders WHERE id = $1`,
      [poId]
    );
    if (existingRes.rows.length === 0) {
      const err = new Error('Khata purchase order not found');
      err.statusCode = 404;
      throw err;
    }

    if (String(existingRes.rows[0].buyer_store_id) !== String(storeId)) {
      const err = new Error('Forbidden: Cross-seller access denied for this purchase order');
      err.statusCode = 403;
      throw err;
    }

    const res = await pool.query(`
      UPDATE b2b_purchase_orders
      SET payment_terms = 'ADVANCE_UPI'
      WHERE id = $1 AND buyer_store_id = $2::uuid
      RETURNING *
    `, [poId, storeId]);

    return res.rows[0];
  }

  // === Seller Phone + 6-Digit PIN Auth & 7-Step Incremental KYC Onboarding ===

  async ensureOnboardingTable() {
    if (this._onboardingTableReady) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS seller_onboarding_steps (
        user_id UUID PRIMARY KEY,
        step1 BOOLEAN DEFAULT false,
        step2 BOOLEAN DEFAULT false,
        step3 BOOLEAN DEFAULT false,
        step4 BOOLEAN DEFAULT false,
        step5 BOOLEAN DEFAULT false,
        step6 BOOLEAN DEFAULT false,
        step7 BOOLEAN DEFAULT false,
        profile_data JSONB DEFAULT '{}'::jsonb,
        delivery_config JSONB DEFAULT '{}'::jsonb,
        credit_config JSONB DEFAULT '{}'::jsonb,
        starter_products JSONB DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    this._onboardingTableReady = true;
  }

  normalizePhoneDigits(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  async loginWithPassword(phone, password, extra = {}) {
    const { hashPin, verifyPin, signToken } = require('../utils/jwt');
    const idMode = extra.idMode || (extra.email && !phone ? 'email' : 'phone');
    const rawEmail = String(extra.email || '').trim().toLowerCase();
    const rawPassword = String(password || extra.password || '');

    let cleanDigits = this.normalizePhoneDigits(phone);
    if (idMode === 'email') {
      if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
        throw new Error('Please enter a valid email address');
      }
    } else {
      if (!cleanDigits || cleanDigits.length < 10) {
        throw new Error('Please enter a valid 10-digit mobile number');
      }
    }

    if (!rawPassword || rawPassword.length < 4) {
      throw new Error('Password must be at least 4 characters');
    }

    let userRes;
    if (idMode === 'email') {
      userRes = await pool.query(`
        SELECT u.id, u.phone, u.email, u.full_name, u.password_hash, u.user_type, u.status, u.is_phone_verified
        FROM users u
        LEFT JOIN seller_profiles sp ON sp.user_id = u.id
        WHERE LOWER(COALESCE(u.email, '')) = $1
        ORDER BY
          (u.user_type = 'SELLER') DESC,
          (sp.id IS NOT NULL) DESC,
          u.created_at DESC
        LIMIT 1
      `, [rawEmail]);
    } else {
      userRes = await pool.query(`
        SELECT u.id, u.phone, u.email, u.full_name, u.password_hash, u.user_type, u.status, u.is_phone_verified
        FROM users u
        LEFT JOIN seller_profiles sp ON sp.user_id = u.id
        WHERE RIGHT(REGEXP_REPLACE(u.phone, '\\D', '', 'g'), 10) = $1
        ORDER BY
          (u.user_type = 'SELLER') DESC,
          (sp.id IS NOT NULL) DESC,
          u.created_at DESC
        LIMIT 1
      `, [cleanDigits]);
    }

    if (userRes.rows.length === 0) {
      // Auto-register new seller on first login
      let signupPhone = cleanDigits;
      const isEmailMode = Boolean(rawEmail && (!signupPhone || signupPhone.length < 10));
      if (!signupPhone || signupPhone.length < 10) {
        if (rawEmail) {
          signupPhone = '9' + Math.floor(100000000 + Math.random() * 900000000).toString().slice(0, 9);
        } else {
          throw new Error('Please enter a valid 10-digit mobile number');
        }
      }
      const namePart = rawEmail ? rawEmail.split('@')[0] : 'Merchant';
      const defaultName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      return await this.signupWithPassword(signupPhone, rawPassword, {
        email: rawEmail || undefined,
        full_name: extra.full_name || defaultName,
        store_name: extra.store_name || `${defaultName} Store`,
        idMode,
        is_phone_verified: !isEmailMode
      }, true);
    }

    const user = userRes.rows[0];

    // Validate account status
    if (user.status && ['BLOCKED', 'SUSPENDED', 'DEACTIVATED'].includes(String(user.status).toUpperCase())) {
      throw new Error('Your account has been deactivated or suspended. Please contact support.');
    }

    // Validate user type
    if (user.user_type && user.user_type !== 'SELLER') {
      throw new Error('Unauthorized account type. This portal is for registered sellers only.');
    }

    // Validate password strictly
    const passwordValid = verifyPin(rawPassword, user.password_hash);
    if (!passwordValid) {
      throw new Error('Invalid credentials. Please verify your credentials and PIN.');
    }

    let onboarding = await this.getOnboardingData(user.id);
    if (!onboarding.profile?.seller_profile_id || !onboarding.store?.id) {
      const defaultStoreName = `Store ${String(user.phone || '0000').replace(/\D/g, '').slice(-4) || 'ADAB'}`;
      const spRes = await pool.query(`
        INSERT INTO seller_profiles (user_id, legal_name, entity_type, pan, kyc_status, onboarding_step)
        VALUES ($1, $2, 'Sole Proprietorship', 'PENDING00P', 'DRAFT', 1)
        ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
        RETURNING id
      `, [user.id, defaultStoreName]);
      const spId = spRes.rows[0]?.id;
      if (spId && !onboarding.store?.id) {
        await pool.query(`
          INSERT INTO stores (seller_id, store_name, category, city, state, pincode, address_line, phone, delivery_radius_km, is_online)
          VALUES ($1, $2, 'Grocery & Supermarket', 'Surat', 'Gujarat', '395007', '', $3, 10, false)
        `, [spId, defaultStoreName, user.phone || '']);
      }
      onboarding = await this.getOnboardingData(user.id);
    }

    const storeId = onboarding.store?.id || null;
    const token = signToken({ userId: user.id, storeId, phone: user.phone });

    return {
      token,
      userId: user.id,
      storeId,
      phone: user.phone,
      email: user.email,
      profile: onboarding.profile,
      store: onboarding.store,
      kycSteps: onboarding.kycSteps,
      onboarding,
      isNewSignup: false
    };
  }

  async loginWithPin(phone, password, extra = {}) {
    return await this.loginWithPassword(phone, password, extra);
  }

  async signupWithPassword(phone, password, extra = {}, skipExistCheck = false) {
    const { hashPin, signToken } = require('../utils/jwt');
    const cleanDigits = this.normalizePhoneDigits(phone);
    const rawPassword = String(password || extra.password || extra.secretToHash || '');
    if (!cleanDigits || cleanDigits.length < 10) {
      throw new Error('Please enter a valid 10-digit mobile number');
    }
    if (!rawPassword || rawPassword.length < 4) {
      throw new Error('Password must be at least 4 characters');
    }

    if (!skipExistCheck) {
      const existing = await pool.query(`
        SELECT id FROM users
        WHERE REGEXP_REPLACE(phone, '\\D', '', 'g') LIKE '%' || $1
        LIMIT 1
      `, [cleanDigits]);

      if (existing.rows.length > 0) {
        throw new Error('This mobile number is already registered. Please switch to Sign In.');
      }
    }

    const formattedPhone = `+91${cleanDigits}`;
    const hashed = hashPin(rawPassword);
    const emailVal = (extra.email || '').trim().toLowerCase() || null;
    const ownerName = (extra.full_name || '').trim() || 'Merchant Owner';
    const storeName = (extra.store_name || '').trim() || `Store ${cleanDigits.slice(-4)}`;

    const isPhoneVerified = extra.is_phone_verified !== undefined ? Boolean(extra.is_phone_verified) : (extra.idMode !== 'email');

    // Single atomic CTE round-trip for user + seller_profile + store + seller_onboarding_steps
    const cteRes = await pool.query(`
      WITH new_user AS (
        INSERT INTO users (phone, email, password_hash, full_name, user_type, status, is_phone_verified)
        VALUES ($1, $5, $2, $3, 'SELLER', 'ACTIVE', $6)
        RETURNING id, phone, full_name, email, status, is_phone_verified
      ),
      new_profile AS (
        INSERT INTO seller_profiles (user_id, legal_name, entity_type, pan, kyc_status, onboarding_step)
        SELECT id, $4, 'Sole Proprietorship', 'PENDING00P', 'DRAFT', 1 FROM new_user
        RETURNING id, legal_name, entity_type, gstin, pan, fssai_license, udhyam_msme, kyc_status, onboarding_step, rejection_reason, submitted_at, verified_at
      ),
      new_store AS (
        INSERT INTO stores (seller_id, store_name, category, city, state, pincode, address_line, phone, delivery_radius_km, is_online)
        SELECT id, $4, 'Grocery & Supermarket', 'Surat', 'Gujarat', '395007', '', $1, 10, false FROM new_profile
        RETURNING id, seller_id AS owner_id, store_name, city, state, pincode, address_line, ui_mode, is_online, open_time, close_time, delivery_radius_km, rating, phone, category, latitude, longitude
      ),
      new_steps AS (
        INSERT INTO seller_onboarding_steps (user_id, step1, step2, step3, step4, step5, step6, step7)
        SELECT id, false, false, false, false, false, false, false FROM new_user
        ON CONFLICT (user_id) DO NOTHING
        RETURNING *
      )
      SELECT
        (SELECT row_to_json(new_user) FROM new_user) AS user_row,
        (SELECT row_to_json(new_profile) FROM new_profile) AS profile_row,
        (SELECT row_to_json(new_store) FROM new_store) AS store_row
    `, [formattedPhone, hashed, ownerName, storeName, emailVal, isPhoneVerified]);

    const { user_row: u, profile_row: sp, store_row: store } = cteRes.rows[0];
    const profile = {
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      is_phone_verified: u.is_phone_verified,
      status: u.status,
      seller_profile_id: sp.id,
      legal_name: sp.legal_name,
      entity_type: sp.entity_type,
      gstin: sp.gstin,
      pan: sp.pan,
      fssai_license: sp.fssai_license,
      udhyam_msme: sp.udhyam_msme,
      kyc_status: sp.kyc_status,
      onboarding_step: sp.onboarding_step,
      rejection_reason: sp.rejection_reason,
      submitted_at: sp.submitted_at,
      verified_at: sp.verified_at
    };
    const kycSteps = {
      step1: false,
      step2: false,
      step3: false,
      step4: false,
      step5: false,
      step6: false,
      step7: false
    };
    const onboarding = {
      profile,
      store,
      bankAccount: null,
      kycSteps,
      profileData: {},
      deliveryConfig: {},
      creditConfig: {},
      starterProducts: []
    };

    const token = signToken({ userId: u.id, storeId: store.id, phone: u.phone });

    return {
      token,
      userId: u.id,
      storeId: store.id,
      phone: u.phone,
      email: u.email,
      profile,
      store,
      kycSteps,
      onboarding,
      isNewSignup: true
    };
  }

  async signupWithPin(phone, password, extra = {}, skipExistCheck = false) {
    return await this.signupWithPassword(phone, password, extra, skipExistCheck);
  }

  async getOnboardingData(userId) {
    // Single SQL round-trip fetching profile, store, bankAccount, and ensuring seller_onboarding_steps row
    const res = await pool.query(`
      WITH ensured_steps AS (
        INSERT INTO seller_onboarding_steps (user_id, step1, step2, step3, step4, step5, step6, step7)
        SELECT
          u.id,
          (sp.kyc_status = 'APPROVED'),
          (sp.kyc_status = 'APPROVED'),
          (sp.kyc_status = 'APPROVED'),
          (sp.kyc_status = 'APPROVED'),
          (sp.kyc_status = 'APPROVED'),
          (sp.kyc_status = 'APPROVED'),
          (sp.kyc_status = 'APPROVED')
        FROM users u
        LEFT JOIN seller_profiles sp ON u.id = sp.user_id
        WHERE u.id = $1
        ON CONFLICT (user_id) DO NOTHING
        RETURNING *
      )
      SELECT
        json_build_object(
          'id', u.id,
          'full_name', u.full_name,
          'email', u.email,
          'phone', u.phone,
          'is_phone_verified', u.is_phone_verified,
          'status', u.status,
          'seller_profile_id', sp.id,
          'legal_name', sp.legal_name,
          'entity_type', sp.entity_type,
          'gstin', sp.gstin,
          'pan', sp.pan,
          'fssai_license', sp.fssai_license,
          'udhyam_msme', sp.udhyam_msme,
          'kyc_status', sp.kyc_status,
          'onboarding_step', sp.onboarding_step,
          'rejection_reason', sp.rejection_reason,
          'submitted_at', sp.submitted_at,
          'verified_at', sp.verified_at
        ) AS profile,
        CASE WHEN s.id IS NOT NULL THEN json_build_object(
          'id', s.id,
          'owner_id', s.seller_id,
          'store_name', s.store_name,
          'city', s.city,
          'state', s.state,
          'pincode', s.pincode,
          'address_line', s.address_line,
          'ui_mode', s.ui_mode,
          'is_online', s.is_online,
          'open_time', s.open_time,
          'close_time', s.close_time,
          'delivery_radius_km', s.delivery_radius_km,
          'rating', s.rating,
          'phone', s.phone,
          'category', s.category,
          'latitude', s.latitude,
          'longitude', s.longitude
        ) ELSE NULL END AS store,
        (
          SELECT row_to_json(b)
          FROM (
            SELECT id, bank_name, account_holder_name, account_number, ifsc_code, account_type, is_verified
            FROM seller_bank_accounts
            WHERE seller_id = sp.id
            ORDER BY created_at DESC
            LIMIT 1
          ) b
        ) AS bank_account,
        COALESCE(
          (SELECT row_to_json(es) FROM ensured_steps es),
          (SELECT row_to_json(os) FROM seller_onboarding_steps os WHERE os.user_id = u.id)
        ) AS steps_row
      FROM users u
      LEFT JOIN seller_profiles sp ON u.id = sp.user_id
      LEFT JOIN LATERAL (
        SELECT * FROM stores WHERE seller_id = sp.id LIMIT 1
      ) s ON true
      WHERE u.id = $1
    `, [userId]);

    const row = res.rows[0] || {};
    const profile = row.profile || null;
    const store = row.store || null;
    const bankAccount = row.bank_account || null;
    const stepsRow = row.steps_row || {};

    if (profile) {
      profile.kyc_status = this.normalizeKycStatus(profile.kyc_status, profile.status);
    }

    const isApproved = profile?.kyc_status === 'APPROVED';
    const isRejected = profile?.kyc_status === 'REJECTED';
    const hasStep1Data = Boolean(store?.address_line && String(store.address_line).trim().length > 0);
    const hasStep2Data = Boolean(profile?.gstin && profile?.pan && profile.pan !== 'PENDING00P');
    const hasStep3Data = Boolean(bankAccount?.account_number);
    const hasStep4Data = Boolean(stepsRow.delivery_config && Object.keys(stepsRow.delivery_config).length > 0);
    const hasStep5Data = Boolean(stepsRow.credit_config && Object.keys(stepsRow.credit_config).length > 0);

    const kycSteps = {
      step1: Boolean(stepsRow.step1 || hasStep1Data || isApproved || isRejected),
      step2: Boolean(stepsRow.step2 || hasStep2Data || isApproved || isRejected),
      step3: Boolean(stepsRow.step3 || hasStep3Data),
      step4: Boolean(stepsRow.step4 || hasStep4Data),
      step5: Boolean(stepsRow.step5 || hasStep5Data),
      step6: Boolean(stepsRow.step6),
      step7: Boolean(isApproved || (!isRejected && stepsRow.step7))
    };

    // Lazy background geocode for existing stores with missing coordinates
    if (store && (store.latitude == null || store.longitude == null) && (store.address_line || store.city || store.pincode)) {
      geocodeAddress({
        addressLine: store.address_line,
        city: store.city,
        state: store.state,
        pincode: store.pincode
      }).then(coords => {
        if (coords) {
          pool.query(
            'UPDATE stores SET latitude = $1, longitude = $2 WHERE id = $3 AND (latitude IS NULL OR longitude IS NULL)',
            [coords.latitude, coords.longitude, store.id]
          ).catch(() => {});
        }
      }).catch(() => {});
    }

    return {
      profile,
      store,
      bankAccount,
      kycSteps,
      profileData: stepsRow.profile_data || {},
      deliveryConfig: stepsRow.delivery_config || {},
      creditConfig: stepsRow.credit_config || {},
      starterProducts: stepsRow.starter_products || []
    };
  }

  async saveOnboardingStep(userId, stepNum, data = {}) {
    await this.ensureOnboardingTable();
    const step = Number(stepNum);
    const current = await this.getOnboardingData(userId);
    const profile = current.profile;
    const store = current.store;
    if (!profile || !store) {
      throw new Error('Seller profile or store not found');
    }

    const isAlreadyApproved = profile.kyc_status === 'APPROVED';

    if (step === 1) {
      // Step 1: Store & Owner Profile (Critical)
      const fullName = (data.owner_name || data.full_name || profile.full_name || '').trim();
      const email = (data.email || profile.email || '').trim() || null;
      const storeName = (data.store_name || store.store_name || '').trim();
      const legalName = (data.legal_name || profile.legal_name || storeName || '').trim();
      const entityType = data.entity_type || profile.entity_type || 'Sole Proprietorship';
      const category = data.category || store.category || 'Grocery & Supermarket';
      const addressLine = (data.address_line || store.address_line || '').trim();
      const city = (data.city || store.city || 'Surat').trim();
      const stateVal = (data.state || store.state || 'Gujarat').trim();
      const pincodeVal = (data.pincode || store.pincode || '395007').trim();

      if (!storeName || !fullName || !addressLine) {
        throw new Error('Store Name, Owner Name, and Complete Address are required for Step 1');
      }

      // Resolve latitude and longitude (explicitly provided or auto-geocoded via OpenStreetMap)
      let storeLat = data.latitude !== undefined && data.latitude !== null && !isNaN(Number(data.latitude))
        ? Number(Number(data.latitude).toFixed(7))
        : null;
      let storeLng = data.longitude !== undefined && data.longitude !== null && !isNaN(Number(data.longitude))
        ? Number(Number(data.longitude).toFixed(7))
        : null;

      if (storeLat == null || storeLng == null) {
        try {
          const geocoded = await geocodeAddress({
            addressLine,
            city,
            state: stateVal,
            pincode: pincodeVal
          });
          if (geocoded) {
            storeLat = geocoded.latitude;
            storeLng = geocoded.longitude;
          }
        } catch (geoErr) {
          // Gracefully continue without blocking Step 1 completion
        }
      }

      let phoneToUpdate = null;
      if (data.phone) {
        const cleanPhone = this.normalizePhoneDigits(data.phone);
        if (!cleanPhone || cleanPhone.length !== 10) {
          throw new Error('Please enter a valid 10-digit mobile number');
        }
        phoneToUpdate = `+91${cleanPhone}`;
        const existingPhoneUser = await pool.query(`
          SELECT id FROM users
          WHERE RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = $1 AND id != $2
          LIMIT 1
        `, [cleanPhone, userId]);
        if (existingPhoneUser.rows.length > 0) {
          throw new Error('This mobile number is already registered to another account');
        }
      }

      if (phoneToUpdate) {
        await pool.query(`
          UPDATE users SET full_name = $1, email = COALESCE($2, email), phone = $3, is_phone_verified = true, updated_at = NOW()
          WHERE id = $4
        `, [fullName, email, phoneToUpdate, userId]);

        await pool.query(`
          UPDATE stores
          SET store_name = $1, category = $2, address_line = $3, city = $4, state = $5, pincode = $6, phone = $7,
              latitude = COALESCE($8, latitude), longitude = COALESCE($9, longitude)
          WHERE id = $10
        `, [storeName, category, addressLine, city, stateVal, pincodeVal, phoneToUpdate, storeLat, storeLng, store.id]);
      } else {
        await pool.query(`
          UPDATE users SET full_name = $1, email = COALESCE($2, email), updated_at = NOW()
          WHERE id = $3
        `, [fullName, email, userId]);

        await pool.query(`
          UPDATE stores
          SET store_name = $1, category = $2, address_line = $3, city = $4, state = $5, pincode = $6,
              latitude = COALESCE($7, latitude), longitude = COALESCE($8, longitude)
          WHERE id = $9
        `, [storeName, category, addressLine, city, stateVal, pincodeVal, storeLat, storeLng, store.id]);
      }

      await pool.query(`
        UPDATE seller_profiles
        SET legal_name = $1,
            entity_type = $2,
            kyc_status = $3,
            onboarding_step = GREATEST(onboarding_step, 2),
            updated_at = NOW()
        WHERE user_id = $4
      `, [legalName, entityType, isAlreadyApproved ? 'APPROVED' : 'DRAFT', userId]);

      const profileExtra = {
        state: stateVal,
        pincode: pincodeVal
      };
      await pool.query(`
        UPDATE seller_onboarding_steps
        SET step1 = true, step7 = $3, profile_data = $1::jsonb, updated_at = NOW()
        WHERE user_id = $2
      `, [JSON.stringify(profileExtra), userId, isAlreadyApproved]);
    } else if (step === 2) {
      // Step 2: Business KYC & Tax Compliance (Critical)
      const gstin = (data.gstin || '').trim().toUpperCase();
      const pan = (data.pan || '').trim().toUpperCase();
      const fssai = (data.fssai_license || '').trim() || null;
      const udhyam = (data.udhyam_msme || '').trim() || null;

      if (!gstin || !pan || pan === 'PENDING00P') {
        throw new Error('Valid GSTIN and PAN Card number are required for Step 2');
      }

      await pool.query(`
        UPDATE seller_profiles
        SET gstin = $1, pan = $2, fssai_license = $3, udhyam_msme = $4,
            kyc_status = $5,
            onboarding_step = GREATEST(onboarding_step, 3), updated_at = NOW()
        WHERE user_id = $6
      `, [gstin, pan, fssai, udhyam, isAlreadyApproved ? 'APPROVED' : 'DRAFT', userId]);

      await pool.query(`
        UPDATE seller_onboarding_steps
        SET step2 = true, step7 = $2, updated_at = NOW()
        WHERE user_id = $1
      `, [userId, isAlreadyApproved]);
    } else if (step === 3) {
      // Step 3: Bank Account & Settlement (Compliance)
      const bankName = (data.bank_name || '').trim();
      const holderName = (data.account_holder_name || '').trim();
      const accNum = (data.account_number || '').trim();
      const ifsc = (data.ifsc_code || '').trim().toUpperCase();
      const accType = (data.account_type || 'CURRENT').toUpperCase() === 'SAVINGS' ? 'SAVINGS' : 'CURRENT';

      if (!bankName || !holderName || !accNum || !ifsc) {
        throw new Error('Bank Name, Account Holder, Account Number, and IFSC Code are required for Step 3');
      }

      const existingBank = await pool.query(
        'SELECT id FROM seller_bank_accounts WHERE seller_id = $1 LIMIT 1',
        [profile.seller_profile_id]
      );
      if (existingBank.rows.length > 0) {
        await pool.query(`
          UPDATE seller_bank_accounts
          SET bank_name = $1, account_holder_name = $2, account_number = $3, ifsc_code = $4, account_type = $5, is_verified = false
          WHERE id = $6
        `, [bankName, holderName, accNum, ifsc, accType, existingBank.rows[0].id]);
      } else {
        await pool.query(`
          INSERT INTO seller_bank_accounts (seller_id, bank_name, account_holder_name, account_number, ifsc_code, account_type, is_verified)
          VALUES ($1, $2, $3, $4, $5, $6, false)
        `, [profile.seller_profile_id, bankName, holderName, accNum, ifsc, accType]);
      }

      await pool.query(`
        UPDATE seller_profiles
        SET kyc_status = $2,
            updated_at = NOW()
        WHERE user_id = $1
      `, [userId, isAlreadyApproved ? 'APPROVED' : 'DRAFT']);

      await pool.query(`
        UPDATE seller_onboarding_steps
        SET step3 = true, step7 = $2, updated_at = NOW()
        WHERE user_id = $1
      `, [userId, isAlreadyApproved]);
    } else if (step === 4) {
      // Step 4: Store Operations & Delivery Logistics (Non-compliance operational setting)
      const prevCfg = current.deliveryConfig || {};
      const openTime = data.open_time || store.open_time || prevCfg.open_time || '08:00';
      const closeTime = data.close_time || store.close_time || prevCfg.close_time || '22:00';
      const parsedRadius = Number(data.delivery_radius_km);
      const fallbackRadius = Number(store.delivery_radius_km ?? prevCfg.delivery_radius_km);
      const radiusKm = Number.isFinite(parsedRadius)
        ? Math.min(20, Math.max(0, parsedRadius))
        : Number.isFinite(fallbackRadius)
        ? Math.min(20, Math.max(0, fallbackRadius))
        : 10;

      const parseRate = (val, prevVal, defaultVal) => {
        if (val !== undefined && val !== null && val !== '' && Number.isFinite(Number(val))) {
          return Math.max(0, Number(Number(val).toFixed(2)));
        }
        if (prevVal !== undefined && prevVal !== null && prevVal !== '' && Number.isFinite(Number(prevVal))) {
          return Math.max(0, Number(Number(prevVal).toFixed(2)));
        }
        return defaultVal;
      };

      const delivFast = data.delivFast !== undefined ? Boolean(data.delivFast) : (prevCfg.delivFast !== undefined ? Boolean(prevCfg.delivFast) : true);
      const delivSame = data.delivSame !== undefined ? Boolean(data.delivSame) : (prevCfg.delivSame !== undefined ? Boolean(prevCfg.delivSame) : true);
      const delivScheduled = data.delivScheduled !== undefined ? Boolean(data.delivScheduled) : (prevCfg.delivScheduled !== undefined ? Boolean(prevCfg.delivScheduled) : true);
      const delivPickup = data.delivPickup !== undefined ? Boolean(data.delivPickup) : (prevCfg.delivPickup !== undefined ? Boolean(prevCfg.delivPickup) : true);
      const porter = data.porter !== undefined ? Boolean(data.porter) : (prevCfg.porter !== undefined ? Boolean(prevCfg.porter) : true);
      const delhivery = data.delhivery !== undefined ? Boolean(data.delhivery) : (prevCfg.delhivery !== undefined ? Boolean(prevCfg.delhivery) : true);
      const exportFreight = data.exportFreight !== undefined ? Boolean(data.exportFreight) : (prevCfg.exportFreight !== undefined ? Boolean(prevCfg.exportFreight) : false);

      const delivFastRate = parseRate(data.delivFastRate, prevCfg.delivFastRate, 49);
      const delivSameRate = parseRate(data.delivSameRate, prevCfg.delivSameRate, 29);
      const delivScheduledRate = parseRate(data.delivScheduledRate, prevCfg.delivScheduledRate, 19);
      const delivPickupRate = parseRate(data.delivPickupRate, prevCfg.delivPickupRate, 0);
      const porterRate = parseRate(data.porterRate, prevCfg.porterRate, 250);
      const delhiveryRate = parseRate(data.delhiveryRate, prevCfg.delhiveryRate, 450);
      const exportFreightRate = parseRate(data.exportFreightRate, prevCfg.exportFreightRate, 2500);

      let storeLat = data.latitude !== undefined && data.latitude !== null && !isNaN(Number(data.latitude))
        ? Number(Number(data.latitude).toFixed(7))
        : null;
      let storeLng = data.longitude !== undefined && data.longitude !== null && !isNaN(Number(data.longitude))
        ? Number(Number(data.longitude).toFixed(7))
        : null;

      const deliveryConfig = {
        ...prevCfg,
        open_time: openTime,
        close_time: closeTime,
        delivery_radius_km: radiusKm,
        ...(storeLat !== null ? { latitude: storeLat, longitude: storeLng } : {}),
        delivFast,
        delivSame,
        delivScheduled,
        delivPickup,
        delivFastRate,
        delivSameRate,
        delivScheduledRate,
        delivPickupRate,
        fleet: data.fleet || prevCfg.fleet || 'SELF',
        porter,
        delhivery,
        exportFreight,
        porterRate,
        delhiveryRate,
        exportFreightRate
      };

      await pool.query(`
        UPDATE stores
        SET open_time = $1, close_time = $2, delivery_radius_km = $3,
            latitude = COALESCE($5, latitude),
            longitude = COALESCE($6, longitude)
        WHERE id = $4
      `, [openTime, closeTime, radiusKm, store.id, storeLat, storeLng]);

      await pool.query(`
        UPDATE seller_onboarding_steps
        SET step4 = true, delivery_config = $1::jsonb, updated_at = NOW()
        WHERE user_id = $2
      `, [JSON.stringify(deliveryConfig), userId]);

      // Sync seller-defined mode rates into canonical delivery_zones table
      try {
        await pool.query('DELETE FROM delivery_zones WHERE store_id = $1', [store.id]);
        await pool.query(`
          INSERT INTO delivery_zones (
            store_id, zone_name, radius_km, delivery_fee, estimated_minutes_min, estimated_minutes_max, is_active
          ) VALUES
            ($1, 'Express (Under 1h)', $2, $3, 15, 60, $4),
            ($1, 'Same-Day', $2, $5, 120, 480, $6),
            ($1, 'Scheduled Hours', $2, $7, 240, 720, $8),
            ($1, 'Store Pickup', 0, $9, 5, 30, $10),
            ($1, 'Porter (Intra-city LCV)', 50, $11, 120, 360, $12),
            ($1, 'Delhivery & Express Cargo', 999, $13, 1440, 4320, $14),
            ($1, 'Export Freight (Air / Sea)', 999, $15, 4320, 14400, $16)
        `, [
          store.id,
          radiusKm,
          delivFastRate, delivFast,
          delivSameRate, delivSame,
          delivScheduledRate, delivScheduled,
          delivPickupRate, delivPickup,
          porterRate, porter,
          delhiveryRate, delhivery,
          exportFreightRate, exportFreight
        ]);
      } catch (zoneErr) {
        console.warn('⚠️ Optional delivery_zones sync skipped:', zoneErr.message);
      }
    } else if (step === 5) {
      // Step 5: B2B Wholesale & Store Credit Terms (Compliance)
      const creditConfig = {
        enableCredit: data.enableCredit !== undefined ? Boolean(data.enableCredit) : true,
        creditDays: Number(data.creditDays) || 14,
        creditLimit: Number(data.creditLimit) || 50000,
        creditMinOrder: Number(data.creditMinOrder) || 5000,
        buyerCreditLimit: Number(data.buyerCreditLimit) || 250000
      };

      await pool.query(`
        UPDATE seller_profiles
        SET kyc_status = $2,
            updated_at = NOW()
        WHERE user_id = $1
      `, [userId, isAlreadyApproved ? 'APPROVED' : 'DRAFT']);

      await pool.query(`
        UPDATE seller_onboarding_steps
        SET step5 = true, step7 = $3, credit_config = $1::jsonb, updated_at = NOW()
        WHERE user_id = $2
      `, [JSON.stringify(creditConfig), userId, isAlreadyApproved]);
    } else if (step === 6) {
      // Step 6: Starter Products (Non-compliance catalog setting)
      const starterProducts = Array.isArray(data.starterProducts) ? data.starterProducts : [];
      await pool.query(`
        UPDATE seller_onboarding_steps
        SET step6 = true, starter_products = $1::jsonb, updated_at = NOW()
        WHERE user_id = $2
      `, [JSON.stringify(starterProducts), userId]);
    } else if (step === 7) {
      // Step 7: Review & Final Submission / Resubmission for Admin Verification
      const latest = await this.getOnboardingData(userId);
      if (!latest.kycSteps.step1 || !latest.kycSteps.step2) {
        throw new Error('Please complete critical steps — Step 1 (Store Profile) and Step 2 (KYC & GST) — before submitting for Admin Verification.');
      }

      await pool.query(`
        UPDATE users
        SET status = CASE
              WHEN UPPER(COALESCE(status, '')) IN ('REJECTED', 'DENIED', 'DECLINED', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING') THEN 'ACTIVE'
              ELSE status
            END,
            updated_at = NOW()
        WHERE id = $1
      `, [userId]);

      await pool.query(`
        UPDATE seller_profiles
        SET kyc_status = $2,
            rejection_reason = NULL,
            onboarding_step = 7,
            submitted_at = NOW(),
            updated_at = NOW()
        WHERE user_id = $1
      `, [userId, isAlreadyApproved ? 'APPROVED' : 'SUBMITTED']);

      await pool.query(`
        UPDATE seller_onboarding_steps
        SET step7 = true, updated_at = NOW()
        WHERE user_id = $1
      `, [userId]);
    } else {
      throw new Error('Invalid onboarding step number');
    }

    return await this.getOnboardingData(userId);
  }
}

module.exports = new SellerRepository();
