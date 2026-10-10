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

const crypto = require('crypto');

// Helper to find, create, or merge a cart for a customer or session token
async function getOrCreateCart({ customerId, sessionToken }) {
  let cart = null;

  // Case A: Both customerId and sessionToken are provided (e.g. guest signs in or authenticated user with session)
  if (customerId && sessionToken) {
    const custRes = await pool.query(
      `SELECT * FROM carts WHERE customer_id = $1 LIMIT 1`,
      [customerId]
    );
    const guestRes = await pool.query(
      `SELECT * FROM carts WHERE session_token = $1 AND (customer_id IS NULL OR customer_id != $2) LIMIT 1`,
      [sessionToken, customerId]
    );

    const custCart = custRes.rows[0] || null;
    const guestCart = guestRes.rows[0] || null;

    if (custCart && guestCart && custCart.id !== guestCart.id) {
      // Merge guest cart items into existing customer cart
      const guestItems = await pool.query(`SELECT * FROM cart_items WHERE cart_id = $1`, [guestCart.id]);
      for (const gi of guestItems.rows) {
        const existInCust = await pool.query(
          `SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND listing_id = $2`,
          [custCart.id, gi.listing_id]
        );
        if (existInCust.rows.length > 0) {
          await pool.query(
            `UPDATE cart_items SET quantity = quantity + $1 WHERE id = $2`,
            [Number(gi.quantity), existInCust.rows[0].id]
          );
          await pool.query(`DELETE FROM cart_items WHERE id = $1`, [gi.id]);
        } else {
          await pool.query(
            `UPDATE cart_items SET cart_id = $1 WHERE id = $2`,
            [custCart.id, gi.id]
          );
        }
      }
      // Delete empty guest cart
      await pool.query(`DELETE FROM carts WHERE id = $1`, [guestCart.id]);
      await pool.query(`UPDATE carts SET updated_at = NOW() WHERE id = $1`, [custCart.id]);
      return custCart;
    } else if (!custCart && guestCart) {
      // Claim guest cart for this customer
      const claimRes = await pool.query(
        `UPDATE carts SET customer_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [customerId, guestCart.id]
      );
      return claimRes.rows[0];
    } else if (custCart) {
      return custCart;
    }
  }

  // Case B: Only customerId provided
  if (customerId) {
    const res = await pool.query(
      `SELECT * FROM carts WHERE customer_id = $1 LIMIT 1`,
      [customerId]
    );
    if (res.rows.length > 0) cart = res.rows[0];
  }
  // Case C: Only sessionToken provided
  else if (sessionToken) {
    const res = await pool.query(
      `SELECT * FROM carts WHERE session_token = $1 LIMIT 1`,
      [sessionToken]
    );
    if (res.rows.length > 0) cart = res.rows[0];
  }

  // Case D: Create new cart if none exists with persistent session token
  if (!cart) {
    const token = sessionToken || `guest_${crypto.randomUUID()}`;
    const insertRes = await pool.query(
      `INSERT INTO carts (customer_id, session_token, delivery_speed, updated_at)
       VALUES ($1, $2, 'EXPRESS_30M', NOW())
       RETURNING *`,
      [customerId || null, token]
    );
    cart = insertRes.rows[0];
  }

  return cart;
}

// Fetch all items in a cart with product, store, and inventory details
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
      sl.unit,
      sl.sku,
      sl.is_active,
      sl.approval_status,
      sl.stock_qty,
      sl.store_id,
      s.store_name,
      s.store_name AS store,
      s.category AS store_category,
      s.rating AS store_rating,
      s.address_line AS store_address,
      inv.available_quantity,
      inv.stock_quantity,
      COALESCE(
        CASE WHEN inv.available_quantity IS NOT NULL AND inv.available_quantity > 0 THEN inv.available_quantity ELSE NULL END,
        sl.stock_qty,
        inv.available_quantity,
        0
      ) AS effective_stock,
      ROUND(ci.quantity * sl.sell_price, 2) AS item_subtotal
    FROM cart_items ci
    JOIN seller_listings sl ON ci.listing_id = sl.id
    LEFT JOIN stores s ON sl.store_id = s.id
    LEFT JOIN inventory inv ON inv.listing_id = sl.id
    WHERE ci.cart_id = $1
    ORDER BY ci.added_at ASC
  `;
  const res = await pool.query(query, [cartId]);
  return res.rows;
}

// Add item to cart or increment quantity if already exists with live stock checks
async function addItemToCart(cartId, listingId, quantity = 1) {
  // Validate listing exists and fetch live stock from seller_listings + inventory
  const listingRes = await pool.query(
    `SELECT sl.id, sl.title, sl.sell_price, sl.mrp, sl.stock_qty, sl.is_active, sl.approval_status,
            inv.available_quantity, inv.stock_quantity
     FROM seller_listings sl
     LEFT JOIN inventory inv ON inv.listing_id = sl.id
     WHERE sl.id = $1`,
    [listingId]
  );

  if (listingRes.rows.length === 0) {
    throw new Error('Product listing not found');
  }

  const listing = listingRes.rows[0];
  if (listing.is_active === false) {
    throw new Error(`Product "${listing.title}" is currently unavailable`);
  }
  if (listing.approval_status && listing.approval_status !== 'APPROVED') {
    throw new Error(`Product "${listing.title}" is not available for purchase`);
  }

  // Determine available stock prioritizing inventory available_quantity, then listing stock_qty
  const availableStock = listing.available_quantity !== null && Number(listing.available_quantity) > 0
    ? Number(listing.available_quantity)
    : (listing.stock_qty !== null ? Number(listing.stock_qty) : (listing.available_quantity !== null ? Number(listing.available_quantity) : 999));

  if (availableStock <= 0) {
    throw new Error(`Product "${listing.title}" is out of stock`);
  }

  const existing = await pool.query(
    `SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND listing_id = $2`,
    [cartId, listingId]
  );

  if (existing.rows.length > 0) {
    const newQty = Number(existing.rows[0].quantity) + Number(quantity);
    if (newQty > availableStock) {
      throw new Error(`Cannot add ${quantity} more units. Only ${availableStock} units available in stock (${existing.rows[0].quantity} already in cart)`);
    }

    const updateRes = await pool.query(
      `UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *`,
      [newQty, existing.rows[0].id]
    );
    await pool.query(`UPDATE carts SET updated_at = NOW() WHERE id = $1`, [cartId]);
    return updateRes.rows[0];
  } else {
    if (Number(quantity) > availableStock) {
      throw new Error(`Only ${availableStock} units available in stock`);
    }

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

// Update specific cart item quantity or apply delta (+1, -1); auto-delete if quantity <= 0
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

  // Auto-delete item if quantity drops to 0 or below
  if (newQty <= 0) {
    await removeCartItem(cartItemId);
    return {
      id: cartItemId,
      cart_id: existing.rows[0].cart_id,
      listing_id: existing.rows[0].listing_id,
      quantity: 0,
      removed: true
    };
  }

  // Validate stock boundary against live seller_listings / inventory
  const listingRes = await pool.query(
    `SELECT sl.id, sl.title, sl.stock_qty, sl.is_active,
            inv.available_quantity
     FROM seller_listings sl
     LEFT JOIN inventory inv ON inv.listing_id = sl.id
     WHERE sl.id = $1`,
    [existing.rows[0].listing_id]
  );

  if (listingRes.rows.length > 0) {
    const listing = listingRes.rows[0];
    const availableStock = listing.available_quantity !== null && Number(listing.available_quantity) > 0
      ? Number(listing.available_quantity)
      : (listing.stock_qty !== null ? Number(listing.stock_qty) : (listing.available_quantity !== null ? Number(listing.available_quantity) : 999));

    if (newQty > availableStock) {
      throw new Error(`Cannot update quantity to ${newQty}. Only ${availableStock} units available in stock`);
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
  if (res.rows.length === 0) {
    throw new Error('Cart item not found');
  }
  await pool.query(`UPDATE carts SET updated_at = NOW() WHERE id = $1`, [res.rows[0].cart_id]);
  return {
    ...res.rows[0],
    removed: true
  };
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
