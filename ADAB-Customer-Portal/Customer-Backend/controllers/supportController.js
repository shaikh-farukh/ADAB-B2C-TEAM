const supportService = require('../services/supportService');
const { formatError } = require('../utils/errorHandler');

const getCustomerId = (req) =>
  req.headers['x-user-id'] ||
  req.headers['x-session-token'] ||
  (req.query && req.query.customer_id) ||
  (req.body && req.body.customer_id) ||
  null;

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
