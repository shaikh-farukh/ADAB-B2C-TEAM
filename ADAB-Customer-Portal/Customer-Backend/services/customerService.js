const pool = require('../db');

// Dummy logged in user for Day 1 testing
const USER_ID = '11111111-1111-1111-1111-111111111111';

exports.getProfile = async () => {
  const res = await pool.query(`
    SELECT c.id, u.email, u.full_name as name, u.phone
    FROM customer_profiles c
    JOIN users u ON c.user_id = u.id
    WHERE c.user_id = $1
  `, [USER_ID]);
  if (res.rows.length === 0) {
    return { id: 'cust-001', name: 'Mahi Customer', email: 'mahi@example.com' };
  }
  return res.rows[0];
};

exports.updateProfile = async (body) => {
  if (body.name || body.phone) {
    await pool.query(`UPDATE users SET full_name = $1, phone = $2 WHERE id = $3`, [body.name, body.phone, USER_ID]);
  }
  return this.getProfile();
};

exports.getAddresses = async () => {
  const res = await pool.query(`SELECT * FROM addresses WHERE user_id = $1`, [USER_ID]);
  return res.rows.map(r => ({
    id: r.id,
    type: r.label,
    address: r.address_line,
    city: r.city,
    state: r.state,
    zip: r.pincode,
    isDefault: r.is_default
  }));
};

exports.addAddress = async (body) => {
  const res = await pool.query(`
    INSERT INTO addresses (id, user_id, label, address_line, city, state, pincode, is_default, created_at)
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING id
  `, [USER_ID, body.type, body.address, body.city, body.state, body.zip, body.isDefault || false]);
  return { id: res.rows[0].id, ...body };
};

exports.updateAddress = async (id, body) => {
  await pool.query(`
    UPDATE addresses SET label = $1, address_line = $2, city = $3, state = $4, pincode = $5, is_default = $6
    WHERE id = $7 AND user_id = $8
  `, [body.type, body.address, body.city, body.state, body.zip, body.isDefault, id, USER_ID]);
  return { id, ...body };
};

exports.deleteAddress = async (id) => {
  await pool.query(`DELETE FROM addresses WHERE id = $1 AND user_id = $2`, [id, USER_ID]);
  return true;
};

exports.getWishlist = async () => {
  const wishlistRes = await pool.query(`SELECT id FROM wishlists WHERE user_id = $1`, [USER_ID]);
  if (wishlistRes.rows.length === 0) return [];
  
  const res = await pool.query(`
    SELECT w.id, w.listing_id as "productId", s.title as name, s.sell_price as price, 'https://via.placeholder.com/150' as image 
    FROM wishlist_items w
    JOIN seller_listings s ON w.listing_id = s.id
    WHERE w.wishlist_id = $1
  `, [wishlistRes.rows[0].id]);
  
  return res.rows.map(r => ({ ...r, price: parseFloat(r.price) }));
};

exports.addWishlistItem = async (body) => {
  let wishlistRes = await pool.query(`SELECT id FROM wishlists WHERE user_id = $1`, [USER_ID]);
  let wishlistId;
  if (wishlistRes.rows.length === 0) {
    const insertRes = await pool.query(`INSERT INTO wishlists (id, user_id, created_at) VALUES (gen_random_uuid(), $1, NOW()) RETURNING id`, [USER_ID]);
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
