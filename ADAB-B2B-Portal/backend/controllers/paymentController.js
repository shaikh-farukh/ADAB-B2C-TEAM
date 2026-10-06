import pool from '../Config/database.js';
import creditLedgerService from '../services/creditLedgerService.js';
import logger from '../utils/logger.js';

// Helper to transition state
const transitionPaymentState = (currentStatus, targetStatus) => {
  const allowedTransitions = {
    'PENDING': ['AUTHORIZED', 'PAID', 'FAILED', 'CANCELLED'],
    'AUTHORIZED': ['PAID', 'FAILED', 'CANCELLED'],
    'PAID': ['SETTLED', 'REFUNDED'],
    'SETTLED': [],
    'FAILED': [],
    'CANCELLED': [],
    'REFUNDED': []
  };
  return allowedTransitions[currentStatus?.toUpperCase()]?.includes(targetStatus.toUpperCase()) || false;
};

export const initializePayment = async (req, res) => {
  const distributorId = req.user.userId;
  const { order_id, payment_method } = req.body || {}; // payment_method: 'CASH', 'ONLINE', 'B2B_CREDIT'

  if (!order_id || !payment_method) {
    return res.status(400).json({ success: false, message: 'Missing order_id or payment_method' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch order
    const orderResult = await client.query(
      `SELECT * FROM manage_b_to_b_orders WHERE id = $1 AND distributor_id = $2 AND deleted_at IS NULL FOR UPDATE`,
      [order_id, distributorId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // If already paid
    if (order.payment_status === 'PAID' || order.payment_status === 'SETTLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Order is already paid' });
    }

    let nextPaymentStatus = 'PENDING';
    let transactionData = null;
    let dueDate = null;

    if (payment_method === 'CASH') {
      // Cash on delivery logic
      nextPaymentStatus = 'AUTHORIZED';
    } 
    else if (payment_method === 'ONLINE') {
      // Logic for Razorpay/Stripe would go here. We mock the order ID.
      nextPaymentStatus = 'PENDING';
      transactionData = {
        mock_gateway_order_id: `rzp_${Date.now()}_${order_id}`,
        amount: order.total_amount,
        currency: 'INR'
      };
    } 
    else if (payment_method === 'B2B_CREDIT') {
      // 1. Credit Validation Engine: verify order_total <= (approved_limit - used_amount)
      try {
        await creditLedgerService.logOrderDebit(distributorId, order.manufacturer_id, order.total_amount, order.id);
        nextPaymentStatus = 'PAID'; // B2B Credit is treated as paid in terms of checkout completion
        
        // Set due date to 30 days from today for Net-30 terms
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
      } catch (err) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: err.message });
      }
    } 
    else {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    // Update order payment method and status
    const updateResult = await client.query(
      `UPDATE manage_b_to_b_orders 
       SET payment_method = $1, payment_status = $2, net_30_due_date = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [payment_method, nextPaymentStatus, dueDate, order_id]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        order: updateResult.rows[0],
        transaction: transactionData
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('initializePayment error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const updatePaymentStatus = async (req, res) => {
  const { order_id, new_status, transaction_reference } = req.body || {};
  const adminOrWebhookUser = req.user; // assume auth middleware

  if (!order_id || !new_status) {
    return res.status(400).json({ success: false, message: 'Missing order_id or new_status' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      `SELECT * FROM manage_b_to_b_orders WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [order_id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Validate state machine
    if (!transitionPaymentState(order.payment_status || 'PENDING', new_status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Cannot transition payment status from ${order.payment_status} to ${new_status}` });
    }

    // Update DB
    const updateResult = await client.query(
      `UPDATE manage_b_to_b_orders 
       SET payment_status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [new_status, order_id]
    );

    // If status became SETTLED or PAID via ONLINE, you might log payment in ledger if it was B2B credit that is being paid back.
    // For now we just update order state.

    // Also record into manage_b_to_b_payments if it is a real cash/online payment
    if (new_status === 'PAID') {
      await client.query(
        `INSERT INTO manage_b_to_b_payments (distributor_id, manufacturer_id, amount, mode, reference_id, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.distributor_id, order.manufacturer_id, order.total_amount, order.payment_method, transaction_reference || `manual_${Date.now()}`, 'completed']
      );
    }

    await client.query('COMMIT');
    res.status(200).json({
      success: true,
      message: 'Payment status updated',
      data: updateResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('updatePaymentStatus error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
};
