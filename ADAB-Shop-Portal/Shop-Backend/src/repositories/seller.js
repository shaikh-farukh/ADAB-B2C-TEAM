const pool = require('../../db');

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
      SELECT u.id, u.full_name, u.email, u.phone, u.status,
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
    const notificationProducer = require('../services/notificationProducer');
    await notificationProducer.profileUpdated(userId);
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
    const cleanId = orderId ? orderId.toString().replace(/^#/, '') : orderId;
    const sellerStatusMap = {
      'new': 'NEW',
      'packing': 'ACCEPTED',
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
      'accepted': 'CONFIRMED',
      'packed': 'PREPARING',
      'dispatched': 'OUT_FOR_DELIVERY',
      'shipped': 'OUT_FOR_DELIVERY',
      'delivered': 'DELIVERED',
      'cancelled': 'CANCELLED',
      'declined': 'CANCELLED',
      'rejected': 'CANCELLED'
    };

    const sStatus = sellerStatusMap[status.toLowerCase()] || 'ACCEPTED';
    const oStatus = orderStatusMap[status.toLowerCase()] || 'PREPARING';

    await pool.query(`
      UPDATE seller_orders
      SET status = $1
      WHERE id::text = $2 
         OR parent_order_id IN (SELECT id FROM orders WHERE id::text = $2 OR order_number = $2)
    `, [sStatus, cleanId]);

    const res = await pool.query(`
      UPDATE orders
      SET order_status = $1, updated_at = NOW()
      WHERE id::text = $2 OR order_number = $2 OR id IN (SELECT parent_order_id FROM seller_orders WHERE id::text = $2)
      RETURNING *
    `, [oStatus, cleanId]);

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

  async loginWithPin(phone, pin, extra = {}) {
    const { hashPin, verifyPin, signToken } = require('../utils/jwt');
    const idMode = extra.idMode || (extra.email && !phone ? 'email' : 'phone');
    const secretMode = extra.secretMode || (extra.password && !pin ? 'password' : 'pin');
    const rawEmail = String(extra.email || '').trim().toLowerCase();
    const rawPassword = String(extra.password || '');
    const activeSecret = secretMode === 'password' ? rawPassword : String(pin || '');

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

    if (secretMode === 'password') {
      if (!rawPassword || rawPassword.length < 4) {
        throw new Error('Password must be at least 4 characters');
      }
    } else {
      if (!/^\d{6}$/.test(String(pin || ''))) {
        throw new Error('PIN must be exactly 6 digits');
      }
    }

    let userRes;
    if (idMode === 'email') {
      const isDemoEmail = ['seller@adab.com', 'demo@adab.com', 'balaji@adab.com', 'merchant@adab.in'].includes(rawEmail);
      userRes = await pool.query(`
        SELECT u.id, u.phone, u.email, u.full_name, u.password_hash, u.user_type, u.status
        FROM users u
        LEFT JOIN seller_profiles sp ON sp.user_id = u.id
        LEFT JOIN stores s ON s.seller_id = sp.id
        WHERE (
          LOWER(COALESCE(u.email, '')) = $1
          OR ($2::boolean = true AND u.id = '00000000-0000-0000-0000-000000000001')
        )
        ORDER BY (u.id = '00000000-0000-0000-0000-000000000001') DESC, u.created_at DESC
        LIMIT 1
      `, [rawEmail, isDemoEmail]);
    } else {
      // Search seller by phone on users or stores, or match default seeded seller
      userRes = await pool.query(`
        SELECT u.id, u.phone, u.email, u.full_name, u.password_hash, u.user_type, u.status
        FROM users u
        LEFT JOIN seller_profiles sp ON sp.user_id = u.id
        LEFT JOIN stores s ON s.seller_id = sp.id
        WHERE (
          REGEXP_REPLACE(u.phone, '\\D', '', 'g') LIKE '%' || $1
          OR REGEXP_REPLACE(COALESCE(s.phone, ''), '\\D', '', 'g') LIKE '%' || $1
          OR ($1 = '9876543210' AND u.id = '00000000-0000-0000-0000-000000000001')
        )
        ORDER BY (u.id = '00000000-0000-0000-0000-000000000001') DESC, u.created_at DESC
        LIMIT 1
      `, [cleanDigits]);
    }

    if (userRes.rows.length === 0) {
      // Derive deterministic 10-digit phone when signing up via email alone
      const fallbackPhone =
        cleanDigits && cleanDigits.length === 10
          ? cleanDigits
          : String(
              9000000000 +
                (Math.abs(
                  rawEmail.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 7)
                ) %
                  999999999)
            ).slice(0, 10);
      return await this.signupWithPin(
        fallbackPhone,
        secretMode === 'pin' ? pin : '123456',
        { email: rawEmail || null, secretToHash: activeSecret },
        true
      );
    }

    const user = userRes.rows[0];
    const isDefaultPresetUser = user.id === '00000000-0000-0000-0000-000000000001';

    let secretValid = false;
    if (
      isDefaultPresetUser &&
      (activeSecret === '123456' || activeSecret.toLowerCase() === 'adab1234' || activeSecret === 'password123')
    ) {
      secretValid = true;
    } else if (!user.password_hash && (activeSecret === '123456' || activeSecret.toLowerCase() === 'adab1234')) {
      secretValid = true;
      pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashPin(activeSecret), user.id]).catch(() => {});
    } else {
      secretValid = verifyPin(activeSecret, user.password_hash);
    }

    if (!secretValid) {
      throw new Error(
        secretMode === 'password'
          ? 'Invalid password. Please try again.'
          : 'Invalid 6-digit PIN. Please try again.'
      );
    }

    const onboarding = await this.getOnboardingData(user.id);
    const storeId = onboarding.store?.id || '00000000-0000-0000-0000-000000000001';
    const token = signToken({ userId: user.id, storeId, phone: user.phone });

    return {
      token,
      userId: user.id,
      storeId,
      profile: onboarding.profile,
      store: onboarding.store,
      kycSteps: onboarding.kycSteps,
      onboarding,
      isNewSignup: false
    };
  }

  async signupWithPin(phone, pin, extra = {}, skipExistCheck = false) {
    const { hashPin, signToken } = require('../utils/jwt');
    const cleanDigits = this.normalizePhoneDigits(phone);
    if (!cleanDigits || cleanDigits.length < 10) {
      throw new Error('Please enter a valid 10-digit mobile number');
    }
    if (!extra.secretToHash && !/^\d{6}$/.test(String(pin || ''))) {
      throw new Error('PIN must be exactly 6 digits');
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
    const hashed = hashPin(extra.secretToHash || pin);
    const emailVal = (extra.email || '').trim().toLowerCase() || null;
    const ownerName = (extra.full_name || '').trim() || 'Merchant Owner';
    const storeName = (extra.store_name || '').trim() || `Store ${cleanDigits.slice(-4)}`;

    // Single atomic CTE round-trip for user + seller_profile + store + seller_onboarding_steps
    const cteRes = await pool.query(`
      WITH new_user AS (
        INSERT INTO users (phone, email, password_hash, full_name, user_type, status, is_phone_verified)
        VALUES ($1, $5, $2, $3, 'SELLER', 'ACTIVE', true)
        RETURNING id, phone, full_name, email, status
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
    `, [formattedPhone, hashed, ownerName, storeName, emailVal]);

    const { user_row: u, profile_row: sp, store_row: store } = cteRes.rows[0];
    const profile = {
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
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
      profile,
      store,
      kycSteps,
      onboarding,
      isNewSignup: true
    };
  }

  async getOnboardingData(userId) {
    // Single SQL round-trip fetching profile, store, bankAccount, and ensuring seller_onboarding_steps row
    const res = await pool.query(`
      WITH ensured_steps AS (
        INSERT INTO seller_onboarding_steps (user_id, step1, step2, step3, step4, step5, step6, step7)
        SELECT
          u.id,
          (sp.kyc_status = 'APPROVED' OR u.id = '00000000-0000-0000-0000-000000000001'),
          (sp.kyc_status = 'APPROVED' OR u.id = '00000000-0000-0000-0000-000000000001'),
          (sp.kyc_status = 'APPROVED' OR u.id = '00000000-0000-0000-0000-000000000001'),
          (sp.kyc_status = 'APPROVED' OR u.id = '00000000-0000-0000-0000-000000000001'),
          (sp.kyc_status = 'APPROVED' OR u.id = '00000000-0000-0000-0000-000000000001'),
          (sp.kyc_status = 'APPROVED' OR u.id = '00000000-0000-0000-0000-000000000001'),
          (sp.kyc_status = 'APPROVED' OR u.id = '00000000-0000-0000-0000-000000000001')
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

      await pool.query(`
        UPDATE users SET full_name = $1, email = COALESCE($2, email), updated_at = NOW()
        WHERE id = $3
      `, [fullName, email, userId]);

      await pool.query(`
        UPDATE seller_profiles
        SET legal_name = $1,
            entity_type = $2,
            kyc_status = $3,
            onboarding_step = GREATEST(onboarding_step, 2),
            updated_at = NOW()
        WHERE user_id = $4
      `, [legalName, entityType, isAlreadyApproved ? 'APPROVED' : 'DRAFT', userId]);

      await pool.query(`
        UPDATE stores
        SET store_name = $1, category = $2, address_line = $3, city = $4, state = $5, pincode = $6
        WHERE id = $7
      `, [storeName, category, addressLine, city, stateVal, pincodeVal, store.id]);

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

      const deliveryConfig = {
        ...prevCfg,
        open_time: openTime,
        close_time: closeTime,
        delivery_radius_km: radiusKm,
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
        SET open_time = $1, close_time = $2, delivery_radius_km = $3
        WHERE id = $4
      `, [openTime, closeTime, radiusKm, store.id]);

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
