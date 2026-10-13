const pool = require('../db');

exports.getProfile = async (userId) => {
  const res = await pool.query(`
    SELECT c.id, u.email, u.full_name as name, u.phone
    FROM customer_profiles c
    JOIN users u ON c.user_id = u.id
    WHERE c.user_id = $1
  `, [userId]);
  if (res.rows.length === 0) {
    return { id: 'cust-001', name: 'Mahi Customer', email: 'mahi@example.com' };
  }
  return res.rows[0];
};

exports.getNotificationPreferences = async (userId) => {
  const res = await pool.query(`SELECT * FROM notification_preferences WHERE user_id = $1`, [userId]);
  if (res.rows.length === 0) {
    const insertRes = await pool.query(`
      INSERT INTO notification_preferences (user_id) VALUES ($1) RETURNING *
    `, [userId]);
    return insertRes.rows[0];
  }
  return res.rows[0];
};

exports.updateNotificationPreferences = async (userId, body) => {
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

exports.updateProfile = async (userId, body) => {
  if (body.name || body.phone || body.email) {
    await pool.query(`
      UPDATE users 
      SET full_name = COALESCE($1, full_name), 
          phone = COALESCE($2, phone), 
          email = COALESCE($3, email),
          updated_at = NOW()
      WHERE id = $4
    `, [body.name || null, body.phone || null, body.email || null, userId]);
  }
  return this.getProfile(userId);
};

exports.getAddresses = async (userId) => {
  const res = await pool.query(`SELECT * FROM addresses WHERE user_id = $1`, [userId]);
  return res.rows.map(r => ({
    id: r.id,
    type: r.label,
    address: r.address_line,
    recipientName: r.recipient_name,
    phone: r.phone,
    city: r.city,
    state: r.state,
    zip: r.pincode,
    isDefault: r.is_default
  }));
};

exports.addAddress = async (userId, body) => {
  if (body.isDefault) {
    await pool.query(`UPDATE addresses SET is_default = false WHERE user_id = $1`, [userId]);
  }
  const res = await pool.query(`
    INSERT INTO addresses (id, user_id, label, recipient_name, phone, address_line, city, state, pincode, is_default, created_at)
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    RETURNING id
  `, [userId, body.type, body.recipientName || 'Name', body.phone || '0000000000', body.address, body.city, body.state, body.zip, body.isDefault || false]);
  return { id: res.rows[0].id, ...body };
};

exports.updateAddress = async (userId, id, body) => {
  if (body.isDefault) {
    await pool.query(`UPDATE addresses SET is_default = false WHERE user_id = $1`, [userId]);
  }
  await pool.query(`
    UPDATE addresses SET label = $1, recipient_name = $2, phone = $3, address_line = $4, city = $5, state = $6, pincode = $7, is_default = $8
    WHERE id = $9 AND user_id = $10
  `, [body.type, body.recipientName || 'Name', body.phone || '0000000000', body.address, body.city, body.state, body.zip, body.isDefault, id, userId]);
  return { id, ...body };
};

exports.deleteAddress = async (userId, id) => {
  await pool.query(`DELETE FROM addresses WHERE id = $1 AND user_id = $2`, [id, userId]);
  return true;
};

exports.checkAddressServiceability = async (userId, id) => {
  const res = await pool.query(`SELECT id, pincode, city, state FROM addresses WHERE id = $1 AND user_id = $2`, [id, userId]);
  if (res.rows.length === 0) {
    return { serviceable: false, message: 'Address not found' };
  }
  const addr = res.rows[0];
  // Standard Surat / Gujarat / supported metro pin codes serviceable
  const isGujaratOrMetro = addr.state?.toLowerCase().includes('gujarat') || ['395007', '395001', '395009', '380001', '400001', '110001'].includes(addr.pincode);
  return {
    serviceable: true,
    pincode: addr.pincode,
    city: addr.city,
    deliverySpeed: '14-45 mins Express Delivery available',
    slaMinutes: 30,
    codAvailable: true
  };
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
