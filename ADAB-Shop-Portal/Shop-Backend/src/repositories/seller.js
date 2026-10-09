const pool = require('../../db');

class SellerRepository {
  // === Shared: Profile & Store Read (used by both Shabbir & Mayank) ===

  async getProfile(sellerId) {
    const query = `
      SELECT u.id, u.full_name, u.email, u.phone, u.status,
             sp.legal_name, sp.entity_type, sp.gstin, sp.pan, sp.kyc_status
      FROM users u
      LEFT JOIN seller_profiles sp ON u.id = sp.user_id
      WHERE u.id = $1
    `;
    const res = await pool.query(query, [sellerId]);
    return res.rows[0];
  }

  async getStore(userId) {
    const query = `
      SELECT s.id, s.seller_id as owner_id, s.store_name, s.city, s.address_line, 
             s.ui_mode, s.is_online, s.delivery_radius_km, s.rating, s.phone, s.category,
             s.latitude, s.longitude
      FROM stores s
      JOIN seller_profiles sp ON s.seller_id = sp.id
      WHERE sp.user_id = $1
    `;
    const res = await pool.query(query, [userId]);
    return res.rows[0];
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
    return this.getProfile(userId);
  }

  async updateStore(userId, data) {
    // We only want to update stores where the store belongs to the user
    // First find the store id
    const store = await this.getStore(userId);
    if (!store) throw new Error("Store not found");

    const fields = [];
    const values = [];
    let idx = 1;
    const allowedFields = ['store_name', 'city', 'address_line', 'phone', 'category'];
    for (const [k, v] of Object.entries(data)) {
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
    return this.getSettings(userId);
  }

  async getDashboardMetrics(userId) {
    const store = await this.getStore(userId);
    if (!store) throw new Error("Store not found");

    const query = `
      SELECT 
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COALESCE(SUM(grand_total), 0) FROM orders) as total_revenue,
        (SELECT COUNT(*) FROM seller_listings WHERE store_id = $1) as total_products,
        (SELECT COUNT(*) FROM orders WHERE order_status = 'PLACED' OR order_status = 'PROCESSING' OR order_status = 'new' OR order_status = 'pending') as pending_orders
    `;
    const res = await pool.query(query, [store.id]);
    return res.rows[0];
  }

  // === Mayank's Fulfillment / Operations: Orders, Returns, B2B, Finance, etc. ===

  async getOrders(storeId) {
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
      WHERE ($1::uuid IS NULL OR so.store_id = $1::uuid)
      ORDER BY so.created_at DESC
      LIMIT 50
    `;
    const res = await pool.query(query, [storeId || null]);
    return res.rows.map(r => {
      const addr = r.delivery_address;
      let distance = '2.0';
      if (addr && addr.latitude != null && addr.longitude != null) {
        const sLat = Number(r.store_latitude) || 21.1702;
        const sLng = Number(r.store_longitude) || 72.8311;
        const cLat = Number(addr.latitude);
        const cLng = Number(addr.longitude);
        const R = 6371; // km
        const dLat = (cLat - sLat) * Math.PI / 180;
        const dLon = (cLng - sLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(sLat * Math.PI / 180) * Math.cos(cLat * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        distance = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
      } else {
        distance = (Math.abs((parseInt((r.order_number || r.seller_order_id || '10').replace(/\D/g, '') || 12, 10) % 80) / 10) + 0.8).toFixed(1);
      }

      return {
        id: r.order_number || r.order_id,
        real_id: r.seller_order_id,
        parent_order_id: r.parent_order_id,
        store_id: r.store_id,
        customer: r.customer || r.delivery_address?.full_name || 'Customer',
        customer_phone: r.customer_phone || r.delivery_address?.phone || '',
        distance,
        delivery_mode: r.delivery_mode ? r.delivery_mode.toLowerCase() : 'normal',
        delivery_address: r.delivery_address,
        items: r.items_list || [],
        item_summary: r.item_summary || 'Items',
        amount: Number(r.store_subtotal || r.amount) || 0,
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

  async updateOrderStatus(orderId, status) {
    const sellerStatusMap = {
      'new': 'NEW',
      'packing': 'ACCEPTED',
      'accepted': 'ACCEPTED',
      'packed': 'PACKED',
      'dispatched': 'DISPATCHED',
      'shipped': 'DISPATCHED',
      'delivered': 'DELIVERED',
      'cancelled': 'CANCELLED'
    };
    const orderStatusMap = {
      'new': 'PLACED',
      'packing': 'PREPARING',
      'accepted': 'CONFIRMED',
      'packed': 'PREPARING',
      'dispatched': 'OUT_FOR_DELIVERY',
      'shipped': 'OUT_FOR_DELIVERY',
      'delivered': 'DELIVERED',
      'cancelled': 'CANCELLED'
    };

    const sStatus = sellerStatusMap[status.toLowerCase()] || 'ACCEPTED';
    const oStatus = orderStatusMap[status.toLowerCase()] || 'PREPARING';

    await pool.query(`
      UPDATE seller_orders
      SET status = $1
      WHERE id::text = $2 
         OR parent_order_id IN (SELECT id FROM orders WHERE id::text = $2 OR order_number = $2)
    `, [sStatus, orderId]);

    const res = await pool.query(`
      UPDATE orders
      SET order_status = $1, updated_at = NOW()
      WHERE id::text = $2 OR order_number = $2 OR id IN (SELECT parent_order_id FROM seller_orders WHERE id::text = $2)
      RETURNING *
    `, [oStatus, orderId]);

    return res.rows[0];
  }

  async getReturns() {
    const query = `
      SELECT r.id, r.order_id, r.status, r.reason, r.created_at,
             o.order_number, o.grand_total,
             u.full_name as customer
      FROM returns r
      LEFT JOIN orders o ON r.order_id = o.id
      LEFT JOIN users u ON o.customer_id = u.id
      ORDER BY r.created_at DESC
      LIMIT 50
    `;
    const res = await pool.query(query);
    return res.rows;
  }

  async getB2BOrders() {
    const query = `
      SELECT bpo.id, bpo.po_number, bpo.status, bpo.total_amount, bpo.created_at,
             s.name as supplier_name
      FROM b2b_purchase_orders bpo
      LEFT JOIN suppliers s ON bpo.supplier_id = s.id
      ORDER BY bpo.created_at DESC
      LIMIT 50
    `;
    try {
      const res = await pool.query(query);
      return res.rows;
    } catch (e) {
      return [];
    }
  }

  async getCoupons() {
    const query = `
      SELECT id, code, discount_type, discount_value, min_order_value, max_discount, 
             start_date, end_date, is_active, usage_limit, usage_count, description
      FROM coupons
      ORDER BY created_at DESC
    `;
    try {
      const res = await pool.query(query);
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

  async getAnalytics() {
    const query = `
      SELECT 
        COUNT(id) as total_orders,
        COALESCE(SUM(grand_total), 0) as total_revenue,
        COALESCE(AVG(grand_total), 0) as avg_order_value
      FROM orders
    `;
    try {
      const res = await pool.query(query);
      return res.rows[0];
    } catch (e) {
      return { total_orders: 0, total_revenue: 0, avg_order_value: 0 };
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

  async getMessages() {
    const query = `
      SELECT u.id, u.full_name as customer_name, u.phone,
             o.order_number, o.created_at,
             'Order inquiry and delivery update' as message_preview,
             '10 min ago' as time_ago
      FROM users u
      JOIN orders o ON o.customer_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `;
    try {
      const res = await pool.query(query);
      return res.rows;
    } catch (e) {
      return [];
    }
  }

  async getFinanceSummary() {
    const query = `
      SELECT 
        COALESCE(SUM(grand_total), 0) as balance,
        COUNT(id) as total_orders
      FROM orders
    `;
    try {
      const res = await pool.query(query);
      const row = res.rows[0] || { balance: 0 };
      return {
        balance: Number(row.balance) || 0,
        available_credit: 250000,
        sanctioned_limit: 250000,
        utilized_credit: 0,
        receivables: 0,
        payables: 0
      };
    } catch (e) {
      return { balance: 0, available_credit: 250000, sanctioned_limit: 250000, utilized_credit: 0, receivables: 0, payables: 0 };
    }
  }

  async getKhataLedger() {
    const query = `
      SELECT bpo.id, s.name as store, bpo.total_amount as you_owe, 0 as they_owe,
             '7 Days' as due_date, bpo.status
      FROM b2b_purchase_orders bpo
      LEFT JOIN suppliers s ON bpo.supplier_id = s.id
      ORDER BY bpo.created_at DESC
      LIMIT 10
    `;
    try {
      const res = await pool.query(query);
      return res.rows;
    } catch (e) {
      return [];
    }
  }
}

module.exports = new SellerRepository();
