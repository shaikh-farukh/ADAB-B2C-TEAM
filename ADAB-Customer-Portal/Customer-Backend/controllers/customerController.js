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
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Phone number or email is already registered.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNotificationPreferences = async (req, res) => {
  try {
    const data = await customerService.getNotificationPreferences(getUserId(req));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateNotificationPreferences = async (req, res) => {
  try {
    const data = await customerService.updateNotificationPreferences(getUserId(req), req.body);
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

exports.checkAddressServiceability = async (req, res) => {
  try {
    const data = await customerService.checkAddressServiceability(getUserId(req), req.params.id);
    res.json({ success: true, data });
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

exports.getWishlistCount = async (req, res) => {
  try {
    const data = await customerService.getWishlist(getUserId(req));
    res.json({ success: true, count: Array.isArray(data) ? data.length : 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const cartService = require('../services/cartService');

exports.moveWishlistItemToCart = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const cart = await cartService.getOrCreateCart({ customerId: userId });
    await cartService.addItemToCart(cart.id, id, 1);
    res.json({ success: true, message: 'Item added to cart from wishlist' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
