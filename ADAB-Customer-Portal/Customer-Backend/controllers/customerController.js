const customerService = require('../services/customerService');
const { formatError } = require('../utils/errorHandler');

const getUserId = (req) =>
  req.headers['x-user-id'] ||
  (req.query && req.query.customer_id) ||
  (req.body && req.body.customer_id) ||
  null;

exports.getProfile = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.json({ status: 'success', success: true, data: null });
    }
    const data = await customerService.getProfile(userId);
    res.json({ status: 'success', success: true, data });
  } catch (error) {
    const { statusCode, response } = formatError(error);
    res.status(statusCode).json(response);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ status: 'error', success: false, message: 'Please log in to update your profile.' });
    }
    const data = await customerService.updateProfile(userId, req.body);
    res.json({ status: 'success', success: true, data });
  } catch (error) {
    const { statusCode, response } = formatError(error);
    res.status(statusCode).json(response);
  }
};

exports.getNotificationPreferences = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.json({ success: true, data: null });
    }
    const data = await customerService.getNotificationPreferences(userId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateNotificationPreferences = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please log in.' });
    }
    const data = await customerService.updateNotificationPreferences(userId, req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAddresses = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      // If user is not logged in or registered, return empty array (no address)
      return res.json({ status: 'success', success: true, data: [] });
    }
    const data = await customerService.getAddresses(userId);
    res.json({ status: 'success', success: true, data: data || [] });
  } catch (error) {
    const { statusCode, response } = formatError(error);
    res.status(statusCode).json(response);
  }
};

exports.addAddress = async (req, res) => {
  try {
    const data = await customerService.addAddress(getUserId(req), req.body);
    res.status(201).json({ status: 'success', success: true, message: 'Address saved successfully', data });
  } catch (error) {
    const { statusCode, response } = formatError(error);
    res.status(statusCode).json(response);
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const data = await customerService.updateAddress(getUserId(req), req.params.id, req.body);
    res.json({ status: 'success', success: true, message: 'Address updated successfully', data });
  } catch (error) {
    const { statusCode, response } = formatError(error);
    res.status(statusCode).json(response);
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    await customerService.deleteAddress(getUserId(req), req.params.id);
    res.json({ status: 'success', success: true, message: 'Address deleted successfully' });
  } catch (error) {
    const { statusCode, response } = formatError(error);
    res.status(statusCode).json(response);
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const data = await customerService.getWishlist(getUserId(req));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addWishlistItem = async (req, res) => {
  try {
    const data = await customerService.addWishlistItem(getUserId(req), req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeWishlistItem = async (req, res) => {
  try {
    await customerService.removeWishlistItem(req.params.id);
    res.json({ success: true, message: 'Item removed from wishlist' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPaymentMethods = async (req, res) => {
  try {
    const data = await customerService.getPaymentMethods(getUserId(req));
    res.json({ status: 'success', success: true, data });
  } catch (error) {
    const { statusCode, response } = formatError(error);
    res.status(statusCode).json(response);
  }
};

exports.addPaymentMethod = async (req, res) => {
  try {
    const data = await customerService.addPaymentMethod(getUserId(req), req.body);
    res.status(201).json({ status: 'success', success: true, message: 'Payment method saved successfully', data });
  } catch (error) {
    const { statusCode, response } = formatError(error);
    res.status(statusCode).json(response);
  }
};

exports.deletePaymentMethod = async (req, res) => {
  try {
    await customerService.deletePaymentMethod(getUserId(req), req.params.id);
    res.json({ status: 'success', success: true, message: 'Payment method removed' });
  } catch (error) {
    const { statusCode, response } = formatError(error);
    res.status(statusCode).json(response);
  }
};

exports.getWallet = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.json({
        status: 'success',
        success: true,
        data: {
          wallet_id: null,
          balance: 0,
          currency: 'INR',
          bnpl_limit: 0,
          bnpl_available: 0,
          bnpl_due_date: 'N/A'
        }
      });
    }
    const data = await customerService.getWallet(userId);
    res.json({ status: 'success', success: true, data });
  } catch (error) {
    const { statusCode, response } = formatError(error);
    res.status(statusCode).json(response);
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const data = await customerService.getNotifications(userId, { limit, offset });
    res.json({ status: 'success', success: true, data });
  } catch (error) {
    const { statusCode, response } = formatError(error);
    res.status(statusCode).json(response);
  }
};

exports.getUnreadNotificationCount = async (req, res) => {
  try {
    const userId = getUserId(req);
    const count = await customerService.getUnreadNotificationCount(userId);
    res.json({
      status: 'success',
      success: true,
      unread_count: count,
      count: count,
      data: { unread_count: count, count }
    });
  } catch (error) {
    const { statusCode, response } = formatError(error);
    res.status(statusCode).json(response);
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const data = await customerService.markNotificationRead(getUserId(req), req.params.id);
    res.json({ status: 'success', success: true, message: 'Notification marked as read', data });
  } catch (error) {
    const { statusCode, response } = formatError(error);
    res.status(statusCode).json(response);
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    const data = await customerService.markAllNotificationsRead(getUserId(req));
    res.json({ status: 'success', success: true, message: 'All notifications marked as read', data });
  } catch (error) {
    const { statusCode, response } = formatError(error);
    res.status(statusCode).json(response);
  }
};


