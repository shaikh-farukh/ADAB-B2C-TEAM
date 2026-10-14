const pool = require('../db');
const { smartGeocode } = require('./geocodingService');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves any customer identifier (UUID, session token, phone, or default)
 * to a valid, persistent user UUID in the users table
 */
async function resolveCustomerUserId(identifier) {
  // 1. If valid UUID, check if user exists
  if (identifier && UUID_REGEX.test(identifier)) {
    const res = await pool.query(`SELECT id FROM users WHERE id = $1 LIMIT 1`, [identifier]);
    if (res.rows.length > 0) return res.rows[0].id;
  }

  // 2. Check if a cart with this session_token has a customer_id
  if (identifier && typeof identifier === 'string') {
    const cartRes = await pool.query(
      `SELECT customer_id FROM carts WHERE session_token = $1 AND customer_id IS NOT NULL LIMIT 1`,
      [identifier]
    );
    if (cartRes.rows.length > 0 && cartRes.rows[0].customer_id) {
      return cartRes.rows[0].customer_id;
    }
  }

  // 3. Fallback to active default customer in the database
  const defaultUserRes = await pool.query(
    `SELECT id FROM users WHERE user_type = 'CUSTOMER' ORDER BY created_at ASC LIMIT 1`
  );
  if (defaultUserRes.rows.length > 0) {
    return defaultUserRes.rows[0].id;
  }

  // 4. If no customer exists in DB, create one
  const newCust = await pool.query(
    `INSERT INTO users (email, phone, password_hash, full_name, user_type, status, is_phone_verified)
     VALUES ('customer@adab.com', '+919876512340', 'otp_guest', 'Pooja Sharma', 'CUSTOMER', 'ACTIVE', true)
     RETURNING id`
  );
  return newCust.rows[0].id;
}

exports.resolveCustomerUserId = resolveCustomerUserId;

exports.getProfile = async (rawUserId) => {
  const userId = await resolveCustomerUserId(rawUserId);
  const res = await pool.query(`
    SELECT c.id, u.email, u.full_name as name, u.phone,
           c.loyalty_tier
    FROM users u
    LEFT JOIN customer_profiles c ON c.user_id = u.id
    WHERE u.id = $1
  `, [userId]);
  if (res.rows.length === 0) {
    return { id: userId, name: 'Pooja Sharma', email: 'customer@adab.com', phone: '+91 98765 12340', points: 0, wallet_balance: 0 };
  }

  // Calculate reward points from user's completed orders (starts at 0 for new account)
  const ordersPointsRes = await pool.query(`
    SELECT COALESCE(SUM(FLOOR(grand_total / 100)), 0)::int as points
    FROM orders
    WHERE customer_id = $1 AND order_status != 'CANCELLED'
  `, [userId]);
  const points = ordersPointsRes.rows[0]?.points || 0;

  // Get user wallet balance from customer_wallets table
  const walletRes = await pool.query(`SELECT balance FROM customer_wallets WHERE customer_id = $1 LIMIT 1`, [userId]);
  const wallet_balance = walletRes.rows.length > 0 ? Number(walletRes.rows[0].balance || 0) : 0;

  return {
    ...res.rows[0],
    points,
    wallet_balance
  };
};

exports.getNotificationPreferences = async (rawUserId) => {
  const userId = await resolveCustomerUserId(rawUserId);
  const res = await pool.query(`SELECT * FROM notification_preferences WHERE user_id = $1`, [userId]);
  if (res.rows.length === 0) {
    const insertRes = await pool.query(`
      INSERT INTO notification_preferences (user_id) VALUES ($1) RETURNING *
    `, [userId]);
    return insertRes.rows[0];
  }
  return res.rows[0];
};

exports.updateNotificationPreferences = async (rawUserId, body) => {
  const userId = await resolveCustomerUserId(rawUserId);
  // Ensure record exists before update
  await exports.getNotificationPreferences(userId);
  const res = await pool.query(`
    UPDATE notification_preferences
    SET order_updates_sms = COALESCE($1, order_updates_sms),
        order_updates_email = COALESCE($2, order_updates_email),
        order_updates_whatsapp = COALESCE($3, order_updates_whatsapp),
        promotional_sms = COALESCE($4, promotional_sms),
        promotional_email = COALESCE($5, promotional_email),
        promotional_whatsapp = COALESCE($6, promotional_whatsapp),
        soundbox_alerts = COALESCE($7, soundbox_alerts),
        updated_at = NOW()
    WHERE user_id = $8
    RETURNING *
  `, [
    body.order_updates_sms, body.order_updates_email, body.order_updates_whatsapp,
    body.promotional_sms, body.promotional_email, body.promotional_whatsapp,
    body.soundbox_alerts, userId
  ]);
  return res.rows[0];
};

