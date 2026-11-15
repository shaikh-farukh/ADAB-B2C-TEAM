const jwt = require('jsonwebtoken');
const supportService = require('../services/supportService');
const { formatError } = require('../utils/errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'adab_customer_portal_jwt_secret_2026';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getCustomerId = (req) => {
  if (req.userId) return req.userId;
  if (req.user && (req.user.id || req.user.userId)) return req.user.id || req.user.userId;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.id || decoded.userId || decoded.customerId || decoded.sub;
      } catch (err) {
        return null;
      }
    }
  }

  const rawId = req.headers['x-user-id'] ||
    req.headers['x-customer-id'] ||
    (req.query && req.query.customer_id) ||
    (req.body && req.body.customer_id) ||
    null;
  if (!rawId) return null;
  return UUID_REGEX.test(rawId) ? rawId : null;
};

/**
 * Create support ticket (with category, priority, optional order_id, initial message)
 * POST /api/v1/customers/me/support/tickets
 * POST /api/v1/support/tickets
 */
async function createTicket(req, res) {
  try {
    const customerId = getCustomerId(req);
    const {
      category,
      priority,
      order_id,
      subject,
      message,
      initial_message,
      description,
      attachment_url
    } = req.body || {};

    const ticket = await supportService.createTicket(customerId, {
      category,
      priority,
      order_id,
      subject,
      message,
      initial_message,
      description,
      attachment_url
    });

    return res.status(201).json({
      status: 'success',
      message: 'Support ticket created successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Error creating support ticket:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

/**
 * List customer's support tickets
 * GET /api/v1/customers/me/support/tickets
 * GET /api/v1/support/tickets
 */
async function getCustomerTickets(req, res) {
  try {
    const customerId = getCustomerId(req);
    const { status, category, limit, page } = req.query || {};

    const result = await supportService.getCustomerTickets(customerId, {
      status,
      category,
      limit,
      page
    });

    return res.json({
      status: 'success',
      data: result.tickets,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

/**
 * Get ticket details and conversation thread
 * GET /api/v1/customers/me/support/tickets/:id
 * GET /api/v1/support/tickets/:id
 */
async function getTicketDetails(req, res) {
  try {
    const { id } = req.params;
    const customerId = getCustomerId(req);

    const ticket = await supportService.getTicketDetails(customerId, id);

    return res.json({
      status: 'success',
      data: ticket
    });
  } catch (error) {
    console.error(`Error fetching ticket ${req.params.id}:`, error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

/**
 * Send reply message within support ticket
 * POST /api/v1/customers/me/support/tickets/:id/messages
 * POST /api/v1/support/tickets/:id/messages
 */
async function sendTicketMessage(req, res) {
  try {
    const { id } = req.params;
    const customerId = getCustomerId(req);
    const { message, attachment_url } = req.body || {};

    const sentMessage = await supportService.sendTicketMessage(customerId, id, {
      message,
      attachment_url
    });

    return res.status(201).json({
      status: 'success',
      message: 'Support message sent successfully',
      data: sentMessage
    });
  } catch (error) {
    console.error(`Error sending message on ticket ${req.params.id}:`, error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

/**
 * Update ticket status (e.g., resolve/close) or priority
 * PATCH /api/v1/customers/me/support/tickets/:id
 * PATCH /api/v1/support/tickets/:id
 */
async function updateTicketStatus(req, res) {
  try {
    const { id } = req.params;
    const customerId = getCustomerId(req);
    const { status, priority } = req.body || {};

    const updated = await supportService.updateTicketStatus(customerId, id, {
      status,
      priority
    });

    return res.json({
      status: 'success',
      message: 'Support ticket updated successfully',
      data: updated
    });
  } catch (error) {
    console.error(`Error updating ticket ${req.params.id}:`, error.message);
    const formatted = formatError(error);
    const statusCode = error.statusCode || formatted.statusCode || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || formatted.response.message
    });
  }
}

module.exports = {
  createTicket,
  getCustomerTickets,
  getTicketDetails,
  sendTicketMessage,
  updateTicketStatus
};
