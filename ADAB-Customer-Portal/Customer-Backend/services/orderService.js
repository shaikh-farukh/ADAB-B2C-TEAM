const pool = require('../db');
const { calculateCheckoutPreview } = require('./checkoutService');

/**
 * Normalizes payment methods to match orders_payment_method_check constraint
 */
function normalizePaymentMethod(method) {
  if (!method) return 'UPI';
  const m = method.toUpperCase();
  if (m === 'COD' || m.includes('CASH')) return 'CASH_ON_DELIVERY';
  if (m.includes('CARD')) return 'CARD';
  if (m.includes('WALLET')) return 'WALLET';
  if (m.includes('NET') || m.includes('BANK')) return 'NET_BANKING';
  if (m.includes('BNPL') || m.includes('LATER')) return 'ADAB_PAY_LATER';
  if (m.includes('14D')) return 'CREDIT_14D';
  return 'UPI';
}

function normalizeDeliveryMode(mode) {
  if (!mode) return 'EXPRESS_30M';
  const s = mode.toLowerCase();
  if (s.includes('same')) return 'SAME_DAY';
  if (s.includes('pickup') || s.includes('store')) return 'STORE_PICKUP';
  return 'EXPRESS_30M';
}

// Find or create customer user (to satisfy orders.customer_id FK to users)
async function getOrCreateCustomerUser(client, { customerId, customerName, customerPhone, customerEmail }) {
  if (customerId) {
    const res = await client.query(`SELECT id, full_name, phone FROM users WHERE id = $1`, [customerId]);
    if (res.rows.length > 0) return res.rows[0];
  }

  const phone = customerPhone || '+919876512340';
  const name = customerName || 'Pooja Sharma';
  const email = customerEmail || `customer_${Date.now()}@adab.com`;

  // Look for existing user by phone
  const existingByPhone = await client.query(`SELECT id, full_name, phone FROM users WHERE phone = $1 LIMIT 1`, [phone]);
  if (existingByPhone.rows.length > 0) {
    return existingByPhone.rows[0];
  }

  // Insert a new user of type 'CUSTOMER'
  const insertUser = await client.query(
    `INSERT INTO users (email, phone, password_hash, full_name, user_type, status, is_phone_verified, is_email_verified)
     VALUES ($1, $2, 'otp_verified_guest', $3, 'CUSTOMER', 'ACTIVE', true, false)
     RETURNING id, full_name, phone`,
    [email, phone, name]
  );

  return insertUser.rows[0];
}