exports.updateProfile = async (rawUserId, body) => {
  const userId = await resolveCustomerUserId(rawUserId);
  if (body.name || body.phone || body.email) {
    await pool.query(`UPDATE users SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone), email = COALESCE($3, email) WHERE id = $4`, [body.name, body.phone, body.email, userId]);
  }
  return exports.getProfile(userId);
};

exports.getAddresses = async (rawUserId) => {
  if (!rawUserId) return [];
  const userId = await resolveCustomerUserId(rawUserId);
  if (!userId) return [];

  // Query both customer_addresses and addresses tables
  const caRes = await pool.query(
    `SELECT 
      id, customer_id AS user_id, label, recipient_name, phone, address_line, landmark, city, pincode, is_default, created_at, 'Gujarat' AS state
     FROM customer_addresses 
     WHERE customer_id = $1 
     ORDER BY is_default DESC, created_at DESC`,
    [userId]
  );

  const aRes = await pool.query(
    `SELECT 
      id, user_id, label, recipient_name, phone, address_line, landmark, city, state, pincode, latitude, longitude, is_default, created_at
     FROM addresses 
     WHERE user_id = $1 
     ORDER BY is_default DESC, created_at DESC`,
    [userId]
  );

  // Build coordinate lookup from addresses table
  const coordMap = new Map();
  for (const aRow of aRes.rows) {
    if (aRow.latitude && aRow.longitude && !isNaN(Number(aRow.latitude)) && !isNaN(Number(aRow.longitude))) {
      const coords = { latitude: Number(aRow.latitude), longitude: Number(aRow.longitude) };
      coordMap.set(aRow.id, coords);
      const key = `${(aRow.address_line || '').toLowerCase().trim()}_${aRow.pincode}`;
      coordMap.set(key, coords);
    }
  }

  // Deduplicate records by address_line + pincode or ID
  const seenIds = new Set();
  const seenAddressKeys = new Set();
  const unified = [];

  // Process aRes first (has native latitude/longitude), then caRes
  for (const row of [...aRes.rows, ...caRes.rows]) {
    const key = `${(row.address_line || '').toLowerCase().trim()}_${row.pincode}`;
    if (!seenIds.has(row.id) && !seenAddressKeys.has(key)) {
      seenIds.add(row.id);
      seenAddressKeys.add(key);

      let lat = row.latitude ? Number(row.latitude) : null;
      let lng = row.longitude ? Number(row.longitude) : null;

      // Check coordinate map fallback
      if (!lat || !lng) {
        const cached = coordMap.get(row.id) || coordMap.get(key);
        if (cached) {
          lat = cached.latitude;
          lng = cached.longitude;
        }
      }

      // If still missing, dynamically geocode and backfill
      if (!lat || !lng) {
        const resolved = await smartGeocode({
          address_line: row.address_line,
          landmark: row.landmark,
          city: row.city,
          state: row.state,
          pincode: row.pincode
        });
        lat = resolved.latitude;
        lng = resolved.longitude;

        // Synchronize coordinates into addresses table
        pool.query(
          `INSERT INTO addresses (id, user_id, label, recipient_name, phone, address_line, landmark, city, state, pincode, latitude, longitude, is_default, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
           ON CONFLICT (id) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude`,
          [row.id, userId, row.label || 'Home', row.recipient_name || 'Customer', row.phone || '', row.address_line, row.landmark || '', row.city || 'Surat', row.state || 'Gujarat', row.pincode || '', lat, lng, Boolean(row.is_default)]
        ).catch(() => {});
      }

      unified.push({
        id: row.id,
        user_id: row.user_id,
        label: row.label || 'Home',
        recipient_name: row.recipient_name || 'Customer',
        phone: row.phone || '',
        address_line: row.address_line,
        landmark: row.landmark || '',
        city: row.city || 'Surat',
        state: row.state || 'Gujarat',
        pincode: row.pincode || '',
        is_default: Boolean(row.is_default),
        latitude: lat,
        longitude: lng,
        created_at: row.created_at,
        // CamelCase aliases for backward compatibility
        full_name: row.recipient_name,
        address: row.address_line,
        zip: row.pincode,
        type: row.label,
        isDefault: Boolean(row.is_default)
      });
    }
  }

  return unified;
};

