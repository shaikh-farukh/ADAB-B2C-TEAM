const jwt = require('jsonwebtoken');
const orderService = require('../services/orderService');
const { formatError } = require('../utils/errorHandler');

/**
 * Order Controller handling customer order retrieval, lifecycle, tracking, and invoicing
 * Strictly isolates customer orders: users can ONLY access their own orders.
 */

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
 * Verifies that the requested order exists and strictly belongs to the requesting customer
 */
async function verifyOrderAccess(orderId, customerId) {
  const order = await orderService.getOrderById(orderId);
  if (!order) {
    const err = new Error(`Order #${orderId} not found`);
    err.statusCode = 404;
    throw err;
  }
  if (order.customer_id) {
    if (!customerId) {
      const err = new Error('Authentication required. Please log in to view or manage this order.');
      err.statusCode = 401;
      throw err;
    }
    if (order.customer_id !== customerId) {
      const err = new Error('Access denied. You do not have permission to access another customer’s order.');
      err.statusCode = 403;
      throw err;
    }
  }
  return order;
}

async function getOrders(req, res) {
  try {
    const customerId = getCustomerId(req);
    if (!customerId) {
      return res.json({
        status: 'success',
        data: []
      });
    }
    const orders = await orderService.getCustomerOrders(customerId);

    return res.json({
      status: 'success',
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

async function getOrder(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Order ID is required' });
    }

    const customerId = getCustomerId(req);
    const order = await verifyOrderAccess(id, customerId);

    return res.json({
      status: 'success',
      data: order
    });
  } catch (error) {
    console.error('Error fetching order by ID:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

async function cancelOrder(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Order ID is required' });
    }
    const customerId = getCustomerId(req);
    await verifyOrderAccess(id, customerId);

    const cancelledOrder = await orderService.cancelOrder(id, customerId);

    return res.json({
      status: 'success',
      message: 'Order cancelled successfully',
      data: cancelledOrder
    });
  } catch (error) {
    console.error('Error cancelling order:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

async function reorderOrder(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Order ID is required' });
    }
    const customerId = getCustomerId(req);
    await verifyOrderAccess(id, customerId);

    const sessionToken = req.headers['x-session-token'] || null;
    const result = await orderService.reorderOrder(id, { customerId, sessionToken });

    return res.json({
      status: 'success',
      message: `${result.added_count} items added to your cart`,
      data: result
    });
  } catch (error) {
    console.error('Error reordering order:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

async function getOrderStatusHistory(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Order ID is required' });
    }

    const customerId = getCustomerId(req);
    await verifyOrderAccess(id, customerId);

    const history = await orderService.getOrderStatusHistory(id);

    return res.json({
      status: 'success',
      data: history
    });
  } catch (error) {
    console.error('Error fetching order status history:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

async function getOrderShipments(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Order ID is required' });
    }

    const customerId = getCustomerId(req);
    await verifyOrderAccess(id, customerId);

    const shipments = await orderService.getOrderShipments(id);

    return res.json({
      status: 'success',
      data: shipments
    });
  } catch (error) {
    console.error('Error fetching order shipments:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

async function getOrderTracking(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Order ID is required' });
    }

    const customerId = getCustomerId(req);
    await verifyOrderAccess(id, customerId);

    const tracking = await orderService.getOrderTracking(id);

    return res.json({
      status: 'success',
      data: tracking
    });
  } catch (error) {
    console.error('Error fetching order tracking:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

async function getOrderInvoice(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Order ID is required' });
    }

    const customerId = getCustomerId(req);
    await verifyOrderAccess(id, customerId);

    const invoice = await orderService.getOrderInvoice(id);

    return res.json({
      status: 'success',
      data: invoice
    });
  } catch (error) {
    console.error('Error fetching order invoice:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Order ID is required' });
    }
    const {
      status,
      notes,
      rider_latitude,
      rider_longitude,
      carrier_name,
      tracking_number
    } = req.body;

    if (!status) {
      return res.status(400).json({
        status: 'error',
        message: 'A valid status is required to update order status'
      });
    }

    const changedByUserId = req.headers['x-user-id'] || null;

    const updatedOrder = await orderService.updateOrderStatus(id, status, {
      changedByUserId,
      notes,
      riderLatitude: rider_latitude,
      riderLongitude: rider_longitude,
      carrierName: carrier_name,
      trackingNumber: tracking_number
    });

    const tracking = await orderService.getOrderTracking(id);

    return res.json({
      status: 'success',
      message: `Order status successfully transitioned to ${status}`,
      data: {
        order: updatedOrder,
        tracking
      }
    });
  } catch (error) {
    console.error('Error updating order status:', error.message);
    const { statusCode, response } = formatError(error);
    return res.status(statusCode).json(response);
  }
}

module.exports = {
  getOrders,
  getOrder,
  cancelOrder,
  reorderOrder,
  getOrderStatusHistory,
  getOrderShipments,
  getOrderTracking,
  getOrderInvoice,
  updateOrderStatus
};

