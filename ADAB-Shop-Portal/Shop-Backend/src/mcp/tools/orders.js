const sellerService = require('../../services/seller');
const pool = require('../../../db');

// Legal finite state machine progression
const LEGAL_TRANSITIONS = {
  NEW: ['ACCEPTED', 'CANCELLED'],
  PLACED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PACKED', 'CANCELLED'],
  PACKED: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED: [], // Terminal
  CANCELLED: []  // Terminal
};

/**
 * 1. Tool: adab_list_orders
 * Tier: TIER_1_READ
 */
const listOrdersTool = {
  name: 'adab_list_orders',
  description: 'Retrieve real-time customer orders placed at the store with optional filtering by status, search keyword, or pagination.',
  tier: 'TIER_1_READ',
  parameters: {
    type: 'OBJECT',
    properties: {
      status: {
        type: 'STRING',
        enum: ['ALL', 'NEW', 'ACCEPTED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
        description: 'Filter orders by status. Use ALL to retrieve all active and past orders.'
      },
      limit: {
        type: 'INTEGER',
        description: 'Maximum number of orders to return (default 10, max 50).'
      },
      page: {
        type: 'INTEGER',
        description: 'Page number for pagination (starts at 1).'
      },
      searchTerm: {
        type: 'STRING',
        description: 'Search by order number (e.g. ORD-108) or customer name.'
      }
    }
  },
  handler: async (args, authContext) => {
    const { storeId } = authContext;
    const filters = {
      status: args.status && args.status !== 'ALL' ? args.status : null,
      limit: args.limit ? Math.min(Math.max(1, parseInt(args.limit, 10)), 50) : 10,
      page: args.page ? Math.max(1, parseInt(args.page, 10)) : 1,
      search: args.searchTerm || null
    };

    const orders = await sellerService.getSellerOrders(storeId, filters);

    return {
      storeId,
      totalReturned: orders.length,
      page: filters.page,
      limit: filters.limit,
      orders: orders.map(o => ({
        orderId: o.real_id || o.seller_order_id || o.id,
        orderNumber: o.order_number || o.id || 'N/A',
        status: (o.seller_order_status || o.status || 'NEW').toUpperCase(),
        amount: Number(o.amount || o.grand_total || o.store_subtotal || 0),
        customer: o.customer || 'Customer',
        itemSummary: o.item_summary || 'Items',
        createdAt: o.created_at || o.seller_order_created_at
      }))
    };
  }
};

/**
 * 2. Tool: adab_update_order_state
 * Tier: TIER_2_MUTATIVE
 */
const updateOrderStateTool = {
  name: 'adab_update_order_state',
  description: 'Progress an order through fulfillment lifecycle states: ACCEPTED -> PACKED -> DISPATCHED -> DELIVERED, or cancel it.',
  tier: 'TIER_2_MUTATIVE',
  parameters: {
    type: 'OBJECT',
    properties: {
      orderId: {
        type: 'STRING',
        description: 'The order identifier (e.g. order UUID, order_number like "ORD-108", or "108").'
      },
      targetStatus: {
        type: 'STRING',
        enum: ['ACCEPTED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
        description: 'The new target status to transition the order into.'
      },
      reason: {
        type: 'STRING',
        description: 'Optional note or cancellation reason.'
      }
    },
    required: ['orderId', 'targetStatus']
  },
  handler: async (args, authContext) => {
    const { storeId } = authContext;
    const { orderId, targetStatus } = args;

    if (!orderId || !targetStatus) {
      throw new Error('Missing required arguments: orderId and targetStatus are mandatory.');
    }

    const cleanId = orderId.toString().replace(/^#/, '');
    const cleanTarget = targetStatus.toUpperCase();

    // 1. Fetch current status to enforce state-machine transitions
    const existing = await pool.query(`
      SELECT so.id, so.status as current_status, o.order_number
      FROM seller_orders so
      JOIN orders o ON so.parent_order_id = o.id
      WHERE (so.id::text = $1 OR o.id::text = $1 OR o.order_number = $1 OR o.order_number = ('ORD-' || $1))
        AND so.store_id = $2::uuid
    `, [cleanId, storeId]);

    if (existing.rows.length === 0) {
      throw new Error(`OrderNotFound: Order '${orderId}' not found in store '${storeId}'.`);
    }

    const sellerOrderId = existing.rows[0].id;
    const currentStatus = (existing.rows[0].current_status || 'NEW').toUpperCase();
    const orderNumber = existing.rows[0].order_number || orderId;

    // 2. Validate state machine transition
    if (currentStatus === cleanTarget) {
      return {
        success: true,
        orderId: sellerOrderId,
        orderNumber,
        status: currentStatus,
        message: `Order ${orderNumber} is already in status '${currentStatus}'.`
      };
    }

    const allowedNext = LEGAL_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(cleanTarget)) {
      throw new Error(
        `INVALID_TRANSITION: Cannot transition order ${orderNumber} from '${currentStatus}' directly to '${cleanTarget}'. Legal progression: NEW -> ACCEPTED -> PACKED -> DISPATCHED -> DELIVERED.`
      );
    }

    // 3. Execute update via sellerService using the exact sellerOrderId
    const updated = await sellerService.updateOrderStatus(sellerOrderId, cleanTarget, storeId);

    return {
      success: true,
      orderId: sellerOrderId,
      orderNumber,
      previousStatus: currentStatus,
      newStatus: cleanTarget,
      message: `Order ${orderNumber} successfully updated from ${currentStatus} to ${cleanTarget}.`,
      updatedAt: new Date().toISOString()
    };
  }
};

/**
 * Register all order tools into the registry
 */
function registerOrderTools(registry) {
  registry.register(listOrdersTool);
  registry.register(updateOrderStateTool);
}

module.exports = {
  listOrdersTool,
  updateOrderStateTool,
  registerOrderTools
};
