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
  if (m.includes('BNPL') || m.includes('LATER')) return 'ADAB_PAY_LATER';
  return 'UPI';
}

/**
 * Retrieve payment record by payment ID or order ID
 */
async function getPaymentById(paymentId) {
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

  // Also fetch any recorded transactions
  const txRes = await pool.query(
    `SELECT * FROM payment_transactions WHERE order_id = $1 ORDER BY created_at DESC`,
    [payment.order_id]
  );
  payment.transactions = txRes.rows;

  return payment;
}

/**
 * Confirm payment gateway callback / response
 * Verifies transaction signature, updates payment and order statuses, and inserts audit transaction
 */
async function confirmPayment({
  paymentId,
  gatewayTransactionId,
  gatewaySignature,
  intentId,
  paymentGateway = 'mock',
  paymentMode,
  responsePayload = {}
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch current payment record
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

    // Idempotent return if already marked SUCCESS
    if (payment.status === 'SUCCESS' && order.payment_status === 'PAID') {
      await client.query('COMMIT');
      return {
        payment,
        order,
        is_idempotent: true,
        message: 'Payment has already been confirmed successfully'
      };
    }

    // 3. Verify payment through gateway abstraction adapter
    const targetGateway = paymentGateway || 'mock';
    const verification = await paymentAdapter.verifyPayment({
      intentId: intentId || payment.order_id,
      orderId: intentId || payment.order_id,
      paymentId: gatewayTransactionId,
      signature: gatewaySignature,
      payload: responsePayload
    }, targetGateway);

    const txMode = normalizeTransactionPaymentMode(paymentMode || payment.payment_method);
    const resolvedTxId = gatewayTransactionId || verification.transaction_id || `tx_${Date.now()}`;

    if (!verification.verified || verification.status === 'FAILED') {
      // Record failure state in database
      const failReason = verification.error_message || responsePayload.failure_reason || 'Payment declined by gateway';

      const updatedPayRes = await client.query(
        `UPDATE payments SET status = 'FAILED' WHERE id = $1 RETURNING *`,
        [payment.id]
      );

      const updatedOrderRes = await client.query(
        `UPDATE orders SET payment_status = 'FAILED', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [order.id]
      );

      // Audit log into payment_transactions
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
            verification,
            raw_payload: responsePayload,
            failure_reason: failReason
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

    // 4. Verification Successful: update payment, order, and insert audit transaction
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
          verification,
          raw_payload: responsePayload
        })
      ]
    );

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
 * Re-initializes a fresh gateway intent and resets order payment status to PENDING
 */
async function retryPayment({
  paymentId,
  paymentMethod,
  paymentGateway = 'mock',
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

    // 3. Update payment method if switched (e.g. from UPI to CARD)
    const newOrderMethod = paymentMethod
      ? normalizeOrderPaymentMethod(paymentMethod)
      : payment.payment_method;
    const newTxMode = normalizeTransactionPaymentMode(newOrderMethod);

    // 4. Create new payment session via paymentAdapter
    const targetGateway = paymentGateway || 'mock';
    const newReceipt = `retry_${payment.id.slice(0, 8)}_${Date.now()}`;

    const newIntent = await paymentAdapter.createPaymentIntent({
      amount: Number(payment.amount),
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
        is_retry: true,
        previous_payment_status: payment.status
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
    const retryTxId = `retry_${newIntent.intent_id}`;
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
          intent: newIntent,
          note: 'Payment retry initiated',
          customer_notes: customerNotes || null
        })
      ]
    );

    await client.query('COMMIT');

    return {
      payment: updatedPayRes.rows[0],
      order: updatedOrderRes.rows[0],
      intent: newIntent,
      transaction: txRes.rows[0]
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  normalizeOrderPaymentMethod,
  normalizeTransactionPaymentMode,
  getPaymentById,
  confirmPayment,
  retryPayment
};