// Place a new order from an existing cart inside a transactional boundary
async function createOrderFromCart({
  cartId,
  customerId = null,
  customerName = null,
  customerPhone = null,
  customerEmail = null,
  deliveryAddress = {},
  deliverySpeed = 'EXPRESS_30M',
  paymentMethod = 'UPI',
  couponCode = null
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Resolve customer user
    const customerUser = await getOrCreateCustomerUser(client, {
      customerId,
      customerName,
      customerPhone,
      customerEmail
    });

    // 2. Calculate preview and validate items
    const preview = await calculateCheckoutPreview(cartId, { deliverySpeed, couponCode });
    if (!preview.items || preview.items.length === 0) {
      throw new Error('Cart is empty. Cannot place an order.');
    }

    if (!preview.stock_validation.is_valid) {
      const issue = preview.stock_validation.issues[0];
      throw new Error(`Insufficient stock for "${issue.name}". Available: ${issue.available_stock}, Requested: ${issue.requested_qty}`);
    }

    const orderNumber = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
    const dbDeliveryMode = normalizeDeliveryMode(deliverySpeed);
    const dbPaymentMethod = normalizePaymentMethod(paymentMethod);
    const etaMinutes = dbDeliveryMode === 'EXPRESS_30M' ? 25 : dbDeliveryMode === 'SAME_DAY' ? 180 : 1440;
    const isCod = dbPaymentMethod === 'CASH_ON_DELIVERY';

    // 3. Insert parent order into orders
    const orderInsertQuery = `
      INSERT INTO orders (
        order_number,
        customer_id,
        delivery_address,
        delivery_mode,
        total_mrp,
        total_discount,
        delivery_fee,
        grand_total,
        payment_method,
        payment_status,
        order_status,
        eta_minutes,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `;

    const orderValues = [
      orderNumber,
      customerUser.id,
      JSON.stringify(deliveryAddress),
      dbDeliveryMode,
      preview.pricing.total_mrp,
      preview.pricing.discount,
      preview.pricing.delivery_fee,
      preview.pricing.grand_total,
      dbPaymentMethod,
      isCod ? 'PENDING' : 'PAID',
      'PLACED',
      etaMinutes
    ];

    const orderRes = await client.query(orderInsertQuery, orderValues);
    const order = orderRes.rows[0];

    // 4. Create multi-seller order split
    const itemsByStore = {};
    for (const item of preview.items) {
      const storeId = item.store_id;
      if (!itemsByStore[storeId]) {
        itemsByStore[storeId] = [];
      }
      itemsByStore[storeId].push(item);
    }

    const sellerOrders = [];

    for (const storeId of Object.keys(itemsByStore)) {
      const storeItems = itemsByStore[storeId];
      const storeSubtotal = storeItems.reduce((sum, it) => sum + (Number(it.sell_price) * Number(it.quantity)), 0);
      const commissionFee = Math.round(storeSubtotal * 0.02 * 100) / 100;
      const sellerPayout = storeSubtotal - commissionFee;

      const sellerOrderRes = await client.query(
        `INSERT INTO seller_orders (
          parent_order_id,
          store_id,
          subtotal,
          commission_fee,
          seller_payout_amount,
          status,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, 'NEW', NOW())
        RETURNING *`,
        [order.id, storeId, storeSubtotal, commissionFee, sellerPayout]
      );

      const sellerOrder = sellerOrderRes.rows[0];
      sellerOrder.items = [];

      // 5. Insert line items and deduct stock from seller_listings
      for (const item of storeItems) {
        const lineTotal = Number(item.sell_price) * Number(item.quantity);
        const itemRes = await client.query(
          `INSERT INTO order_items (
            seller_order_id,
            listing_id,
            product_name,
            quantity,
            unit_price,
            total_price
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *`,
          [sellerOrder.id, item.listing_id, item.product_name, item.quantity, item.sell_price, lineTotal]
        );
        sellerOrder.items.push(itemRes.rows[0]);

        // Deduct stock safely
        await client.query(
          `UPDATE seller_listings 
           SET stock_qty = GREATEST(0, stock_qty - $1), updated_at = NOW() 
           WHERE id = $2`,
          [Number(item.quantity), item.listing_id]
        );
      }

      sellerOrders.push(sellerOrder);
    }

    // 6. Record payment in payments table
    await client.query(
      `INSERT INTO payments (
        order_id,
        user_id,
        amount,
        currency,
        payment_method,
        status,
        created_at
      )
      VALUES ($1, $2, $3, 'INR', $4, $5, NOW())`,
      [
        order.id,
        customerUser.id,
        preview.pricing.grand_total,
        dbPaymentMethod,
        isCod ? 'PENDING' : 'SUCCESS'
      ]
    );

    // 7. Clear the cart
    await client.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);

    await client.query('COMMIT');

    order.seller_orders = sellerOrders;
    order.items = preview.items;
    order.pricing = preview.pricing;
    order.customer = customerUser;

    return order;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Fetch all orders for a customer
async function getCustomerOrders(customerId = null) {
  let query = `
    SELECT 
      o.*,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', so.id,
            'store_id', so.store_id,
            'subtotal', so.subtotal,
            'status', so.status
          )
        ) FILTER (WHERE so.id IS NOT NULL), '[]'
      ) AS seller_orders
    FROM orders o
    LEFT JOIN seller_orders so ON so.parent_order_id = o.id
    WHERE 1=1
  `;
  const params = [];
  if (customerId) {
    query += ` AND o.customer_id = $1`;
    params.push(customerId);
  }
  query += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT 20`;

  const res = await pool.query(query, params);
  return res.rows;
}

// Fetch single order details with items and tracking
async function getOrderById(orderId) {
  const orderRes = await pool.query(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  if (orderRes.rows.length === 0) return null;

  const order = orderRes.rows[0];

  const sellerOrdersRes = await pool.query(
    `SELECT so.*, s.store_name, s.category AS store_category 
     FROM seller_orders so
     LEFT JOIN stores s ON so.store_id = s.id
     WHERE so.parent_order_id = $1`,
    [orderId]
  );

  const itemsRes = await pool.query(
    `SELECT oi.*, sl.title AS product_name, sl.mrp, sl.sell_price 
     FROM order_items oi
     JOIN seller_orders so ON oi.seller_order_id = so.id
     LEFT JOIN seller_listings sl ON oi.listing_id = sl.id
     WHERE so.parent_order_id = $1`,
    [orderId]
  );

  order.seller_orders = sellerOrdersRes.rows;
  order.items = itemsRes.rows;
  return order;
}

module.exports = {
  normalizePaymentMethod,
  normalizeDeliveryMode,
  createOrderFromCart,
  getCustomerOrders,
  getOrderById
};
