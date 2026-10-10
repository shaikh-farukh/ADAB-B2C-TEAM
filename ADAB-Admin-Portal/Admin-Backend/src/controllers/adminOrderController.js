const orderService = require('../services/adminOrderService');
const { OrderFilterDto, OrderStatusUpdateDto } = require('../dtos/orderDto');

class AdminOrderController {
  async getOrders(req, res) {
    try {
      const filters = new OrderFilterDto(req.query);
      const result = await orderService.getOrders(filters);
      res.json({ success: true, data: result.orders, pagination: { total: result.totalRecords, page: result.page, limit: result.limit, totalPages: result.totalPages } });
    } catch (error) {
      console.error('Error fetching admin orders:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }
  }

  async getOrderDetails(req, res) {
    try {
      const { id } = req.params;
      const order = await orderService.getOrderDetails(id);
      
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      
      res.json({ success: true, data: order });
    } catch (error) {
      console.error('Error fetching admin order details:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch order details' });
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const statusDto = new OrderStatusUpdateDto(req.body);
      
      const validationError = statusDto.validate();
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }

      const order = await orderService.updateOrderStatus(id, statusDto.status, statusDto.notes);
      
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      res.json({ success: true, message: 'Order status updated successfully', data: order });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ success: false, message: 'Failed to update order status' });
    }
  }
}

module.exports = new AdminOrderController();
