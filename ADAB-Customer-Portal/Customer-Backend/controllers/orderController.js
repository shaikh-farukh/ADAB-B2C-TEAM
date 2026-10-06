const orderService = require('../services/orderService');
const { formatError } = require('../utils/errorHandler');

/**
 * Order Controller handling customer order retrieval and status
 */

async function getOrders(req, res) {
  try {
    const customerId = req.query.customer_id || null;
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

module.exports = {
  getOrders,
  getOrder
};
