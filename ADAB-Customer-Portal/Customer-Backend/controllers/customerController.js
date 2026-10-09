const customerService = require('../services/customerService');

const getUserId = (req) => req.headers['x-session-token'] || req.headers['x-user-id'] || '11111111-1111-1111-1111-111111111111';

exports.getProfile = async (req, res) => {
  try {
    const data = await customerService.getProfile(getUserId(req));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const data = await customerService.updateProfile(getUserId(req), req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAddresses = async (req, res) => {
  try {
    const data = await customerService.getAddresses(getUserId(req));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addAddress = async (req, res) => {
  try {
    const data = await customerService.addAddress(getUserId(req), req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const data = await customerService.updateAddress(getUserId(req), req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    await customerService.deleteAddress(getUserId(req), req.params.id);
    res.json({ success: true, message: 'Address deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
