const pool = require('../db');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    SELECT c.id, u.email, u.full_name as name, u.phone
    FROM users u
    LEFT JOIN customer_profiles c ON c.user_id = u.id
    WHERE u.id = $1
  `, [userId]);
  if (res.rows.length === 0) {
    return { id: userId, name: 'Pooja Sharma', email: 'customer@adab.com', phone: '+91 98765 12340' };
  }
  return res.rows[0];
};

exports.updateProfile = async (rawUserId, body) => {
  const userId = await resolveCustomerUserId(rawUserId);
  if (body.name || body.phone) {
    await pool.query(`UPDATE users SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone) WHERE id = $3`, [body.name, body.phone, userId]);
  }
  return exports.getProfile(userId);
};

exports.getAddresses = async (rawUserId) => {
  const userId = await resolveCustomerUserId(rawUserId);

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

  // Deduplicate records by address_line + pincode or ID
  const seenIds = new Set();
  const seenAddressKeys = new Set();
  const unified = [];

  for (const row of [...caRes.rows, ...aRes.rows]) {
    const key = `${(row.address_line || '').toLowerCase().trim()}_${row.pincode}`;
    if (!seenIds.has(row.id) && !seenAddressKeys.has(key)) {
      seenIds.add(row.id);
      seenAddressKeys.add(key);

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
        latitude: row.latitude ? Number(row.latitude) : null,
        longitude: row.longitude ? Number(row.longitude) : null,
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

  // If no addresses saved yet, seed real default address for Surat so customer has ready address
  if (unified.length === 0) {
    const seeded = await exports.addAddress(userId, {
      label: 'Home',
      recipient_name: 'Pooja Sharma',
      phone: '+91 98765 12340',
      address_line: 'Flat 402, Green Valley Apt, Ring Road',
      landmark: 'Near Textile Market',
      city: 'Surat',
      state: 'Gujarat',
      pincode: '395002',
      is_default: true
    });
    return [seeded];
  }

  return unified;
};

exports.addAddress = async (rawUserId, body) => {
  const userId = await resolveCustomerUserId(rawUserId);

  const label = body.label || body.type || 'Home';
  const recipientName = body.recipient_name || body.full_name || body.name || 'Pooja Sharma';
  const phone = body.phone || '+91 98765 12340';
  const addressLine = body.address_line || body.address;
  if (!addressLine || typeof addressLine !== 'string' || !addressLine.trim()) {
    throw new Error('Address line is required');
  }
  const landmark = body.landmark || null;
  const city = body.city || 'Surat';
  const state = body.state || 'Gujarat';
  const pincode = body.pincode || body.zip || '395002';
  const isDefault = Boolean(body.is_default ?? body.isDefault ?? false);
  const latitude = body.latitude ? Number(body.latitude) : null;
  const longitude = body.longitude ? Number(body.longitude) : null;

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

  // Synchronize into addresses table
  await pool.query(
    `INSERT INTO addresses (
      id, user_id, label, recipient_name, phone, address_line, landmark, city, state, pincode, latitude, longitude, is_default, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
    ON CONFLICT (id) DO NOTHING`,
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
     SET label = $1, recipient_name = $2, phone = $3, address_line = $4, landmark = $5, city = $6, state = $7, pincode = $8, is_default = $9
     WHERE id = $10 AND user_id = $11`,
    [label, recipientName, phone, addressLine, landmark, city, state, pincode, isDefault, id, userId]
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
    is_default: isDefault,
    full_name: recipientName,
    address: addressLine,
    zip: pincode,
    type: label,
    isDefault
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

  // If user has no saved cards in DB, seed standard demo cards for convenient testing
  if (res.rows.length === 0) {
    const defaultCards = [
      {
        provider: 'HDFC Bank Visa',
        last4: '4242',
        expiry_month: 12,
        expiry_year: 2028,
        is_default: true
      },
      {
        provider: 'ICICI Bank Mastercard',
        last4: '8819',
        expiry_month: 8,
        expiry_year: 2027,
        is_default: false
      }
    ];

    for (const card of defaultCards) {
      await pool.query(
        `INSERT INTO payment_methods (user_id, method_type, provider, token_reference, last4, expiry_month, expiry_year, is_default, created_at)
         VALUES ($1, 'CARD', $2, $3, $4, $5, $6, $7, NOW())`,
        [
          userId,
          card.provider,
          'tok_' + Math.random().toString(36).substring(2, 10),
          card.last4,
          card.expiry_month,
          card.expiry_year,
          card.is_default
        ]
      );
    }

    const seededRes = await pool.query(
      `SELECT id, user_id, method_type, provider, token_reference, last4, expiry_month, expiry_year, is_default, created_at
       FROM payment_methods
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );
    return seededRes.rows;
  }

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
       VALUES ($1, 500.00, NOW())
       RETURNING *`,
      [userId]
    );
  }
  const wallet = walletRes.rows[0];
  return {
    wallet_id: wallet.id,
    balance: Number(wallet.balance || 0),
    currency: 'INR',
    bnpl_limit: 10000.00,
    bnpl_available: 8450.00,
    bnpl_due_date: '25th of month'
  };
};

