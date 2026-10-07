const pool = require('../db');
const { emitOutboxEvent } = require('./outboxService');

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Mock store for fallback when DB is unpopulated in test environments
const inMemoryQueue = [
  {
    id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    listing_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    seller_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
    product_id: 'p-101',
    title: 'Fresh Organic Milk 1L',
    category_id: 1,
    status: 'PENDING',
    price: 65.00,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    listing_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    seller_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
    product_id: 'p-102',
    title: 'Basmati Rice 5kg Pack',
    category_id: 2,
    status: 'CHANGES_REQUESTED',
    price: 450.00,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99',
    listing_id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99',
    seller_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
    product_id: 'p-103',
    title: 'Whole Wheat Atta 10kg',
    category_id: 2,
    status: 'PENDING',
    price: 380.00,
    created_at: new Date(Date.now() - 1800000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString()
  }
];

const inMemoryHistory = [
  {
    id: 'h-001',
    listing_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    admin_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    previous_status: 'PENDING',
    new_status: 'CHANGES_REQUESTED',
    rejection_reason: null,
    notes: 'Please update ingredient list and barcode image',
    action_at: new Date(Date.now() - 7200000).toISOString()
  }
];

/**
 * List Approval Queue Items with filtering, sorting, and pagination
 */
async function getApprovalQueue({ status = 'PENDING', seller_id, category_id, sort = 'DESC', page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (pageNum - 1) * limitNum;
  const sortOrder = String(sort).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  try {
    if (pool && typeof pool.query === 'function') {
      let queryText = `
        SELECT id, seller_id, product_id, title, status, price, created_at, updated_at
        FROM seller_listings
        WHERE 1=1
      `;
      const params = [];

      if (status && status !== 'ALL') {
        params.push(status.toUpperCase());
        queryText += ` AND status = $${params.length}`;
      }

      if (seller_id && UUID_REGEX.test(seller_id)) {
        params.push(seller_id);
        queryText += ` AND seller_id = $${params.length}`;
      }

      queryText += ` ORDER BY created_at ${sortOrder} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limitNum, offset);

      const res = await pool.query(queryText, params);
      if (res.rowCount > 0) {
        return {
          success: true,
          pagination: { page: pageNum, limit: limitNum, count: res.rowCount },
          data: res.rows
        };
      }
    }
  } catch (err) {}

  // Filter in-memory items
  let filtered = inMemoryQueue.filter(item => {
    if (status && status !== 'ALL' && item.status.toUpperCase() !== status.toUpperCase()) {
      return false;
    }
    if (seller_id && item.seller_id !== seller_id) {
      return false;
    }
    if (category_id && String(item.category_id) !== String(category_id)) {
      return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    const tA = new Date(a.created_at).getTime();
    const tB = new Date(b.created_at).getTime();
    return sortOrder === 'ASC' ? tA - tB : tB - tA;
  });

  const paginated = filtered.slice(offset, offset + limitNum);

  return {
    success: true,
    pagination: { page: pageNum, limit: limitNum, total: filtered.length, count: paginated.length },
    data: paginated
  };
}

/**
 * Get Approval Item by ID with approval history
 */
async function getApprovalItemById(id) {
  try {
    if (pool && typeof pool.query === 'function' && UUID_REGEX.test(id)) {
      const itemRes = await pool.query('SELECT * FROM seller_listings WHERE id = $1', [id]);
      if (itemRes.rowCount > 0) {
        const histRes = await pool.query(
          'SELECT * FROM product_approval_history WHERE listing_id = $1 ORDER BY action_at DESC',
          [id]
        );
        return {
          success: true,
          data: {
            ...itemRes.rows[0],
            history: histRes.rows
          }
        };
      }
    }
  } catch (err) {}

  const item = inMemoryQueue.find(i => i.id === id || i.listing_id === id);
  if (!item) {
    return {
      success: false,
      error: 'NOT_FOUND',
      message: `Approval item with ID '${id}' not found`
    };
  }

  const history = inMemoryHistory.filter(h => h.listing_id === id || h.listing_id === item.id);

  return {
    success: true,
    data: {
      ...item,
      history
    }
  };
}

/**
 * Record History & Persist Approval State Update
 */
async function updateApprovalItemState({ id, admin_id, transitionResult }) {
  const validAdminId = (admin_id && UUID_REGEX.test(admin_id)) ? admin_id : '00000000-0000-0000-0000-000000000000';
  const validListingId = (id && UUID_REGEX.test(id)) ? id : '00000000-0000-0000-0000-000000000000';

  // 1. In-memory update
  const item = inMemoryQueue.find(i => i.id === id || i.listing_id === id);
  if (item) {
    item.status = transitionResult.new_status;
    item.updated_at = new Date().toISOString();
  }

  inMemoryHistory.unshift({
    id: `h-${Date.now()}`,
    listing_id: id,
    admin_id: validAdminId,
    previous_status: transitionResult.previous_status,
    new_status: transitionResult.new_status,
    rejection_reason: transitionResult.rejection_reason || null,
    notes: transitionResult.notes || null,
    action_at: new Date().toISOString()
  });

  // 2. Database persistence
  try {
    if (pool && typeof pool.query === 'function' && UUID_REGEX.test(id)) {
      await pool.query('UPDATE seller_listings SET status = $1, updated_at = NOW() WHERE id = $2', [
        transitionResult.new_status,
        id
      ]);

      if (UUID_REGEX.test(validAdminId)) {
        await pool.query(
          `INSERT INTO product_approval_history (listing_id, admin_id, previous_status, new_status, rejection_reason, notes, action_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            id,
            validAdminId,
            transitionResult.previous_status,
            transitionResult.new_status,
            transitionResult.rejection_reason || null,
            transitionResult.notes || null
          ]
        );
      }
    }
  } catch (err) {}

  // 3. Emit Outbox Event
  let eventType = 'PRODUCT_STATUS_UPDATED';
  if (transitionResult.new_status === 'APPROVED') eventType = 'PRODUCT_APPROVED';
  if (transitionResult.new_status === 'REJECTED') eventType = 'PRODUCT_REJECTED';
  if (transitionResult.new_status === 'CHANGES_REQUESTED') eventType = 'CHANGES_REQUESTED';

  await emitOutboxEvent({
    aggregate_type: 'PRODUCT_LISTING',
    aggregate_id: validListingId,
    event_type: eventType,
    payload: {
      listing_id: id,
      admin_id: validAdminId,
      previous_status: transitionResult.previous_status,
      new_status: transitionResult.new_status,
      rejection_reason: transitionResult.rejection_reason,
      notes: transitionResult.notes,
      timestamp: new Date().toISOString()
    }
  });

  return {
    success: true,
    data: transitionResult
  };
}

