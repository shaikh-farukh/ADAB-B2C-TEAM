const notificationRepository = require('../repositories/notification');

class NotificationService {
  async getNotifications(userId, limit, offset) {
    if (!userId) throw new Error('User ID is required');
    return await notificationRepository.getNotifications(userId, limit, offset);
  }

  async getUnreadCount(userId) {
    if (!userId) throw new Error('User ID is required');
    return await notificationRepository.getUnreadCount(userId);
  }

  async markAsRead(userId, notificationId) {
    if (!userId) throw new Error('User ID is required');
    if (!notificationId) throw new Error('Notification ID is required');
    const result = await notificationRepository.markAsRead(userId, notificationId);
    if (!result) throw new Error('Notification not found or unauthorized');
    return result;
  }

  async createNotification(userId, title, message, type = 'GENERAL', actionUrl = null) {
    if (!userId || !title || !message) throw new Error('Missing required notification fields');
    
    // Save to database
    const notification = await notificationRepository.createNotification(userId, title, message, type, actionUrl);
    
    // Emit via socket if initialized
    try {
      const io = require('../config/socket').getIO();
      io.to(userId).emit('notification', notification);
    } catch (err) {
      console.warn('Socket.io not initialized or error emitting notification:', err.message);
    }
    
    return notification;
  }
}

module.exports = new NotificationService();
