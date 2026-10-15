const orderService = require('../services/orderService');
const { formatError } = require('../utils/errorHandler');

/**
 * Order Controller handling customer order retrieval, lifecycle, tracking, and invoicing
 */

const getCustomerId = (req) =>
  req.headers['x-user-id'] ||
  req.headers['x-session-token'] ||
  (req.query && req.query.customer_id) ||
  (req.body && req.body.customer_id) ||
  null;

async function getOrders(req, res) {
  try {
    const customerId = getCustomerId(req);
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

    const order = await orderService.getOrderById(id);

    if (!order) {
      return res.status(404).json({ status: 'error', message: `Order #${id} not found` });
    }

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
    const customerId = req.headers['x-user-id'] || (req.body && req.body.customer_id) || null;
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

