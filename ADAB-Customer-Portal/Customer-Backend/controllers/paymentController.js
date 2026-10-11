const paymentService = require('../services/paymentService');
const paymentAdapter = require('../services/paymentAdapter');
const { formatError } = require('../utils/errorHandler');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getCustomerId = (req) => {
  const candidate =
    req.headers['x-user-id'] ||
    (req.body && req.body.customer_id) ||
    (req.query && req.query.customer_id) ||
    null;
  if (candidate && typeof candidate === 'string' && UUID_REGEX.test(candidate.trim())) {
    return candidate.trim();
  }
  return null;
};

/**
 * GET /api/v1/payments/:id
 * Fetch payment and transaction audit records by payment ID or order ID with ownership check
 */
async function getPayment(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'Payment ID or Order ID is required'
      });
    }

    const customerId = getCustomerId(req);
    const payment = await paymentService.getPaymentById(id, customerId);
    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: `Payment record not found for: ${id}`
      });
    }

    return res.json({
      status: 'success',
      data: payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(error.status || statusCode).json(response);
  }
}

/**
 * POST /api/v1/payments/:id/confirm
 * Verifies gateway transaction signature, enforces customer ownership,
 * checks authoritative amounts, guards against replay attacks, updates payment and order status,
 * and inserts audit record into payment_transactions
 */
async function confirmPayment(req, res) {
  try {
    const { id } = req.params;
    const {
      gateway_transaction_id,
      gateway_signature,
      intent_id,
      payment_gateway = 'razorpay',
      payment_mode,
      response_payload = {}
    } = req.body;

    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'Payment ID or Order ID parameter is required'
      });
    }

    const customerId = getCustomerId(req);

    const result = await paymentService.confirmPayment({
      paymentId: id,
      gatewayTransactionId: gateway_transaction_id,
      gatewaySignature: gateway_signature,
      intentId: intent_id,
      paymentGateway: payment_gateway,
      paymentMode: payment_mode,
      customerId,
      responsePayload: response_payload
    });

    return res.status(200).json({
      status: 'success',
      message: result.message || 'Payment confirmed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error confirming payment:', error.message);
    const { statusCode, response } = formatError(error);
    if (error.data) {
      response.data = error.data;
    }
    return res.status(error.status || statusCode).json(response);
  }
}

/**
 * POST /api/v1/payments/:id/retry
 * Re-attempts payment for failed or pending orders.
 * Creates a fresh gateway intent and resets order payment status to PENDING.
 */
async function retryPayment(req, res) {
  try {
    const { id } = req.params;
    const {
      payment_method,
      payment_gateway = 'razorpay',
      customer_notes
    } = req.body;

    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'Payment ID or Order ID parameter is required'
      });
    }

    const customerId = getCustomerId(req);

    const result = await paymentService.retryPayment({
      paymentId: id,
      paymentMethod: payment_method,
      paymentGateway: payment_gateway,
      customerId,
      customerNotes: customer_notes
    });

    return res.status(200).json({
      status: 'success',
      message: 'Payment retry initiated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error retrying payment:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(error.status || statusCode).json(response);
  }
}

/**
 * POST /api/v1/payments/webhook
 * Handles asynchronous Razorpay webhook events with HMAC signature verification
 */
async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing x-razorpay-signature header in webhook request'
      });
    }

    // Verify webhook signature against raw request body
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const isValid = paymentAdapter.verifyWebhookSignature({
      rawBody,
      signature
    });

    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid webhook signature'
      });
    }

    const result = await paymentService.processWebhookEvent(req.body);

    return res.status(200).json({
      status: 'success',
      message: 'Webhook processed successfully',
      data: result
    });
  } catch (error) {
    console.error('Webhook error:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(error.status || statusCode).json(response);
  }
}

module.exports = {
  getPayment,
  confirmPayment,
  retryPayment,
  handleWebhook
};
