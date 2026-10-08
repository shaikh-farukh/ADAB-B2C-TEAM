const orderService = require('../services/adminOrderService');

async function getOrders(req, res) {
  try {
    const { search, status, payment_status, exceptions, page, limit } = req.query;
    const result = await orderService.getAdminOrders({
      search,
      status,
      payment_status,
      exceptions,
      page: page || 1,
      limit: limit || 20
    });

    return res.status(200).json({
      success: true,
      pagination: result.pagination,
      data: result.data
    });
  } catch (error) {
    console.error('Error fetching admin orders:', error.message);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to fetch orders: ' + error.message
    });
  }
}

async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'Order ID is required' });
    }

    const order = await orderService.getAdminOrderById(id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: `Order #${id} not found` });
    }

    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching admin order details:', error.message);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to fetch order details: ' + error.message
    });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!id || !status) {
      return res.status(400).json({
        success: false,
        error: 'BAD_REQUEST',
        message: 'Order ID and status are required'
      });
    }

    const userId = req.user ? req.user.id : null;
    const result = await orderService.updateOrderStatus(id, {
      new_status: status,
      notes: notes || '',
      user_id: userId
    });

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: result
    });
  } catch (error) {
    console.error('Error updating order status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to update order status: ' + error.message
    });
  }
}

module.exports = {
  getOrders,
  getOrderById,
  updateOrderStatus
};
