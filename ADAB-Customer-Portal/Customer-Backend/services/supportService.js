const pool = require('../db');
const customerService = require('./customerService');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];

/**
 * Generate human-readable ticket number (e.g., TCK-M4K7-8291)
 */
function generateTicketNumber() {
  const timePart = Date.now().toString(36).toUpperCase().slice(-4);
  const randPart = Math.floor(1000 + Math.random() * 9000);
  return `TCK-${timePart}-${randPart}`;
}

/**
 * Create a new support ticket
 * POST /api/v1/customers/me/support/tickets
 */
async function createTicket(rawCustomerId, ticketData = {}) {
  const userId = await customerService.resolveCustomerUserId(rawCustomerId);
  if (!userId) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }

  const {
    category,
    priority = 'MEDIUM',
    order_id,
    subject,
    message,
    initial_message,
    description,
    attachment_url
  } = ticketData;

  if (!category || typeof category !== 'string' || !category.trim()) {
    const err = new Error('Ticket category is required');
    err.statusCode = 400;
    throw err;
  }

  const normalizedCategory = category.trim().toUpperCase();

  const normalizedPriority = String(priority).trim().toUpperCase();
  if (!VALID_PRIORITIES.includes(normalizedPriority)) {
    const err = new Error(`Invalid priority '${priority}'. Allowed: ${VALID_PRIORITIES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  let validatedOrderId = null;
  let orderInfo = null;
  if (order_id) {
    if (!UUID_REGEX.test(order_id)) {
      const err = new Error('Invalid order_id format (must be a UUID)');
      err.statusCode = 400;
      throw err;
    }

    const orderRes = await pool.query(
      `SELECT id, customer_id, order_number, order_status, grand_total as total_amount FROM orders WHERE id = $1`,
      [order_id]
    );

    if (orderRes.rows.length === 0) {
      const err = new Error('Referenced order not found');
      err.statusCode = 404;
      throw err;
    }

    if (orderRes.rows[0].customer_id !== userId) {
      const err = new Error('You are not authorized to link a ticket to another customer’s order');
      err.statusCode = 403;
      throw err;
    }

    validatedOrderId = orderRes.rows[0].id;
    orderInfo = orderRes.rows[0];
  }

  let ticketNumber = generateTicketNumber();
  let createdTicket = null;

  // Insert ticket with retry if number collides (extremely rare)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ticketRes = await pool.query(
        `INSERT INTO support_tickets (
          ticket_number,
          user_id,
          user_role,
          order_id,
          category,
          priority,
          status
        ) VALUES ($1, $2, 'CUSTOMER', $3, $4, $5, 'OPEN')
        RETURNING *`,
        [ticketNumber, userId, validatedOrderId, normalizedCategory, normalizedPriority]
      );
      createdTicket = ticketRes.rows[0];
      break;
    } catch (insertErr) {
      if (insertErr.code === '23505' && attempt < 2) {
        ticketNumber = generateTicketNumber();
        continue;
      }
      throw insertErr;
    }
  }

  // Handle optional initial message
  let messageContent = (message || initial_message || description || '').trim();
  if (subject && subject.trim() && !messageContent.includes(subject.trim())) {
    messageContent = subject.trim() + (messageContent ? '\n\n' + messageContent : '');
  }

  const messages = [];
  if (messageContent) {
    const msgRes = await pool.query(
      `INSERT INTO support_messages (
        ticket_id,
        sender_user_id,
        message,
        attachment_url,
        is_internal_admin_note
      ) VALUES ($1, $2, $3, $4, false)
      RETURNING *`,
      [createdTicket.id, userId, messageContent, attachment_url || null]
    );

    const userRes = await pool.query(`SELECT full_name, user_type FROM users WHERE id = $1`, [userId]);
    messages.push({
      ...msgRes.rows[0],
      sender_name: userRes.rows[0]?.full_name || 'Customer',
      sender_role: userRes.rows[0]?.user_type || 'CUSTOMER'
    });
  }

  return {
    ...createdTicket,
    order: orderInfo,
    messages
  };
}

/**
 * List support tickets for customer with pagination & filters
 * GET /api/v1/customers/me/support/tickets
 */
async function getCustomerTickets(rawCustomerId, query = {}) {
  const userId = await customerService.resolveCustomerUserId(rawCustomerId);
  if (!userId) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const conditions = ['t.user_id = $1'];
  const params = [userId];
  let paramIdx = 2;

  if (query.status && query.status.trim()) {
    conditions.push(`t.status = $${paramIdx}`);
    params.push(query.status.trim().toUpperCase());
    paramIdx++;
  }

  if (query.category && query.category.trim()) {
    conditions.push(`t.category = $${paramIdx}`);
    params.push(query.category.trim().toUpperCase());
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const countQuery = `SELECT COUNT(*)::int as total FROM support_tickets t WHERE ${whereClause}`;
  const countRes = await pool.query(countQuery, params);
  const total = countRes.rows[0]?.total || 0;

  const dataQuery = `
    SELECT 
      t.id,
      t.ticket_number,
      t.user_id,
      t.user_role,
      t.order_id,
      t.category,
      t.priority,
      t.status,
      t.assigned_admin_id,
      t.created_at,
      t.resolved_at,
      o.order_number,
      o.order_status,
      o.grand_total as order_total_amount,
      COALESCE(msg_stats.message_count, 0)::int as message_count,
      msg_stats.last_message,
      msg_stats.last_message_at
    FROM support_tickets t
    LEFT JOIN orders o ON o.id = t.order_id
    LEFT JOIN LATERAL (
      SELECT 
        COUNT(*)::int as message_count,
        (ARRAY_AGG(m.message ORDER BY m.created_at DESC))[1] as last_message,
        MAX(m.created_at) as last_message_at
      FROM support_messages m
      WHERE m.ticket_id = t.id 
        AND (m.is_internal_admin_note = false OR m.is_internal_admin_note IS NULL)
    ) msg_stats ON true
    WHERE ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  params.push(limit, offset);
  const dataRes = await pool.query(dataQuery, params);

  return {
    tickets: dataRes.rows,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
}

/**
 * Get ticket details and conversation thread
 * GET /api/v1/customers/me/support/tickets/:id
 */
async function getTicketDetails(rawCustomerId, ticketId) {
  const userId = await customerService.resolveCustomerUserId(rawCustomerId);
  if (!userId) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }

  if (!ticketId || !UUID_REGEX.test(ticketId)) {
    const err = new Error('Invalid ticket ID format (must be a UUID)');
    err.statusCode = 400;
    throw err;
  }

  const ticketRes = await pool.query(
    `SELECT 
      t.id,
      t.ticket_number,
      t.user_id,
      t.user_role,
      t.order_id,
      t.category,
      t.priority,
      t.status,
      t.assigned_admin_id,
      t.created_at,
      t.resolved_at,
      o.order_number,
      o.order_status,
      o.grand_total as order_total_amount,
      o.created_at as order_created_at
    FROM support_tickets t
    LEFT JOIN orders o ON o.id = t.order_id
    WHERE t.id = $1`,
    [ticketId]
  );

  if (ticketRes.rows.length === 0) {
    const err = new Error('Support ticket not found');
    err.statusCode = 404;
    throw err;
  }

  const ticket = ticketRes.rows[0];
  if (ticket.user_id !== userId) {
    const err = new Error('You do not have permission to view this support ticket');
    err.statusCode = 403;
    throw err;
  }

  const messagesRes = await pool.query(
    `SELECT 
      m.id,
      m.ticket_id,
      m.sender_user_id,
      m.message,
      m.attachment_url,
      m.created_at,
      u.full_name as sender_name,
      u.user_type as sender_role
    FROM support_messages m
    LEFT JOIN users u ON u.id = m.sender_user_id
    WHERE m.ticket_id = $1 
      AND (m.is_internal_admin_note = false OR m.is_internal_admin_note IS NULL)
    ORDER BY m.created_at ASC`,
    [ticketId]
  );

  return {
    ...ticket,
    messages: messagesRes.rows
  };
}

/**
 * Send reply message within support ticket
 * POST /api/v1/customers/me/support/tickets/:id/messages
 */
async function sendTicketMessage(rawCustomerId, ticketId, messageData = {}) {
  const userId = await customerService.resolveCustomerUserId(rawCustomerId);
  if (!userId) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }

  if (!ticketId || !UUID_REGEX.test(ticketId)) {
    const err = new Error('Invalid ticket ID format (must be a UUID)');
    err.statusCode = 400;
    throw err;
  }

  const ticketRes = await pool.query(
    `SELECT id, user_id, status FROM support_tickets WHERE id = $1`,
    [ticketId]
  );

  if (ticketRes.rows.length === 0) {
    const err = new Error('Support ticket not found');
    err.statusCode = 404;
    throw err;
  }

  const ticket = ticketRes.rows[0];
  if (ticket.user_id !== userId) {
    const err = new Error('You do not have permission to post messages to this ticket');
    err.statusCode = 403;
    throw err;
  }

  if (ticket.status === 'CLOSED') {
    const err = new Error('Cannot reply to a closed ticket. Please create a new ticket.');
    err.statusCode = 400;
    throw err;
  }

  const { message, attachment_url } = messageData;
  if (!message || typeof message !== 'string' || !message.trim()) {
    const err = new Error('Message text is required');
    err.statusCode = 400;
    throw err;
  }

  const msgRes = await pool.query(
    `INSERT INTO support_messages (
      ticket_id,
      sender_user_id,
      message,
      attachment_url,
      is_internal_admin_note
    ) VALUES ($1, $2, $3, $4, false)
    RETURNING *`,
    [ticketId, userId, message.trim(), attachment_url || null]
  );

  // If ticket was waiting for customer or marked resolved, reactivate it to IN_PROGRESS
  if (ticket.status === 'WAITING_CUSTOMER' || ticket.status === 'RESOLVED') {
    await pool.query(
      `UPDATE support_tickets 
       SET status = 'IN_PROGRESS', resolved_at = NULL 
       WHERE id = $1`,
      [ticketId]
    );
  }

  const userRes = await pool.query(`SELECT full_name, user_type FROM users WHERE id = $1`, [userId]);

  return {
    ...msgRes.rows[0],
    sender_name: userRes.rows[0]?.full_name || 'Customer',
    sender_role: userRes.rows[0]?.user_type || 'CUSTOMER'
  };
}

