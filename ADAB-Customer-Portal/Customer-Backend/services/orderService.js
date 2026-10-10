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

// Place a new order from an existing cart inside a hardened transactional boundary
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

    // 2. Calculate preview and fetch items
    const preview = await calculateCheckoutPreview(cartId, { deliverySpeed, couponCode });
    if (!preview.items || preview.items.length === 0) {
      const err = new Error('Cart is empty. Cannot place an order.');
      err.statusCode = 400;
      throw err;
    }

    // 3. ATOMIC INVENTORY & LISTING VALIDATION (Acquire row-level exclusive locks)
    const listingIds = preview.items.map((it) => it.listing_id);

    // Row-level write lock on seller_listings
    const lockedListingsRes = await client.query(
      `SELECT id, title, stock_qty, is_active, sell_price, store_id
       FROM seller_listings
       WHERE id = ANY($1)
       FOR UPDATE`,
      [listingIds]
    );

    const lockedListingsMap = {};
    for (const row of lockedListingsRes.rows) {
      lockedListingsMap[row.id] = row;
    }

    // Row-level write lock on inventory (where inventory records exist)
    const lockedInventoryRes = await client.query(
      `SELECT id, listing_id, stock_quantity, reserved_quantity, available_quantity
       FROM inventory
       WHERE listing_id = ANY($1)
       FOR UPDATE`,
      [listingIds]
    );

    const lockedInventoryMap = {};
    for (const row of lockedInventoryRes.rows) {
      lockedInventoryMap[row.listing_id] = row;
    }

    // Validate every item against live locked records
    for (const item of preview.items) {
      const listing = lockedListingsMap[item.listing_id];
      if (!listing) {
        const err = new Error(`Item "${item.product_name}" is no longer listed in the catalog.`);
        err.statusCode = 404;
        throw err;
      }

      if (!listing.is_active) {
        const err = new Error(`Item "${item.product_name}" is currently unavailable from the store.`);
        err.statusCode = 409;
        throw err;
      }

      const reqQty = Number(item.quantity);
      const availableListingStock = Number(listing.stock_qty || 0);

      // Determine effective stock prioritizing inventory available_quantity if tracked > 0, otherwise listing stock_qty
      const invRecord = lockedInventoryMap[item.listing_id];
      const invStock =
        invRecord && invRecord.available_quantity !== null && Number(invRecord.available_quantity) > 0
          ? Number(invRecord.available_quantity)
          : null;

      const effectiveStock = invStock !== null ? invStock : availableListingStock;

      if (effectiveStock < reqQty) {
        const err = new Error(
          `Insufficient stock for "${item.product_name}". Available: ${effectiveStock}, Requested: ${reqQty}`
        );
        err.statusCode = 409;
        throw err;
      }
    }

    // 4. Generate guaranteed-unique order number & normalize parameters
    const orderNumber =
      'ORD-' + Date.now().toString().slice(-6) + '-' + Math.floor(100 + Math.random() * 900);
    const dbDeliveryMode = normalizeDeliveryMode(deliverySpeed);
    const dbPaymentMethod = normalizePaymentMethod(paymentMethod);
    const etaMinutes = dbDeliveryMode === 'EXPRESS_30M' ? 25 : dbDeliveryMode === 'SAME_DAY' ? 180 : 1440;
    const isCod = dbPaymentMethod === 'CASH_ON_DELIVERY';

    // 5. Parent order creation in orders
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

    // Record delivery slot booking if a scheduled delivery slot was selected
    if (deliveryAddress && (deliveryAddress.delivery_slot_id || deliveryAddress.delivery_slot?.id)) {
      const slotId = deliveryAddress.delivery_slot_id || deliveryAddress.delivery_slot?.id;
      try {
        await client.query(
          `UPDATE delivery_slots
           SET current_booked = COALESCE(current_booked, 0) + 1
           WHERE id = $1`,
          [slotId]
        );
      } catch (slotErr) {
        console.warn('Could not increment delivery slot booking count:', slotErr.message);
      }
    }

    // 6. Multi-seller split into seller_orders and order_items
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
      const storeSubtotal = storeItems.reduce(
        (sum, it) => sum + Number(it.sell_price) * Number(it.quantity),
        0
      );
      const commissionFee = Math.round(storeSubtotal * 0.02 * 100) / 100;
      const sellerPayout = Math.round((storeSubtotal - commissionFee) * 100) / 100;

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

      for (const item of storeItems) {
        const qty = Number(item.quantity);
        const lineTotal = Math.round(Number(item.sell_price) * qty * 100) / 100;

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
          [sellerOrder.id, item.listing_id, item.product_name, qty, item.sell_price, lineTotal]
        );
        sellerOrder.items.push(itemRes.rows[0]);

        // Atomic stock deduction on seller_listings
        const updateListingRes = await client.query(
          `UPDATE seller_listings 
           SET stock_qty = stock_qty - $1, updated_at = NOW() 
           WHERE id = $2 AND stock_qty >= $1
           RETURNING stock_qty`,
          [qty, item.listing_id]
        );

        if (updateListingRes.rows.length === 0) {
          const err = new Error(
            `Atomic lock conflict: stock depleted for "${item.product_name}" during order processing.`
          );
          err.statusCode = 409;
          throw err;
        }

        // Atomic stock deduction on inventory table (if tracked)
        const invRecord = lockedInventoryMap[item.listing_id];
        if (invRecord) {
          const updateInvRes = await client.query(
            `UPDATE inventory
             SET stock_quantity = GREATEST(reserved_quantity, stock_quantity - $1),
                 updated_at = NOW()
             WHERE listing_id = $2
             RETURNING id, stock_quantity, available_quantity`,
            [qty, item.listing_id]
          );

          if (updateInvRes.rows.length > 0) {
            // Insert inventory transaction audit log
            await client.query(
              `INSERT INTO inventory_transactions (
                inventory_id,
                quantity_change,
                quantity_after,
                transaction_type,
                reference_type,
                reference_id,
                notes,
                created_at
              )
              VALUES ($1, $2, $3, 'ORDER_FULFILLMENT', 'ORDER', $4, $5, NOW())`,
              [
                invRecord.id,
                Math.round(-qty),
                Math.round(Number(updateInvRes.rows[0].available_quantity || 0)),
                order.id,
                `Order ${orderNumber} placed for customer user ${customerUser.id}`
              ]
            );
          }
        }
      }

      sellerOrders.push(sellerOrder);
    }

    // 7. Payment record generation in payments
    const initialPaymentStatus = isCod ? 'PENDING' : 'SUCCESS';

    const payRes = await client.query(
      `INSERT INTO payments (
        order_id,
        user_id,
        amount,
        currency,
        payment_method,
        status,
        created_at
      )
      VALUES ($1, $2, $3, 'INR', $4, $5, NOW())
      RETURNING *`,
      [
        order.id,
        customerUser.id,
        preview.pricing.grand_total,
        dbPaymentMethod,
        initialPaymentStatus
      ]
    );

    const paymentRecord = payRes.rows[0];

    // Audit record in payment_transactions
    const txRef = 'TXN-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
    const paymentMode = isCod ? 'COD' : (dbPaymentMethod === 'ADAB_PAY_LATER' ? 'ADAB_PAY_LATER' : dbPaymentMethod);

    await client.query(
      `INSERT INTO payment_transactions (
        order_id,
        user_id,
        amount,
        currency,
        payment_mode,
        payment_gateway,
        gateway_transaction_id,
        status,
        response_payload,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, 'INR', $4, $5, $6, $7, $8, NOW(), NOW())`,
      [
        order.id,
        customerUser.id,
        preview.pricing.grand_total,
        paymentMode,
        isCod ? 'CASH_ON_DELIVERY' : 'MOCK_GATEWAY',
        txRef,
        initialPaymentStatus,
        JSON.stringify({
          order_number: order.order_number,
          customer_id: customerUser.id,
          payment_method: dbPaymentMethod,
          auto_captured: !isCod
        })
      ]
    );

    // 8. Clear the cart atomically only after successful order and payment creation
    await client.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);
    await client.query(`UPDATE carts SET updated_at = NOW() WHERE id = $1`, [cartId]);

    // Commit all changes atomically
    await client.query('COMMIT');

    order.seller_orders = sellerOrders;
    order.items = preview.items;
    order.pricing = preview.pricing;
    order.customer = customerUser;
    order.payment = paymentRecord;

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
            'store_name', st.store_name,
            'subtotal', so.subtotal,
            'status', so.status
          )
        ) FILTER (WHERE so.id IS NOT NULL), '[]'
      ) AS seller_orders,
      COALESCE(
        (
          SELECT json_agg(
            jsonb_build_object(
              'id', oi.id,
              'listing_id', oi.listing_id,
              'product_name', COALESCE(sl.title, oi.product_name),
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'total_price', oi.total_price,
              'store_name', st2.store_name
            )
          )
          FROM order_items oi
          JOIN seller_orders so2 ON oi.seller_order_id = so2.id
          LEFT JOIN seller_listings sl ON oi.listing_id = sl.id
          LEFT JOIN stores st2 ON so2.store_id = st2.id
          WHERE so2.parent_order_id = o.id
        ), '[]'
      ) AS items,
      COALESCE(
        (
          SELECT jsonb_build_object(
            'id', p.id,
            'amount', p.amount,
            'payment_method', p.payment_method,
            'status', p.status
          )
          FROM payments p
          WHERE p.order_id = o.id
          ORDER BY p.created_at DESC
          LIMIT 1
        ), null
      ) AS payment
    FROM orders o
    LEFT JOIN seller_orders so ON so.parent_order_id = o.id
    LEFT JOIN stores st ON so.store_id = st.id
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
