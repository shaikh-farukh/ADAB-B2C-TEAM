const customerService = require('../services/customerService');
const { formatError } = require('../utils/errorHandler');

const getUserId = (req) =>
  req.headers['x-user-id'] ||
  req.headers['x-session-token'] ||
  (req.query && req.query.customer_id) ||
  (req.body && req.body.customer_id) ||
  null;

exports.getProfile = async (req, res) => {
  try {
    const data = await customerService.getProfile(getUserId(req));
    res.json({ status: 'success', success: true, data });
  } catch (error) {
    const { statusCode, response } = formatError(error);
    res.status(statusCode).json(response);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const data = await customerService.updateProfile(getUserId(req), req.body);
    res.json({ status: 'success', success: true, data });
  } catch (error) {
    const { statusCode, response } = formatError(error);
    res.status(statusCode).json(response);
  }
};

exports.getAddresses = async (req, res) => {
  try {
    const data = await customerService.getAddresses(getUserId(req));
    res.json({ status: 'success', success: true, data });
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
    const data = await customerService.getWallet(getUserId(req));
    res.json({ status: 'success', success: true, data });
  } catch (error) {
    const { statusCode, response } = formatError(error);
    res.status(statusCode).json(response);
  }
};

