const pool = require('../db');
const { calculateCheckoutPreview } = require('./checkoutService');
const { smartGeocode, resolveCoordinatesSync } = require('./geocodingService');

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
  if (m.includes('ONLINE')) return 'CARD';
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
  // 1. Look for existing user by UUID if provided
  if (customerId) {
    const res = await client.query(`SELECT id, full_name, phone, email FROM users WHERE id = $1 LIMIT 1`, [customerId]);
    if (res.rows.length > 0) return res.rows[0];
  }

  // 2. Look for existing user by email if provided
  const emailCandidate = (customerEmail || '').trim().toLowerCase();
  if (emailCandidate) {
    const resByEmail = await client.query(
      `SELECT id, full_name, phone, email FROM users WHERE LOWER(email) = $1 LIMIT 1`,
      [emailCandidate]
    );
    if (resByEmail.rows.length > 0) {
      return resByEmail.rows[0];
    }
  }

  // 3. Look for existing user by phone (with flexible matching for +91 / 10 digits)
  const rawPhone = (customerPhone || '').trim();
  const digits = rawPhone ? rawPhone.replace(/[^0-9]/g, '') : '';
  const last10 = digits.slice(-10);

  if (rawPhone) {
    const resByPhone = await client.query(
      `SELECT id, full_name, phone, email FROM users
       WHERE phone = $1
          OR phone = $2
          OR phone = $3
          OR (LENGTH($4) >= 10 AND phone LIKE $5)
       LIMIT 1`,
      [rawPhone, `+91${last10}`, last10, last10, `%${last10}`]
    );
    if (resByPhone.rows.length > 0) {
      return resByPhone.rows[0];
    }
  }

  // 4. Fallback to existing default customer if email is default customer@adab.com or general guest
  const defaultUserRes = await client.query(
    `SELECT id, full_name, phone, email FROM users
     WHERE LOWER(email) = 'customer@adab.com' OR user_type = 'CUSTOMER'
     ORDER BY created_at ASC LIMIT 1`
  );
  if (defaultUserRes.rows.length > 0 && (!emailCandidate || emailCandidate === 'customer@adab.com')) {
    return defaultUserRes.rows[0];
  }

  // 5. If truly a new customer without matching record, create a guest user
  const name = customerName || 'Adab Customer';
  const phoneToInsert = rawPhone && rawPhone.startsWith('+') ? rawPhone : (last10 ? `+91${last10}` : `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`);
  
  let emailToInsert = emailCandidate;
  if (!emailToInsert || emailToInsert === 'customer@adab.com') {
    emailToInsert = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@adab.com`;
  }

  try {
    const insertUser = await client.query(
      `INSERT INTO users (email, phone, password_hash, full_name, user_type, status, is_phone_verified, is_email_verified)
       VALUES ($1, $2, 'otp_verified_guest', $3, 'CUSTOMER', 'ACTIVE', true, false)
       RETURNING id, full_name, phone, email`,
      [emailToInsert, phoneToInsert, name]
    );

    const createdUser = insertUser.rows[0];

    // Ensure customer profile exists
    try {
      await client.query(
        `INSERT INTO customer_profiles (user_id, loyalty_tier, preferred_language)
         VALUES ($1, 'BRONZE', 'en')
         ON CONFLICT (user_id) DO NOTHING`,
        [createdUser.id]
      );
    } catch {}

    return createdUser;
  } catch (err) {
    if (err.code === '23505') {
      // Conflict on email or phone: retrieve the conflicting user record
      const conflictRes = await client.query(
        `SELECT id, full_name, phone, email FROM users
         WHERE LOWER(email) = LOWER($1) OR phone = $2 OR (LENGTH($3) >= 10 AND phone LIKE $4)
         LIMIT 1`,
        [emailToInsert, phoneToInsert, last10, `%${last10}`]
      );
      if (conflictRes.rows.length > 0) {
        return conflictRes.rows[0];
      }
      if (defaultUserRes.rows.length > 0) {
        return defaultUserRes.rows[0];
      }
    }
    throw err;
  }
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
  couponCode = null,
  pointsRedeemed = 0
}) {
  let client = await pool.connect();
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
      'ORD-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
    const dbDeliveryMode = normalizeDeliveryMode(deliverySpeed);
    const dbPaymentMethod = normalizePaymentMethod(paymentMethod);
    const etaMinutes = dbDeliveryMode === 'STORE_PICKUP' ? 15 : (dbDeliveryMode === 'SAME_DAY' ? 60 : 25);
    const isCod = dbPaymentMethod === 'CASH_ON_DELIVERY';

    // Ensure delivery address has exact physical coordinates before saving
    let finalDeliveryAddress = { ...(deliveryAddress || {}) };
    if (!finalDeliveryAddress.latitude || !finalDeliveryAddress.longitude || isNaN(Number(finalDeliveryAddress.latitude)) || isNaN(Number(finalDeliveryAddress.longitude))) {
      try {
        const resolvedGeo = await smartGeocode(finalDeliveryAddress);
        finalDeliveryAddress.latitude = resolvedGeo.latitude;
        finalDeliveryAddress.longitude = resolvedGeo.longitude;
      } catch (geoErr) {
        console.warn('Geocoding in createOrderFromCart fallback:', geoErr.message);
      }
    }

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

    const numPointsRedeemed = Math.max(0, parseInt(pointsRedeemed || 0, 10));
    let pointsDiscount = 0;
    if (numPointsRedeemed > 0) {
      pointsDiscount = Math.min(numPointsRedeemed, Number(preview.pricing.grand_total));
    }
    const finalDiscount = Math.round((Number(preview.pricing.discount || 0) + pointsDiscount) * 100) / 100;
    const finalGrandTotal = Math.max(0, Math.round((Number(preview.pricing.grand_total) - pointsDiscount) * 100) / 100);

    const orderValues = [
      orderNumber,
      customerUser.id,
      JSON.stringify(finalDeliveryAddress),
      dbDeliveryMode,
      preview.pricing.total_mrp,
      finalDiscount,
      preview.pricing.delivery_fee,
      finalGrandTotal,
      dbPaymentMethod,
      'PENDING',
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
        let invRecord = lockedInventoryMap[item.listing_id];
        let inventoryId = invRecord ? invRecord.id : null;

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
            inventoryId = updateInvRes.rows[0].id;
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
              VALUES ($1, $2, $3, 'ORDER_FULFILL', 'ORDER', $4, $5, NOW())`,
              [
                invRecord.id,
                Math.round(-qty),
                Math.round(Number(updateInvRes.rows[0].available_quantity || 0)),
                order.id,
                `Order ${orderNumber} placed for customer user ${customerUser.id}`
              ]
            );
          }
        } else {
          // If no inventory row existed yet, lazily create one so reservations & audit trail are tracked
          try {
            const currentListing = lockedListingsMap[item.listing_id];
            const currentListingStock = currentListing ? Number(currentListing.stock_qty || 0) : 0;
            const createInvRes = await client.query(
              `INSERT INTO inventory (listing_id, stock_quantity, reserved_quantity, updated_at)
               VALUES ($1, $2, 0, NOW())
               ON CONFLICT (listing_id) DO UPDATE SET updated_at = NOW()
               RETURNING id, stock_quantity, available_quantity`,
              [item.listing_id, Math.max(0, currentListingStock - qty)]
            );
            if (createInvRes.rows.length > 0) {
              inventoryId = createInvRes.rows[0].id;
            }
          } catch (e) {
            console.warn('Could not auto-create inventory record:', e.message);
          }
        }

        // Record atomic inventory reservation with status COMMITTED
        if (inventoryId) {
          try {
            await client.query(
              `INSERT INTO inventory_reservations (
                inventory_id, order_id, quantity_reserved, expires_at, status, created_at
              ) VALUES ($1, $2, $3, NOW() + INTERVAL '7 days', 'COMMITTED', NOW())`,
              [inventoryId, order.id, Math.round(qty)]
            );
          } catch (resErr) {
            console.warn('Could not record inventory reservation:', resErr.message);
          }
        }
      }

      sellerOrders.push(sellerOrder);
    }

    // 6b. Generate initial Tax Invoice record in invoices table
    const invoiceNumber = `INV-${order.order_number}`;
    const totalAmount = Number(finalGrandTotal);
    const taxAmount = Math.round(totalAmount * 0.05 * 100) / 100;
    let initialInvoice = null;
    try {
      const invRes = await client.query(
        `INSERT INTO invoices (
          invoice_number, order_id, seller_order_id, tax_amount, total_amount, invoice_pdf_url, generated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (invoice_number) DO UPDATE
        SET tax_amount = EXCLUDED.tax_amount, total_amount = EXCLUDED.total_amount, generated_at = NOW()
        RETURNING *`,
        [
          invoiceNumber,
          order.id,
          sellerOrders[0]?.id || null,
          taxAmount,
          totalAmount,
          `/api/v1/orders/${order.id}/invoice/pdf`
        ]
      );
      initialInvoice = invRes.rows[0];
    } catch (invErr) {
      console.warn('Could not create invoice record during order placement:', invErr.message);
    }

    // 6c. Record initial milestone in order_status_history
    try {
      await client.query(
        `INSERT INTO order_status_history (
          order_id, seller_order_id, previous_status, new_status, notes, created_at
        ) VALUES ($1, $2, 'NONE', 'PLACED', 'Order placed by customer via Customer Portal', NOW())`,
        [order.id, sellerOrders[0]?.id || null]
      );
    } catch (histErr) {
      console.warn('Could not record initial order status history:', histErr.message);
    }

    // 7. Payment record generation in payments
    const initialPaymentStatus = 'PENDING';

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
        finalGrandTotal,
        dbPaymentMethod,
        initialPaymentStatus
      ]
    );

    const paymentRecord = payRes.rows[0];

    // Audit record in payment_transactions
    const txRef = 'TXN-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
    const paymentMode = isCod ? 'COD' : (dbPaymentMethod === 'ADAB_PAY_LATER' ? 'ADAB_PAY_LATER' : dbPaymentMethod);
    const gatewayName = isCod ? 'COD' : (process.env.PAYMENT_GATEWAY_PROVIDER || 'razorpay').toLowerCase();
    const initialTxStatus = isCod ? 'PENDING' : 'INITIATED';

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
        finalGrandTotal,
        paymentMode,
        gatewayName,
        txRef,
        initialTxStatus,
        JSON.stringify({
          order_number: order.order_number,
          payment_method: dbPaymentMethod,
          cart_id: cartId,
          note: isCod ? 'Cash on Delivery order created' : 'Order placed; awaiting gateway verification'
        })
      ]
    );

    // 8. For COD orders, clear the cart immediately since no gateway callback is needed.
    // For Online Payments, retain the cart until payment is verified and confirmed so customer does not lose their basket if payment fails or is cancelled.
    if (isCod) {
      await client.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);
      await client.query(`UPDATE carts SET updated_at = NOW() WHERE id = $1`, [cartId]);
    } else {
      await client.query(
        `UPDATE carts SET customer_id = COALESCE(customer_id, $1), updated_at = NOW() WHERE id = $2`,
        [customerUser.id, cartId]
      );
    }

    // 9. Generate Order Placed Notification for Customer
    if (customerUser.id) {
      const modeLabel = dbDeliveryMode === 'STORE_PICKUP' ? 'Store Pickup' : 'Delivery';
      const notificationMessage = `Your order #${orderNumber} for ₹${finalGrandTotal} has been confirmed (${modeLabel} - ${etaMinutes} mins).`;
      try {
        await client.query(
          `INSERT INTO notifications (
            user_id, title, message, type, is_read, action_url, created_at
          ) VALUES ($1, $2, $3, 'ORDER_STATUS', false, '/track', NOW())`,
          [
            customerUser.id,
            'Order Placed Successfully! 🎉',
            notificationMessage
          ]
        );
      } catch (notifErr) {
        console.warn('Could not insert order placed notification:', notifErr.message);
      }
    }

    // Commit all changes atomically
    await client.query('COMMIT');
    client.release();
    client = null;

    // Auto-redeem reward points if applied during checkout
    if (numPointsRedeemed > 0 && customerUser.id) {
      try {
        const rewardService = require('./rewardService');
        await rewardService.redeemRewardPoints(customerUser.id, {
          points: numPointsRedeemed,
          order_id: order.id,
          order_amount: preview.pricing.grand_total
        });
      } catch (ptsErr) {
        console.warn('Auto points redemption in createOrderFromCart note:', ptsErr.message);
      }
    }

    order.seller_orders = sellerOrders;
    order.items = preview.items;
    order.pricing = {
      ...preview.pricing,
      discount: finalDiscount,
      grand_total: finalGrandTotal,
      points_discount: pointsDiscount,
      points_redeemed: numPointsRedeemed
    };
    order.customer = customerUser;
    order.payment = paymentRecord;
    order.invoice = initialInvoice;

    return order;
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function queryOrdersList(customerId = null) {
  const validCustomerId = customerId && UUID_REGEX.test(customerId) ? customerId : null;
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
  if (validCustomerId) {
    query += ` AND o.customer_id = $1`;
    params.push(validCustomerId);
  }
  query += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT 20`;

  const res = await pool.query(query, params);
  return res.rows;
}

// Fetch all orders for a customer with smart resolution
async function getCustomerOrders(rawCustomerId = null) {
  let customerId = null;

  if (rawCustomerId) {
    if (UUID_REGEX.test(rawCustomerId)) {
      customerId = rawCustomerId;
    } else {
      try {
        const { resolveCustomerUserId } = require('./customerService');
        customerId = await resolveCustomerUserId(rawCustomerId);
      } catch {
        customerId = null;
      }
    }
  }

  // If a specific customer is resolved, return only their orders
  if (customerId) {
    return await queryOrdersList(customerId);
  }

  // Guests or unauthenticated sessions have 0 orders
  return [];
}

// Fetch single order details with items, seller orders, invoice, and status history
async function getOrderById(orderId) {
  const orderRes = await pool.query(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  if (orderRes.rows.length === 0) return null;

  const order = orderRes.rows[0];

  const sellerOrdersRes = await pool.query(
    `SELECT so.*, s.store_name, s.category AS store_category, s.address_line as store_address, s.phone as store_phone
     FROM seller_orders so
     LEFT JOIN stores s ON so.store_id = s.id
     WHERE so.parent_order_id = $1`,
    [orderId]
  );

  const itemsRes = await pool.query(
    `SELECT oi.*, sl.title AS product_name, sl.mrp, sl.sell_price, s2.store_name
     FROM order_items oi
     JOIN seller_orders so ON oi.seller_order_id = so.id
     LEFT JOIN seller_listings sl ON oi.listing_id = sl.id
     LEFT JOIN stores s2 ON so.store_id = s2.id
     WHERE so.parent_order_id = $1`,
    [orderId]
  );

  const invRes = await pool.query(
    `SELECT * FROM invoices WHERE order_id = $1 LIMIT 1`,
    [orderId]
  );

  const histRes = await pool.query(
    `SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC`,
    [orderId]
  );

  order.seller_orders = sellerOrdersRes.rows;
  order.items = itemsRes.rows;
  order.invoice = invRes.rows[0] || null;
  order.status_history = histRes.rows;
  return order;
}

// Cancel an active order
async function cancelOrder(orderId, customerId = null) {
  const orderRes = await pool.query(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  if (orderRes.rows.length === 0) {
    const err = new Error(`Order #${orderId} not found`);
    err.statusCode = 404;
    throw err;
  }
  const order = orderRes.rows[0];

  const nonCancellable = ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'];
  if (nonCancellable.includes((order.order_status || '').toUpperCase())) {
    const err = new Error(`Order #${order.order_number} cannot be cancelled because it is already ${order.order_status}`);
    err.statusCode = 400;
    throw err;
  }

  let actorUserId = customerId;
  if (actorUserId) {
    try {
      const { resolveCustomerUserId } = require('./customerService');
      actorUserId = await resolveCustomerUserId(actorUserId);
    } catch {
      actorUserId = order.customer_id;
    }
  } else {
    actorUserId = order.customer_id;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const prevStatus = order.order_status;
    const updateOrderRes = await client.query(
      `UPDATE orders SET order_status = 'CANCELLED', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [orderId]
    );
    const updatedOrder = updateOrderRes.rows[0];

    // Cancel seller orders
    await client.query(
      `UPDATE seller_orders SET status = 'CANCELLED' WHERE parent_order_id = $1`,
      [orderId]
    );

    // Record in order_status_history
    await client.query(
      `INSERT INTO order_status_history (
        order_id, previous_status, new_status, changed_by_user_id, notes, created_at
      ) VALUES ($1, $2, 'CANCELLED', $3, 'Order cancelled by customer', NOW())`,
      [orderId, prevStatus, actorUserId]
    );

    // Insert customer notification
    if (order.customer_id) {
      await client.query(
        `INSERT INTO notifications (
          user_id, title, message, type, is_read, action_url, created_at
        ) VALUES ($1, 'Order Cancelled', $2, 'ORDER_STATUS', false, '/orders', NOW())`,
        [order.customer_id, `Your order #${order.order_number} has been cancelled successfully.`]
      );
    }

    await client.query('COMMIT');
    return updatedOrder;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Reorder an existing order's items into customer's active cart
