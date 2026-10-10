const notificationService = require('../services/notification');
const { getAuthenticatedSellerContext } = require('../middlewares/auth');

class NotificationController {
  async getNotifications(req, res) {
    try {
      const { userId } = getAuthenticatedSellerContext(req);
      
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      
      const result = await notificationService.getNotifications(userId, limit, offset);
      res.json({ success: true, data: result.notifications, total: result.total });
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

  /**
   * Bulk mark all unread notifications as read.
   * Replaces the N+1 sequential markAsRead calls.
   */
  async markAllAsRead(req, res) {
    try {
      const { userId } = getAuthenticatedSellerContext(req);
      
      const data = await notificationService.markAllAsRead(userId);
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Get notifications since a timestamp (for reconnection recovery).
   */
  async getNotificationsSince(req, res) {
    try {
      const { userId } = getAuthenticatedSellerContext(req);
      const since = req.query.since;
      
      if (!since) {
        return res.status(400).json({ success: false, error: 'Missing "since" query parameter (ISO timestamp)' });
      }
      
      const data = await notificationService.getNotificationsSince(userId, since);
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

}

module.exports = new NotificationController();
