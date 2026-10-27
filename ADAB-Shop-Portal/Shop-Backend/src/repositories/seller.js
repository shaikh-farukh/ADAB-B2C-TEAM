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
             s.ui_mode, s.is_online, s.open_time, s.close_time, s.delivery_radius_km, s.rating, s.phone, s.email, s.category,
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

    // Ensure store.email is synced with users.email if previously empty
    if (store && (!store.email || store.email === '')) {
      try {
        const uRes = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
        const userEmail = uRes.rows[0]?.email;
        if (userEmail) {
          store.email = userEmail;
          pool.query(
            'UPDATE stores SET email = $1 WHERE id = $2 AND (email IS NULL OR email = \'\')',
            [userEmail, store.id]
          ).catch(() => {});
        }
      } catch (_) {}
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

    const allowedFields = ['store_name', 'city', 'state', 'pincode', 'address_line', 'phone', 'email', 'category', 'latitude', 'longitude', 'is_online', 'open_time', 'close_time'];
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
        (SELECT COUNT(*) 
         FROM seller_orders so
         JOIN orders o ON so.parent_order_id = o.id
         WHERE so.store_id = $1
           AND (
             UPPER(COALESCE(o.payment_status, 'PAID')) = 'PAID'
             OR UPPER(COALESCE(o.payment_method, '')) IN ('CASH_ON_DELIVERY', 'COD', 'PAY_ON_DELIVERY')
             OR UPPER(COALESCE(o.payment_method, '')) LIKE '%CREDIT%'
           )
        ) as total_orders,
        (SELECT COALESCE(SUM(so.subtotal), 0) 
         FROM seller_orders so
         JOIN orders o ON so.parent_order_id = o.id
         WHERE so.store_id = $1
           AND (
             UPPER(COALESCE(o.payment_status, 'PAID')) = 'PAID'
             OR UPPER(COALESCE(o.payment_method, '')) IN ('CASH_ON_DELIVERY', 'COD', 'PAY_ON_DELIVERY')
             OR UPPER(COALESCE(o.payment_method, '')) LIKE '%CREDIT%'
           )
        ) as total_revenue,
        (SELECT COUNT(*) FROM seller_listings WHERE store_id = $1) as total_products,
        (SELECT COUNT(*) 
         FROM seller_orders so
         JOIN orders o ON so.parent_order_id = o.id
         WHERE so.store_id = $1 
           AND (so.status = 'PLACED' OR so.status = 'PROCESSING' OR so.status = 'new' OR so.status = 'pending')
           AND (
             UPPER(COALESCE(o.payment_status, 'PAID')) = 'PAID'
             OR UPPER(COALESCE(o.payment_method, '')) IN ('CASH_ON_DELIVERY', 'COD', 'PAY_ON_DELIVERY')
             OR UPPER(COALESCE(o.payment_method, '')) LIKE '%CREDIT%'
           )
        ) as pending_orders,
        COALESCE((SELECT COUNT(*) FROM b2b_purchase_orders WHERE buyer_store_id = $1 OR supplier_store_id = $1), 0) as total_b2b_orders,
        COALESCE((SELECT COUNT(*) FROM returns r JOIN seller_orders so ON r.seller_order_id = so.id WHERE so.store_id = $1), 0) as total_returns,
        COALESCE((SELECT COUNT(*) FROM messages m JOIN message_threads t ON m.thread_id = t.id WHERE (t.participant_a = $2 OR t.participant_b = $2) AND m.sender_id != $2 AND m.is_read = false), 0) as unread_messages
    `;
    const res = await pool.query(query, [store.id, userId]);
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
             o.delivery_fee,
             o.total_discount,
             o.total_mrp,
             o.grand_total as amount,
             o.delivery_address,
             u.full_name as customer,
             u.phone as customer_phone,
             inv.invoice_number,
             inv.tax_amount,
             inv.invoice_pdf_url,
             inv.generated_at as invoice_date,
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
      LEFT JOIN invoices inv ON inv.seller_order_id = so.id OR (inv.seller_order_id IS NULL AND inv.order_id = so.parent_order_id)
      WHERE so.store_id = $1::uuid
        AND ($2::text IS NULL OR UPPER(so.status) = $2::text)
        AND ($3::text IS NULL OR o.order_number ILIKE $3::text OR COALESCE(u.full_name, '') ILIKE $3::text)
        AND (
          UPPER(COALESCE(o.payment_status, 'PAID')) = 'PAID'
          OR UPPER(COALESCE(o.payment_method, '')) IN ('CASH_ON_DELIVERY', 'COD', 'PAY_ON_DELIVERY')
          OR UPPER(COALESCE(o.payment_method, '')) LIKE '%CREDIT%'
          OR UPPER(COALESCE(so.status, '')) IN ('CANCELLED', 'RETURNED')
        )
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

      const storeSubtotal = Number(r.store_subtotal ?? r.amount ?? 0);
      const storeDeliveryFee = Number(r.delivery_fee ?? 0);
      const storeDiscount = Number(r.total_discount ?? 0);
      const calculatedGrandTotal = Math.max(0, storeSubtotal + storeDeliveryFee - storeDiscount);

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
        amount: storeSubtotal,
        tax_amount: r.tax_amount != null ? Number(r.tax_amount) : null,
        delivery_fee: storeDeliveryFee,
        total_discount: storeDiscount,
        total_mrp: r.total_mrp != null ? Number(r.total_mrp) : null,
        grand_total: calculatedGrandTotal,
        invoice_number: r.invoice_number || null,
        invoice_pdf_url: r.invoice_pdf_url || null,
        invoice_date: r.invoice_date || null,
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
             o.delivery_fee,
             o.total_mrp,
             o.total_discount,
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
                     'order_quantity', COALESCE(oi_all.quantity, ri_all.quantity, 1),
                     'return_quantity', COALESCE(ri_all.quantity, 1),
                     'unit_price', oi_all.unit_price,
                     'total_price', COALESCE(ri_all.refund_amount, oi_all.total_price),
                     'reason', COALESCE(ri_all.reason, r.reason),
                     'item_condition', COALESCE(ri_all.item_condition, 'UNOPENED'),
                     'current_listing_stock', sl_all.stock_qty,
                     'is_refundable', COALESCE(sl_all.is_refundable, true),
                     'refund_percentage', COALESCE(sl_all.refund_percentage, 100.00),
                     'return_window_days', COALESCE(sl_all.return_window_days, 7)
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
                     'current_listing_stock', sl_fallback.stock_qty,
                     'is_refundable', COALESCE(sl_fallback.is_refundable, true),
                     'refund_percentage', COALESCE(sl_fallback.refund_percentage, 100.00),
                     'return_window_days', COALESCE(sl_fallback.return_window_days, 7)
                   )
                 )
                 FROM order_items oi_fallback
                 LEFT JOIN seller_listings sl_fallback ON oi_fallback.listing_id = sl_fallback.id
                 WHERE oi_fallback.seller_order_id = so.id
               ),
               '[]'::json
             ) as items_list,
             COALESCE(
               (
                 SELECT json_agg(
                   json_build_object(
                     'order_item_id', oi_ord.id,
                     'listing_id', oi_ord.listing_id,
                     'product_name', COALESCE(oi_ord.product_name, 'Order Item'),
                     'quantity', COALESCE(oi_ord.quantity, 1),
                     'unit_price', oi_ord.unit_price,
                     'total_price', oi_ord.total_price,
                     'is_returned', EXISTS (
                       SELECT 1 FROM return_items ri_chk
                       WHERE ri_chk.return_id = r.id AND ri_chk.order_item_id = oi_ord.id
                     ),
                     'returned_quantity', COALESCE((
                       SELECT ri_chk.quantity FROM return_items ri_chk
                       WHERE ri_chk.return_id = r.id AND ri_chk.order_item_id = oi_ord.id
                       LIMIT 1
                     ), 0)
                   )
                 )
                 FROM order_items oi_ord
                 WHERE oi_ord.seller_order_id = so.id
               ),
               '[]'::json
             ) as all_order_items
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
        r.refund_amount ?? r.return_item_refund_amount ?? r.item_total_price ?? r.payment_amount ?? r.grand_total ?? 0
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
        resolved_at: r.resolved_at,
        deliveryFee: r.delivery_fee != null ? Number(r.delivery_fee) : 0,
        discount: r.total_discount != null ? Number(r.total_discount) : 0,
        orderGrandTotal: r.grand_total != null ? Number(r.grand_total) : null,
        allOrderItems: Array.isArray(r.all_order_items) && r.all_order_items.length > 0 ? r.all_order_items : items,
        orderSummary: {
          orderNumber: orderNum,
          grandTotal: Math.max(0, Number(r.store_subtotal != null ? r.store_subtotal : (r.grand_total != null ? r.grand_total : (r.item_total_price || 0))) + Number(r.delivery_fee || 0) - Number(r.total_discount || 0)),
          itemsSubtotal: r.store_subtotal != null ? Number(r.store_subtotal) : (r.item_total_price != null ? Number(r.item_total_price) : 0),
          deliveryFee: r.delivery_fee != null ? Number(r.delivery_fee) : 0,
          discount: r.total_discount != null ? Number(r.total_discount) : 0,
          paymentMethod: r.payment_method || r.order_payment_method || 'CARD',
          paymentStatus: r.payment_record_status || r.payment_status || 'PAID'
        }
      };
    });
  }

  async updateReturnStatus(returnId, status, rejectionReason = null, storeId = null, refundAmount = null) {
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

      const regulatedAmount = (refundAmount !== null && refundAmount !== undefined && !isNaN(Number(refundAmount)) && Number(refundAmount) >= 0)
        ? Math.min(Number(refundAmount), paymentDomainRefundAmount)
        : paymentDomainRefundAmount;

      const regulatedPct = paymentDomainRefundAmount > 0
        ? Number(((regulatedAmount / paymentDomainRefundAmount) * 100).toFixed(2))
        : 100.00;

      await pool.query(`
        UPDATE returns
        SET status = 'APPROVED',
            refund_amount = $2,
            refund_percentage = $3,
            rejection_reason = NULL
        WHERE id = $1
      `, [ret.id, regulatedAmount, regulatedPct]);

      await pool.query(`
        UPDATE return_items
        SET refund_amount = $2
        WHERE return_id = $1
      `, [ret.id, regulatedAmount]);

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
      (normalized === 'approved' && refundAmount !== null && refundAmount !== undefined ? Math.min(Number(refundAmount), paymentDomainRefundAmount) : paymentDomainRefundAmount),
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
      refundAmount: (normalized === 'approved' && refundAmount !== null && refundAmount !== undefined ? Math.min(Number(refundAmount), paymentDomainRefundAmount) : paymentDomainRefundAmount),
      refundPercentage: normalized === 'approved' && refundAmount !== null && refundAmount !== undefined && paymentDomainRefundAmount > 0 ? Number(((Math.min(Number(refundAmount), paymentDomainRefundAmount) / paymentDomainRefundAmount) * 100).toFixed(2)) : (ret.refund_percentage != null ? Number(ret.refund_percentage) : 100),
      paymentStatus: finalPaymentStatus,
      paymentRecordStatus: finalPaymentRecordStatus,
      rejectionReason: finalUiStatus === 'rejected' ? (rejectionReason || 'Return request declined after seller review') : null,
      resolved_at: finalDbStatus === 'COMPLETED' || finalDbStatus === 'REJECTED' ? new Date().toISOString() : ret.resolved_at
    };
  }


  async getB2BOrders(storeId = null) {
    try {
      await this.ensureB2BPurchaseTables();
      const query = `
        SELECT 
          bpo.id,
          bpo.po_number,
          bpo.status,
          bpo.total_amount,
          bpo.payment_terms,
          COALESCE(bpo.payment_status, 'PENDING') as payment_status,
          COALESCE(bpo.payment_method, bpo.payment_terms) as payment_method,
          bpo.payment_reference,
          bpo.delivery_method,
          COALESCE(bpo.delivery_fee, 0) as delivery_fee,
          bpo.notes,
          bpo.rejection_reason,
          bpo.created_at,
          bpo.updated_at,
          bpo.buyer_store_id,
          bpo.supplier_store_id,
          buyer.store_name as buyer_store_name,
          buyer.phone as buyer_phone,
          buyer.city as buyer_city,
          buyer.latitude as buyer_lat,
          buyer.longitude as buyer_lng,
          supp.store_name as supplier_store_name,
          supp.phone as supplier_phone,
          supp.city as supplier_city,
          supp.latitude as supplier_lat,
          supp.longitude as supplier_lng,
          (
            SELECT json_agg(json_build_object(
              'id', bpi.id,
              'listing_id', bpi.listing_id,
              'item_name', bpi.item_name,
              'quantity', bpi.quantity,
              'unit_price', bpi.unit_price,
              'total_price', bpi.total_price,
              'unit', COALESCE(bpi.unit, 'pcs'),
              'brand', bpi.brand_tag,
              'mrp', bpi.mrp,
              'category_name', bpi.category_name,
              'resale_sell_price', bpi.resale_sell_price,
              'image_url', bpi.image_url
            ))
            FROM b2b_purchase_items bpi
            WHERE bpi.purchase_order_id = bpo.id
          ) as items
        FROM b2b_purchase_orders bpo
        LEFT JOIN stores buyer ON bpo.buyer_store_id = buyer.id
        LEFT JOIN stores supp ON bpo.supplier_store_id = supp.id
        WHERE ($1::uuid IS NULL OR bpo.buyer_store_id = $1::uuid OR bpo.supplier_store_id = $1::uuid)
        ORDER BY bpo.created_at DESC
        LIMIT 100
      `;

      const res = await pool.query(query, [storeId || null]);
      return res.rows.map(row => {
        const isBuyer = storeId ? row.buyer_store_id === storeId : true;
        const orderDirection = isBuyer ? 'BOUGHT' : 'SOLD';
        const partnerName = isBuyer ? (row.supplier_store_name || 'Supplier Store') : (row.buyer_store_name || 'Buyer Store');
        const partnerPhone = isBuyer ? row.supplier_phone : row.buyer_phone;
        const partnerCity = isBuyer ? (row.supplier_city || 'Surat') : (row.buyer_city || 'Ahmedabad');

        // Source channel classification
        const poNum = String(row.po_number || '').toUpperCase();
        let sourceChannel = 'DIRECT_B2B';
        let sourceLabel = 'Direct B2B';
        let partnerRole = 'Kirana Wholesale';

        if (poNum.startsWith('REQ-') || String(row.notes || '').toLowerCase().includes('resale')) {
          sourceChannel = 'OTHER_STORE_BRANDS';
          sourceLabel = 'Other Store Brands';
          partnerRole = 'Brand Store';
        } else if (poNum.startsWith('PO-B2B-') || poNum.startsWith('PO-NK-')) {
          sourceChannel = 'NEARBY_KIRANA';
          sourceLabel = 'Nearby Kirana';
          partnerRole = 'Partner Kirana';
        } else if (poNum.startsWith('PO-MFG-')) {
          sourceChannel = 'MANUFACTURER';
          sourceLabel = 'Manufacturer';
          partnerRole = 'Manufacturer';
        } else if (poNum.startsWith('PO-DIST-')) {
          sourceChannel = 'DISTRIBUTOR';
          sourceLabel = 'Distributor';
          partnerRole = 'Distributor';
        }

        // Distance calculation
        let distanceKm = null;
        if (row.buyer_lat && row.buyer_lng && row.supplier_lat && row.supplier_lng) {
          const toRad = (x) => (x * Math.PI) / 180;
          const R = 6371;
          const dLat = toRad(Number(row.supplier_lat) - Number(row.buyer_lat));
          const dLon = toRad(Number(row.supplier_lng) - Number(row.buyer_lng));
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(Number(row.buyer_lat))) * Math.cos(toRad(Number(row.supplier_lat))) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distanceKm = Math.round(R * c * 10) / 10;
        }
        if (!distanceKm || isNaN(distanceKm)) {
          const sameCity = (row.buyer_city && row.supplier_city && row.buyer_city.toLowerCase() === row.supplier_city.toLowerCase());
          distanceKm = sameCity ? 12.5 : 285.0;
        }

        let distanceTier = 'near';
        if (distanceKm > 1500) {
          distanceTier = 'export';
        } else if (distanceKm > 50) {
          distanceTier = 'far';
        }

        // Freight transporter
        let freightPartner = 'Porter Truck';
        if (distanceTier === 'far') {
          freightPartner = 'Delhivery Freight';
        } else if (distanceTier === 'export') {
          freightPartner = 'Air Cargo / Freight';
        } else if (row.delivery_method && !row.delivery_method.includes('DIRECT')) {
          freightPartner = row.delivery_method;
        }

        return {
          ...row,
          order_direction: orderDirection,
          source_channel: sourceChannel,
          source_label: sourceLabel,
          partner_name: partnerName,
          partner_phone: partnerPhone,
          partner_city: partnerCity,
          partner_role: partnerRole,
          distance: distanceKm,
          distance_tier: distanceTier,
          freight_partner: freightPartner,
          items: Array.isArray(row.items) ? row.items : []
        };
      });
    } catch (e) {
      console.error('getB2BOrders error:', e);
      return [];
    }
  }

  async updateB2BOrderStatus(orderId, status, metadata = {}, storeId = null) {
    await this.ensureB2BPurchaseTables();
    const cleanId = orderId ? orderId.toString().replace(/^#/, '') : orderId;
    const normalizedStatus = String(status || '').trim().toUpperCase();

    const lookup = await pool.query(
      `SELECT * FROM b2b_purchase_orders 
       WHERE id::text = $1 OR po_number = $1 OR po_number = ('PO-' || $1) OR po_number = ('REQ-' || $1)
       LIMIT 1`,
      [cleanId]
    );
    if (lookup.rows.length === 0) {
      throw new Error(`B2B Order '${orderId}' not found`);
    }
    const order = lookup.rows[0];

    if (storeId && order.buyer_store_id !== storeId && order.supplier_store_id !== storeId) {
      throw new Error('Unauthorized: You are neither the buyer nor the supplier for this B2B order.');
    }

    const { delivery_method, rejection_reason, payment_status, payment_reference, auto_add_stock } = metadata || {};

    const updateRes = await pool.query(
      `UPDATE b2b_purchase_orders
       SET status = COALESCE($1, status),
           delivery_method = COALESCE($2, delivery_method),
           rejection_reason = COALESCE($3, rejection_reason),
           payment_status = COALESCE($4, payment_status),
           payment_reference = COALESCE($5, payment_reference),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        normalizedStatus || null,
        delivery_method || null,
        rejection_reason || null,
        payment_status || null,
        payment_reference || null,
        order.id
      ]
    );

    if ((normalizedStatus === 'DELIVERED' || normalizedStatus === 'RECEIVED') && auto_add_stock) {
      await this.addB2BOrderItemsToInventory(order.id, order.buyer_store_id);
    }

    return updateRes.rows[0];
  }

  async addB2BOrderItemsToInventory(orderId, buyerStoreId) {
    try {
      const itemsRes = await pool.query(
        `SELECT * FROM b2b_purchase_items WHERE purchase_order_id = $1`,
        [orderId]
      );
      for (const item of itemsRes.rows) {
        const addedQty = Number(item.quantity) || 1;
        let targetListingId = item.listing_id;

        if (!targetListingId && item.item_name) {
          const matchRes = await pool.query(
            `SELECT id FROM seller_listings WHERE store_id = $1 AND LOWER(TRIM(title)) = LOWER(TRIM($2)) LIMIT 1`,
            [buyerStoreId, item.item_name]
          );
          targetListingId = matchRes.rows[0]?.id || null;
        }

        if (targetListingId) {
          await pool.query(
            `UPDATE seller_listings 
             SET stock_qty = COALESCE(stock_qty, 0) + $1, updated_at = NOW() 
             WHERE id = $2`,
            [addedQty, targetListingId]
          );
          await pool.query(
            `INSERT INTO inventory (listing_id, stock_quantity, reserved_quantity, low_stock_threshold, updated_at)
             VALUES ($1, $2, 0, 5, NOW())
             ON CONFLICT (listing_id) DO UPDATE 
             SET stock_quantity = inventory.stock_quantity + EXCLUDED.stock_quantity,
                 updated_at = NOW()`,
            [targetListingId, addedQty]
          );
        } else if (item.item_name) {
          const unitPrice = Number(item.unit_price) || 0;
          const targetSellPrice = Number(item.resale_sell_price) || (unitPrice > 0 ? unitPrice * 1.2 : 50);
          const effectiveMrp = Number(item.mrp) || targetSellPrice * 1.15;

          const newListingRes = await pool.query(
            `INSERT INTO seller_listings (
              store_id, product_type, title, sku, brand_tag, mrp, sell_price, unit,
              min_order_qty, allowed_buyers, approval_status, is_active, stock_qty, rating, review_count
            ) VALUES (
              $1, 'PACKED', $2, $3, $4, $5, $6, $7, 1, 'CUSTOMERS_AND_STORES', 'PUBLISHED', true, $8, 5.0, 0
            ) RETURNING id`,
            [
              buyerStoreId,
              item.item_name,
              `SKU-B2B-${Date.now().toString().slice(-6)}`,
              item.brand_tag || null,
              effectiveMrp,
              targetSellPrice,
              item.unit || 'pcs',
              addedQty
            ]
          );
          const newId = newListingRes.rows[0]?.id;
          if (newId) {
            await pool.query(
              `INSERT INTO inventory (listing_id, stock_quantity, reserved_quantity, low_stock_threshold, updated_at)
               VALUES ($1, $2, 0, 5, NOW())
               ON CONFLICT DO NOTHING`,
              [newId, addedQty]
            );
          }
        }
      }
    } catch (err) {
      console.error('addB2BOrderItemsToInventory error:', err);
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

  async getNearbyCatalog(buyerStoreId, options = {}) {
    try {
      let buyerLat = null;
      let buyerLng = null;
      let buyerCity = '';

      if (buyerStoreId) {
        const storeRes = await pool.query(
          `SELECT id, city, latitude, longitude FROM stores WHERE id = $1`,
          [buyerStoreId]
        );
        if (storeRes.rows.length > 0) {
          const s = storeRes.rows[0];
          buyerLat = s.latitude ? Number(s.latitude) : null;
          buyerLng = s.longitude ? Number(s.longitude) : null;
          buyerCity = s.city || '';
        }
      }

      const query = `
        SELECT 
          sl.id,
          sl.store_id,
          sl.title as name,
          sl.category_id,
          COALESCE(c.name, 'General') as category,
          sl.mrp,
          sl.sell_price as price,
          sl.unit,
          COALESCE(sl.min_order_qty, 1) as min_order,
          COALESCE(sl.stock_qty, 0) as stock_qty,
          sl.barcode,
          sl.brand_tag,
          (
            SELECT pi.image_url 
            FROM product_images pi 
            WHERE pi.product_id = sl.id 
            ORDER BY pi.is_primary DESC, pi.display_order ASC 
            LIMIT 1
          ) AS image_url,
          (
            SELECT json_agg(pi.image_url ORDER BY pi.is_primary DESC, pi.display_order ASC)
            FROM product_images pi
            WHERE pi.product_id = sl.id
          ) AS images,
          s.store_name,
          s.city as store_city,
          s.phone as store_phone,
          s.latitude as store_latitude,
          s.longitude as store_longitude,
          COALESCE(s.rating, 5.0) as store_rating,
          COALESCE(s.is_online, false) as store_is_online,
          CASE 
            WHEN $2::numeric IS NOT NULL AND $3::numeric IS NOT NULL 
                 AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL THEN
              ROUND(
                CAST(
                  6371 * acos(
                    least(1.0, greatest(-1.0,
                      cos(radians($2::numeric)) * cos(radians(s.latitude)) *
                      cos(radians(s.longitude) - radians($3::numeric)) +
                      sin(radians($2::numeric)) * sin(radians(s.latitude))
                    ))
                  ) AS numeric
                ), 1
              )
            WHEN LOWER(s.city) = LOWER($4) THEN 3.0
            ELSE 15.0
          END AS distance_km,
          COALESCE(sos.credit_config->>'enableCredit', 'true')::boolean as credit_allowed,
          COALESCE(sos.credit_config->>'creditDays', '14') as credit_days,
          COALESCE(sos.credit_config->>'creditLimit', '50000') as credit_limit,
          (
            SELECT json_agg(json_build_object(
              'zone_name', dz.zone_name,
              'radius_km', dz.radius_km,
              'delivery_fee', dz.delivery_fee,
              'estimated_minutes_min', dz.estimated_minutes_min,
              'estimated_minutes_max', dz.estimated_minutes_max
            ))
            FROM delivery_zones dz
            WHERE dz.store_id = s.id AND dz.is_active = true
          ) AS delivery_options
        FROM seller_listings sl
        JOIN stores s ON sl.store_id = s.id
        LEFT JOIN categories c ON sl.category_id = c.id
        LEFT JOIN seller_profiles sp ON s.seller_id = sp.id
        LEFT JOIN seller_onboarding_steps sos ON sp.user_id = sos.user_id
        WHERE ($1::uuid IS NULL OR s.id != $1)
          AND sl.is_active = true
          AND sl.approval_status = 'APPROVED'
          AND sl.product_type IN ('PACKED_ITEM', 'LOOSE_WEIGHT')
          AND sl.product_type != 'OWN_BRAND'
          AND COALESCE(sl.allowed_buyers, 'ALL') IN ('ALL', 'STORES_ONLY')
        ORDER BY sl.created_at DESC
        LIMIT 50;
      `;

      const res = await pool.query(query, [buyerStoreId || null, buyerLat, buyerLng, buyerCity]);
      return res.rows;
    } catch (e) {
      console.error('getNearbyCatalog Error:', e);
      return [];
    }
  }

  async getNearbyStores(buyerStoreId, options = {}) {
    try {
      let buyerLat = null;
      let buyerLng = null;
      let buyerCity = '';

      if (buyerStoreId) {
        const storeRes = await pool.query(
          `SELECT id, city, latitude, longitude FROM stores WHERE id = $1`,
          [buyerStoreId]
        );
        if (storeRes.rows.length > 0) {
          const s = storeRes.rows[0];
          buyerLat = s.latitude ? Number(s.latitude) : null;
          buyerLng = s.longitude ? Number(s.longitude) : null;
          buyerCity = s.city || '';
        }
      }

      const query = `
        SELECT 
          s.id,
          s.store_name,
          s.category,
          s.city,
          s.pincode,
          s.address_line,
          s.phone,
          s.email,
          s.latitude,
          s.longitude,
          COALESCE(s.delivery_radius_km, 10.0) as delivery_radius_km,
          COALESCE(s.is_online, false) as is_online,
          COALESCE(s.rating, 5.0) as rating,
          COALESCE(s.rating_count, 0) as rating_count,
          CASE 
            WHEN $2::numeric IS NOT NULL AND $3::numeric IS NOT NULL 
                 AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL THEN
              ROUND(
                CAST(
                  6371 * acos(
                    least(1.0, greatest(-1.0,
                      cos(radians($2::numeric)) * cos(radians(s.latitude)) *
                      cos(radians(s.longitude) - radians($3::numeric)) +
                      sin(radians($2::numeric)) * sin(radians(s.latitude))
                    ))
                  ) AS numeric
                ), 1
              )
            WHEN LOWER(s.city) = LOWER($4) THEN 3.0
            ELSE 15.0
          END AS distance_km,
          COALESCE(sos.credit_config->>'enableCredit', 'true')::boolean as credit_allowed,
          COALESCE(sos.credit_config->>'creditDays', '14') as credit_days,
          COALESCE(sos.credit_config->>'creditLimit', '50000') as credit_limit,
          COALESCE(sos.credit_config->>'creditMinOrder', '5000') as credit_min_order,
          (SELECT COUNT(*) FROM seller_listings sl WHERE sl.store_id = s.id AND sl.is_active = true AND sl.approval_status = 'APPROVED' AND sl.product_type IN ('PACKED_ITEM', 'LOOSE_WEIGHT') AND sl.product_type != 'OWN_BRAND' AND COALESCE(sl.allowed_buyers, 'ALL') IN ('ALL', 'STORES_ONLY')) as active_listings_count,
          (
            SELECT json_agg(json_build_object(
              'zone_name', dz.zone_name,
              'radius_km', dz.radius_km,
              'delivery_fee', dz.delivery_fee,
              'estimated_minutes_min', dz.estimated_minutes_min,
              'estimated_minutes_max', dz.estimated_minutes_max
            ))
            FROM delivery_zones dz
            WHERE dz.store_id = s.id AND dz.is_active = true
          ) AS delivery_options
        FROM stores s
        LEFT JOIN seller_profiles sp ON s.seller_id = sp.id
        LEFT JOIN seller_onboarding_steps sos ON sp.user_id = sos.user_id
        WHERE ($1::uuid IS NULL OR s.id != $1)
        ORDER BY distance_km ASC
        LIMIT 50;
      `;

      const res = await pool.query(query, [buyerStoreId || null, buyerLat, buyerLng, buyerCity]);
      return res.rows;
    } catch (e) {
      console.error('getNearbyStores Error:', e);
      return [];
    }
  }

  async getBuyerCreditInfo(userId, storeId) {
    try {
      let limit = 0;
      let ledgerUtilized = 0;
      let hasLedger = false;

      // 1. Check credit_ledgers for user OR store ID
      const ledgerRes = await pool.query(
        `SELECT total_limit, utilized_amount, available_amount FROM credit_ledgers WHERE applicant_id = $1 OR applicant_id = $2 LIMIT 1`,
        [userId, storeId]
      );
      if (ledgerRes.rows.length > 0) {
        hasLedger = true;
        limit = Number(ledgerRes.rows[0].total_limit) || 0;
        ledgerUtilized = Number(ledgerRes.rows[0].utilized_amount) || 0;
      } else {
        // 2. Check approved credit_applications
        const appRes = await pool.query(
          `SELECT approved_amount FROM credit_applications WHERE (applicant_id = $1 OR applicant_id = $2) AND status = 'APPROVED' ORDER BY created_at DESC LIMIT 1`,
          [userId, storeId]
        );
        if (appRes.rows.length > 0) {
          limit = Number(appRes.rows[0].approved_amount) || 0;
        } else {
          // 3. Fallback to onboarding credit configuration
          const onbRes = await pool.query(
            `SELECT credit_config FROM seller_onboarding_steps WHERE user_id = $1 LIMIT 1`,
            [userId]
          );
          if (onbRes.rows.length > 0 && onbRes.rows[0].credit_config) {
            const cfg = onbRes.rows[0].credit_config;
            limit = Number(cfg.buyerCreditLimit || cfg.creditLimit) || 0;
          }
        }
      }

      // Calculate real utilized amount from active purchase orders
      let poUtilized = 0;
      if (storeId) {
        const poRes = await pool.query(
          `SELECT COALESCE(SUM(total_amount), 0) as utilized 
           FROM b2b_purchase_orders 
           WHERE buyer_store_id = $1 
             AND payment_terms LIKE '%CREDIT%' 
             AND status NOT IN ('CANCELLED', 'PAID')`,
          [storeId]
        );
        poUtilized = Number(poRes.rows[0]?.utilized) || 0;
      }

      const totalUtilized = hasLedger ? Math.max(ledgerUtilized, poUtilized) : poUtilized;
      const available = Math.max(0, limit - totalUtilized);

      return {
        total_limit: limit,
        utilized_amount: totalUtilized,
        available_amount: available
      };
    } catch (e) {
      console.error('getBuyerCreditInfo Error:', e);
      return { total_limit: 0, utilized_amount: 0, available_amount: 0 };
    }
  }

  async ensureB2BPurchaseTables(client = pool) {
    if (this._b2bPurchaseTablesReady) return;
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS b2b_purchase_orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          po_number VARCHAR(50) UNIQUE NOT NULL,
          buyer_store_id UUID NOT NULL,
          supplier_store_id UUID NOT NULL,
          total_amount NUMERIC(12,2) NOT NULL,
          payment_terms VARCHAR(50) DEFAULT 'CREDIT_14D',
          payment_status VARCHAR(50) DEFAULT 'PENDING',
          payment_method VARCHAR(50) DEFAULT 'CREDIT',
          payment_reference VARCHAR(150),
          payment_metadata JSONB DEFAULT '{}'::jsonb,
          delivery_method VARCHAR(50),
          delivery_fee NUMERIC(10,2) DEFAULT 0,
          notes TEXT,
          status VARCHAR(50) DEFAULT 'PLACED',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS b2b_purchase_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          purchase_order_id UUID NOT NULL REFERENCES b2b_purchase_orders(id) ON DELETE CASCADE,
          listing_id UUID,
          item_name VARCHAR(255),
          unit VARCHAR(50),
          image_url TEXT,
          quantity NUMERIC(10,2) NOT NULL,
          unit_price NUMERIC(10,2) NOT NULL,
          total_price NUMERIC(10,2) NOT NULL
        );

        ALTER TABLE b2b_purchase_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING';
        ALTER TABLE b2b_purchase_orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
        ALTER TABLE b2b_purchase_orders ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(150);
        ALTER TABLE b2b_purchase_orders ADD COLUMN IF NOT EXISTS payment_metadata JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE b2b_purchase_orders ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(50);
        ALTER TABLE b2b_purchase_orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 0;
        ALTER TABLE b2b_purchase_orders ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE b2b_purchase_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

        ALTER TABLE b2b_purchase_items ADD COLUMN IF NOT EXISTS item_name VARCHAR(255);
        ALTER TABLE b2b_purchase_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
        ALTER TABLE b2b_purchase_items ADD COLUMN IF NOT EXISTS image_url TEXT;
        ALTER TABLE b2b_purchase_items ADD COLUMN IF NOT EXISTS brand_tag VARCHAR(100);
        ALTER TABLE b2b_purchase_items ADD COLUMN IF NOT EXISTS mrp NUMERIC(10,2);
        ALTER TABLE b2b_purchase_items ADD COLUMN IF NOT EXISTS category_name VARCHAR(100);

        ALTER TABLE b2b_purchase_items ADD COLUMN IF NOT EXISTS resale_sell_price NUMERIC(10,2);
        ALTER TABLE b2b_purchase_orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
        ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS blocked_reseller_store_ids UUID[] DEFAULT '{}'::uuid[];

        ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(10,2);
        ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS tiered_pricing JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS sample_available BOOLEAN DEFAULT true;
        ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS original_listing_id UUID REFERENCES seller_listings(id) ON DELETE SET NULL;
        ALTER TABLE seller_listings DROP CONSTRAINT IF EXISTS seller_listings_master_catalog_id_fkey;
        ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_listing_id_fkey;
        ALTER TABLE cart_items ADD CONSTRAINT cart_items_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES seller_listings(id) ON DELETE CASCADE;
        ALTER TABLE b2b_purchase_orders DROP CONSTRAINT IF EXISTS b2b_purchase_orders_status_check;
        ALTER TABLE b2b_purchase_orders ADD CONSTRAINT b2b_purchase_orders_status_check CHECK (status IN ('REQUESTED', 'APPROVED', 'DECLINED', 'PLACED', 'CONFIRMED', 'PACKING', 'PACKED', 'DISPATCHED', 'IN_TRANSIT', 'SHIPPED', 'DELIVERED', 'RECEIVED', 'CANCELLED'));
      `);
      this._b2bPurchaseTablesReady = true;
    } catch (_) {
      this._b2bPurchaseTablesReady = true;
    }
  }

  async getPurchaseOrders(storeId, options = {}) {
    try {
      await this.ensureB2BPurchaseTables();
      const typeFilter = options?.type;
      let typeClause = '';
      if (typeFilter === 'restock' || typeFilter === 'PO') {
        typeClause = " AND po.po_number LIKE 'PO-B2B-%'";
      } else if (typeFilter === 'resale' || typeFilter === 'REQ') {
        typeClause = " AND po.po_number LIKE 'REQ-B2B-%'";
      }

      const query = `
        SELECT 
          po.id,
          po.po_number,
          po.supplier_store_id,
          s.store_name as supplier_name,
          s.phone as supplier_phone,
          s.city as supplier_city,
          po.total_amount,
          po.payment_terms,
          COALESCE(po.payment_status, CASE WHEN po.payment_terms LIKE '%CREDIT%' THEN 'PAID_ON_CREDIT' ELSE 'PAID' END) as payment_status,
          COALESCE(po.payment_method, po.payment_terms) as payment_method,
          po.payment_reference,
          po.payment_metadata,
          po.delivery_method,
          po.delivery_fee,
          po.status,
          po.notes,
          po.rejection_reason,
          po.created_at,
          (
            SELECT json_agg(json_build_object(
              'id', poi.id,
              'listing_id', poi.listing_id,
              'item_name', COALESCE(poi.item_name, sl.title, 'Wholesale Product'),
              'quantity', poi.quantity,
              'price', poi.unit_price,
              'resale_sell_price', poi.resale_sell_price,
              'total', poi.total_price,
              'unit', COALESCE(poi.unit, sl.unit, 'pcs'),
              'image_url', COALESCE(poi.image_url, (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = sl.id ORDER BY pi.is_primary DESC LIMIT 1)),
              'brand', sl.brand_tag
            ))
            FROM b2b_purchase_items poi
            LEFT JOIN seller_listings sl ON poi.listing_id = sl.id
            WHERE poi.purchase_order_id = po.id
          ) as items
        FROM b2b_purchase_orders po
        LEFT JOIN stores s ON po.supplier_store_id = s.id
        WHERE po.buyer_store_id = $1 ${typeClause}
        ORDER BY po.created_at DESC
        LIMIT 50;
      `;
      const res = await pool.query(query, [storeId]);
      return res.rows;
    } catch (e) {
      console.warn('getPurchaseOrders fallback to base query:', e.message);
      try {
        const typeFilter = options?.type;
        let typeClause = '';
        if (typeFilter === 'restock' || typeFilter === 'PO') {
          typeClause = " AND po.po_number LIKE 'PO-B2B-%'";
        } else if (typeFilter === 'resale' || typeFilter === 'REQ') {
          typeClause = " AND po.po_number LIKE 'REQ-B2B-%'";
        }

        const fallbackQuery = `
          SELECT 
            po.id,
            po.po_number,
            po.supplier_store_id,
            s.store_name as supplier_name,
            s.phone as supplier_phone,
            s.city as supplier_city,
            po.total_amount,
            po.payment_terms,
            po.status,
            po.created_at,
            (
              SELECT json_agg(json_build_object(
                'id', poi.id,
                'listing_id', poi.listing_id,
                'item_name', COALESCE(sl.title, 'Wholesale Product'),
                'quantity', poi.quantity,
                'price', poi.unit_price,
                'total', poi.total_price,
                'unit', COALESCE(sl.unit, 'pcs'),
                'brand', sl.brand_tag
              ))
              FROM b2b_purchase_items poi
              LEFT JOIN seller_listings sl ON poi.listing_id = sl.id
              WHERE poi.purchase_order_id = po.id
            ) as items
          FROM b2b_purchase_orders po
          LEFT JOIN stores s ON po.supplier_store_id = s.id
          WHERE po.buyer_store_id = $1 ${typeClause}
          ORDER BY po.created_at DESC
          LIMIT 50;
        `;
        const res = await pool.query(fallbackQuery, [storeId]);
        return res.rows;
      } catch (err2) {
        console.error('getPurchaseOrders Error:', err2);
        return [];
      }
    }
  }

  async createPurchaseOrder(buyerStoreId, userId, orderData) {
    const { items, payment_terms = 'CREDIT_14D', payment_method, payment_details = {}, delivery_method = 'porter', delivery_fee = 0, notes } = orderData;
    if (!buyerStoreId) {
      const err = new Error('Buyer store ID is required');
      err.statusCode = 400;
      throw err;
    }
    if (!Array.isArray(items) || items.length === 0) {
      const err = new Error('Cart is empty. Please add items to place a purchase order.');
      err.statusCode = 400;
      throw err;
    }

    // Normalizing payment terms to match DB constraints ('CREDIT_14D' or 'ADVANCE_UPI')
    const isCreditOrder = String(payment_terms || '').toUpperCase().includes('CREDIT') || 
                          String(payment_method || '').toLowerCase().includes('credit');
    const normalizedTerms = isCreditOrder ? 'CREDIT_14D' : 'ADVANCE_UPI';
    const finalPaymentMethod = (payment_method || (isCreditOrder ? 'CREDIT' : 'UPI')).toUpperCase();

    // Handle missing Razorpay / Card / UPI details gracefully
    const paymentRef = payment_details.razorpay_payment_id || 
                       payment_details.transaction_id || 
                       payment_details.reference_id || 
                       payment_details.upi_id || 
                       null;

    const paymentStatus = isCreditOrder ? 'PAID_ON_CREDIT' : (paymentRef ? 'PAID' : 'PAID_SIMULATED');
    const paymentMeta = {
      ...paymentDetailsSafe(payment_details),
      method: finalPaymentMethod,
      reference: paymentRef,
      has_gateway_details: Boolean(paymentRef),
      note: paymentRef ? 'Verified transaction' : 'Online checkout completed (gateway details omitted or pending)',
      paid_at: payment_details.paid_at || new Date().toISOString()
    };

    function paymentDetailsSafe(obj) {
      try {
        return typeof obj === 'object' && obj !== null ? obj : {};
      } catch (_) {
        return {};
      }
    }

    // Group items by supplier store_id
    const groupedBySupplier = {};
    for (const item of items) {
      const sId = item.store_id;
      if (!sId) {
        const err = new Error(`Item ${item.name || item.id} is missing supplier store reference`);
        err.statusCode = 400;
        throw err;
      }
      if (sId === buyerStoreId) {
        const err = new Error('Cannot purchase items from your own store.');
        err.statusCode = 400;
        throw err;
      }
      if (!groupedBySupplier[sId]) {
        groupedBySupplier[sId] = [];
      }
      groupedBySupplier[sId].push(item);
    }

    await this.ensureB2BPurchaseTables();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const createdOrders = [];

      for (const [supplierStoreId, supplierItems] of Object.entries(groupedBySupplier)) {
        let subtotal = 0;
        for (const it of supplierItems) {
          const qty = Number(it.quantity) || 1;
          const price = Number(it.price) || 0;
          subtotal += qty * price;
        }

        const fee = Number(delivery_fee) || 0;
        const totalAmount = subtotal + fee;
        const poNumber = `PO-B2B-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

        let newPo;
        try {
          const poRes = await client.query(
            `INSERT INTO b2b_purchase_orders (
              po_number,
              buyer_store_id,
              supplier_store_id,
              total_amount,
              payment_terms,
              payment_status,
              payment_method,
              payment_reference,
              payment_metadata,
              delivery_method,
              delivery_fee,
              notes,
              status,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PLACED', NOW())
            RETURNING *`,
            [
              poNumber,
              buyerStoreId,
              supplierStoreId,
              totalAmount,
              normalizedTerms,
              paymentStatus,
              finalPaymentMethod,
              paymentRef,
              JSON.stringify(paymentMeta),
              delivery_method,
              fee,
              notes || null
            ]
          );
          newPo = poRes.rows[0];
        } catch (insertErr) {
          // Fallback for older schemas lacking newer columns
          const fallbackRes = await client.query(
            `INSERT INTO b2b_purchase_orders (
              po_number,
              buyer_store_id,
              supplier_store_id,
              total_amount,
              payment_terms,
              status,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, 'PLACED', NOW())
            RETURNING *`,
            [poNumber, buyerStoreId, supplierStoreId, totalAmount, normalizedTerms]
          );
          newPo = fallbackRes.rows[0];
        }

        // Insert items with product metadata snapshot (name, unit, image, brand, mrp, category)
        for (const it of supplierItems) {
          const qty = Number(it.quantity) || 1;
          const price = Number(it.price) || 0;
          const itemTotal = qty * price;
          const itemName = it.name || it.item_name || 'Wholesale Product';
          const itemUnit = it.unit || 'unit';
          const itemImage = it.image_url || null;
          const itemBrand = it.brand_tag || it.brand || null;
          const itemMrp = it.mrp ? Number(it.mrp) : null;
          const itemCategory = it.category || it.category_name || null;

          try {
            await client.query(
              `INSERT INTO b2b_purchase_items (
                purchase_order_id,
                listing_id,
                quantity,
                unit_price,
                total_price,
                item_name,
                unit,
                image_url,
                brand_tag,
                mrp,
                category_name
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [newPo.id, it.id, qty, price, itemTotal, itemName, itemUnit, itemImage, itemBrand, itemMrp, itemCategory]
            );
          } catch (_) {
            try {
              await client.query(
                `INSERT INTO b2b_purchase_items (
                  purchase_order_id,
                  listing_id,
                  quantity,
                  unit_price,
                  total_price,
                  item_name,
                  unit,
                  image_url
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [newPo.id, it.id, qty, price, itemTotal, itemName, itemUnit, itemImage]
              );
            } catch (__) {
              await client.query(
                `INSERT INTO b2b_purchase_items (
                  purchase_order_id,
                  listing_id,
                  quantity,
                  unit_price,
                  total_price
                ) VALUES ($1, $2, $3, $4, $5)`,
                [newPo.id, it.id, qty, price, itemTotal]
              );
            }
          }

          // Deduct stock safely if listing exists
          await client.query(
            `UPDATE seller_listings 
             SET stock_qty = GREATEST(0, stock_qty - $1)
             WHERE id = $2`,
            [qty, it.id]
          );
        }

        // If credit payment, update credit_ledgers if row exists
        if (isCreditOrder) {
          await client.query(
            `UPDATE credit_ledgers 
             SET utilized_amount = utilized_amount + $1,
                 updated_at = NOW()
             WHERE applicant_id = $2 OR applicant_id = $3`,
            [totalAmount, userId, buyerStoreId]
          );
        }

        createdOrders.push(newPo);
      }

      await client.query('COMMIT');
      return createdOrders;
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('createPurchaseOrder Error:', e);
      throw e;
    } finally {
      client.release();
    }
  }

  async getOtherStoreBrands(buyerStoreId, options = {}) {
    await this.ensureB2BPurchaseTables();
    try {
      const { category, q, storeFilter } = options;

      let buyerLat = null;
      let buyerLng = null;
      let buyerCity = null;
      if (buyerStoreId) {
        try {
          const stRes = await pool.query(
            `SELECT id, city, latitude, longitude FROM stores WHERE id = $1`,
            [buyerStoreId]
          );
          if (stRes.rows.length > 0) {
            buyerLat = stRes.rows[0].latitude;
            buyerLng = stRes.rows[0].longitude;
            buyerCity = stRes.rows[0].city;
          }
        } catch (_) {}
      }

      const params = [buyerStoreId || null, buyerLat, buyerLng, buyerCity];
      let conditions = [
        `($1::uuid IS NULL OR sl.store_id != $1)`,
        `($1::uuid IS NULL OR NOT ($1::uuid = ANY(COALESCE(sl.blocked_reseller_store_ids, '{}'))))`,
        `sl.product_type = 'OWN_BRAND'`,
        `sl.original_listing_id IS NULL`, // Only original producer's own brands, not resale duplicates
        `sl.master_catalog_id IS NULL`,
        `sl.is_active = true`,
        `sl.approval_status = 'APPROVED'`,
        `COALESCE(sl.allowed_buyers, 'ALL') IN ('ALL', 'STORES_ONLY')`
      ];

      if (category && category !== 'all') {
        params.push(`%${category}%`);
        conditions.push(`(c.name ILIKE $${params.length} OR sl.title ILIKE $${params.length})`);
      }

      if (q) {
        params.push(`%${q}%`);
        conditions.push(`(sl.title ILIKE $${params.length} OR sl.brand_tag ILIKE $${params.length} OR s.store_name ILIKE $${params.length})`);
      }

      if (storeFilter && storeFilter !== 'all') {
        params.push(storeFilter);
        conditions.push(`sl.store_id = $${params.length}`);
      }

      const query = `
        SELECT 
          sl.id,
          sl.store_id,
          sl.title,
          sl.title as name,
          sl.brand_tag,
          sl.sku,
          sl.barcode,
          sl.category_id,
          COALESCE(c.name, 'General') as category,
          sl.mrp,
          COALESCE(sl.wholesale_price, sl.sell_price) as price,
          COALESCE(sl.wholesale_price, sl.sell_price) as wholesale_price,
          sl.sell_price as retail_sell_price,
          sl.allowed_buyers,
          COALESCE(sl.sample_available, true) as sample_available,
          COALESCE(sl.tiered_pricing, '[]'::jsonb) as tiered_pricing,
          sl.unit,
          COALESCE(sl.min_order_qty, 1) as min_order,
          COALESCE(sl.min_order_qty, 1) as min_order_qty,
          COALESCE(sl.stock_qty, 0) as stock_qty,
          (
            SELECT pi.image_url 
            FROM product_images pi 
            WHERE pi.product_id = sl.id 
            ORDER BY pi.is_primary DESC, pi.display_order ASC 
            LIMIT 1
          ) AS image_url,
          (
            SELECT json_agg(pi.image_url ORDER BY pi.is_primary DESC, pi.display_order ASC)
            FROM product_images pi
            WHERE pi.product_id = sl.id
          ) AS images,
          s.store_name,
          s.city as store_city,
          s.phone as store_phone,
          s.latitude as store_latitude,
          s.longitude as store_longitude,
          s.address_line as store_address,
          COALESCE(s.category, 'Kirana & FMCG') as store_category,
          COALESCE(s.rating, 5.0) as store_rating,
          COALESCE(s.is_online, false) as store_is_online,
          CASE 
            WHEN $2::numeric IS NOT NULL AND $3::numeric IS NOT NULL 
                 AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL THEN
              ROUND(
                (6371 * acos(
                  LEAST(1.0, GREATEST(-1.0,
                    cos(radians($2)) * cos(radians(s.latitude)) *
                    cos(radians($3) - radians(s.longitude)) +
                    sin(radians($2)) * sin(radians(s.latitude))
                  ))
                ))::numeric, 1
              )
            WHEN LOWER(s.city) = LOWER($4) THEN 3.0
            ELSE 10.0
          END AS distance_km,
          COALESCE(sos.credit_config->>'enableCredit', 'true')::boolean as credit_allowed,
          COALESCE(sos.credit_config->>'creditDays', '14') as credit_days,
          COALESCE(
            (
              SELECT json_agg(json_build_object(
                'zone_name', dz.zone_name,
                'radius_km', dz.radius_km,
                'delivery_fee', dz.delivery_fee,
                'estimated_minutes_min', dz.estimated_minutes_min,
                'estimated_minutes_max', dz.estimated_minutes_max
              ))
              FROM delivery_zones dz
              WHERE dz.store_id = s.id AND dz.is_active = true
            ),
            '[]'::json
          ) AS delivery_options,
          (
            SELECT COUNT(DISTINCT sl2.store_id)
            FROM seller_listings sl2
            WHERE sl2.master_catalog_id = sl.id
          ) as stores_selling_count
        FROM seller_listings sl
        JOIN stores s ON sl.store_id = s.id
        LEFT JOIN categories c ON sl.category_id = c.id
        LEFT JOIN seller_profiles sp ON s.seller_id = sp.id
        LEFT JOIN seller_onboarding_steps sos ON sp.user_id = sos.user_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY sl.created_at DESC
        LIMIT 50;
      `;

      const res = await pool.query(query, params);
      return res.rows;
    } catch (e) {
      console.error('getOtherStoreBrands Error:', e);
      return [];
    }
  }

  async addOtherStoreBrandToMyStore(buyerStoreId, { originalListingId, sellPrice, wholesalePrice, stockQty }) {
    await this.ensureB2BPurchaseTables();
    try {
      const origRes = await pool.query(
        `SELECT * FROM seller_listings WHERE id = $1 AND product_type = 'OWN_BRAND' AND is_active = true`,
        [originalListingId]
      );
      if (origRes.rows.length === 0) {
        throw new Error('Original brand product not found or inactive');
      }
      const orig = origRes.rows[0];

      // Safe retail price calculations & guardrails
      const parsedSellPrice = Number(sellPrice);
      const parsedWholesalePrice = Number(wholesalePrice);
      const parsedStockQty = Number(stockQty);

      // Guardrail 1: Resale price cannot exceed printed MRP (if MRP is set)
      const effectiveMrp = orig.mrp ? Number(orig.mrp) : null;
      let finalSellPrice = Number.isFinite(parsedSellPrice) && parsedSellPrice > 0 ? parsedSellPrice : Number(orig.sell_price);
      if (effectiveMrp !== null && finalSellPrice > effectiveMrp) {
        finalSellPrice = effectiveMrp;
      }

      // Wholesale price: systematically locked to the original manufacturer's wholesale price (acquisition cost)
      const wholesaleBase = Number(orig.wholesale_price || orig.sell_price || 0);
      let finalWholesalePrice = Number.isFinite(parsedWholesalePrice) && parsedWholesalePrice > 0
        ? parsedWholesalePrice
        : wholesaleBase;

      const existingRes = await pool.query(
        `SELECT id, stock_qty FROM seller_listings 
         WHERE store_id = $1 AND (original_listing_id = $2 OR (master_catalog_id IS NOT NULL AND master_catalog_id = $2))`,
        [buyerStoreId, originalListingId]
      );
      if (existingRes.rows.length > 0) {
        const addedStock = Number.isFinite(parsedStockQty) && parsedStockQty > 0 ? parsedStockQty : 10;
        const updateRes = await pool.query(
          `UPDATE seller_listings 
           SET sell_price = $1, wholesale_price = $2, stock_qty = stock_qty + $3, approval_status = 'PUBLISHED', allowed_buyers = 'CUSTOMERS_ONLY', is_active = true, updated_at = NOW()
           WHERE id = $4 RETURNING *`,
          [finalSellPrice, finalWholesalePrice, addedStock, existingRes.rows[0].id]
        );
        return updateRes.rows[0];
      }

      const insertRes = await pool.query(
        `INSERT INTO seller_listings (
          store_id, product_type, original_listing_id, master_catalog_id, title, sku, barcode, brand_tag,
          category_id, mrp, sell_price, unit, min_order_qty, allowed_buyers,
          approval_status, is_active, stock_qty, wholesale_price
        ) VALUES (
          $1, 'OWN_BRAND', $2, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, 'CUSTOMERS_ONLY',
          'PUBLISHED', true, $12, $13
        ) RETURNING *`,
        [
          buyerStoreId,
          orig.id, // original_listing_id and master_catalog_id
          orig.title,
          orig.sku ? `${orig.sku}-RES` : null,
          orig.barcode,
          orig.brand_tag,
          orig.category_id,
          orig.mrp,
          finalSellPrice,
          orig.unit || 'unit',
          1,
          parsedStockQty || 20,
          finalWholesalePrice
        ]
      );
      const childListing = insertRes.rows[0];

      // Clone product images into product_images for the new child listing
      try {
        await pool.query(
          `INSERT INTO product_images (product_id, image_url, is_primary, display_order)
           SELECT $1, image_url, is_primary, display_order
           FROM product_images
           WHERE product_id = $2
           ON CONFLICT DO NOTHING`,
          [childListing.id, orig.id]
        );
      } catch (imgErr) {
        console.warn('Image clone notice:', imgErr.message);
      }

      return childListing;
    } catch (e) {
      console.error('addOtherStoreBrandToMyStore Error:', e);
      throw e;
    }
  }

  async requestResaleStock(buyerStoreId, { originalListingId, quantity, resaleSellPrice, paymentTerms = 'CREDIT_14D', notes }) {
    await this.ensureB2BPurchaseTables();
    if (!buyerStoreId) throw new Error('Buyer store ID is required');
    if (!originalListingId) throw new Error('Original listing ID is required');

    const origRes = await pool.query(
      `SELECT sl.*, s.store_name, s.id as supplier_store_id, COALESCE(c.name, 'General') as category_name,
              (
                SELECT pi.image_url 
                FROM product_images pi 
                WHERE pi.product_id = sl.id 
                ORDER BY pi.is_primary DESC, pi.display_order ASC 
                LIMIT 1
              ) AS primary_image_url
       FROM seller_listings sl 
       JOIN stores s ON sl.store_id = s.id 
       LEFT JOIN categories c ON sl.category_id = c.id
       WHERE sl.id = $1 AND sl.product_type = 'OWN_BRAND' AND sl.is_active = true`,
      [originalListingId]
    );
    if (origRes.rows.length === 0) {
      throw new Error('Original brand product not found or inactive');
    }
    const orig = origRes.rows[0];
    const supplierStoreId = orig.supplier_store_id;

    if (supplierStoreId === buyerStoreId) {
      throw new Error('Cannot request stock from your own store');
    }

    if (Array.isArray(orig.blocked_reseller_store_ids) && orig.blocked_reseller_store_ids.includes(buyerStoreId)) {
      throw new Error('The manufacturer is currently not accepting resale requests from your store.');
    }

    const qty = Math.max(1, Number(quantity) || Number(orig.min_order_qty) || 1);
    const unitPrice = Number(orig.wholesale_price || orig.sell_price || 0);
    const totalAmount = qty * unitPrice;
    const poNumber = `REQ-B2B-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const effectiveMrp = orig.mrp ? Number(orig.mrp) : Number(orig.sell_price || unitPrice * 1.25);
    let targetSellPrice = Number(resaleSellPrice);
    if (!Number.isFinite(targetSellPrice) || targetSellPrice <= 0) {
      targetSellPrice = effectiveMrp || unitPrice * 1.25;
    }
    if (effectiveMrp !== null && targetSellPrice > effectiveMrp) {
      targetSellPrice = effectiveMrp;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const isCreditOrder = String(paymentTerms || '').toUpperCase().includes('CREDIT');
      const normalizedTerms = isCreditOrder ? 'CREDIT_14D' : 'ADVANCE_UPI';
      const poMethod = normalizedTerms === 'ADVANCE_UPI' ? 'UPI' : 'CREDIT';
      const poRes = await client.query(
        `INSERT INTO b2b_purchase_orders (
          po_number, buyer_store_id, supplier_store_id, total_amount, payment_terms,
          payment_status, payment_method, payment_reference, delivery_method, delivery_fee,
          status, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $1, 'DIRECT_STORE_DELIVERY', 0, 'REQUESTED', $7, NOW(), NOW())
        RETURNING *`,
        [poNumber, buyerStoreId, supplierStoreId, totalAmount, normalizedTerms, poMethod, notes || 'Resale authorization request']
      );
      const newPo = poRes.rows[0];

      await client.query(
        `INSERT INTO b2b_purchase_items (
          purchase_order_id, listing_id, item_name, unit, image_url, brand_tag, category_name, mrp,
          quantity, unit_price, total_price, resale_sell_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          newPo.id,
          orig.id,
          orig.title,
          orig.unit || 'pcs',
          orig.primary_image_url || null,
          orig.brand_tag || orig.store_name || 'Brand',
          orig.category_name || 'General',
          effectiveMrp,
          qty,
          unitPrice,
          totalAmount,
          targetSellPrice
        ]
      );

      await client.query('COMMIT');
      return {
        ...newPo,
        item: {
          listing_id: orig.id,
          title: orig.title,
          quantity: qty,
          unit_price: unitPrice,
          total_price: totalAmount,
          resale_sell_price: targetSellPrice
        }
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getIncomingResaleRequests(supplierStoreId) {
    await this.ensureB2BPurchaseTables();
    const query = `
      SELECT 
        bpo.id,
        bpo.po_number,
        bpo.buyer_store_id,
        buyer.store_name as buyer_store_name,
        buyer.city as buyer_store_city,
        buyer.phone as buyer_store_phone,
        COALESCE(buyer.rating, 5.0) as buyer_rating,
        bpo.total_amount,
        bpo.payment_terms,
        bpo.payment_status,
        bpo.status,
        bpo.notes,
        bpo.rejection_reason,
        bpo.created_at,
        bpo.updated_at,
        (
          SELECT json_agg(json_build_object(
            'id', poi.id,
            'listing_id', poi.listing_id,
            'item_name', poi.item_name,
            'quantity', poi.quantity,
            'wholesale_price', poi.unit_price,
            'resale_sell_price', poi.resale_sell_price,
            'total_price', poi.total_price,
            'unit', poi.unit,
            'image_url', poi.image_url,
            'mrp', poi.mrp
          ))
          FROM b2b_purchase_items poi
          WHERE poi.purchase_order_id = bpo.id
        ) as items,
        BOOL_OR(buyer.id = ANY(COALESCE(sl_orig.blocked_reseller_store_ids, '{}'))) as is_buyer_blocked
      FROM b2b_purchase_orders bpo
      JOIN stores buyer ON bpo.buyer_store_id = buyer.id
      LEFT JOIN b2b_purchase_items poi_sub ON poi_sub.purchase_order_id = bpo.id
      LEFT JOIN seller_listings sl_orig ON poi_sub.listing_id = sl_orig.id
      WHERE bpo.supplier_store_id = $1
      GROUP BY bpo.id, buyer.id
      ORDER BY bpo.created_at DESC
      LIMIT 50;
    `;
    try {
      const res = await pool.query(query, [supplierStoreId]);
      return res.rows;
    } catch (e) {
      console.error('getIncomingResaleRequests Error:', e);
      return [];
    }
  }

  async approveResaleRequest(supplierStoreId, orderId) {
    await this.ensureB2BPurchaseTables();
    const poRes = await pool.query(
      `SELECT * FROM b2b_purchase_orders WHERE id = $1 AND supplier_store_id = $2`,
      [orderId, supplierStoreId]
    );
    if (poRes.rows.length === 0) {
      throw new Error('Order/request not found or access denied');
    }
    const po = poRes.rows[0];
    if (po.status !== 'REQUESTED' && po.status !== 'PENDING_APPROVAL') {
      throw new Error(`Order cannot be approved in its current status: ${po.status}`);
    }

    const updateRes = await pool.query(
      `UPDATE b2b_purchase_orders 
       SET status = 'APPROVED', updated_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [orderId]
    );
    return updateRes.rows[0];
  }

  async declineResaleRequest(supplierStoreId, orderId, reason = '') {
    await this.ensureB2BPurchaseTables();
    const updateRes = await pool.query(
      `UPDATE b2b_purchase_orders 
       SET status = 'DECLINED', rejection_reason = $1, updated_at = NOW() 
       WHERE id = $2 AND supplier_store_id = $3 
       RETURNING *`,
      [reason || 'Manufacturer declined request at this time', orderId, supplierStoreId]
    );
    if (updateRes.rows.length === 0) {
      throw new Error('Order/request not found or access denied');
    }
    return updateRes.rows[0];
  }

  async confirmAndPayResaleOrder(buyerStoreId, orderId, paymentData = {}) {
    await this.ensureB2BPurchaseTables();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const poRes = await client.query(
        `SELECT * FROM b2b_purchase_orders WHERE id = $1 AND buyer_store_id = $2 FOR UPDATE`,
        [orderId, buyerStoreId]
      );
      if (poRes.rows.length === 0) {
        throw new Error('Order not found or access denied');
      }
      const po = poRes.rows[0];
      if (po.status !== 'APPROVED' && po.status !== 'REQUESTED') {
        throw new Error(`Order is not in an approved state (current: ${po.status})`);
      }

      const paymentMethod = (paymentData.payment_method || po.payment_method || 'CREDIT_14D').toUpperCase();
      const isCredit = paymentMethod.includes('CREDIT');
      const paymentStatus = isCredit ? 'PAID_ON_CREDIT' : 'PAID';
      const paymentRef = paymentData.payment_reference || `PAY-${Date.now().toString().slice(-8)}`;

      await client.query(
        `UPDATE b2b_purchase_orders 
         SET status = 'CONFIRMED', payment_status = $1, payment_method = $2, payment_reference = $3,
             payment_metadata = $4, updated_at = NOW() 
         WHERE id = $5`,
        [paymentStatus, paymentMethod, paymentRef, JSON.stringify(paymentData.metadata || { confirmed_at: new Date().toISOString() }), orderId]
      );

      const itemsRes = await client.query(
        `SELECT * FROM b2b_purchase_items WHERE purchase_order_id = $1`,
        [orderId]
      );

      const publishedListings = [];

      for (const item of itemsRes.rows) {
        if (!item.listing_id) continue;
        const origRes = await client.query(
          `SELECT * FROM seller_listings WHERE id = $1`,
          [item.listing_id]
        );
        if (origRes.rows.length === 0) continue;
        const orig = origRes.rows[0];
        const addedQty = Number(item.quantity) || 1;

        // Deduct inventory from manufacturer Store A
        await client.query(
          `UPDATE seller_listings 
           SET stock_qty = GREATEST(0, stock_qty - $1), updated_at = NOW() 
           WHERE id = $2`,
          [addedQty, orig.id]
        );
        await client.query(
          `UPDATE inventory 
           SET stock_quantity = GREATEST(COALESCE(reserved_quantity, 0), COALESCE(stock_quantity, 0) - $1::numeric),
               updated_at = NOW() 
           WHERE listing_id = $2`,
          [addedQty, orig.id]
        );

        // Check if Store B already has this product in catalog
        const existingRes = await client.query(
          `SELECT id, stock_qty FROM seller_listings 
           WHERE store_id = $1 AND (original_listing_id = $2 OR (master_catalog_id IS NOT NULL AND master_catalog_id = $2))`,
          [buyerStoreId, orig.id]
        );

        const targetSellPrice = item.resale_sell_price ? Number(item.resale_sell_price) : Number(orig.sell_price);
        const effectiveMrp = orig.mrp ? Number(orig.mrp) : targetSellPrice;

        let targetListingId;
        if (existingRes.rows.length > 0) {
          targetListingId = existingRes.rows[0].id;
          const updateRes = await client.query(
            `UPDATE seller_listings 
             SET stock_qty = stock_qty + $1, 
                 sell_price = $2, 
                 wholesale_price = NULL,
                 allowed_buyers = 'CUSTOMERS_ONLY', 
                 approval_status = 'PUBLISHED', 
                 is_active = true, 
                 updated_at = NOW() 
             WHERE id = $3 
             RETURNING *`,
            [addedQty, targetSellPrice, targetListingId]
          );
          publishedListings.push(updateRes.rows[0]);
        } else {
          const insertRes = await client.query(
            `INSERT INTO seller_listings (
              store_id, product_type, original_listing_id, master_catalog_id, title, sku, barcode, brand_tag,
              category_id, mrp, sell_price, unit, min_order_qty, allowed_buyers,
              approval_status, is_active, stock_qty, wholesale_price, rating, review_count
            ) VALUES (
              $1, 'OWN_BRAND', $2, $2, $3, $4, $5, $6,
              $7, $8, $9, $10, 1, 'CUSTOMERS_ONLY',
              'PUBLISHED', true, $11, NULL, 5.0, 0
            ) RETURNING *`,
            [
              buyerStoreId,
              orig.id,
              orig.title,
              orig.sku ? `${orig.sku}-RES` : `SKU-${Date.now().toString().slice(-6)}`,
              orig.barcode || null,
              orig.brand_tag || null,
              orig.category_id || null,
              effectiveMrp,
              targetSellPrice,
              orig.unit || 'pcs',
              addedQty
            ]
          );
          const newChild = insertRes.rows[0];
          targetListingId = newChild.id;

          try {
            await client.query(
              `INSERT INTO product_images (product_id, image_url, is_primary, display_order)
               SELECT $1, image_url, is_primary, display_order
               FROM product_images
               WHERE product_id = $2
               ON CONFLICT DO NOTHING`,
              [newChild.id, orig.id]
            );
          } catch (_) {}

          publishedListings.push(newChild);
        }

        // Sync buyer Store B's inventory table (available_quantity is automatically generated by Postgres)
        await client.query(
          `INSERT INTO inventory (listing_id, stock_quantity, reserved_quantity, low_stock_threshold, updated_at)
           VALUES ($1, $2, 0, 5, NOW())
           ON CONFLICT (listing_id) DO UPDATE 
           SET stock_quantity = inventory.stock_quantity + EXCLUDED.stock_quantity,
               updated_at = NOW()`,
          [targetListingId, addedQty]
        );
      }

      await client.query('COMMIT');
      return {
        orderId,
        status: 'CONFIRMED',
        paymentStatus,
        publishedListings
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async toggleBlockResellerStore(supplierStoreId, buyerStoreId, block = true) {
    if (block) {
      await pool.query(
        `UPDATE seller_listings 
         SET blocked_reseller_store_ids = array_append(COALESCE(blocked_reseller_store_ids, '{}'), $2::uuid)
         WHERE store_id = $1 AND NOT ($2::uuid = ANY(COALESCE(blocked_reseller_store_ids, '{}')))`,
        [supplierStoreId, buyerStoreId]
      );
    } else {
      await pool.query(
        `UPDATE seller_listings 
         SET blocked_reseller_store_ids = array_remove(COALESCE(blocked_reseller_store_ids, '{}'), $2::uuid)
         WHERE store_id = $1`,
        [supplierStoreId, buyerStoreId]
      );
    }
    return { success: true, blocked: block };
  }

  async getMyAddedOtherStoreBrands(buyerStoreId) {
    await this.ensureB2BPurchaseTables();
    try {
      const query = `
        SELECT 
          sl.id,
          sl.title,
          sl.brand_tag,
          sl.sell_price,
          sl.mrp,
          sl.stock_qty,
          sl.unit,
          sl.approval_status,
          sl.is_active,
          sl.wholesale_price,
          sl.original_listing_id,
          (
            SELECT pi.image_url 
            FROM product_images pi 
            WHERE pi.product_id = orig.id OR pi.product_id = sl.id 
            ORDER BY pi.is_primary DESC 
            LIMIT 1
          ) AS image_url,
          s_orig.id as original_store_id,
          s_orig.store_name as original_store_name,
          s_orig.city as original_store_city,
          COALESCE(orig.wholesale_price, orig.sell_price) as original_wholesale_price
        FROM seller_listings sl
        JOIN seller_listings orig ON (sl.original_listing_id = orig.id OR (sl.master_catalog_id IS NOT NULL AND sl.master_catalog_id = orig.id))
        JOIN stores s_orig ON orig.store_id = s_orig.id
        WHERE sl.store_id = $1
        ORDER BY sl.created_at DESC;
      `;
      const res = await pool.query(query, [buyerStoreId]);
      return res.rows;
    } catch (e) {
      console.error('getMyAddedOtherStoreBrands Error:', e);
      return [];
    }
  }

  async getPurchasedBrandsReadyToPublish(buyerStoreId) {
    await this.ensureB2BPurchaseTables();
    try {
      const query = `
        SELECT 
          poi.listing_id as original_listing_id,
          poi.listing_id as id,
          COALESCE(poi.item_name, sl_orig.title, 'Purchased Brand Product') as title,
          COALESCE(poi.item_name, sl_orig.title, 'Purchased Brand Product') as name,
          COALESCE(poi.brand_tag, sl_orig.brand_tag, 'Own Brand') as brand_tag,
          COALESCE(poi.unit, sl_orig.unit, 'unit') as unit,
          COALESCE(
            poi.image_url,
            (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = sl_orig.id ORDER BY pi.is_primary DESC LIMIT 1)
          ) as image_url,
          poi.unit_price as wholesale_price,
          COALESCE(poi.mrp, sl_orig.mrp, poi.unit_price * 1.25) as mrp,
          sl_orig.sell_price as original_retail_price,
          sl_orig.category_id,
          COALESCE(poi.category_name, c.name, 'General') as category,
          SUM(poi.quantity) as total_purchased_qty,
          MAX(bpo.created_at) as last_purchased_at,
          s_supplier.id as store_id,
          s_supplier.store_name,
          s_supplier.city as store_city
        FROM b2b_purchase_items poi
        JOIN b2b_purchase_orders bpo ON poi.purchase_order_id = bpo.id
        JOIN stores s_supplier ON bpo.supplier_store_id = s_supplier.id
        LEFT JOIN seller_listings sl_orig ON poi.listing_id = sl_orig.id
        LEFT JOIN categories c ON sl_orig.category_id = c.id
        WHERE bpo.buyer_store_id = $1
          AND poi.listing_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM seller_listings sl_resale 
            WHERE sl_resale.store_id = $1 
              AND (sl_resale.original_listing_id = poi.listing_id OR (sl_resale.master_catalog_id IS NOT NULL AND sl_resale.master_catalog_id = poi.listing_id))
          )
        GROUP BY 
          poi.listing_id, poi.item_name, poi.brand_tag, poi.unit, poi.image_url,
          poi.unit_price, poi.mrp, poi.category_name,
          s_supplier.id, s_supplier.store_name, s_supplier.city,
          sl_orig.id, sl_orig.title, sl_orig.brand_tag, sl_orig.unit, sl_orig.mrp,
          sl_orig.sell_price, sl_orig.category_id, c.name
        ORDER BY last_purchased_at DESC;
      `;
      const res = await pool.query(query, [buyerStoreId]);
      return res.rows;
    } catch (e) {
      console.error('getPurchasedBrandsReadyToPublish Error:', e);
      return [];
    }
  }

  async getBrandDistributionAnalytics(creatorStoreId) {
    await this.ensureB2BPurchaseTables();
    try {
      const partnersRes = await pool.query(`
        SELECT 
          s.id as store_id,
          s.store_name,
          s.city,
          COUNT(sl.id) as active_resale_listings,
          MIN(sl.created_at) as partner_since,
          BOOL_OR(s.id = ANY(COALESCE(orig.blocked_reseller_store_ids, '{}'))) as is_blocked
        FROM seller_listings sl
        JOIN seller_listings orig ON (sl.original_listing_id = orig.id OR (sl.master_catalog_id IS NOT NULL AND sl.master_catalog_id = orig.id))
        JOIN stores s ON sl.store_id = s.id
        WHERE orig.store_id = $1
        GROUP BY s.id, s.store_name, s.city
        ORDER BY active_resale_listings DESC
        LIMIT 20;
      `, [creatorStoreId]);

      const poStatsRes = await pool.query(`
        SELECT 
          COUNT(DISTINCT bpo.id) as total_b2b_orders,
          COUNT(DISTINCT bpo.buyer_store_id) as total_buyer_stores,
          COALESCE(SUM(poi.quantity), 0) as total_b2b_units_sold,
          COALESCE(SUM(poi.total_price), 0) as total_b2b_revenue
        FROM b2b_purchase_items poi
        JOIN b2b_purchase_orders bpo ON poi.purchase_order_id = bpo.id
        WHERE bpo.supplier_store_id = $1;
      `, [creatorStoreId]);

      const topProductsRes = await pool.query(`
        SELECT 
          orig.id,
          orig.title,
          orig.brand_tag,
          COUNT(DISTINCT sl.store_id) as partner_stores_count,
          COALESCE(SUM(poi.quantity), 0) as units_supplied
        FROM seller_listings orig
        LEFT JOIN seller_listings sl ON (sl.original_listing_id = orig.id OR (sl.master_catalog_id IS NOT NULL AND sl.master_catalog_id = orig.id))
        LEFT JOIN b2b_purchase_items poi ON poi.listing_id = orig.id
        WHERE orig.store_id = $1 AND orig.product_type = 'OWN_BRAND'
        GROUP BY orig.id, orig.title, orig.brand_tag
        ORDER BY partner_stores_count DESC, units_supplied DESC
        LIMIT 10;
      `, [creatorStoreId]);

      const stats = poStatsRes.rows[0] || {};
      return {
        total_buyer_stores: Number(stats.total_buyer_stores || partnersRes.rows.length || 0),
        total_b2b_orders: Number(stats.total_b2b_orders || 0),
        total_b2b_units_sold: Number(stats.total_b2b_units_sold || 0),
        total_b2b_revenue: Number(stats.total_b2b_revenue || 0),
        partner_stores: partnersRes.rows,
        top_products: topProductsRes.rows
      };
    } catch (e) {
      console.error('getBrandDistributionAnalytics Error:', e);
      return {
        total_buyer_stores: 0,
        total_b2b_orders: 0,
        total_b2b_units_sold: 0,
        total_b2b_revenue: 0,
        partner_stores: [],
        top_products: []
      };
    }
  }

  async toggleListingB2B(storeId, listingId) {
    try {
      const getRes = await pool.query(
        `SELECT id, allowed_buyers, master_catalog_id, original_listing_id FROM seller_listings WHERE id = $1 AND store_id = $2`,
        [listingId, storeId]
      );
      if (getRes.rows.length === 0) {
        throw new Error('Listing not found or access denied');
      }
      const item = getRes.rows[0];
      if (item.master_catalog_id || item.original_listing_id) {
        throw new Error('Partner brand products are reserved for retail customers only and cannot be opened for wholesale.');
      }
      const current = item.allowed_buyers || 'ALL';
      const nextVal = (current === 'ALL' || current === 'STORES_ONLY') ? 'CUSTOMERS_ONLY' : 'ALL';

      const updateRes = await pool.query(
        `UPDATE seller_listings 
         SET allowed_buyers = $1, updated_at = NOW() 
         WHERE id = $2 AND store_id = $3 
         RETURNING *`,
        [nextVal, listingId, storeId]
      );
      return updateRes.rows[0];
    } catch (e) {
      console.error('toggleListingB2B Error:', e);
      throw e;
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

  // === Store Credit Terms & Rules (Give, Receive, ADAB Line) ===

  async ensureStoreCreditRulesTable(client = pool) {
    if (this._storeCreditRulesReady) return;
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS store_credit_rules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
          enable_credit BOOLEAN DEFAULT true,
          credit_days INT DEFAULT 14,
          min_order_amount NUMERIC(12,2) DEFAULT 5000.00,
          max_limit_per_store NUMERIC(12,2) DEFAULT 50000.00,
          max_stores_count INT DEFAULT 10,
          total_exposure_cap NUMERIC(12,2) DEFAULT 300000.00,
          buy_max_shops INT DEFAULT 5,
          buy_max_per_shop NUMERIC(12,2) DEFAULT 25000.00,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_store_credit_rules_store ON store_credit_rules(store_id);
      `);
      this._storeCreditRulesReady = true;
    } catch (err) {
      console.warn('⚠️ store_credit_rules table setup error (non-fatal):', err.message);
    }
  }

  async getStoreCreditRules(userId, storeId) {
    await this.ensureStoreCreditRulesTable();
    if (!storeId) {
      const err = new Error('Unauthorized: Valid store ID is required');
      err.statusCode = 400;
      throw err;
    }

    // 1. Fetch or create store credit rules
    let ruleRes = await pool.query(
      `SELECT * FROM store_credit_rules WHERE store_id = $1 LIMIT 1`,
      [storeId]
    );

    if (ruleRes.rows.length === 0) {
      // Check seller_onboarding_steps for existing credit_config
      let initDays = 14;
      let initMin = 5000;
      let initMaxPerStore = 50000;
      let initMaxShops = 10;
      let initCap = 300000;
      let initBuyMaxShops = 5;
      let initBuyPerShop = 25000;
      let initEnable = true;

      if (userId) {
        const onbRes = await pool.query(
          `SELECT credit_config FROM seller_onboarding_steps WHERE user_id = $1 LIMIT 1`,
          [userId]
        );
        if (onbRes.rows.length > 0 && onbRes.rows[0].credit_config) {
          const cfg = onbRes.rows[0].credit_config;
          if (cfg.creditDays) initDays = Number(cfg.creditDays) || 14;
          if (cfg.creditMinOrder) initMin = Number(cfg.creditMinOrder) || 5000;
          if (cfg.creditLimit) initMaxPerStore = Number(cfg.creditLimit) || 50000;
          if (cfg.creditMaxShops) initMaxShops = Number(cfg.creditMaxShops) || 10;
          if (cfg.creditTotalCap) initCap = Number(cfg.creditTotalCap) || 300000;
          if (cfg.buyMaxShops) initBuyMaxShops = Number(cfg.buyMaxShops) || 5;
          if (cfg.buyPerShop) initBuyPerShop = Number(cfg.buyPerShop) || 25000;
          if (cfg.enableCredit !== undefined) initEnable = Boolean(cfg.enableCredit);
        }
      }

      ruleRes = await pool.query(
        `INSERT INTO store_credit_rules (
          store_id, enable_credit, credit_days, min_order_amount,
          max_limit_per_store, max_stores_count, total_exposure_cap,
          buy_max_shops, buy_max_per_shop
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (store_id) DO UPDATE SET updated_at = NOW()
        RETURNING *`,
        [storeId, initEnable, initDays, initMin, initMaxPerStore, initMaxShops, initCap, initBuyMaxShops, initBuyPerShop]
      );
    }

    const rule = ruleRes.rows[0];

    // 2. Fetch live metrics for Credit You GIVE (other stores owe this store)
    const giveOrdersRes = await pool.query(`
      SELECT bpo.buyer_store_id,
             buyer.store_name as buyer_store_name,
             COALESCE(SUM(bpo.total_amount), 0) as amount_owed,
             MIN(bpo.created_at) as earliest_order_at,
             bpo.payment_terms
      FROM b2b_purchase_orders bpo
      LEFT JOIN stores buyer ON bpo.buyer_store_id = buyer.id
      WHERE bpo.supplier_store_id = $1::uuid
        AND bpo.payment_terms LIKE '%CREDIT%'
        AND bpo.status NOT IN ('CANCELLED', 'REJECTED')
        AND bpo.payment_status != 'PAID'
      GROUP BY bpo.buyer_store_id, buyer.store_name, bpo.payment_terms
      ORDER BY amount_owed DESC
    `, [storeId]);

    const storesOnCredit = giveOrdersRes.rows.map(row => {
      const amt = Number(row.amount_owed) || 0;
      let termDays = Number(rule.credit_days) || 14;
      if (row.payment_terms === 'CREDIT_7D') termDays = 7;
      else if (row.payment_terms === 'CREDIT_14D') termDays = 14;
      else if (row.payment_terms === 'CREDIT_21D') termDays = 21;
      else if (row.payment_terms === 'CREDIT_30D') termDays = 30;
      else if (row.payment_terms === 'CREDIT_45D') termDays = 45;
      else if (row.payment_terms === 'CREDIT_60D') termDays = 60;

      const createdTime = row.earliest_order_at ? new Date(row.earliest_order_at).getTime() : Date.now();
      const elapsedDays = Math.max(0, Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24)));
      const daysLeft = Math.max(0, termDays - elapsedDays);

      return {
        store_id: row.buyer_store_id,
        store_name: row.buyer_store_name || 'Buyer Store',
        amount_owed: amt,
        days_left: daysLeft,
        credit_days: termDays
      };
    });

    const giveExposureUsed = storesOnCredit.reduce((acc, s) => acc + s.amount_owed, 0);

    // 3. Fetch live metrics for Credit from OTHER Shops (this store owes other stores)
    const receiveOrdersRes = await pool.query(`
      SELECT bpo.supplier_store_id,
             supplier.store_name as supplier_store_name,
             COALESCE(SUM(bpo.total_amount), 0) as amount_owed,
             MIN(bpo.created_at) as earliest_order_at,
             bpo.payment_terms
      FROM b2b_purchase_orders bpo
      LEFT JOIN stores supplier ON bpo.supplier_store_id = supplier.id
      WHERE bpo.buyer_store_id = $1::uuid
        AND bpo.payment_terms LIKE '%CREDIT%'
        AND bpo.status NOT IN ('CANCELLED', 'REJECTED')
        AND bpo.payment_status != 'PAID'
      GROUP BY bpo.supplier_store_id, supplier.store_name, bpo.payment_terms
      ORDER BY amount_owed DESC
    `, [storeId]);

    const sellerCredits = receiveOrdersRes.rows.map(row => {
      const amt = Number(row.amount_owed) || 0;
      let termDays = 14;
      if (row.payment_terms === 'CREDIT_7D') termDays = 7;
      else if (row.payment_terms === 'CREDIT_14D') termDays = 14;
      else if (row.payment_terms === 'CREDIT_21D') termDays = 21;
      else if (row.payment_terms === 'CREDIT_30D') termDays = 30;
      else if (row.payment_terms === 'CREDIT_45D') termDays = 45;
      else if (row.payment_terms === 'CREDIT_60D') termDays = 60;

      return {
        store_id: row.supplier_store_id,
        store_name: row.supplier_store_name || 'Supplier Store',
        credit_days: termDays,
        limit: Number(rule.buy_max_per_shop) || 25000,
        amount_owed: amt
      };
    });

    const receiveTotalOwed = sellerCredits.reduce((acc, s) => acc + s.amount_owed, 0);

    // 4. ADAB Credit Line
    const buyerCredit = await this.getBuyerCreditInfo(userId, storeId);
    let gstinVerified = false;
    if (userId) {
      const profRes = await pool.query(
        `SELECT gstin, kyc_status FROM seller_profiles WHERE user_id = $1 LIMIT 1`,
        [userId]
      );
      if (profRes.rows.length > 0) {
        gstinVerified = Boolean(profRes.rows[0].gstin && profRes.rows[0].gstin !== 'PENDING00P');
      }
    }

    return {
      rules: {
        id: rule.id,
        store_id: rule.store_id,
        enable_credit: Boolean(rule.enable_credit),
        credit_days: Number(rule.credit_days),
        min_order_amount: Number(rule.min_order_amount),
        max_limit_per_store: Number(rule.max_limit_per_store),
        max_stores_count: Number(rule.max_stores_count),
        total_exposure_cap: Number(rule.total_exposure_cap),
        buy_max_shops: Number(rule.buy_max_shops),
        buy_max_per_shop: Number(rule.buy_max_per_shop),
        updated_at: rule.updated_at
      },
      give_metrics: {
        stores_count: storesOnCredit.length,
        max_stores: Number(rule.max_stores_count),
        exposure_used: giveExposureUsed,
        total_cap: Number(rule.total_exposure_cap),
        stores_on_credit: storesOnCredit
      },
      receive_metrics: {
        active_shops_count: sellerCredits.length,
        max_shops: Number(rule.buy_max_shops),
        total_owed: receiveTotalOwed,
        seller_credits: sellerCredits
      },
      adab_line: {
        total_limit: Number(buyerCredit.total_limit) || 250000,
        utilized_amount: Number(buyerCredit.utilized_amount) || 0,
        available_amount: Number(buyerCredit.available_amount) || 250000,
        interest: '0% for 14 days',
        gstin_verified: gstinVerified,
        status: 'Active'
      }
    };
  }

  async updateCreditGiveTerms(userId, storeId, terms = {}) {
    await this.ensureStoreCreditRulesTable();
    if (!storeId) {
      const err = new Error('Unauthorized: Valid store ID is required');
      err.statusCode = 400;
      throw err;
    }

    const creditDays = Number(terms.credit_days) || 14;
    const minOrder = Number(terms.min_order_amount) || 5000;
    const maxPerStore = Number(terms.max_limit_per_store) || 50000;
    const maxStores = Number(terms.max_stores_count) || 10;
    const totalCap = Number(terms.total_exposure_cap) || 300000;
    const enableCredit = terms.enable_credit !== undefined ? Boolean(terms.enable_credit) : true;

    await pool.query(`
      INSERT INTO store_credit_rules (
        store_id, enable_credit, credit_days, min_order_amount,
        max_limit_per_store, max_stores_count, total_exposure_cap
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (store_id) DO UPDATE SET
        enable_credit = EXCLUDED.enable_credit,
        credit_days = EXCLUDED.credit_days,
        min_order_amount = EXCLUDED.min_order_amount,
        max_limit_per_store = EXCLUDED.max_limit_per_store,
        max_stores_count = EXCLUDED.max_stores_count,
        total_exposure_cap = EXCLUDED.total_exposure_cap,
        updated_at = NOW()
    `, [storeId, enableCredit, creditDays, minOrder, maxPerStore, maxStores, totalCap]);

    // Sync into seller_onboarding_steps.credit_config
    if (userId) {
      try {
        const onbRes = await pool.query(
          `SELECT credit_config FROM seller_onboarding_steps WHERE user_id = $1 LIMIT 1`,
          [userId]
        );
        const existingCfg = (onbRes.rows[0]?.credit_config) || {};
        const mergedCfg = {
          ...existingCfg,
          enableCredit,
          creditDays,
          creditMinOrder: minOrder,
          creditLimit: maxPerStore,
          creditMaxShops: maxStores,
          creditTotalCap: totalCap
        };
        await pool.query(
          `UPDATE seller_onboarding_steps SET credit_config = $1::jsonb, updated_at = NOW() WHERE user_id = $2`,
          [JSON.stringify(mergedCfg), userId]
        );
      } catch (syncErr) {
        console.warn('⚠️ Syncing credit terms to seller_onboarding_steps skipped:', syncErr.message);
      }
    }

    return await this.getStoreCreditRules(userId, storeId);
  }

  async updateCreditBuyLimits(userId, storeId, limits = {}) {
    await this.ensureStoreCreditRulesTable();
    if (!storeId) {
      const err = new Error('Unauthorized: Valid store ID is required');
      err.statusCode = 400;
      throw err;
    }

    const buyMaxShops = Number(limits.buy_max_shops) || 5;
    const buyPerShop = Number(limits.buy_max_per_shop) || 25000;

    await pool.query(`
      INSERT INTO store_credit_rules (
        store_id, buy_max_shops, buy_max_per_shop
      ) VALUES ($1, $2, $3)
      ON CONFLICT (store_id) DO UPDATE SET
        buy_max_shops = EXCLUDED.buy_max_shops,
        buy_max_per_shop = EXCLUDED.buy_max_per_shop,
        updated_at = NOW()
    `, [storeId, buyMaxShops, buyPerShop]);

    // Sync into seller_onboarding_steps.credit_config
    if (userId) {
      try {
        const onbRes = await pool.query(
          `SELECT credit_config FROM seller_onboarding_steps WHERE user_id = $1 LIMIT 1`,
          [userId]
        );
        const existingCfg = (onbRes.rows[0]?.credit_config) || {};
        const mergedCfg = {
          ...existingCfg,
          buyMaxShops,
          buyPerShop
        };
        await pool.query(
          `UPDATE seller_onboarding_steps SET credit_config = $1::jsonb, updated_at = NOW() WHERE user_id = $2`,
          [JSON.stringify(mergedCfg), userId]
        );
      } catch (syncErr) {
        console.warn('⚠️ Syncing buy limits to seller_onboarding_steps skipped:', syncErr.message);
      }
    }

    return await this.getStoreCreditRules(userId, storeId);
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
    try {
      // Sync stores.email from users.email if store email column was previously null
      await pool.query(`
        UPDATE stores s
        SET email = u.email
        FROM seller_profiles sp
        JOIN users u ON sp.user_id = u.id
        WHERE s.seller_id = sp.id
          AND (s.email IS NULL OR s.email = '')
          AND u.email IS NOT NULL AND u.email != '';
      `);
    } catch (_) {}
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
          INSERT INTO stores (seller_id, store_name, category, city, state, pincode, address_line, phone, email, delivery_radius_km, is_online)
          VALUES ($1, $2, 'Grocery & Supermarket', 'Surat', 'Gujarat', '395007', '', $3, $4, 10, false)
        `, [spId, defaultStoreName, user.phone || '', user.email || null]);
      } else if (onboarding.store?.id && (!onboarding.store.email || onboarding.store.email === '') && user.email) {
        await pool.query(`
          UPDATE stores SET email = $1 WHERE id = $2 AND (email IS NULL OR email = '')
        `, [user.email, onboarding.store.id]).catch(() => {});
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

  async loginWithOtp(phone, otp, extra = {}) {
    const { signToken } = require('../utils/jwt');
    const emailOtpService = require('../services/emailOtpService');
    const idMode = extra.idMode || (extra.email && !phone ? 'email' : 'phone');
    const rawEmail = String(extra.email || '').trim().toLowerCase();
    const rawOtp = String(otp || '').trim();

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

    if (!rawOtp || rawOtp.length < 4) {
      throw new Error('Please enter a valid OTP verification code');
    }

    let isOtpValid = rawOtp === '123456';
    if (!isOtpValid) {
      const identifier = idMode === 'email' ? rawEmail : cleanDigits;
      const verifyRes = emailOtpService.verifyOTP(identifier, rawOtp);
      isOtpValid = Boolean(verifyRes?.success);
    }

    if (!isOtpValid) {
      throw new Error('Invalid or expired OTP code. Please try again or use demo code 123456.');
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
      return await this.signupWithPassword(signupPhone, 'adab1234', {
        email: rawEmail || undefined,
        full_name: extra.full_name || defaultName,
        store_name: extra.store_name || `${defaultName} Store`,
        idMode,
        is_phone_verified: !isEmailMode
      }, true);
    }

    const user = userRes.rows[0];

    if (user.status && ['BLOCKED', 'SUSPENDED', 'DEACTIVATED'].includes(String(user.status).toUpperCase())) {
      throw new Error('Your account has been deactivated or suspended. Please contact support.');
    }

    if (user.user_type && user.user_type !== 'SELLER') {
      throw new Error('Unauthorized account type. This portal is for registered sellers only.');
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
          INSERT INTO stores (seller_id, store_name, category, city, state, pincode, address_line, phone, email, delivery_radius_km, is_online)
          VALUES ($1, $2, 'Grocery & Supermarket', 'Surat', 'Gujarat', '395007', '', $3, $4, 10, false)
        `, [spId, defaultStoreName, user.phone || '', user.email || null]);
      } else if (onboarding.store?.id && (!onboarding.store.email || onboarding.store.email === '') && user.email) {
        await pool.query(`
          UPDATE stores SET email = $1 WHERE id = $2 AND (email IS NULL OR email = '')
        `, [user.email, onboarding.store.id]).catch(() => {});
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

  async loginWithGoogle({ credential, idToken, accessToken }) {
    const { signToken } = require('../utils/jwt');
    const googleAuthService = require('../services/googleAuthService');

    const googleUser = await googleAuthService.verifyGoogleToken({ credential, idToken, accessToken });
    const email = googleUser.email;
    const fullName = googleUser.name || (email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1));

    // Look for existing user with this email
    const userRes = await pool.query(`
      SELECT u.id, u.phone, u.email, u.full_name, u.user_type, u.status, u.is_phone_verified
      FROM users u
      LEFT JOIN seller_profiles sp ON sp.user_id = u.id
      WHERE LOWER(COALESCE(u.email, '')) = $1
      ORDER BY
        (u.user_type = 'SELLER') DESC,
        (sp.id IS NOT NULL) DESC,
        u.created_at DESC
      LIMIT 1
    `, [email]);

    let user;
    if (userRes.rows.length === 0) {
      // Auto-register new seller for Google login
      const placeholderPhone = '9' + Math.floor(100000000 + Math.random() * 900000000).toString().slice(0, 9);
      const defaultStoreName = `${fullName}'s Store`;
      const signupRes = await this.signupWithPassword(placeholderPhone, 'adab1234', {
        email,
        full_name: fullName,
        store_name: defaultStoreName,
        idMode: 'email',
        is_phone_verified: false
      }, true);

      return {
        ...signupRes,
        googleUser,
        isNewSignup: true
      };
    }

    user = userRes.rows[0];

    // Validate account status
    if (user.status && ['BLOCKED', 'SUSPENDED', 'DEACTIVATED'].includes(String(user.status).toUpperCase())) {
      throw new Error('Your account has been deactivated or suspended. Please contact support.');
    }

    // Validate user type
    if (user.user_type && user.user_type !== 'SELLER') {
      throw new Error('Unauthorized account type. This portal is for registered sellers only.');
    }

    // Optionally update user's full_name if empty or generic
    if ((!user.full_name || user.full_name === 'Merchant') && fullName) {
      await pool.query(`UPDATE users SET full_name = $1 WHERE id = $2`, [fullName, user.id]).catch(() => {});
      user.full_name = fullName;
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
          INSERT INTO stores (seller_id, store_name, category, city, state, pincode, address_line, phone, email, delivery_radius_km, is_online)
          VALUES ($1, $2, 'Grocery & Supermarket', 'Surat', 'Gujarat', '395007', '', $3, $4, 10, false)
        `, [spId, defaultStoreName, user.phone || '', user.email || null]);
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
      googleUser,
      isNewSignup: false
    };
  }


  async resetPassword(phone, otp, newPassword, extra = {}) {
    const { hashPin } = require('../utils/jwt');
    const emailOtpService = require('../services/emailOtpService');
    const idMode = extra.idMode || (extra.email && !phone ? 'email' : 'phone');
    const rawEmail = String(extra.email || '').trim().toLowerCase();
    const rawOtp = String(otp || '').trim();
    const rawPassword = String(newPassword || '');

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

    if (!rawOtp || rawOtp.length < 4) {
      throw new Error('Please enter a valid OTP verification code');
    }

    if (!rawPassword || rawPassword.length < 4) {
      throw new Error('New password must be at least 4 characters');
    }

    // Verify OTP
    let isOtpValid = rawOtp === '123456';
    if (!isOtpValid) {
      const identifier = idMode === 'email' ? rawEmail : cleanDigits;
      const verifyRes = emailOtpService.verifyOTP(identifier, rawOtp);
      isOtpValid = Boolean(verifyRes?.success);
    }

    if (!isOtpValid) {
      throw new Error('Invalid or expired OTP code. Please try again.');
    }

    // Locate user
    let userRes;
    if (idMode === 'email') {
      userRes = await pool.query(`
        SELECT u.id, u.phone, u.email
        FROM users u
        WHERE LOWER(COALESCE(u.email, '')) = $1
        ORDER BY (u.user_type = 'SELLER') DESC, u.created_at DESC
        LIMIT 1
      `, [rawEmail]);
    } else {
      userRes = await pool.query(`
        SELECT u.id, u.phone, u.email
        FROM users u
        WHERE RIGHT(REGEXP_REPLACE(u.phone, '\\D', '', 'g'), 10) = $1
        ORDER BY (u.user_type = 'SELLER') DESC, u.created_at DESC
        LIMIT 1
      `, [cleanDigits]);
    }

    if (userRes.rows.length === 0) {
      throw new Error('Account not found for this identifier. Please verify and try again.');
    }

    const user = userRes.rows[0];
    const newHash = await hashPin(rawPassword);

    await pool.query(`
      UPDATE users
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
    `, [newHash, user.id]);

    return {
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.',
      userId: user.id
    };
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
        INSERT INTO stores (seller_id, store_name, category, city, state, pincode, address_line, phone, email, delivery_radius_km, is_online)
        SELECT id, $4, 'Grocery & Supermarket', 'Surat', 'Gujarat', '395007', '', $1, $5, 10, false FROM new_profile
        RETURNING id, seller_id AS owner_id, store_name, city, state, pincode, address_line, ui_mode, is_online, open_time, close_time, delivery_radius_km, rating, phone, email, category, latitude, longitude
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

    // Ensure store.email is synced with users.email if store email is missing
    if (store && (!store.email || store.email === '') && profile?.email) {
      pool.query(
        'UPDATE stores SET email = $1 WHERE id = $2 AND (email IS NULL OR email = \'\')',
        [profile.email, store.id]
      ).catch(() => {});
      store.email = profile.email;
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
              latitude = COALESCE($8, latitude), longitude = COALESCE($9, longitude),
              email = COALESCE($10, email)
          WHERE id = $11
        `, [storeName, category, addressLine, city, stateVal, pincodeVal, phoneToUpdate, storeLat, storeLng, email, store.id]);
      } else {
        await pool.query(`
          UPDATE users SET full_name = $1, email = COALESCE($2, email), updated_at = NOW()
          WHERE id = $3
        `, [fullName, email, userId]);

        await pool.query(`
          UPDATE stores
          SET store_name = $1, category = $2, address_line = $3, city = $4, state = $5, pincode = $6,
              latitude = COALESCE($7, latitude), longitude = COALESCE($8, longitude),
              email = COALESCE($9, email)
          WHERE id = $10
        `, [storeName, category, addressLine, city, stateVal, pincodeVal, storeLat, storeLng, email, store.id]);
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
      const b2bSelfDelivery = data.b2bSelfDelivery !== undefined
        ? Boolean(data.b2bSelfDelivery)
        : (data.porter !== undefined ? Boolean(data.porter) : (prevCfg.b2bSelfDelivery !== undefined ? Boolean(prevCfg.b2bSelfDelivery) : (prevCfg.porter !== undefined ? Boolean(prevCfg.porter) : true)));

      const b2bThirdParty = data.b2bThirdParty !== undefined
        ? Boolean(data.b2bThirdParty)
        : (data.delhivery !== undefined ? Boolean(data.delhivery) : (prevCfg.b2bThirdParty !== undefined ? Boolean(prevCfg.b2bThirdParty) : (prevCfg.delhivery !== undefined ? Boolean(prevCfg.delhivery) : true)));

      const b2bPickup = data.b2bPickup !== undefined
        ? Boolean(data.b2bPickup)
        : (data.exportFreight !== undefined ? Boolean(data.exportFreight) : (prevCfg.b2bPickup !== undefined ? Boolean(prevCfg.b2bPickup) : (prevCfg.exportFreight !== undefined ? Boolean(prevCfg.exportFreight) : true)));

      const porter = b2bSelfDelivery;
      const delhivery = b2bThirdParty;
      const exportFreight = b2bPickup;

      const delivFastRate = parseRate(data.delivFastRate, prevCfg.delivFastRate, 49);
      const delivSameRate = parseRate(data.delivSameRate, prevCfg.delivSameRate, 29);
      const delivScheduledRate = parseRate(data.delivScheduledRate, prevCfg.delivScheduledRate, 19);
      const delivPickupRate = parseRate(data.delivPickupRate, prevCfg.delivPickupRate, 0);

      const b2bSelfDeliveryRate = parseRate(data.b2bSelfDeliveryRate, data.porterRate ?? prevCfg.b2bSelfDeliveryRate ?? prevCfg.porterRate, 200);
      const b2bThirdPartyRate = parseRate(data.b2bThirdPartyRate, data.delhiveryRate ?? prevCfg.b2bThirdPartyRate ?? prevCfg.delhiveryRate, 450);
      const b2bPickupRate = parseRate(data.b2bPickupRate, data.exportFreightRate ?? prevCfg.b2bPickupRate ?? prevCfg.exportFreightRate, 0);

      const porterRate = b2bSelfDeliveryRate;
      const delhiveryRate = b2bThirdPartyRate;
      const exportFreightRate = b2bPickupRate;

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
        b2bSelfDelivery,
        b2bThirdParty,
        b2bPickup,
        b2bSelfDeliveryRate,
        b2bThirdPartyRate,
        b2bPickupRate,
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
            ($1, 'Self Delivery (Fleet / Staff)', 50, $11, 120, 360, $12),
            ($1, '3rd Party Logistics (Porter / Delhivery)', 999, $13, 1440, 4320, $14),
            ($1, 'B2B Wholesale Pickup', 0, $15, 30, 120, $16)
        `, [
          store.id,
          radiusKm,
          delivFastRate, delivFast,
          delivSameRate, delivSame,
          delivScheduledRate, delivScheduled,
          delivPickupRate, delivPickup,
          b2bSelfDeliveryRate, b2bSelfDelivery,
          b2bThirdPartyRate, b2bThirdParty,
          b2bPickupRate, b2bPickup
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


  // --- Phase 2: POS Walk-in Sale Persistence & Stock Deduction ---
  async createPOSSale(storeId, userId, payload = {}) {
    const { cart = [], paymentMethod = 'cash', customerPhone = '' } = payload;
    if (!Array.isArray(cart) || cart.length === 0) {
      throw new Error('POS cart cannot be empty');
    }
    if (!storeId) {
      throw new Error('Seller store ID is required for POS transaction');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const subtotal = cart.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 1)), 0);
      const receiptNo = 'POS-' + Math.floor(100000 + Math.random() * 900000);
      const isUpi = String(paymentMethod).toLowerCase() === 'upi';

      // 1. Insert into orders table
      const orderRes = await client.query(`
        INSERT INTO orders (
          order_number, customer_id, delivery_mode, delivery_address, total_mrp,
          total_discount, delivery_fee, grand_total, payment_method, payment_status, order_status
        ) VALUES (
          $1, $2, 'STORE_PICKUP', $3, $4, 0, 0, $4, $5, 'PAID', 'DELIVERED'
        ) RETURNING *
      `, [
        receiptNo,
        userId,
        JSON.stringify({ type: 'POS_WALKIN', phone: customerPhone || 'Walk-in Customer' }),
        subtotal,
        isUpi ? 'UPI' : 'CASH_ON_DELIVERY'
      ]);
      const parentOrder = orderRes.rows[0];

      // 2. Insert into seller_orders table
      const sellerOrderRes = await client.query(`
        INSERT INTO seller_orders (
          parent_order_id, store_id, subtotal, commission_fee, seller_payout_amount, status
        ) VALUES (
          $1, $2, $3, 0, $3, 'DELIVERED'
        ) RETURNING *
      `, [parentOrder.id, storeId, subtotal]);
      const sellerOrder = sellerOrderRes.rows[0];

      // 3. Process cart items and deduct inventory atomically
      for (const item of cart) {
        const itemQty = Number(item.qty) || 1;
        const itemPrice = Number(item.price) || 0;
        const itemTotal = Number((itemPrice * itemQty).toFixed(2));

        // Check if listingId is a valid UUID
        const isValidUuid = typeof item.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
        let listingId = isValidUuid ? item.id : null;

        // If listingId not valid or missing, look up or find first active listing for this product name
        if (!listingId) {
          const lRes = await client.query(
            `SELECT id FROM seller_listings WHERE store_id = $1 AND title ILIKE $2 LIMIT 1`,
            [storeId, item.name]
          );
          if (lRes.rows.length > 0) {
            listingId = lRes.rows[0].id;
          } else {
            // Find any store listing or fallback
            const anyL = await client.query(
              `SELECT id FROM seller_listings WHERE store_id = $1 LIMIT 1`,
              [storeId]
            );
            if (anyL.rows.length > 0) listingId = anyL.rows[0].id;
          }
        }

        if (listingId) {
          // Lock row for update to protect against concurrent checkout race conditions
          const stockLock = await client.query(
            `SELECT id, title, stock_qty FROM seller_listings WHERE id = $1 AND store_id = $2 FOR UPDATE`,
            [listingId, storeId]
          );

          if (stockLock.rows.length > 0) {
            const currentStock = Number(stockLock.rows[0].stock_qty || 0);
            if (currentStock < itemQty) {
              throw new Error(`INSUFFICIENT_STOCK: Item "${stockLock.rows[0].title}" only has ${currentStock} units remaining (requested ${itemQty}).`);
            }
          }

          // Insert into order_items
          await client.query(`
            INSERT INTO order_items (
              seller_order_id, listing_id, product_name, quantity, unit_price, total_price
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [sellerOrder.id, listingId, item.name || 'Store Item', itemQty, itemPrice, itemTotal]);

          // Atomically decrement stock
          await client.query(`
            UPDATE seller_listings
            SET stock_qty = GREATEST(0, stock_qty - $1),
                is_active = CASE WHEN (stock_qty - $1) = 0 THEN false ELSE is_active END,
                updated_at = NOW()
            WHERE id = $2 AND store_id = $3
          `, [itemQty, listingId, storeId]);
        }
      }

      await client.query('COMMIT');

      return {
        success: true,
        receipt_id: receiptNo,
        order_id: parentOrder.id,
        seller_order_id: sellerOrder.id,
        total: subtotal,
        items_count: cart.length,
        payment_method: isUpi ? 'UPI' : 'Cash',
        customer_phone: customerPhone || 'Walk-in Customer',
        created_at: parentOrder.created_at
      };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('POS Sale Transaction Error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  // --- Phase 2: National FMCG Master Catalog Browser & Adoption ---
  async getMasterCatalog(storeId, options = {}) {
    const { q, category_id, limit = 40, offset = 0 } = options;
    const params = [storeId || null];
    let query = `
      SELECT 
        mci.id,
        mci.barcode,
        mci.product_name,
        mci.brand_name,
        mci.category_id,
        COALESCE(c.name, 'General') as category_name,
        mci.printed_mrp,
        mci.standard_unit,
        mci.default_image_url,
        mci.created_at,
        EXISTS (
          SELECT 1 FROM seller_listings sl 
          WHERE sl.master_catalog_id = mci.id 
            AND sl.store_id = $1
            AND sl.is_active = true
        ) AS already_in_store
      FROM master_catalog_items mci
      LEFT JOIN categories c ON mci.category_id = c.id
      WHERE 1=1
    `;

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      const qIdx = params.length;
      query += ` AND (mci.product_name ILIKE ${qIdx} OR mci.brand_name ILIKE ${qIdx} OR mci.barcode = ${qIdx - 1 + 1})`;
    }

    if (category_id && category_id !== 'all') {
      params.push(Number(category_id));
      query += ` AND mci.category_id = ${params.length}`;
    }

    query += ` ORDER BY mci.brand_name ASC, mci.product_name ASC`;

    params.push(Number(limit));
    query += ` LIMIT ${params.length}`;

    params.push(Number(offset));
    query += ` OFFSET ${params.length}`;

    const res = await pool.query(query, params);

    // Get total count
    const countRes = await pool.query('SELECT COUNT(*) FROM master_catalog_items');
    return {
      items: res.rows,
      total: parseInt(countRes.rows[0].count, 10)
    };
  }

  async adoptMasterCatalogItem(storeId, data = {}) {
    const { masterCatalogId, sellPrice, stockQty = 20 } = data;
    if (!storeId) throw new Error('Store ID is required');
    if (!masterCatalogId) throw new Error('Master Catalog Item ID is required');

    // 1. Fetch master item
    const mRes = await pool.query('SELECT * FROM master_catalog_items WHERE id = $1', [masterCatalogId]);
    if (mRes.rows.length === 0) {
      throw new Error('Master catalog item not found');
    }
    const master = mRes.rows[0];
    const finalSellPrice = Number(sellPrice) || Number(master.printed_mrp) || 50;
    const finalStock = Number(stockQty) || 20;

    // 2. Check if listing already exists
    const existing = await pool.query(
      'SELECT id FROM seller_listings WHERE store_id = $1 AND master_catalog_id = $2',
      [storeId, masterCatalogId]
    );

    if (existing.rows.length > 0) {
      const updated = await pool.query(`
        UPDATE seller_listings
        SET stock_qty = stock_qty + $1,
            sell_price = $2,
            is_active = true,
            approval_status = 'APPROVED',
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `, [finalStock, finalSellPrice, existing.rows[0].id]);
      return { adopted: true, action: 'updated', listing: updated.rows[0] };
    }

    // 3. Insert new listing
    const inserted = await pool.query(`
      INSERT INTO seller_listings (
        store_id, master_catalog_id, title, barcode, brand_tag, category_id,
        mrp, sell_price, unit, min_order_qty, stock_qty, product_type, approval_status, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 1, $10, 'PACKED_ITEM', 'APPROVED', true
      ) RETURNING *
    `, [
      storeId,
      masterCatalogId,
      master.product_name,
      master.barcode,
      master.brand_name,
      master.category_id,
      master.printed_mrp,
      finalSellPrice,
      master.standard_unit || 'pcs',
      finalStock
    ]);

    return { adopted: true, action: 'created', listing: inserted.rows[0] };
  }

  // --- Phase 2: Bank Credit Applications & Partners ---
  async getBankPartners() {
    const res = await pool.query(`
      SELECT id, name, code, interest_rate_pct, max_credit_limit, tenure_options, eligibility_criteria
      FROM bank_partners
      WHERE is_active = true
      ORDER BY name ASC
    `);
    return res.rows;
  }

  async submitCreditApplication(storeId, userId, data = {}) {
    const { bank, bank_id, limit, sales, purchases, reason } = data;
    if (!userId && !storeId) throw new Error('Seller identity is required');

    // 1. Resolve Bank ID
    let resolvedBankId = bank_id;
    if (!resolvedBankId && bank) {
      const bRes = await pool.query('SELECT id FROM bank_partners WHERE name ILIKE $1 OR code ILIKE $1 LIMIT 1', [bank]);
      if (bRes.rows.length > 0) resolvedBankId = bRes.rows[0].id;
    }
    if (!resolvedBankId) {
      const firstBank = await pool.query('SELECT id FROM bank_partners WHERE is_active = true LIMIT 1');
      if (firstBank.rows.length > 0) resolvedBankId = firstBank.rows[0].id;
      else throw new Error('No active lending bank partner available');
    }

    // 2. Fetch Store / Applicant Name
    let applicantName = 'Verified Merchant';
    if (storeId) {
      const sRes = await pool.query('SELECT store_name FROM stores WHERE id = $1', [storeId]);
      if (sRes.rows.length > 0) applicantName = sRes.rows[0].store_name;
    }

    const appNo = 'CR-2026-' + Math.floor(10000 + Math.random() * 90000);
    const reqAmount = Number(limit) || 250000;
    const turnover = Number(sales) || 450000;

    const res = await pool.query(`
      INSERT INTO credit_applications (
        application_no, applicant_type, applicant_id, applicant_name, bank_id,
        requested_amount, monthly_turnover, reason, status
      ) VALUES (
        $1, 'SELLER', $2, $3, $4, $5, $6, $7, 'UNDER_REVIEW'
      ) RETURNING *
    `, [
      appNo,
      storeId || userId,
      applicantName,
      resolvedBankId,
      reqAmount,
      turnover,
      reason || 'Working capital & inventory restocking'
    ]);

    return {
      success: true,
      application: res.rows[0]
    };
  }

  async getCreditApplications(storeId, userId) {
    const res = await pool.query(`
      SELECT 
        ca.id,
        ca.application_no,
        ca.applicant_name,
        ca.requested_amount,
        ca.approved_amount,
        ca.monthly_turnover,
        ca.reason,
        ca.status,
        ca.created_at,
        bp.name as bank_name,
        bp.code as bank_code,
        bp.interest_rate_pct
      FROM credit_applications ca
      LEFT JOIN bank_partners bp ON ca.bank_id = bp.id
      WHERE ca.applicant_id IN ($1, $2)
      ORDER BY ca.created_at DESC
    `, [storeId || userId, userId]);
    return res.rows;
  }
}

module.exports = new SellerRepository();
