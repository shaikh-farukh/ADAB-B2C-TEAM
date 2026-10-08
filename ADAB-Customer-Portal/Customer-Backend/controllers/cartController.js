const pool = require('../db');
const cartService = require('../services/cartService');
const checkoutService = require('../services/checkoutService');
const { formatError, validatePositiveQuantity } = require('../utils/errorHandler');

/**
 * Cart Controller with robust validation and error handling
 */

/**
 * Helper to identify session parameters from headers, query, or body
 * Supports authenticated customers (customer_id / x-customer-id) and guest carts (session_token / x-session-token)
 */
function resolveSession(req) {
  const body = req.body || {};
  const query = req.query || {};
  const headers = req.headers || {};

  const customerId = headers['x-customer-id'] || query.customer_id || body.customer_id || null;
  const sessionToken = headers['x-session-token'] || headers['session-token'] || query.session_token || body.session_token || null;

  return { customerId, sessionToken };
}

async function getCart(req, res) {
  try {
    const { customerId, sessionToken } = resolveSession(req);

    const cart = await cartService.getOrCreateCart({ customerId, sessionToken });
    const items = await cartService.getCartItems(cart.id);
    const summary = await checkoutService.calculateCheckoutPreview(cart.id, {
      deliverySpeed: cart.delivery_speed || 'EXPRESS_30M',
      couponCode: cart.coupon_code || null
    });

    res.setHeader('X-Session-Token', cart.session_token);
    return res.json({
      status: 'success',
      data: {
        cart,
        items,
        stores: summary.stores,
        summary
      }
    });
  } catch (error) {
    console.error('Error fetching cart:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

async function addItem(req, res) {
  try {
    const { listing_id, quantity = 1 } = req.body || {};
    
    // 1. Validate listing_id presence
    if (!listing_id) {
      return res.status(400).json({
        status: 'error',
        message: 'listing_id is required to add an item to the cart'
      });
    }

    // 2. Validate ordered quantity is strictly greater than 0
    const qtyCheck = validatePositiveQuantity(quantity);
    if (!qtyCheck.valid) {
      return res.status(400).json({
        status: 'error',
        message: qtyCheck.message
      });
    }

    const { customerId, sessionToken } = resolveSession(req);
    const cart = await cartService.getOrCreateCart({ customerId, sessionToken });

    const item = await cartService.addItemToCart(cart.id, listing_id, qtyCheck.value);
    const items = await cartService.getCartItems(cart.id);
    const summary = await checkoutService.calculateCheckoutPreview(cart.id, {
      deliverySpeed: cart.delivery_speed || 'EXPRESS_30M',
      couponCode: cart.coupon_code || null
    });

    return res.status(201).json({
      status: 'success',
      message: 'Item added to cart',
      data: {
        cart_id: cart.id,
        item,
        items,
        stores: summary.stores,
        summary
      }
    });
  } catch (error) {
    console.error('Error adding item to cart:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

async function updateItem(req, res) {
  try {
    const { id } = req.params;
    const { quantity, delta } = req.body;

    if (quantity === undefined && delta === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Either quantity or delta (+1 / -1) is required to update an item'
      });
    }

    // Validate quantity is not negative
    if (quantity !== undefined) {
      const numQty = Number(quantity);
      if (isNaN(numQty) || numQty < 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Quantity must be 0 or a positive number'
        });
      }
    }

    // Validate delta is numeric
    if (delta !== undefined && isNaN(Number(delta))) {
      return res.status(400).json({
        status: 'error',
        message: 'Delta must be a valid numeric step (e.g. 1 or -1)'
      });
    }

    const updated = await cartService.updateCartItemQuantity(id, { quantity, delta });
    const cartId = updated.cart_id;
    const items = await cartService.getCartItems(cartId);
    const summary = await checkoutService.calculateCheckoutPreview(cartId);

    return res.json({
      status: 'success',
      message: updated.removed ? 'Item removed from cart' : 'Cart item updated',
      data: {
        ...updated,
        item: updated,
        items,
        stores: summary.stores,
        summary
      }
    });
  } catch (error) {
    console.error('Error updating cart item:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

async function removeItem(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Cart item ID is required' });
    }

    const deleted = await cartService.removeCartItem(id);
    const cartId = deleted.cart_id;
    const items = await cartService.getCartItems(cartId);
    const summary = await checkoutService.calculateCheckoutPreview(cartId);

    return res.json({
      status: 'success',
      message: 'Item removed from cart',
      data: {
        ...deleted,
        item: deleted,
        items,
        stores: summary.stores,
        summary
      }
    });
  } catch (error) {
    console.error('Error removing cart item:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

async function getCartSummary(req, res) {
  try {
    const cartId = req.query.cart_id || null;
    const customerId = req.query.customer_id || null;
    const sessionToken = req.query.session_token || req.headers['x-session-token'] || 'guest-session';
    const deliverySpeed = req.query.delivery_speed || null;
    const couponCode = req.query.coupon_code || null;

    let targetCartId = cartId;
    let cart = null;
    if (!targetCartId) {
      cart = await cartService.getOrCreateCart({ customerId, sessionToken });
      targetCartId = cart.id;
    } else {
      const cartRes = await pool.query('SELECT * FROM carts WHERE id = $1 LIMIT 1', [targetCartId]);
      if (cartRes.rows.length > 0) cart = cartRes.rows[0];
    }

    const effectiveSpeed = deliverySpeed || cart?.delivery_speed || 'EXPRESS_30M';
    const effectiveCoupon = couponCode !== null && couponCode !== undefined ? couponCode : (cart?.coupon_code || null);

    const summary = await checkoutService.calculateCheckoutPreview(targetCartId, {
      deliverySpeed: effectiveSpeed,
      couponCode: effectiveCoupon
    });

    return res.json({
      status: 'success',
      data: summary
    });
  } catch (error) {
    console.error('Error getting cart summary:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

async function applyCoupon(req, res) {
  try {
    const { coupon_code, cart_id, customer_id, session_token } = req.body || {};
    if (!coupon_code || typeof coupon_code !== 'string' || coupon_code.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'A valid coupon_code string is required'
      });
    }

    const cleanCode = coupon_code.toUpperCase().trim();

    let targetCartId = cart_id;
    if (!targetCartId) {
      const cart = await cartService.getOrCreateCart({
        customerId: customer_id,
        sessionToken: session_token || req.headers['x-session-token'] || 'guest-session'
      });
      targetCartId = cart.id;
    }

    // 1. Fetch current cart items to determine live order subtotal
    const items = await cartService.getCartItems(targetCartId);
    if (items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot apply coupon to an empty cart. Please add items to your cart first.'
      });
    }

    const currentSubtotal = items.reduce((sum, it) => sum + (Number(it.sell_price) * Number(it.quantity)), 0);

    // 2. Validate coupon against live PostgreSQL coupons table
    const couponValidation = await checkoutService.validateCoupon(cleanCode, {
      subtotal: currentSubtotal,
      deliveryFee: 29
    });

    if (!couponValidation.isValid) {
      return res.status(400).json({
        status: 'error',
        code: couponValidation.status,
        message: couponValidation.message,
        data: {
          coupon_code: cleanCode,
          coupon_status: couponValidation.status,
          min_order_value: couponValidation.min_order_value,
          current_subtotal: currentSubtotal
        }
      });
    }

    // 3. Link coupon code to the cart in database
    const updatedCart = await cartService.applyCartCoupon(targetCartId, cleanCode);
    const summary = await checkoutService.calculateCheckoutPreview(targetCartId, {
      deliverySpeed: updatedCart.delivery_speed || 'EXPRESS_30M',
      couponCode: updatedCart.coupon_code
    });

    return res.json({
      status: 'success',
      message: `Coupon ${cleanCode} applied successfully`,
      data: {
        cart: updatedCart,
        stores: summary.stores,
        discount: summary.pricing.discount,
        summary
      }
    });
  } catch (error) {
    console.error('Error applying coupon:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

async function removeCoupon(req, res) {
  try {
    const body = req.body || {};
    const cart_id = body.cart_id || req.query.cart_id;
    const customer_id = body.customer_id || req.query.customer_id;
    const session_token = body.session_token || req.query.session_token || req.headers['x-session-token'] || 'guest-session';

    let targetCartId = cart_id;
    if (!targetCartId) {
      const cart = await cartService.getOrCreateCart({
        customerId: customer_id,
        sessionToken: session_token
      });
      targetCartId = cart.id;
    }

    // Unlink coupon code from the cart
    const updatedCart = await cartService.removeCartCoupon(targetCartId);
    const summary = await checkoutService.calculateCheckoutPreview(targetCartId, {
      deliverySpeed: updatedCart.delivery_speed || 'EXPRESS_30M',
      couponCode: null
    });

    return res.json({
      status: 'success',
      message: 'Coupon removed successfully',
      data: {
        cart: updatedCart,
        stores: summary.stores,
        summary
      }
    });
  } catch (error) {
    console.error('Error removing coupon:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

async function validateCart(req, res) {
  try {
    const body = req.body || {};
    const customerId = body.customer_id || req.query.customer_id || null;
    const sessionToken = body.session_token || req.query.session_token || req.headers['x-session-token'] || 'guest-session';
    const deliverySpeed = body.delivery_speed || req.query.delivery_speed || 'EXPRESS_30M';
    const couponCode = body.coupon_code || req.query.coupon_code || null;

    let targetCartId = body.cart_id;
    if (!targetCartId) {
      const cart = await cartService.getOrCreateCart({ customerId, sessionToken });
      targetCartId = cart.id;
    }

    const validationResult = await checkoutService.validateCartStock(targetCartId, {
      deliverySpeed,
      couponCode,
      expectedSubtotal: body.expected_subtotal ?? body.client_subtotal,
      expectedTotal: body.expected_total ?? body.client_total,
      clientItems: body.client_items || body.items
    });

    return res.json({
      status: validationResult.isValid ? 'success' : 'fail',
      data: validationResult
    });
  } catch (error) {
    console.error('Error validating cart stock and pricing:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

async function mergeCart(req, res) {
  try {
    const { customerId, sessionToken } = resolveSession(req);

    if (!customerId) {
      return res.status(400).json({
        status: 'error',
        message: 'customer_id is required to claim or merge a guest cart'
      });
    }

    if (!sessionToken) {
      return res.status(400).json({
        status: 'error',
        message: 'session_token or x-session-token header is required to merge a guest cart'
      });
    }

    const cart = await cartService.getOrCreateCart({ customerId, sessionToken });
    const items = await cartService.getCartItems(cart.id);
    const summary = await checkoutService.calculateCheckoutPreview(cart.id, {
      deliverySpeed: cart.delivery_speed || 'EXPRESS_30M',
      couponCode: cart.coupon_code || null
    });

    res.setHeader('X-Session-Token', cart.session_token);
    return res.json({
      status: 'success',
      message: 'Guest cart items successfully linked to customer profile',
      data: {
        cart,
        items,
        stores: summary.stores,
        summary
      }
    });
  } catch (error) {
    console.error('Error merging cart:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

async function getAvailableCoupons(req, res) {
  try {
    const sessionToken = req.headers['x-session-token'] || req.query.session_token || 'guest-session';
    const customerId = req.query.customer_id;
    const cart = await cartService.getOrCreateCart({ customerId, sessionToken });
    const items = await cartService.getCartItems(cart.id);
    const subtotal = items.reduce((sum, it) => sum + (Number(it.sell_price) * Number(it.quantity)), 0);

    const coupons = await checkoutService.getAvailableCoupons({ subtotal });
    return res.json({
      status: 'success',
      data: {
        coupons,
        current_subtotal: subtotal
      }
    });
  } catch (error) {
    console.error('Error fetching available coupons:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  validateCart,
  getCartSummary,
  applyCoupon,
  removeCoupon,
  getAvailableCoupons,
  mergeCart
};
