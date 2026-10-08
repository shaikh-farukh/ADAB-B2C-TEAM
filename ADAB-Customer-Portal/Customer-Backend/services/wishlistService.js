const pool = require('../db');

exports.addWishlistItem = async (userId, listingId) => {
  // 1. Get or create wishlist
  let wishlistRes = await pool.query('SELECT id FROM wishlists WHERE user_id = $1', [userId]);
  if (wishlistRes.rows.length === 0) {
    wishlistRes = await pool.query('INSERT INTO wishlists (user_id) VALUES ($1) RETURNING id', [userId]);
  }
  const wishlistId = wishlistRes.rows[0].id;
  
  // 2. Check if item exists to avoid duplication errors
  const existingItem = await pool.query('SELECT id FROM wishlist_items WHERE wishlist_id = $1 AND listing_id = $2', [wishlistId, listingId]);
  
  if (existingItem.rows.length === 0) {
    const res = await pool.query('INSERT INTO wishlist_items (wishlist_id, listing_id) VALUES ($1, $2) RETURNING *', [wishlistId, listingId]);
    return res.rows[0];
  }
  return existingItem.rows[0];
};

exports.removeWishlistItem = async (userId, listingId) => {
  const wishlistRes = await pool.query('SELECT id FROM wishlists WHERE user_id = $1', [userId]);
  if (wishlistRes.rows.length === 0) return null;
  
  const wishlistId = wishlistRes.rows[0].id;
  const res = await pool.query('DELETE FROM wishlist_items WHERE wishlist_id = $1 AND listing_id = $2 RETURNING *', [wishlistId, listingId]);
  return res.rows[0];
};

exports.getWishlistByUser = async (userId) => {
  const res = await pool.query(`
    SELECT wi.listing_id 
    FROM wishlist_items wi
    JOIN wishlists w ON wi.wishlist_id = w.id
    JOIN seller_listings sl ON wi.listing_id = sl.id
    WHERE w.user_id = $1 AND sl.is_active = true
  `, [userId]);
  return res.rows.map(row => row.listing_id);
};
