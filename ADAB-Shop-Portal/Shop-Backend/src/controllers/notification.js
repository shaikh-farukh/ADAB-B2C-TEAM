const notificationService = require('../services/notification');
const { getAuthenticatedSellerContext } = require('../middlewares/auth');

class NotificationController {
  async getNotifications(req, res) {
    try {
      const { userId } = getAuthenticatedSellerContext(req);
      
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      
      const notifications = await notificationService.getNotifications(userId, limit, offset);
      res.json({ success: true, data: notifications });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getUnreadCount(req, res) {
    try {
      const { userId } = getAuthenticatedSellerContext(req);
      
      const data = await notificationService.getUnreadCount(userId);
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async markAsRead(req, res) {
    try {
      const { userId } = getAuthenticatedSellerContext(req);
      
      const notificationId = req.params.id;
      const data = await notificationService.markAsRead(userId, notificationId);
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async createTestNotification(req, res) {
    try {
      const { userId } = getAuthenticatedSellerContext(req);
      const { title, message, type } = req.body;
      
      const notification = await notificationService.createNotification(
        userId, 
        title || 'Test Notification', 
        message || 'This is a test live push notification.', 
        type || 'GENERAL'
      );
      
      res.json({ success: true, data: notification });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

module.exports = new NotificationController();
