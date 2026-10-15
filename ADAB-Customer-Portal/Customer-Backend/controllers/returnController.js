const returnService = require('../services/returnService');
const { formatError } = require('../utils/errorHandler');

const getCustomerId = (req) =>
  req.headers['x-user-id'] ||
  req.headers['x-session-token'] ||
  (req.query && req.query.customer_id) ||
  (req.body && req.body.customer_id) ||
  null;

/**
 * Submit item-level return request with reason and quantities
 * POST /api/v1/customers/me/orders/:id/return
 * POST /api/v1/orders/:id/return
 */
async function createOrderReturn(req, res) {
  try {
    const { id: orderId } = req.params;
    const customerId = getCustomerId(req);
    const { reason, items, evidence_url, refund_mode } = req.body || {};

    const returnRecord = await returnService.createOrderReturn(orderId, {
      customerId,
      reason,
      items,
      evidence_url,
      refund_mode
    });

    return res.status(201).json({
      status: 'success',
      message: 'Return request submitted successfully',
      data: returnRecord
    });
  } catch (error) {
    console.error('Error creating order return:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

/**
 * List all return requests for the authenticated customer
 * GET /api/v1/customers/me/returns
 */
async function getCustomerReturns(req, res) {
  try {
    const customerId = getCustomerId(req);
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const returns = await returnService.getCustomerReturns(customerId, { limit, offset });

    return res.json({
      status: 'success',
      data: returns
    });
  } catch (error) {
    console.error('Error fetching customer returns:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

/**
 * Get detailed return status and item breakdown
 * GET /api/v1/customers/me/returns/:id
 */
async function getReturnById(req, res) {
  try {
    const { id } = req.params;
    const customerId = getCustomerId(req);

    const returnDetail = await returnService.getReturnById(id, customerId);

    return res.json({
      status: 'success',
      data: returnDetail
    });
  } catch (error) {
    console.error('Error fetching return by ID:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

/**
 * Cancel an active return request
 * POST /api/v1/customers/me/returns/:id/cancel
 */
async function cancelReturn(req, res) {
  try {
    const { id } = req.params;
    const customerId = getCustomerId(req);

    const cancelledReturn = await returnService.cancelReturn(id, customerId);

    return res.json({
      status: 'success',
      message: 'Return request cancelled successfully',
      data: cancelledReturn
    });
  } catch (error) {
    console.error('Error cancelling return:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

/**
 * Attach photo/document evidence URL to return request
 * POST /api/v1/customers/me/returns/:id/evidence
 */
async function uploadReturnEvidence(req, res) {
  try {
    const { id } = req.params;
    const customerId = getCustomerId(req);
    const { evidence_url, notes } = req.body || {};

    const result = await returnService.attachReturnEvidence(id, customerId, {
      evidence_url,
      notes
    });

    return res.json({
      status: 'success',
      message: 'Return evidence attached successfully',
      data: result
    });
  } catch (error) {
    console.error('Error attaching return evidence:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

/**
 * List all refund statuses for the authenticated customer
 * GET /api/v1/customers/me/refunds
 */
async function getCustomerRefunds(req, res) {
  try {
    const customerId = getCustomerId(req);
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const refunds = await returnService.getCustomerRefunds(customerId, { limit, offset });

    return res.json({
      status: 'success',
      data: refunds
    });
  } catch (error) {
    console.error('Error fetching refunds:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

/**
 * Get specific refund details by ID
 * GET /api/v1/customers/me/refunds/:id
 */
async function getRefundById(req, res) {
  try {
    const { id } = req.params;
    const customerId = getCustomerId(req);

    const refund = await returnService.getRefundById(id, customerId);

    return res.json({
      status: 'success',
      data: refund
    });
  } catch (error) {
    console.error('Error fetching refund by ID:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

/**
 * Update return status by admin or seller with refund lifecycle synchronization
 * PATCH/POST /api/v1/customers/me/returns/:id/status
 * PATCH/POST /api/v1/returns/:id/status
 */
async function updateReturnStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, notes, rejection_reason, gateway_refund_id } = req.body || {};

    if (!status) {
      return res.status(400).json({
        status: 'error',
        message: 'New status is required'
      });
    }

    const updated = await returnService.updateReturnStatus(id, status, {
      notes,
      rejection_reason,
      gateway_refund_id
    });

    return res.json({
      status: 'success',
      message: `Return status successfully updated to ${status}`,
      data: updated
    });
  } catch (error) {
    console.error('Error updating return status:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

module.exports = {
  createOrderReturn,
  getCustomerReturns,
  getReturnById,
  cancelReturn,
  uploadReturnEvidence,
  getCustomerRefunds,
  getRefundById,
  updateReturnStatus
};

