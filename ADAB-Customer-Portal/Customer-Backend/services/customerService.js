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

exports.updateProfile = async (userId, body) => {
  if (body.name || body.phone || body.email) {
    await pool.query(`UPDATE users SET full_name = $1, phone = $2, email = $3 WHERE id = $4`, [body.name, body.phone, body.email, userId]);
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