exports.addAddress = async (rawUserId, body) => {
  const userId = await resolveCustomerUserId(rawUserId);

  const label = body.label || body.type || 'Home';
  const recipientName = body.recipient_name || body.full_name || body.name || 'Customer';
  const phone = body.phone || '';
  const addressLine = body.address_line || body.address;
  if (!addressLine || typeof addressLine !== 'string' || !addressLine.trim()) {
    throw new Error('Address line is required');
  }
  const landmark = body.landmark || null;
  const city = body.city || 'Surat';
  const state = body.state || 'Gujarat';
  const pincode = body.pincode || body.zip || '395002';
  const isDefault = Boolean(body.is_default ?? body.isDefault ?? false);

  // Dynamic high-precision geocoding
  let latitude = body.latitude ? Number(body.latitude) : null;
  let longitude = body.longitude ? Number(body.longitude) : null;
  if (!latitude || !longitude) {
    const resolvedCoords = await smartGeocode({
      address_line: addressLine.trim(),
      landmark,
      city,
      state,
      pincode
    });
    latitude = resolvedCoords.latitude;
    longitude = resolvedCoords.longitude;
  }

  // If isDefault is true, unset default on other addresses
  if (isDefault) {
    await pool.query(`UPDATE customer_addresses SET is_default = false WHERE customer_id = $1`, [userId]);
    await pool.query(`UPDATE addresses SET is_default = false WHERE user_id = $1`, [userId]);
  }

  // Insert into customer_addresses table
  const caRes = await pool.query(
    `INSERT INTO customer_addresses (
      id, customer_id, label, recipient_name, phone, address_line, landmark, city, pincode, is_default, created_at
    )
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    RETURNING *`,
    [userId, label, recipientName, phone, addressLine.trim(), landmark, city, pincode, isDefault]
  );

  const saved = caRes.rows[0];

  // Synchronize into addresses table with resolved latitude & longitude
  await pool.query(
    `INSERT INTO addresses (
      id, user_id, label, recipient_name, phone, address_line, landmark, city, state, pincode, latitude, longitude, is_default, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
    ON CONFLICT (id) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude`,
    [saved.id, userId, label, recipientName, phone, addressLine.trim(), landmark, city, state, pincode, latitude, longitude, isDefault]
  );

  return {
    id: saved.id,
    user_id: userId,
    label: saved.label,
    recipient_name: saved.recipient_name,
    phone: saved.phone,
    address_line: saved.address_line,
    landmark: saved.landmark,
    city: saved.city,
    state: state,
    pincode: saved.pincode,
    is_default: saved.is_default,
    latitude,
    longitude,
    created_at: saved.created_at,
    full_name: saved.recipient_name,
    address: saved.address_line,
    zip: saved.pincode,
    type: saved.label,
    isDefault: saved.is_default
  };
};