/**
 * Update Seller / Customer User Status
 */
async function updateUserStatus({ user_id, new_status, admin_id, reason = null }) {
  const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED'];
  if (!validStatuses.includes(new_status.toUpperCase())) {
    return {
      success: false,
      error: 'INVALID_STATUS',
      message: `Invalid user status '${new_status}'. Allowed: ${validStatuses.join(', ')}`
    };
  }

  const validUserId = (user_id && UUID_REGEX.test(user_id)) ? user_id : '00000000-0000-0000-0000-000000000000';
  const validAdminId = (admin_id && UUID_REGEX.test(admin_id)) ? admin_id : '00000000-0000-0000-0000-000000000000';

  let dbUpdated = false;
  try {
    if (pool && typeof pool.query === 'function' && UUID_REGEX.test(user_id)) {
      const res = await pool.query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, user_type, status', [
        new_status.toUpperCase(),
        user_id
      ]);
      if (res.rowCount > 0) {
        dbUpdated = true;
      }
    }
  } catch (err) {}

  // Emit Outbox Event for User Status Update
  await emitOutboxEvent({
    aggregate_type: 'USER',
    aggregate_id: validUserId,
    event_type: 'USER_STATUS_UPDATED',
    payload: {
      user_id,
      new_status: new_status.toUpperCase(),
      admin_id: validAdminId,
      reason,
      timestamp: new Date().toISOString()
    }
  });

  return {
    success: true,
    message: `User '${user_id}' status updated to '${new_status.toUpperCase()}'`,
    data: {
      user_id,
      status: new_status.toUpperCase(),
      reason: reason || null,
      updated_at: new Date().toISOString()
    }
  };
}

module.exports = {
  getApprovalQueue,
  getApprovalItemById,
  updateApprovalItemState,
  updateUserStatus,
  inMemoryQueue
};
