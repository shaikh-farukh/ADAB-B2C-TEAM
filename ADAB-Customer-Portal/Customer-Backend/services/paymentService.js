const pool = require('../db');
const paymentAdapter = require('./paymentAdapter');

/**
 * Normalizes payment methods to match orders_payment_method_check constraint
 */
function normalizeOrderPaymentMethod(method) {
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

/**
 * Normalizes payment modes to match payment_transactions_payment_mode_check constraint
 * Check: ('UPI','CARD','NET_BANKING','ADAB_PAY_LATER','WALLET','COD')
 */
function normalizeTransactionPaymentMode(method) {
  if (!method) return 'UPI';
  const m = method.toUpperCase();
  if (m === 'CASH_ON_DELIVERY' || m === 'COD' || m.includes('CASH')) return 'COD';
  if (m.includes('CARD')) return 'CARD';
  if (m.includes('WALLET')) return 'WALLET';
  if (m.includes('NET') || m.includes('BANK')) return 'NET_BANKING';
  if (m.includes('ONLINE')) return 'CARD';
  if (m.includes('BNPL') || m.includes('LATER')) return 'ADAB_PAY_LATER';
  return 'UPI';
}

/**
 * Retrieve payment record by payment ID or order ID with optional customer ownership verification
 */
async function getPaymentById(paymentId, customerId = null) {
  const query = `
    SELECT 
      p.*,
      o.order_number,
      o.payment_status AS order_payment_status,
      o.order_status,
      o.grand_total,
      u.full_name AS customer_name,
      u.phone AS customer_phone,
      u.email AS customer_email
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    JOIN users u ON p.user_id = u.id
    WHERE p.id = $1 OR p.order_id = $1
    LIMIT 1
  `;
  const res = await pool.query(query, [paymentId]);
  if (res.rows.length === 0) return null;

  const payment = res.rows[0];

  // IDOR ownership guard: if customerId is provided, enforce match
  if (customerId && payment.user_id && payment.user_id !== customerId) {
    const err = new Error('Unauthorized: You do not have permission to view this payment');
    err.status = 403;
    throw err;
  }

  // Also fetch any recorded audit transactions (without leaking internal credentials)
  const txRes = await pool.query(
    `SELECT id, order_id, user_id, payment_gateway, gateway_transaction_id, amount, currency, payment_mode, status, created_at
     FROM payment_transactions 
     WHERE order_id = $1 
     ORDER BY created_at DESC`,
    [payment.order_id]
  );
  payment.transactions = txRes.rows;

  return payment;
}

/**
 * Confirm payment gateway callback / response securely
 * Verifies transaction signature, validates server-side capture, enforces order ownership,
 * checks authoritative amounts, guards against replay attacks, updates payment and order statuses,
 * and inserts audit transaction.
 */
async function confirmPayment({
  paymentId,
  gatewayTransactionId,
  gatewaySignature,
  intentId,
  paymentGateway = 'razorpay',
  paymentMode,
  customerId = null,
  responsePayload = {}
}) {
  if (!gatewayTransactionId || !gatewaySignature || !intentId) {
    const err = new Error(
      'Missing required payment verification fields: gateway_transaction_id, gateway_signature, and intent_id are mandatory.'
    );
    err.status = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch current payment record with exclusive row lock
    const payRes = await client.query(
      `SELECT * FROM payments WHERE id = $1 OR order_id = $1 LIMIT 1 FOR UPDATE`,
      [paymentId]
    );

    if (payRes.rows.length === 0) {
      const err = new Error(`Payment record not found for ID: ${paymentId}`);
      err.status = 404;
      throw err;
    }

    const payment = payRes.rows[0];

    // IDOR verification: Customer must own the payment
    if (customerId && payment.user_id && payment.user_id !== customerId) {
      const err = new Error('Unauthorized: You do not have permission to confirm payment for this order.');
      err.status = 403;
      throw err;
    }

    // 2. Fetch associated order with exclusive row lock
    const orderRes = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [payment.order_id]
    );

    if (orderRes.rows.length === 0) {
      const err = new Error(`Associated order not found for payment: ${payment.id}`);
      err.status = 404;
      throw err;
    }

    const order = orderRes.rows[0];

    // Replay attack and payment-ID substitution check:
    // Ensure gatewayTransactionId has not already been used for a DIFFERENT order
    const existingTx = await client.query(
      `SELECT order_id FROM payment_transactions WHERE gateway_transaction_id = $1 LIMIT 1`,
      [gatewayTransactionId]
    );

    if (existingTx.rows.length > 0 && existingTx.rows[0].order_id !== order.id) {
      const err = new Error(
        `Cross-order payment substitution rejected: Payment ID "${gatewayTransactionId}" was already processed for another order.`
      );
      err.status = 409;
      throw err;
    }

    // Idempotent return if already marked SUCCESS and PAID
    if (payment.status === 'SUCCESS' && order.payment_status === 'PAID') {
      await client.query('COMMIT');
      return {
        payment,
        order,
        is_idempotent: true,
        message: 'Payment has already been confirmed and order is marked as paid.'
      };
    }

    // 3. Verify payment through gateway adapter (constant-time HMAC + server-side capture check)
    const targetGateway = (paymentGateway || process.env.PAYMENT_GATEWAY_PROVIDER || 'razorpay').toLowerCase();
    const verification = await paymentAdapter.verifyPayment({
      intentId,
      orderId: intentId,
      paymentId: gatewayTransactionId,
      signature: gatewaySignature,
      expectedAmount: Number(order.grand_total),
      expectedCurrency: payment.currency || 'INR',
      payload: responsePayload
    }, targetGateway);

    const txMode = normalizeTransactionPaymentMode(paymentMode || verification.payment_mode || payment.payment_method);
    const resolvedTxId = gatewayTransactionId;

    if (!verification.verified || verification.status === 'FAILED') {
      // Record failure state in database
      const failReason = verification.error_message || 'Payment verification failed';

      const updatedPayRes = await client.query(
        `UPDATE payments SET status = 'FAILED' WHERE id = $1 RETURNING *`,
        [payment.id]
      );

      const updatedOrderRes = await client.query(
        `UPDATE orders SET payment_status = 'FAILED', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [order.id]
      );

      // Audit log into payment_transactions (clean, sanitized payload)
      const txRes = await client.query(
        `INSERT INTO payment_transactions (
          order_id,
          user_id,
          payment_gateway,
          gateway_transaction_id,
          amount,
          currency,
          payment_mode,
          status,
          response_payload,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'FAILED', $8, NOW(), NOW())
        ON CONFLICT (gateway_transaction_id) DO UPDATE 
        SET status = 'FAILED', updated_at = NOW()
        RETURNING *`,
        [
          order.id,
          payment.user_id,
          targetGateway,
          resolvedTxId,
          payment.amount,
          payment.currency || 'INR',
          txMode,
          JSON.stringify({
            failure_reason: failReason,
            intent_id: intentId
          })
        ]
      );

      await client.query('COMMIT');

      const failureErr = new Error(`Payment verification failed: ${failReason}`);
      failureErr.status = 400;
      failureErr.data = {
        payment: updatedPayRes.rows[0],
        order: updatedOrderRes.rows[0],
        transaction: txRes.rows[0]
      };
      throw failureErr;
    }

    // 4. Verification Successful: update payment to SUCCESS, order to PAID, and record audit transaction
    const updatedPayRes = await client.query(
      `UPDATE payments SET status = 'SUCCESS' WHERE id = $1 RETURNING *`,
      [payment.id]
    );

    const updatedOrderRes = await client.query(
      `UPDATE orders SET payment_status = 'PAID', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [order.id]
    );

    const txRes = await client.query(
      `INSERT INTO payment_transactions (
        order_id,
        user_id,
        payment_gateway,
        gateway_transaction_id,
        amount,
        currency,
        payment_mode,
        status,
        response_payload,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'SUCCESS', $8, NOW(), NOW())
      ON CONFLICT (gateway_transaction_id) DO UPDATE 
      SET status = 'SUCCESS', updated_at = NOW()
      RETURNING *`,
      [
        order.id,
        payment.user_id,
        targetGateway,
        resolvedTxId,
        payment.amount,
        payment.currency || 'INR',
        txMode,
        JSON.stringify({
          intent_id: intentId,
          verified_at: new Date().toISOString()
        })
      ]
    );

    // 5. Clear cart items now that payment is confirmed
    try {
      const initialTx = await client.query(
        `SELECT response_payload FROM payment_transactions WHERE order_id = $1 AND response_payload->>'cart_id' IS NOT NULL LIMIT 1`,
        [order.id]
      );
      const cartIdToClear = initialTx.rows[0]?.response_payload?.cart_id;
      if (cartIdToClear) {
        await client.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartIdToClear]);
        await client.query(`UPDATE carts SET updated_at = NOW() WHERE id = $1`, [cartIdToClear]);
      } else if (order.customer_id) {
        await client.query(
          `DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE customer_id = $1)`,
          [order.customer_id]
        );
      }
    } catch (cartCleanupErr) {
      console.warn('Non-fatal: could not clear cart after payment confirmation:', cartCleanupErr.message);
    }

    await client.query('COMMIT');

    return {
      payment: updatedPayRes.rows[0],
      order: updatedOrderRes.rows[0],
      transaction: txRes.rows[0]
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Re-attempt payment for failed or pending transactions
 * Creates a fresh gateway order intent and resets order payment status to PENDING
 */
async function retryPayment({
  paymentId,
  paymentMethod,
  paymentGateway = 'razorpay',
  customerId = null,
  customerNotes
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch current payment
    const payRes = await client.query(
      `SELECT p.*, u.full_name, u.phone, u.email 
       FROM payments p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.id = $1 OR p.order_id = $1 
       LIMIT 1 FOR UPDATE`,
      [paymentId]
    );

    if (payRes.rows.length === 0) {
      const err = new Error(`Payment record not found for ID: ${paymentId}`);
      err.status = 404;
      throw err;
    }

    const payment = payRes.rows[0];

    // IDOR check
    if (customerId && payment.user_id && payment.user_id !== customerId) {
      const err = new Error('Unauthorized: You do not have permission to retry payment for this order.');
      err.status = 403;
      throw err;
    }

    // Cannot retry a payment that is already PAID
    if (payment.status === 'SUCCESS') {
      const err = new Error('Payment for this order has already succeeded. Cannot retry.');
      err.status = 400;
      throw err;
    }

    // 2. Fetch associated order
    const orderRes = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [payment.order_id]
    );

    if (orderRes.rows.length === 0) {
      const err = new Error(`Associated order not found for payment: ${payment.id}`);
      err.status = 404;
      throw err;
    }

    const order = orderRes.rows[0];

    // 3. Update payment method if switched
    const newOrderMethod = paymentMethod
      ? normalizeOrderPaymentMethod(paymentMethod)
      : payment.payment_method;
    const newTxMode = normalizeTransactionPaymentMode(newOrderMethod);

    // 4. Create new payment session via paymentAdapter
    const targetGateway = (paymentGateway || process.env.PAYMENT_GATEWAY_PROVIDER || 'razorpay').toLowerCase();
    const newReceipt = `rt_${order.order_number.slice(0, 20)}_${Date.now().toString().slice(-6)}`;

    const newIntent = await paymentAdapter.createPaymentIntent({
      amount: Number(order.grand_total),
      currency: payment.currency || 'INR',
      receipt: newReceipt,
      paymentMethod: newOrderMethod,
      customer: {
        id: payment.user_id,
        name: payment.full_name,
        phone: payment.phone,
        email: payment.email
      },
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        is_retry: true
      }
    }, targetGateway);

    // 5. Reset payment & order status to PENDING
    const updatedPayRes = await client.query(
      `UPDATE payments 
       SET status = 'PENDING', payment_method = $1 
       WHERE id = $2 
       RETURNING *`,
      [newOrderMethod, payment.id]
    );

    const updatedOrderRes = await client.query(
      `UPDATE orders 
       SET payment_status = 'PENDING', payment_method = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [newOrderMethod, order.id]
    );

    // 6. Record audit entry in payment_transactions
    const retryTxId = `retry_${newIntent.intent_id || Date.now()}`;
    const txRes = await client.query(
      `INSERT INTO payment_transactions (
        order_id,
        user_id,
        payment_gateway,
        gateway_transaction_id,
        amount,
        currency,
        payment_mode,
        status,
        response_payload,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'INITIATED', $8, NOW(), NOW())
      RETURNING *`,
      [
        order.id,
        payment.user_id,
        targetGateway,
        retryTxId,
        payment.amount,
        payment.currency || 'INR',
        newTxMode,
        JSON.stringify({
          intent_id: newIntent.intent_id,
          note: 'Payment retry initiated'
        })
      ]
    );

    await client.query('COMMIT');

    return {
      payment: updatedPayRes.rows[0],
      order: updatedOrderRes.rows[0],
      intent: newIntent,
      razorpay_order_id: newIntent.order_id,
      razorpay_key_id: newIntent.key_id,
      transaction: txRes.rows[0]
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Handle incoming asynchronous Webhook events
 */
async function processWebhookEvent(event) {
  if (!event || !event.event) {
    throw new Error('Invalid webhook event payload');
  }

  const eventName = event.event;
  const payload = event.payload || {};
  const client = await pool.connect();

  try {
    if (eventName === 'payment.captured' || eventName === 'order.paid') {
      const paymentEntity = payload.payment?.entity || {};
      const paymentId = paymentEntity.id;
      const razorpayOrderId = paymentEntity.order_id;
      const amountPaise = paymentEntity.amount;
      const adabOrderId = paymentEntity.notes?.order_id;

      if (!paymentId || (!adabOrderId && !razorpayOrderId)) {
        return { processed: false, reason: 'Missing identifier in webhook' };
      }

      await client.query('BEGIN');

      // Find order either by adabOrderId or by checking payment_transactions with intent
      let order = null;
      if (adabOrderId) {
        const orderRes = await client.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [adabOrderId]);
        if (orderRes.rows.length > 0) order = orderRes.rows[0];
      }

      if (!order && razorpayOrderId) {
        const txLookup = await client.query(
          `SELECT order_id FROM payment_transactions WHERE response_payload->>'intent_id' = $1 LIMIT 1`,
          [razorpayOrderId]
        );
        if (txLookup.rows.length > 0) {
          const orderRes = await client.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [txLookup.rows[0].order_id]);
          if (orderRes.rows.length > 0) order = orderRes.rows[0];
        }
      }

      if (!order) {
        await client.query('ROLLBACK');
        return { processed: false, reason: 'Order not found for webhook' };
      }

      // Check if already marked PAID (idempotent)
      if (order.payment_status === 'PAID') {
        await client.query('COMMIT');
        return { processed: true, idempotent: true };
      }

      // Authoritative amount check
      const expectedPaise = Math.round(Number(order.grand_total) * 100);
      if (amountPaise && Number(amountPaise) !== expectedPaise) {
        await client.query('ROLLBACK');
        return { processed: false, reason: 'Amount mismatch in webhook' };
      }

      // Update order and payment
      await client.query(`UPDATE orders SET payment_status = 'PAID', updated_at = NOW() WHERE id = $1`, [order.id]);
      await client.query(`UPDATE payments SET status = 'SUCCESS' WHERE order_id = $1`, [order.id]);

      // Record transaction
      const txMode = normalizeTransactionPaymentMode(paymentEntity.method || 'UPI');
      await client.query(
        `INSERT INTO payment_transactions (
          order_id, user_id, payment_gateway, gateway_transaction_id, amount, currency, payment_mode, status, response_payload, created_at, updated_at
        ) VALUES ($1, $2, 'razorpay', $3, $4, $5, $6, 'SUCCESS', $7, NOW(), NOW())
        ON CONFLICT (gateway_transaction_id) DO UPDATE SET status = 'SUCCESS', updated_at = NOW()`,
        [
          order.id,
          order.customer_id,
          paymentId,
          order.grand_total,
          paymentEntity.currency || 'INR',
          txMode,
          JSON.stringify({
            event: eventName,
            intent_id: razorpayOrderId,
            source: 'webhook'
          })
        ]
      );

      await client.query('COMMIT');
      return { processed: true, order_id: order.id, status: 'PAID' };
    }

    if (eventName === 'payment.failed') {
      const paymentEntity = payload.payment?.entity || {};
      const adabOrderId = paymentEntity.notes?.order_id;
      if (adabOrderId) {
        await client.query('BEGIN');
        await client.query(`UPDATE orders SET payment_status = 'FAILED', updated_at = NOW() WHERE id = $1 AND payment_status != 'PAID'`, [adabOrderId]);
        await client.query(`UPDATE payments SET status = 'FAILED' WHERE order_id = $1 AND status != 'SUCCESS'`, [adabOrderId]);
        await client.query('COMMIT');
        return { processed: true, order_id: adabOrderId, status: 'FAILED' };
      }
    }

    return { processed: true, event: eventName };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  normalizeOrderPaymentMethod,
  normalizeTransactionPaymentMode,
  getPaymentById,
  confirmPayment,
  retryPayment,
  processWebhookEvent
};
