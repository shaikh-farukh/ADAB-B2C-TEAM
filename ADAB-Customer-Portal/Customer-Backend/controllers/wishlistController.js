const wishlistService = require('../services/wishlistService');

exports.addItem = async (req, res) => {
  try {
    const { userId, listingId } = req.body;
    if (!userId || !listingId) {
      return res.status(400).json({ success: false, message: 'userId and listingId are required' });
    }
    const item = await wishlistService.addWishlistItem(userId, listingId);
    res.status(201).json({ success: true, item });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.removeItem = async (req, res) => {
  try {
    const { userId, listingId } = req.body; // or req.params depending on design, let's use body for consistency
    if (!userId || !listingId) {
      return res.status(400).json({ success: false, message: 'userId and listingId are required' });
    }
    const item = await wishlistService.removeWishlistItem(userId, listingId);
    res.status(200).json({ success: true, item });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }
    const wishlist = await wishlistService.getWishlistByUser(userId);
    res.status(200).json({ success: true, wishlist });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const cartService = require('../services/cartService');

exports.moveItemToCart = async (req, res) => {
  try {
    const { userId } = req.params; // or from auth
    const { listingId } = req.params; // the item id or listing id

    if (!userId || !listingId) {
      return res.status(400).json({ success: false, message: 'userId and listingId are required' });
    }

    // Remove from wishlist
    await wishlistService.removeWishlistItem(userId, listingId);

    // Get or create cart for user
    const cart = await cartService.getOrCreateCart({ customerId: userId });

    // Add to cart
    const cartItem = await cartService.addItemToCart(cart.id, listingId, 1);

    res.status(200).json({ success: true, message: 'Item moved to cart', cartItem });
  } catch (error) {
    console.error('Error moving item to cart:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};