/**
 * Update ticket status (e.g., resolve/close) or priority
 * PATCH /api/v1/customers/me/support/tickets/:id
 */
async function updateTicketStatus(rawCustomerId, ticketId, updateData = {}) {
  const userId = await customerService.resolveCustomerUserId(rawCustomerId);
  if (!userId) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }

  if (!ticketId || !UUID_REGEX.test(ticketId)) {
    const err = new Error('Invalid ticket ID format (must be a UUID)');
    err.statusCode = 400;
    throw err;
  }

  const ticketRes = await pool.query(
    `SELECT * FROM support_tickets WHERE id = $1`,
    [ticketId]
  );

  if (ticketRes.rows.length === 0) {
    const err = new Error('Support ticket not found');
    err.statusCode = 404;
    throw err;
  }

  const ticket = ticketRes.rows[0];
  if (ticket.user_id !== userId) {
    const err = new Error('You do not have permission to update this support ticket');
    err.statusCode = 403;
    throw err;
  }

  let newStatus = ticket.status;
  if (updateData.status) {
    const norm = String(updateData.status).trim().toUpperCase();
    if (!VALID_STATUSES.includes(norm)) {
      const err = new Error(`Invalid status '${updateData.status}'. Allowed: ${VALID_STATUSES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    newStatus = norm;
  }

  let newPriority = ticket.priority;
  if (updateData.priority) {
    const norm = String(updateData.priority).trim().toUpperCase();
    if (!VALID_PRIORITIES.includes(norm)) {
      const err = new Error(`Invalid priority '${updateData.priority}'. Allowed: ${VALID_PRIORITIES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    newPriority = norm;
  }

  const updateRes = await pool.query(
    `UPDATE support_tickets
     SET 
       status = $1::varchar,
       priority = $2::varchar,
       resolved_at = CASE 
         WHEN $1::varchar IN ('RESOLVED', 'CLOSED') THEN COALESCE(resolved_at, NOW())
         WHEN $1::varchar = 'OPEN' THEN NULL
         ELSE resolved_at
       END
     WHERE id = $3
     RETURNING *`,
    [newStatus, newPriority, ticketId]
  );

  return updateRes.rows[0];
}

module.exports = {
  createTicket,
  getCustomerTickets,
  getTicketDetails,
  sendTicketMessage,
  updateTicketStatus,
  generateTicketNumber
};
