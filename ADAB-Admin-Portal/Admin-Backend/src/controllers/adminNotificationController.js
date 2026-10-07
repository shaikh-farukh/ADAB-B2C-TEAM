const notificationService = require('../services/adminNotificationService');

exports.getNotifications = async (req, res) => {
  try {
    const data = await notificationService.getNotifications(req.user.userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const data = await notificationService.getUnreadCount(req.user.userId);
    res.status(200).json({ success: true, count: data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user.userId);
    res.status(200).json({ success: true, message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
