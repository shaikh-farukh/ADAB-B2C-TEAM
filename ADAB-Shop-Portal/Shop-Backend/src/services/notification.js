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
}

module.exports = new NotificationService();