async function reorderOrder(orderId, { customerId = null, sessionToken = null } = {}) {
  const orderRes = await pool.query(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  if (orderRes.rows.length === 0) {
    const err = new Error(`Order #${orderId} not found`);
    err.statusCode = 404;
    throw err;
  }

  const itemsRes = await pool.query(
    `SELECT oi.listing_id, oi.quantity, sl.title, sl.is_active, sl.stock_qty, sl.sell_price
     FROM order_items oi
     JOIN seller_orders so ON oi.seller_order_id = so.id
     JOIN seller_listings sl ON oi.listing_id = sl.id
     WHERE so.parent_order_id = $1`,
    [orderId]
  );

  if (itemsRes.rows.length === 0) {
    const err = new Error('No valid items found in this order to reorder');
    err.statusCode = 400;
    throw err;
  }

  let resolvedCustomerId = customerId;
  if (customerId) {
    try {
      const { resolveCustomerUserId } = require('./customerService');
      resolvedCustomerId = await resolveCustomerUserId(customerId);
    } catch {
      resolvedCustomerId = null;
    }
  }

  const { getOrCreateCart, addItemToCart } = require('./cartService');
  const cart = await getOrCreateCart({ customerId: resolvedCustomerId, sessionToken });

  const addedItems = [];
  const unavailableItems = [];

  for (const item of itemsRes.rows) {
    if (item.is_active && (item.stock_qty === null || item.stock_qty > 0)) {
      const qtyToAdd = Math.min(Math.max(1, Math.round(Number(item.quantity))), item.stock_qty || 10);
      try {
        await addItemToCart(cart.id, item.listing_id, qtyToAdd);
        addedItems.push({ listing_id: item.listing_id, title: item.title, quantity: qtyToAdd });
      } catch (e) {
        unavailableItems.push({ listing_id: item.listing_id, title: item.title, reason: e.message });
      }
    } else {
      unavailableItems.push({ listing_id: item.listing_id, title: item.title, reason: 'Currently out of stock' });
    }
  }

  return {
    cart_id: cart.id,
    added_count: addedItems.length,
    added_items: addedItems,
    unavailable_items: unavailableItems
  };
}

// Fetch order status timeline history
async function getOrderStatusHistory(orderId) {
  const orderRes = await pool.query(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  if (orderRes.rows.length === 0) {
    const err = new Error(`Order #${orderId} not found`);
    err.statusCode = 404;
    throw err;
  }
  const order = orderRes.rows[0];

  const historyRes = await pool.query(
    `SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC`,
    [orderId]
  );

  if (historyRes.rows.length > 0) {
    return historyRes.rows;
  }

  // Synthesize progressive milestones from actual order timestamp & status
  const createdAt = new Date(order.created_at || Date.now());
  const milestones = [
    {
      order_id: order.id,
      previous_status: 'NEW',
      new_status: 'PLACED',
      notes: 'Order placed by customer and payment verified',
      created_at: createdAt
    }
  ];

  const status = (order.order_status || 'PLACED').toUpperCase();
  if (['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status)) {
    milestones.push({
      order_id: order.id,
      previous_status: 'PLACED',
      new_status: 'ACCEPTED',
      notes: 'Store accepted the order and started packing',
      created_at: new Date(createdAt.getTime() + 4 * 60 * 1000)
    });
  }
  if (['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status)) {
    milestones.push({
      order_id: order.id,
      previous_status: 'ACCEPTED',
      new_status: 'PACKED',
      notes: 'Items verified, packed in tamper-proof package',
      created_at: new Date(createdAt.getTime() + 10 * 60 * 1000)
    });
  }
  if (['OUT_FOR_DELIVERY', 'DELIVERED'].includes(status)) {
    milestones.push({
      order_id: order.id,
      previous_status: 'PACKED',
      new_status: 'OUT_FOR_DELIVERY',
      notes: 'Rider Ramesh picked up package and is en route',
      created_at: new Date(createdAt.getTime() + 15 * 60 * 1000)
    });
  }
  if (status === 'DELIVERED') {
    milestones.push({
      order_id: order.id,
      previous_status: 'OUT_FOR_DELIVERY',
      new_status: 'DELIVERED',
      notes: 'Package safely delivered to recipient',
      created_at: new Date(createdAt.getTime() + (order.eta_minutes || 25) * 60 * 1000)
    });
  }
  if (status === 'CANCELLED') {
    milestones.push({
      order_id: order.id,
      previous_status: 'PLACED',
      new_status: 'CANCELLED',
      notes: 'Order was cancelled',
      created_at: new Date(createdAt.getTime() + 2 * 60 * 1000)
    });
  }

  return milestones;
}

// Fetch shipments for multi-seller orders
async function getOrderShipments(orderId) {
  const orderRes = await pool.query(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  if (orderRes.rows.length === 0) {
    const err = new Error(`Order #${orderId} not found`);
    err.statusCode = 404;
    throw err;
  }
  const order = orderRes.rows[0];

  const shipmentsRes = await pool.query(
    `SELECT sh.*, so.store_id, st.store_name, st.phone as store_phone
     FROM shipments sh
     JOIN seller_orders so ON sh.seller_order_id = so.id
     LEFT JOIN stores st ON so.store_id = st.id
     WHERE so.parent_order_id = $1`,
    [orderId]
  );

  if (shipmentsRes.rows.length > 0) {
    return shipmentsRes.rows;
  }

  // If no carrier shipment manifested, return seller-order fulfillment state
  const soRes = await pool.query(
    `SELECT so.id, so.store_id, so.status, st.store_name, st.phone as store_phone, st.address_line as store_address
     FROM seller_orders so
     LEFT JOIN stores st ON so.store_id = st.id
     WHERE so.parent_order_id = $1`,
    [orderId]
  );

  if (soRes.rows.length === 0) {
    return [{
      id: order.id,
      seller_order_id: null,
      store_id: null,
      store_name: 'ADAB Central Fulfillment',
      carrier_name: 'ADAB Hyperlocal Express',
      tracking_number: `TRK-${order.order_number}`,
      status: order.order_status === 'DELIVERED' ? 'DELIVERED' : (order.order_status === 'SHIPPED' ? 'OUT_FOR_DELIVERY' : 'CREATED'),
      shipped_at: order.created_at,
      delivered_at: order.order_status === 'DELIVERED' ? order.updated_at : null
    }];
  }

  return soRes.rows.map((so) => ({
    id: so.id,
    seller_order_id: so.id,
    store_id: so.store_id,
    store_name: so.store_name,
    carrier_name: 'ADAB Hyperlocal Express',
    tracking_number: `TRK-${order.order_number}-${so.id.slice(0, 4).toUpperCase()}`,
    status: so.status === 'DELIVERED' ? 'DELIVERED' : (so.status === 'DISPATCHED' ? 'OUT_FOR_DELIVERY' : 'CREATED'),
    shipped_at: order.created_at,
    delivered_at: so.status === 'DELIVERED' ? order.updated_at : null
  }));
}

// Helper to resolve realistic city coordinates based on pincode / locality
function resolveLocationCoordinates(loc = {}, fallbackCity = 'Surat') {
  return resolveCoordinatesSync(loc, fallbackCity);
}

// Fetch live GPS tracking, rider info, and waypoints
async function getOrderTracking(orderId) {
  const orderRes = await pool.query(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  if (orderRes.rows.length === 0) {
    const err = new Error(`Order #${orderId} not found`);
    err.statusCode = 404;
    throw err;
  }
  const order = orderRes.rows[0];

  // Store information
  const storeRes = await pool.query(
    `SELECT s.id, s.store_name, s.address_line, s.city, s.pincode, s.latitude, s.longitude, s.phone
     FROM seller_orders so
     JOIN stores s ON so.store_id = s.id
     WHERE so.parent_order_id = $1
     LIMIT 1`,
    [orderId]
  );
  const store = storeRes.rows[0] || {
    store_name: 'ADAB Local Mart',
    city: 'Surat',
    latitude: 21.1702,
    longitude: 72.8311,
    address_line: 'Ring Road, Surat'
  };

  // Delivery destination coordinates
  const addr = order.delivery_address || {};

  // Resolve realistic geographic coordinates with high-precision smart geocoding
  const storeCoords = await smartGeocode(store);
  const destCoords = await smartGeocode(addr);

  const storeLat = storeCoords.latitude;
  const storeLng = storeCoords.longitude;
  let destLat = destCoords.latitude;
  let destLng = destCoords.longitude;

  // If order delivery address lacks coordinates in DB, backfill so it stays permanently accurate
  if (!addr.latitude || !addr.longitude) {
    addr.latitude = destLat;
    addr.longitude = destLng;
    pool.query(`UPDATE orders SET delivery_address = $1 WHERE id = $2`, [JSON.stringify(addr), orderId]).catch(() => {});
  }

  // If store and destination coordinates are too close (< 100 meters), add small offset so pins don't overlap completely
  if (Math.abs(storeLat - destLat) < 0.001 && Math.abs(storeLng - destLng) < 0.001) {
    destLat = Math.round((destLat + 0.004) * 10000) / 10000;
    destLng = Math.round((destLng - 0.003) * 10000) / 10000;
  }

  // Real rider info or assigned default fleet driver
  const rider = {
    name: 'Ramesh Patel',
    phone: '+91 98765 43210',
    vehicle_number: 'GJ-05-AB-4021',
    rating: 4.85,
    avatar: null
  };

  // Calculate live intermediate rider position based on progress
  const isPickup = order.delivery_mode === 'STORE_PICKUP';
  const defaultEta = isPickup ? 15 : 25;
  const etaMinutes = order.eta_minutes && Number(order.eta_minutes) > 0 && Number(order.eta_minutes) < 180
    ? Number(order.eta_minutes)
    : defaultEta;

  const progressRatio =
    order.order_status === 'DELIVERED' ? 0.85 :
    order.order_status === 'OUT_FOR_DELIVERY' ? 0.72 :
    order.order_status === 'PACKED' || order.order_status === 'PREPARING' ? 0.25 : 0.08;

  const riderLat = Math.round((storeLat + (destLat - storeLat) * progressRatio) * 10000) / 10000;
  const riderLng = Math.round((storeLng + (destLng - storeLng) * progressRatio) * 10000) / 10000;

  // Retrieve existing tracking events
  const teRes = await pool.query(
    `SELECT * FROM tracking_events WHERE order_id = $1 ORDER BY timestamp ASC`,
    [orderId]
  );

  let events = teRes.rows;
  if (events.length === 0) {
    // If no events recorded yet, record initial placement event to DB
    const initialEvent = await pool.query(
      `INSERT INTO tracking_events (
        order_id, event_name, event_description, latitude, longitude, timestamp
      ) VALUES ($1, 'ORDER_PLACED', $2, $3, $4, $5)
      RETURNING *`,
      [
        orderId,
        `Order placed at ${store.store_name}`,
        storeLat,
        storeLng,
        order.created_at || new Date()
      ]
    );
    events = [initialEvent.rows[0]];
  }

  // If actual live GPS telemetry exists in tracking_events, use the most recent recorded waypoint
  const lastGeoEvent = [...events].reverse().find(
    (e) => e.latitude !== null && e.longitude !== null && !isNaN(Number(e.latitude)) && !isNaN(Number(e.longitude))
  );
  const effectiveRiderLat = lastGeoEvent ? Number(lastGeoEvent.latitude) : riderLat;
  const effectiveRiderLng = lastGeoEvent ? Number(lastGeoEvent.longitude) : riderLng;

  // Retrieve associated shipments for multi-seller orders
  let shipments = [];
  try {
    const shipmentsRes = await pool.query(
      `SELECT sh.*, so.store_id, st.store_name, st.phone as store_phone
       FROM shipments sh
       JOIN seller_orders so ON sh.seller_order_id = so.id
       LEFT JOIN stores st ON so.store_id = st.id
       WHERE so.parent_order_id = $1`,
      [orderId]
    );
    if (shipmentsRes.rows.length > 0) {
      shipments = shipmentsRes.rows;
    } else {
      shipments = await getOrderShipments(orderId);
    }
  } catch (shipErr) {
    console.warn('Could not query shipments in getOrderTracking:', shipErr.message);
  }

  return {
    order_id: order.id,
    order_number: order.order_number,
    order_status: order.order_status,
    delivery_mode: order.delivery_mode,
    eta_minutes: etaMinutes,
    progress_percentage: Math.round(progressRatio * 100),
    rider,
    store: {
      id: store.id,
      name: store.store_name,
      address: store.address_line,
      city: store.city,
      latitude: storeLat,
      longitude: storeLng,
      phone: store.phone
    },
    destination: {
      address: addr.address_line || addr.address || 'Ring Road, Surat',
      city: addr.city || store.city,
      pincode: addr.pincode,
      latitude: destLat,
      longitude: destLng,
      recipient_name: addr.recipient_name || addr.full_name || 'Customer'
    },
    current_location: {
      latitude: effectiveRiderLat,
      longitude: effectiveRiderLng
    },
    rider_telemetry: {
      latitude: effectiveRiderLat,
      longitude: effectiveRiderLng
    },
    shipments,
    events
  };
}

// Fetch or generate customer tax invoice
async function getOrderInvoice(orderId) {
  const orderRes = await pool.query(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  if (orderRes.rows.length === 0) {
    const err = new Error(`Order #${orderId} not found`);
    err.statusCode = 404;
    throw err;
  }
  const order = orderRes.rows[0];

  // Fetch full order items and store details
  const sellerOrdersRes = await pool.query(
    `SELECT so.*, s.store_name, s.address_line as store_address, COALESCE(sp.gstin, '24AAACA1234A1Z5') as gstin
     FROM seller_orders so
     LEFT JOIN stores s ON so.store_id = s.id
     LEFT JOIN seller_profiles sp ON s.seller_id = sp.id
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

  // Check if invoice record exists in invoices table
  const existingInvRes = await pool.query(
    `SELECT * FROM invoices WHERE order_id = $1 LIMIT 1`,
    [orderId]
  );

  let invoiceRecord = existingInvRes.rows[0];
  const grandTotal = parseFloat(order.grand_total) || 0;
  const taxAmount = parseFloat((grandTotal * 0.05 / 1.05).toFixed(2)); // 5% GST breakdown

  if (!invoiceRecord) {
    const invoiceNumber = `INV-${order.order_number}`;
    const primarySellerOrderId = sellerOrdersRes.rows[0]?.id || null;
    const insertRes = await pool.query(
      `INSERT INTO invoices (
        invoice_number, order_id, seller_order_id, tax_amount, total_amount, invoice_pdf_url, generated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *`,
      [
        invoiceNumber,
        order.id,
        primarySellerOrderId,
        taxAmount,
        grandTotal,
        `/api/v1/orders/${order.id}/invoice/pdf`
      ]
    );
    invoiceRecord = insertRes.rows[0];
  }

  const primaryStore = sellerOrdersRes.rows[0] || {};
  const deliveryAddr = order.delivery_address || {};

  return {
    invoice: invoiceRecord,
    order: {
      id: order.id,
      order_number: order.order_number,
      created_at: order.created_at,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      delivery_mode: order.delivery_mode,
      pricing: {
        total_mrp: order.total_mrp,
        total_discount: order.total_discount,
        delivery_fee: order.delivery_fee,
        tax_amount: taxAmount,
        grand_total: order.grand_total
      }
    },
    seller: {
      store_name: primaryStore.store_name || 'ADAB Verified Store',
      address: primaryStore.store_address || 'Surat, Gujarat',
      gstin: primaryStore.gstin || '24AAACA1234A1Z5'
    },
    buyer: {
      name: deliveryAddr.recipient_name || deliveryAddr.full_name || 'Customer',
      phone: deliveryAddr.phone || '+91 98765 12340',
      address: deliveryAddr.address_line || deliveryAddr.address || 'Surat, Gujarat'
    },
    items: itemsRes.rows,
    seller_orders: sellerOrdersRes.rows
  };
}

/**
 * Update order status with cross-portal seller order, shipment, and telemetry sync
 * Supports: PLACED, ACCEPTED, CONFIRMED, PACKED, PREPARING, OUT_FOR_DELIVERY, DELIVERED, CANCELLED
 */
async function updateOrderStatus(orderId, newStatus, options = {}) {
  const {
    changedByUserId = null,
    notes = null,
    riderLatitude = null,
    riderLongitude = null,
    carrierName = 'ADAB Hyperlocal Express',
    trackingNumber = null
  } = options;

  const validStatuses = ['PLACED', 'ACCEPTED', 'CONFIRMED', 'PACKED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
  const normalizedNewStatus = (newStatus || '').toUpperCase();
  if (!validStatuses.includes(normalizedNewStatus)) {
    const err = new Error(`Invalid order status "${newStatus}". Must be one of: ${validStatuses.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  // Canonical mappings
  let targetOrderStatus = normalizedNewStatus;
  if (normalizedNewStatus === 'ACCEPTED') targetOrderStatus = 'CONFIRMED';
  if (normalizedNewStatus === 'PACKED') targetOrderStatus = 'PREPARING';

  // Map to seller_orders status constraint: ('NEW','ACCEPTED','PACKED','DISPATCHED','DELIVERED','CANCELLED')
  let targetSellerStatus = 'NEW';
  if (['ACCEPTED', 'CONFIRMED'].includes(normalizedNewStatus)) targetSellerStatus = 'ACCEPTED';
  else if (['PACKED', 'PREPARING'].includes(normalizedNewStatus)) targetSellerStatus = 'PACKED';
  else if (['OUT_FOR_DELIVERY'].includes(normalizedNewStatus)) targetSellerStatus = 'DISPATCHED';
  else if (['DELIVERED'].includes(normalizedNewStatus)) targetSellerStatus = 'DELIVERED';
  else if (['CANCELLED'].includes(normalizedNewStatus)) targetSellerStatus = 'CANCELLED';

  // Map to shipments status constraint: ('CREATED','MANIFESTED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','FAILED','RETURNED')
  let targetShipmentStatus = 'CREATED';
  if (['ACCEPTED', 'CONFIRMED'].includes(normalizedNewStatus)) targetShipmentStatus = 'MANIFESTED';
  else if (['PACKED', 'PREPARING'].includes(normalizedNewStatus)) targetShipmentStatus = 'PICKED_UP';
  else if (['OUT_FOR_DELIVERY'].includes(normalizedNewStatus)) targetShipmentStatus = 'OUT_FOR_DELIVERY';
  else if (['DELIVERED'].includes(normalizedNewStatus)) targetShipmentStatus = 'DELIVERED';
  else if (['CANCELLED'].includes(normalizedNewStatus)) targetShipmentStatus = 'FAILED';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch current order
    const orderRes = await client.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [orderId]);
    if (orderRes.rows.length === 0) {
      const err = new Error(`Order #${orderId} not found`);
      err.statusCode = 404;
      throw err;
    }
    const currentOrder = orderRes.rows[0];
    const previousStatus = currentOrder.order_status;

    // Idempotency check: if status is already the requested status, return early without duplicate logs
    if (previousStatus === targetOrderStatus) {
      await client.query('ROLLBACK');
      return await getOrderById(orderId);
    }

    // 2. Update orders table
    const isNowDelivered = targetOrderStatus === 'DELIVERED';
    const orderUpdateRes = await client.query(
      `UPDATE orders 
       SET order_status = $1, 
           payment_status = CASE WHEN $3 = true AND payment_status = 'PENDING' AND payment_method = 'CASH_ON_DELIVERY' THEN 'PAID' ELSE payment_status END,
           updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [targetOrderStatus, orderId, isNowDelivered]
    );
    const updatedOrder = orderUpdateRes.rows[0];

    // 3. Update all associated seller_orders
    const soRes = await client.query(
      `UPDATE seller_orders 
       SET status = $1 
       WHERE parent_order_id = $2 
       RETURNING *`,
      [targetSellerStatus, orderId]
    );
    const updatedSellerOrders = soRes.rows;

    // 4. Update or manifest shipments for each seller order
    const isShipInTransit = ['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(targetShipmentStatus);
    const isShipDelivered = targetShipmentStatus === 'DELIVERED';

    for (const so of updatedSellerOrders) {
      const generatedTrk = trackingNumber || `TRK-${updatedOrder.order_number}-${so.id.slice(0, 4).toUpperCase()}`;
      const existingShipRes = await client.query(
        `SELECT id FROM shipments WHERE seller_order_id = $1 LIMIT 1`,
        [so.id]
      );

      if (existingShipRes.rows.length > 0) {
        await client.query(
          `UPDATE shipments 
           SET status = $1, 
               shipped_at = CASE WHEN $3 = true AND shipped_at IS NULL THEN NOW() ELSE shipped_at END,
               delivered_at = CASE WHEN $4 = true THEN NOW() ELSE delivered_at END
           WHERE id = $2`,
          [targetShipmentStatus, existingShipRes.rows[0].id, isShipInTransit, isShipDelivered]
        );
      } else {
        await client.query(
          `INSERT INTO shipments (
            seller_order_id, carrier_name, tracking_number, status, shipped_at, delivered_at, created_at
          ) VALUES ($1, $2, $3, $4, CASE WHEN $5 = true THEN NOW() ELSE NULL END, CASE WHEN $6 = true THEN NOW() ELSE NULL END, NOW())
          ON CONFLICT (tracking_number) DO UPDATE
          SET status = EXCLUDED.status, delivered_at = EXCLUDED.delivered_at`,
          [so.id, carrierName, generatedTrk, targetShipmentStatus, isShipInTransit, isShipDelivered]
        );
      }
    }

    // 5. Append order status history
    const historyNotes = notes || `Status updated from ${previousStatus} to ${targetOrderStatus}`;
    await client.query(
      `INSERT INTO order_status_history (
        order_id, seller_order_id, previous_status, new_status, changed_by_user_id, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        orderId,
        updatedSellerOrders[0]?.id || null,
        previousStatus,
        targetOrderStatus,
        changedByUserId,
        historyNotes
      ]
    );

    // 6. Append tracking event with accurate coordinates
    const destCoords = await smartGeocode(updatedOrder.delivery_address || {});
    let lat = riderLatitude !== null && !isNaN(Number(riderLatitude)) ? Number(riderLatitude) : null;
    let lng = riderLongitude !== null && !isNaN(Number(riderLongitude)) ? Number(riderLongitude) : null;

    if (lat === null || lng === null) {
      if (normalizedNewStatus === 'DELIVERED') {
        lat = destCoords.latitude;
        lng = destCoords.longitude;
      } else if (['ACCEPTED', 'CONFIRMED', 'PACKED', 'PREPARING'].includes(normalizedNewStatus)) {
        const stRes = await client.query(
          `SELECT latitude, longitude FROM stores WHERE id = $1 LIMIT 1`,
          [updatedSellerOrders[0]?.store_id]
        );
        lat = stRes.rows[0]?.latitude || 21.1702;
        lng = stRes.rows[0]?.longitude || 72.8311;
      } else if (normalizedNewStatus === 'OUT_FOR_DELIVERY') {
        const stRes = await client.query(
          `SELECT latitude, longitude FROM stores WHERE id = $1 LIMIT 1`,
          [updatedSellerOrders[0]?.store_id]
        );
        const sLat = Number(stRes.rows[0]?.latitude || 21.1702);
        const sLng = Number(stRes.rows[0]?.longitude || 72.8311);
        lat = Math.round((sLat + (destCoords.latitude - sLat) * 0.65) * 10000) / 10000;
        lng = Math.round((sLng + (destCoords.longitude - sLng) * 0.65) * 10000) / 10000;
      }
    }

    const eventName = 
      normalizedNewStatus === 'DELIVERED' ? 'ORDER_DELIVERED' :
      normalizedNewStatus === 'OUT_FOR_DELIVERY' ? 'DISPATCHED_FOR_DELIVERY' :
      normalizedNewStatus === 'PACKED' ? 'ORDER_PACKED' :
      normalizedNewStatus === 'ACCEPTED' ? 'ORDER_ACCEPTED' :
      normalizedNewStatus === 'CANCELLED' ? 'ORDER_CANCELLED' : 'STATUS_UPDATE';

    await client.query(
      `INSERT INTO tracking_events (
        order_id, event_name, event_description, latitude, longitude, timestamp
      ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [orderId, eventName, historyNotes, lat, lng]
    );

    // 7. Dispatch Customer Notification
    if (updatedOrder.customer_id) {
      let notifTitle = `Order Update: #${updatedOrder.order_number}`;
      let notifMsg = `Your order status is now ${targetOrderStatus}.`;
      if (normalizedNewStatus === 'ACCEPTED') {
        notifTitle = 'Order Accepted! 👨‍🍳';
        notifMsg = `Store has accepted order #${updatedOrder.order_number} and is preparing items.`;
      } else if (normalizedNewStatus === 'PACKED') {
        notifTitle = 'Order Packed! 📦';
        notifMsg = `Your order #${updatedOrder.order_number} is packed and ready for courier pickup.`;
      } else if (normalizedNewStatus === 'OUT_FOR_DELIVERY') {
        notifTitle = 'Out for Delivery! 🛵';
        notifMsg = `Ramesh is on the way with your order #${updatedOrder.order_number}.`;
      } else if (normalizedNewStatus === 'DELIVERED') {
        notifTitle = 'Order Delivered! 🎉';
        notifMsg = `Your order #${updatedOrder.order_number} has been delivered. Enjoy!`;
      }

      try {
        await client.query(
          `INSERT INTO notifications (
            user_id, title, message, type, is_read, action_url, created_at
          ) VALUES ($1, $2, $3, 'ORDER_STATUS', false, '/track', NOW())`,
          [updatedOrder.customer_id, notifTitle, notifMsg]
        );
      } catch (notifErr) {
        console.warn('Could not insert order status notification:', notifErr.message);
      }
    }

    await client.query('COMMIT');

    const fullOrder = await getOrderById(orderId);
    return fullOrder;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  normalizePaymentMethod,
  normalizeDeliveryMode,
  createOrderFromCart,
  getCustomerOrders,
  getOrderById,
  cancelOrder,
  reorderOrder,
  getOrderStatusHistory,
  getOrderShipments,
  getOrderTracking,
  getOrderInvoice,
  updateOrderStatus
};
