const notificationRepository = require('../repositories/notification');

/**
 * Notification Service
 * 
 * Manages notification lifecycle. Socket.IO delivery is NOT done here —
 * it is handled by the PostgreSQL trigger on the `notifications` table
 * which fires pg_notify → pgListener.js → Socket.IO emit.
 * 
 * This guarantees that notifications from ANY source (this portal, 
 * Admin portal, Customer portal, background jobs) are delivered in real-time.
 */
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

  /**
   * Mark all unread notifications as read for a seller.
   * Replaces the N+1 individual markAsRead calls from the frontend.
   */
  async markAllAsRead(userId) {
    if (!userId) throw new Error('User ID is required');
    return await notificationRepository.markAllAsRead(userId);
  }

  /**
   * Create a notification. Persisted to DB FIRST, then the PostgreSQL
   * trigger handles Socket.IO delivery automatically.
   * 
   * NOTE: No manual socket emit here. This is intentional.
   * The DB trigger ensures delivery regardless of which portal/service
   * creates the notification.
   */
  async createNotification(userId, title, message, type = 'GENERAL', actionUrl = null) {
    if (!userId || !title || !message) throw new Error('Missing required notification fields');
    return await notificationRepository.createNotification(userId, title, message, type, actionUrl);
  }

  /**
   * Get notifications created after a timestamp.
   * Used for reconnection recovery — catches missed notifications.
   */
  async getNotificationsSince(userId, sinceTimestamp) {
    if (!userId) throw new Error('User ID is required');
    if (!sinceTimestamp) throw new Error('Timestamp is required');
    return await notificationRepository.getNotificationsSince(userId, sinceTimestamp);
  }
}

module.exports = new NotificationService();
