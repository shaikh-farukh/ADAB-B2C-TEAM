const cartService = require('../services/cartService');
const checkoutService = require('../services/checkoutService');
const orderService = require('../services/orderService');
const paymentAdapter = require('../services/paymentAdapter');
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
      couponCode: coupon_code || undefined
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
      couponCode: coupon_code || undefined
    });

    return res.status(201).json({
      status: 'success',
      message: 'Order placed successfully',
      data: {
        order_id: order.id,
        order_number: order.order_number,
        payment_id: order.payment ? order.payment.id : null,
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

/**
 * POST /api/v1/checkout/payment-intent
 * Initializes payment session with amount, currency (INR), and receipt IDs
 * Decoupled through paymentAdapter (supports mock, razorpay, etc.)
 */
async function createPaymentIntent(req, res) {
  try {
    const {
      cart_id,
      customer_id,
      session_token,
      amount,
      currency = 'INR',
      delivery_speed = 'EXPRESS_30M',
      coupon_code = null,
      payment_method = 'UPI',
      customer_name,
      customer_phone,
      customer_email,
      receipt = null,
      provider = null
    } = req.body;

    let targetCartId = cart_id;
    let preview = null;
    let finalAmount = 0;

    // 1. If cart_id or session token is available, resolve cart and calculate authoritative total
    const token = session_token || req.headers['x-session-token'];
    if (targetCartId || token || customer_id) {
      if (!targetCartId) {
        const cart = await cartService.getOrCreateCart({
          customerId: customer_id,
          sessionToken: token || 'guest-session'
        });
        targetCartId = cart.id;
      }

      const cartItems = await cartService.getCartItems(targetCartId);
      if (!cartItems || cartItems.length === 0) {
        if (!amount) {
          return res.status(400).json({
            status: 'error',
            message: 'Your cart is empty. Please add items before initializing payment.'
          });
        }
      } else {
        // Re-check preview & stock boundaries server-side
        preview = await checkoutService.calculateCheckoutPreview(targetCartId, {
          deliverySpeed: delivery_speed,
          couponCode: coupon_code
        });

        if (!preview.stock_validation.is_valid) {
          const issue = preview.stock_validation.issues[0];
          return res.status(400).json({
            status: 'error',
            message: `Cannot initialize payment: ${issue.message || 'Stock validation failed'}`
          });
        }

        finalAmount = Number(preview.pricing.grand_total);
      }
    }

    // If no cart total was resolved, fall back to explicit amount passed in request
    if (finalAmount <= 0) {
      if (amount && Number(amount) > 0) {
        finalAmount = Number(amount);
      } else {
        return res.status(400).json({
          status: 'error',
          message: 'A valid amount > 0 or a non-empty cart is required to create a payment intent.'
        });
      }
    }

    // 2. Generate receipt identifier
    const receiptId = receipt || `rcpt_${targetCartId ? targetCartId.slice(0, 8) : Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Delegate to payment abstraction adapter
    const intent = await paymentAdapter.createPaymentIntent({
      amount: finalAmount,
      currency: currency || 'INR',
      receipt: receiptId,
      paymentMethod: payment_method,
      customer: {
        id: customer_id || null,
        name: customer_name,
        phone: customer_phone,
        email: customer_email
      },
      metadata: {
        cart_id: targetCartId || null,
        delivery_speed,
        coupon_code,
        item_count: preview ? preview.item_count : 1
      }
    }, provider);

    return res.status(200).json({
      status: 'success',
      message: 'Payment intent created successfully',
      data: intent
    });
  } catch (error) {
    console.error('Error creating payment intent:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

/**
 * GET /api/v1/checkout/delivery-slots
 * Returns available delivery slots for inspection
 */
async function getDeliverySlots(req, res) {
  try {
    const { zone_id, store_id, date } = req.query;
    const slots = await checkoutService.getDeliverySlots({
      zoneId: zone_id || null,
      storeId: store_id || null,
      date: date || null
    });

    return res.json({
      status: 'success',
      data: slots
    });
  } catch (error) {
    console.error('Error fetching delivery slots:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

/**
 * POST or GET /api/v1/checkout/serviceability
 * Inspects whether the delivery address / pincode is serviceable
 */
async function checkServiceability(req, res) {
  try {
    const body = req.method === 'POST' ? req.body : req.query;
    const { pincode, address_line, store_id, cart_id } = body;

    const serviceability = await checkoutService.checkServiceability({
      pincode,
      addressLine: address_line,
      storeId: store_id,
      cartId: cart_id
    });

    return res.json({
      status: 'success',
      data: serviceability
    });
  } catch (error) {
    console.error('Error checking checkout serviceability:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

module.exports = {
  previewCheckout,
  placeOrder,
  createPaymentIntent,
  getDeliverySlots,
  checkServiceability
};


