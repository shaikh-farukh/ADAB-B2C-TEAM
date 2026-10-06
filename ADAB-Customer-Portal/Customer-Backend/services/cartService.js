const pool = require('../db');

/**
 * Service handling shopping cart database operations
 * Maps to existing tables: carts, cart_items, seller_listings, stores
 */

function normalizeDeliverySpeed(speed) {
  if (!speed) return 'EXPRESS_30M';
  const s = speed.toLowerCase();
  if (s.includes('same')) return 'SAME_DAY';
  if (s.includes('pickup') || s.includes('store')) return 'STORE_PICKUP';
  return 'EXPRESS_30M';
}

// Helper to find or create a cart for a customer or session token
async function getOrCreateCart({ customerId, sessionToken }) {
  let cart = null;
  if (customerId) {
    const res = await pool.query(
      `SELECT * FROM carts WHERE customer_id = $1 LIMIT 1`,
      [customerId]
    );
    if (res.rows.length > 0) cart = res.rows[0];
  } else if (sessionToken) {
    const res = await pool.query(
      `SELECT * FROM carts WHERE session_token = $1 LIMIT 1`,
      [sessionToken]
    );
    if (res.rows.length > 0) cart = res.rows[0];
  }

  if (!cart) {
    const insertRes = await pool.query(
      `INSERT INTO carts (customer_id, session_token, delivery_speed, updated_at)
       VALUES ($1, $2, 'EXPRESS_30M', NOW())
       RETURNING *`,
      [customerId || null, sessionToken || null]
    );
    cart = insertRes.rows[0];
  }

  return cart;
}

// Fetch all items in a cart with product and store details
async function getCartItems(cartId) {
  const query = `
    SELECT 
      ci.id AS cart_item_id,
      ci.id,
      ci.cart_id,
      ci.listing_id,
      ci.quantity,
      ci.added_at,
      sl.title AS product_name,
      sl.title AS name,
      sl.sell_price,
      sl.sell_price AS price,
      sl.mrp,
      sl.stock_qty,
      sl.store_id,
      s.store_name,
      s.store_name AS store,
      s.category AS store_category
    FROM cart_items ci
    JOIN seller_listings sl ON ci.listing_id = sl.id
    LEFT JOIN stores s ON sl.store_id = s.id
    WHERE ci.cart_id = $1
    ORDER BY ci.added_at ASC
  `;
  const res = await pool.query(query, [cartId]);
  return res.rows;
}

// Add item to cart or increment quantity if already exists
async function addItemToCart(cartId, listingId, quantity = 1) {
  // Validate listing exists
  const listingRes = await pool.query(
    `SELECT id, title, sell_price, stock_qty, is_active FROM seller_listings WHERE id = $1`,
    [listingId]
  );

  if (listingRes.rows.length === 0) {
    throw new Error('Product listing not found');
  }

  const listing = listingRes.rows[0];
  if (listing.stock_qty !== null && Number(listing.stock_qty) <= 0) {
    throw new Error(`Product "${listing.title}" is out of stock`);
  }

  const existing = await pool.query(
    `SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND listing_id = $2`,
    [cartId, listingId]
  );

  if (existing.rows.length > 0) {
    const newQty = Number(existing.rows[0].quantity) + Number(quantity);
    if (listing.stock_qty !== null && newQty > Number(listing.stock_qty)) {
      throw new Error(`Only ${listing.stock_qty} units available in stock`);
    }

    const updateRes = await pool.query(
      `UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *`,
      [newQty, existing.rows[0].id]
    );
    await pool.query(`UPDATE carts SET updated_at = NOW() WHERE id = $1`, [cartId]);
    return updateRes.rows[0];
  } else {
    const insertRes = await pool.query(
      `INSERT INTO cart_items (cart_id, listing_id, quantity, added_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [cartId, listingId, quantity]
    );
    await pool.query(`UPDATE carts SET updated_at = NOW() WHERE id = $1`, [cartId]);
    return insertRes.rows[0];
  }
}

// Update specific cart item quantity or apply delta (+1, -1)
async function updateCartItemQuantity(cartItemId, { quantity, delta }) {
  const existing = await pool.query(`SELECT * FROM cart_items WHERE id = $1`, [cartItemId]);
  if (existing.rows.length === 0) {
    throw new Error('Cart item not found');
  }

  let newQty;
  if (quantity !== undefined) {
    newQty = Number(quantity);
  } else if (delta !== undefined) {
    newQty = Number(existing.rows[0].quantity) + Number(delta);
  } else {
    throw new Error('Either quantity or delta must be provided');
  }

  if (newQty <= 0) {
    return removeCartItem(cartItemId);
  }

  // Validate stock
  const listingRes = await pool.query(
    `SELECT title, stock_qty FROM seller_listings WHERE id = $1`,
    [existing.rows[0].listing_id]
  );
  if (listingRes.rows.length > 0) {
    const listing = listingRes.rows[0];
    if (listing.stock_qty !== null && newQty > Number(listing.stock_qty)) {
      throw new Error(`Cannot add more than ${listing.stock_qty} available units`);
    }
  }

  const res = await pool.query(
    `UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *`,
    [newQty, cartItemId]
  );
  await pool.query(`UPDATE carts SET updated_at = NOW() WHERE id = $1`, [existing.rows[0].cart_id]);
  return res.rows[0];
}

// Remove item from cart
async function removeCartItem(cartItemId) {
  const res = await pool.query(
    `DELETE FROM cart_items WHERE id = $1 RETURNING *`,
    [cartItemId]
  );
  if (res.rows.length > 0) {
    await pool.query(`UPDATE carts SET updated_at = NOW() WHERE id = $1`, [res.rows[0].cart_id]);
  }
  return res.rows[0];
}

// Apply coupon to cart
async function applyCartCoupon(cartId, couponCode) {
  const res = await pool.query(
    `UPDATE carts SET coupon_code = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [couponCode, cartId]
  );
  return res.rows[0];
}

// Remove coupon from cart
async function removeCartCoupon(cartId) {
  const res = await pool.query(
    `UPDATE carts SET coupon_code = NULL, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [cartId]
  );
  return res.rows[0];
}

// Clear all items in a cart
async function clearCart(cartId) {
  await pool.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);
  await pool.query(`UPDATE carts SET updated_at = NOW() WHERE id = $1`, [cartId]);
}

module.exports = {
  normalizeDeliverySpeed,
  getOrCreateCart,
  getCartItems,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  applyCartCoupon,
  removeCartCoupon,
  clearCart
};