exports.updateAddress = async (rawUserId, id, body) => {
  const userId = await resolveCustomerUserId(rawUserId);

  // Find address in customer_addresses or addresses
  const existRes = await pool.query(
    `SELECT id, customer_id AS user_id, label, recipient_name, phone, address_line, landmark, city, pincode, is_default, created_at, 'Gujarat' AS state
     FROM customer_addresses WHERE id = $1 AND customer_id = $2
     UNION
     SELECT id, user_id, label, recipient_name, phone, address_line, landmark, city, pincode, is_default, created_at, state
     FROM addresses WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [id, userId]
  );

  if (existRes.rows.length === 0) {
    const err = new Error(`Address not found with id: ${id}`);
    err.status = 404;
    throw err;
  }

  const current = existRes.rows[0];
  const label = body.label !== undefined ? body.label : (body.type !== undefined ? body.type : current.label);
  const recipientName = body.recipient_name !== undefined ? body.recipient_name : (body.full_name !== undefined ? body.full_name : current.recipient_name);
  const phone = body.phone !== undefined ? body.phone : current.phone;
  const addressLine = body.address_line !== undefined ? body.address_line : (body.address !== undefined ? body.address : current.address_line);
  const landmark = body.landmark !== undefined ? body.landmark : current.landmark;
  const city = body.city !== undefined ? body.city : current.city;
  const state = body.state !== undefined ? body.state : (current.state || 'Gujarat');
  const pincode = body.pincode !== undefined ? body.pincode : (body.zip !== undefined ? body.zip : current.pincode);
  const isDefault = body.is_default !== undefined ? Boolean(body.is_default) : (body.isDefault !== undefined ? Boolean(body.isDefault) : current.is_default);

  // Resolve coordinates
  let latitude = body.latitude ? Number(body.latitude) : null;
  let longitude = body.longitude ? Number(body.longitude) : null;
  if (!latitude || !longitude) {
    const resolvedCoords = await smartGeocode({
      address_line: addressLine,
      landmark,
      city,
      state,
      pincode
    });
    latitude = resolvedCoords.latitude;
    longitude = resolvedCoords.longitude;
  }

  if (isDefault) {
    await pool.query(`UPDATE customer_addresses SET is_default = false WHERE customer_id = $1`, [userId]);
    await pool.query(`UPDATE addresses SET is_default = false WHERE user_id = $1`, [userId]);
  }

  // Update customer_addresses
  await pool.query(
    `UPDATE customer_addresses 
     SET label = $1, recipient_name = $2, phone = $3, address_line = $4, landmark = $5, city = $6, pincode = $7, is_default = $8
     WHERE id = $9 AND customer_id = $10`,
    [label, recipientName, phone, addressLine, landmark, city, pincode, isDefault, id, userId]
  );

  // Update addresses
  await pool.query(
    `UPDATE addresses 
     SET label = $1, recipient_name = $2, phone = $3, address_line = $4, landmark = $5, city = $6, state = $7, pincode = $8, latitude = $9, longitude = $10, is_default = $11
     WHERE id = $12 AND user_id = $13`,
    [label, recipientName, phone, addressLine, landmark, city, state, pincode, latitude, longitude, isDefault, id, userId]
  );

  return {
    id,
    user_id: userId,
    label,
    recipient_name: recipientName,
    phone,
    address_line: addressLine,
    landmark,
    city,
    state,
    pincode,
    latitude,
    longitude,
    is_default: isDefault,
    full_name: recipientName,
    address: addressLine,
    zip: pincode,
    type: label,
    isDefault,
    recipientName
  };
};

exports.deleteAddress = async (rawUserId, id) => {
  const userId = await resolveCustomerUserId(rawUserId);
  await pool.query(`DELETE FROM customer_addresses WHERE id = $1 AND customer_id = $2`, [id, userId]);
  await pool.query(`DELETE FROM addresses WHERE id = $1 AND user_id = $2`, [id, userId]);
  return true;
};

exports.getWishlist = async (userId) => {
  const wishlistRes = await pool.query(`SELECT id FROM wishlists WHERE user_id = $1`, [userId]);
  if (wishlistRes.rows.length === 0) return [];
  
  const res = await pool.query(`
    SELECT w.id, w.listing_id as "productId", s.title as name, s.sell_price as price, 'https://via.placeholder.com/150' as image 
    FROM wishlist_items w
    JOIN seller_listings s ON w.listing_id = s.id
    WHERE w.wishlist_id = $1
  `, [wishlistRes.rows[0].id]);
  
  return res.rows.map(r => ({ ...r, price: parseFloat(r.price) }));
};

exports.addWishlistItem = async (userId, body) => {
  let wishlistRes = await pool.query(`SELECT id FROM wishlists WHERE user_id = $1`, [userId]);
  let wishlistId;
  if (wishlistRes.rows.length === 0) {
    const insertRes = await pool.query(`INSERT INTO wishlists (id, user_id, created_at) VALUES (gen_random_uuid(), $1, NOW()) RETURNING id`, [userId]);
    wishlistId = insertRes.rows[0].id;
  } else {
    wishlistId = wishlistRes.rows[0].id;
  }
  
  const res = await pool.query(`
    INSERT INTO wishlist_items (id, wishlist_id, listing_id, added_at)
    VALUES (gen_random_uuid(), $1, $2, NOW())
    RETURNING id
  `, [wishlistId, body.productId]);
  
  return { id: res.rows[0].id, ...body };
};

exports.removeWishlistItem = async (id) => {
  await pool.query(`DELETE FROM wishlist_items WHERE id = $1`, [id]);
  return true;
};

exports.getPaymentMethods = async (rawUserId) => {
  const userId = await resolveCustomerUserId(rawUserId);
  const res = await pool.query(
    `SELECT id, user_id, method_type, provider, token_reference, last4, expiry_month, expiry_year, is_default, created_at
     FROM payment_methods
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at DESC`,
    [userId]
  );

  return res.rows;
};

exports.addPaymentMethod = async (rawUserId, cardData) => {
  const userId = await resolveCustomerUserId(rawUserId);
  const { provider = 'Visa', last4 = '1234', expiry_month = 12, expiry_year = 2029, is_default = false } = cardData;

  if (is_default) {
    await pool.query(`UPDATE payment_methods SET is_default = false WHERE user_id = $1`, [userId]);
  }

  const tokenRef = 'tok_' + Math.random().toString(36).substring(2, 12);
  const res = await pool.query(
    `INSERT INTO payment_methods (user_id, method_type, provider, token_reference, last4, expiry_month, expiry_year, is_default, created_at)
     VALUES ($1, 'CARD', $2, $3, $4, $5, $6, $7, NOW())
     RETURNING *`,
    [userId, provider, tokenRef, last4, expiry_month, expiry_year, !!is_default]
  );
  return res.rows[0];
};

exports.deletePaymentMethod = async (rawUserId, methodId) => {
  const userId = await resolveCustomerUserId(rawUserId);
  await pool.query(`DELETE FROM payment_methods WHERE id = $1 AND user_id = $2`, [methodId, userId]);
  return true;
};

exports.getWallet = async (rawUserId) => {
  const userId = await resolveCustomerUserId(rawUserId);
  let walletRes = await pool.query(`SELECT * FROM customer_wallets WHERE customer_id = $1 LIMIT 1`, [userId]);
  if (walletRes.rows.length === 0) {
    walletRes = await pool.query(
      `INSERT INTO customer_wallets (customer_id, balance, updated_at)
       VALUES ($1, 0.00, NOW())
       RETURNING *`,
      [userId]
    );
  }
  const wallet = walletRes.rows[0];
  return {
    wallet_id: wallet.id,
    balance: Number(wallet.balance || 0),
    currency: 'INR',
    bnpl_limit: 0.00,
    bnpl_available: 0.00,
    bnpl_due_date: 'N/A'
  };
};

exports.getNotifications = async (rawUserId, { limit = 50, offset = 0 } = {}) => {
  const userId = await resolveCustomerUserId(rawUserId);

  let res = await pool.query(
    `SELECT * FROM notifications 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  // If no notifications exist yet for this customer, generate initial notifications tied to their real orders/account
  if (res.rows.length === 0) {
    const ordersRes = await pool.query(
      `SELECT id, order_number, order_status, grand_total FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 3`,
      [userId]
    );

    if (ordersRes.rows.length > 0) {
      for (const ord of ordersRes.rows) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type, is_read, action_url, created_at)
           VALUES ($1, $2, $3, 'ORDER_STATUS', false, $4, NOW())`,
          [
            userId,
            `Order #${ord.order_number} ${ord.order_status}`,
            `Your order #${ord.order_number} for ₹${ord.grand_total} is currently ${ord.order_status}.`,
            `/orders`
          ]
        );
      }
    } else {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, action_url, created_at)
         VALUES ($1, 'Welcome to ADAB!', 'Start exploring local stores in your neighborhood with fast 14-45 min delivery.', 'GENERAL', false, '/stores', NOW())`,
        [userId]
      );
    }

    res = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  }

  return res.rows;
};

exports.getUnreadNotificationCount = async (rawUserId) => {
  const userId = await resolveCustomerUserId(rawUserId);
  const res = await pool.query(
    `SELECT COUNT(*)::int as unread_count FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return res.rows[0]?.unread_count || 0;
};

exports.markNotificationRead = async (rawUserId, notificationId) => {
  const userId = await resolveCustomerUserId(rawUserId);
  const res = await pool.query(
    `UPDATE notifications 
     SET is_read = true 
     WHERE id = $1 AND user_id = $2 
     RETURNING *`,
    [notificationId, userId]
  );
  if (res.rows.length === 0) {
    const notifCheck = await pool.query(`SELECT id FROM notifications WHERE id = $1`, [notificationId]);
    if (notifCheck.rows.length === 0) {
      const err = new Error(`Notification #${notificationId} not found`);
      err.statusCode = 404;
      throw err;
    }
  }
  return res.rows[0] || { id: notificationId, is_read: true };
};

exports.markAllNotificationsRead = async (rawUserId) => {
  const userId = await resolveCustomerUserId(rawUserId);
  const res = await pool.query(
    `UPDATE notifications 
     SET is_read = true 
     WHERE user_id = $1 AND is_read = false 
     RETURNING id`,
    [userId]
  );
  return { updated_count: res.rows.length };
};


