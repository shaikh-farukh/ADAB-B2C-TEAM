const paymentService = require('../services/paymentService');
const { formatError } = require('../utils/errorHandler');

/**
 * GET /api/v1/payments/:id
 * Fetch payment and transaction audit records by payment ID or order ID
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

    const payment = await paymentService.getPaymentById(id);
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
    return res.status(statusCode).json(response);
  }
}

/**
 * POST /api/v1/payments/:id/confirm
 * Verifies gateway transaction signature, updates payment and order status,
 * and inserts audit record into payment_transactions
 */
async function confirmPayment(req, res) {
  try {
    const { id } = req.params;
    const {
      gateway_transaction_id,
      gateway_signature,
      intent_id,
      payment_gateway = 'mock',
      payment_mode,
      response_payload = {}
    } = req.body;

    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'Payment ID or Order ID parameter is required'
      });
    }

    const result = await paymentService.confirmPayment({
      paymentId: id,
      gatewayTransactionId: gateway_transaction_id,
      gatewaySignature: gateway_signature,
      intentId: intent_id,
      paymentGateway: payment_gateway,
      paymentMode: payment_mode,
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
      payment_gateway = 'mock',
      customer_notes
    } = req.body;

    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'Payment ID or Order ID parameter is required'
      });
    }

    const result = await paymentService.retryPayment({
      paymentId: id,
      paymentMethod: payment_method,
      paymentGateway: payment_gateway,
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

module.exports = {
  getPayment,
  confirmPayment,
  retryPayment
};
