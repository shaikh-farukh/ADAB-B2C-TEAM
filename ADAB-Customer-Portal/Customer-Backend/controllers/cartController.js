const cartService = require('../services/cartService');
const checkoutService = require('../services/checkoutService');
const { formatError, validatePositiveQuantity } = require('../utils/errorHandler');

/**
 * Cart Controller with robust validation and error handling
 */

async function getCart(req, res) {
  try {
    const customerId = req.query.customer_id || null;
    const sessionToken = req.query.session_token || req.headers['x-session-token'] || 'guest-session';

    const cart = await cartService.getOrCreateCart({ customerId, sessionToken });
    const items = await cartService.getCartItems(cart.id);
    const summary = await checkoutService.calculateCheckoutPreview(cart.id, {
      deliverySpeed: cart.delivery_speed || 'EXPRESS_30M',
      couponCode: cart.coupon_code || null
    });

    return res.json({
      status: 'success',
      data: {
        cart,
        items,
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
    const { listing_id, quantity = 1, customer_id, session_token } = req.body;
    
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

    const token = session_token || req.headers['x-session-token'] || 'guest-session';
    const cart = await cartService.getOrCreateCart({ customerId: customer_id, sessionToken: token });

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
    return res.json({
      status: 'success',
      message: 'Cart item updated',
      data: updated
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
    return res.json({
      status: 'success',
      message: 'Item removed from cart',
      data: deleted
    });
  } catch (error) {
    console.error('Error removing cart item:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

async function getCartSummary(req, res) {
  try {
    const customerId = req.query.customer_id || null;
    const sessionToken = req.query.session_token || req.headers['x-session-token'] || 'guest-session';
    const deliverySpeed = req.query.delivery_speed || 'EXPRESS_30M';
    const couponCode = req.query.coupon_code || null;

    const cart = await cartService.getOrCreateCart({ customerId, sessionToken });
    const summary = await checkoutService.calculateCheckoutPreview(cart.id, {
      deliverySpeed,
      couponCode: couponCode || cart.coupon_code
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
    const { coupon_code, cart_id, customer_id, session_token } = req.body;
    if (!coupon_code || typeof coupon_code !== 'string' || coupon_code.trim() === '') {
      return res.status(400).json({ status: 'error', message: 'A valid coupon_code string is required' });
    }

    let targetCartId = cart_id;
    if (!targetCartId) {
      const cart = await cartService.getOrCreateCart({
        customerId: customer_id,
        sessionToken: session_token || req.headers['x-session-token'] || 'guest-session'
      });
      targetCartId = cart.id;
    }

    const updatedCart = await cartService.applyCartCoupon(targetCartId, coupon_code.toUpperCase().trim());
    const summary = await checkoutService.calculateCheckoutPreview(targetCartId, {
      deliverySpeed: updatedCart.delivery_speed || 'EXPRESS_30M',
      couponCode: updatedCart.coupon_code
    });

    return res.json({
      status: 'success',
      message: `Coupon ${coupon_code.toUpperCase().trim()} applied`,
      data: {
        cart: updatedCart,
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

    const updatedCart = await cartService.removeCartCoupon(targetCartId);
    const summary = await checkoutService.calculateCheckoutPreview(targetCartId, {
      deliverySpeed: updatedCart.delivery_speed || 'EXPRESS_30M',
      couponCode: null
    });

    return res.json({
      status: 'success',
      message: 'Coupon removed',
      data: {
        cart: updatedCart,
        summary
      }
    });
  } catch (error) {
    console.error('Error removing coupon:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  getCartSummary,
  applyCoupon,
  removeCoupon
};
