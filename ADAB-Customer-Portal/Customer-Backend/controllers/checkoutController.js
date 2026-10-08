const cartService = require('../services/cartService');
const checkoutService = require('../services/checkoutService');
const orderService = require('../services/orderService');
const { formatError } = require('../utils/errorHandler');

/**
 * Checkout Controller with empty-cart guards and structured error handling
 */

/**
 * POST /api/v1/checkout/preview
 * Validates stock, calculates delivery fees & discounts, and returns full bill breakdown
 */
async function previewCheckout(req, res) {
  try {
    const {
      cart_id,
      customer_id,
      session_token,
      delivery_speed = 'EXPRESS_30M',
      coupon_code = null
    } = req.body;

    let targetCartId = cart_id;
    if (!targetCartId) {
      const token = session_token || req.headers['x-session-token'] || 'guest-session';
      const cart = await cartService.getOrCreateCart({
        customerId: customer_id,
        sessionToken: token
      });
      targetCartId = cart.id;
    }

    const preview = await checkoutService.calculateCheckoutPreview(targetCartId, {
      deliverySpeed: delivery_speed,
      couponCode: coupon_code
    });

    // Guard: Empty cart
    if (preview.item_count === 0 || !preview.items || preview.items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Your cart is empty. Please add items to preview checkout.'
      });
    }

    return res.json({
      status: 'success',
      data: preview
    });
  } catch (error) {
    console.error('Error previewing checkout:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

/**
 * POST /api/v1/checkout/place-order
 * Validates cart content, address, payment method, and places order
 */
async function placeOrder(req, res) {
  try {
    const {
      cart_id,
      customer_id,
      session_token,
      customer_name,
      customer_phone,
      customer_email,
      delivery_address,
      delivery_speed = 'EXPRESS_30M',
      payment_method = 'UPI',
      coupon_code = null
    } = req.body;

    let targetCartId = cart_id;
    if (!targetCartId) {
      const token = session_token || req.headers['x-session-token'] || 'guest-session';
      const cart = await cartService.getOrCreateCart({
        customerId: customer_id,
        sessionToken: token
      });
      targetCartId = cart.id;
    }

    // 1. Guard: Check if cart has items before attempting transaction
    const cartItems = await cartService.getCartItems(targetCartId);
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot place an order with an empty cart. Please add items to your cart first.'
      });
    }

    // 2. Guard: Delivery address validation
    if (!delivery_address || typeof delivery_address !== 'object') {
      return res.status(400).json({
        status: 'error',
        message: 'A valid delivery address is required to place an order.'
      });
    }

    const addrLine = delivery_address.address_line || delivery_address.address;
    if (!addrLine || typeof addrLine !== 'string' || addrLine.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Delivery address line cannot be empty.'
      });
    }

    // 3. Process order in database transaction
    const order = await orderService.createOrderFromCart({
      cartId: targetCartId,
      customerId: customer_id || null,
      customerName: customer_name,
      customerPhone: customer_phone,
      customerEmail: customer_email,
      deliveryAddress: delivery_address,
      deliverySpeed: delivery_speed,
      paymentMethod: payment_method,
      couponCode: coupon_code
    });

    return res.status(201).json({
      status: 'success',
      message: 'Order placed successfully',
      data: {
        order_id: order.id,
        order_number: order.order_number,
        order_status: order.order_status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        delivery_mode: order.delivery_mode,
        eta_minutes: order.eta_minutes,
        grand_total: order.grand_total,
        total_mrp: order.total_mrp,
        delivery_fee: order.delivery_fee,
        delivery_address: order.delivery_address,
        seller_orders_count: order.seller_orders ? order.seller_orders.length : 0,
        seller_orders: order.seller_orders,
        created_at: order.created_at
      }
    });
  } catch (error) {
    console.error('Error placing order:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

module.exports = {
  previewCheckout,
  placeOrder
};
