const pool = require('../db');

// In-memory store for recently viewed listings per customer
const recentlyViewedStore = new Map();

/**
 * 1. GET /api/v1/customers/me & GET /api/v1/customers/me/profile
 * Get customer profile
 */
exports.getProfile = async (userId) => {
  const res = await pool.query(`
    SELECT 
      c.id, 
      c.user_id as "userId",
      u.email, 
      u.full_name as name, 
      u.phone,
      c.preferred_language as "preferredLanguage",
      c.loyalty_tier as "loyaltyTier",
      c.profile_picture_url as "avatarUrl",
      c.company_name as "companyName",
      c.gst_in as "gstIn"
    FROM customer_profiles c
    JOIN users u ON c.user_id = u.id
    WHERE c.user_id = $1
  `, [userId]);

  if (res.rows.length === 0) {
    // If not found in join, check if user exists
    const userRes = await pool.query('SELECT id, full_name, email, phone FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length > 0) {
      const u = userRes.rows[0];
      // Auto-create customer profile
      const profRes = await pool.query(`
        INSERT INTO customer_profiles (id, user_id, preferred_language, loyalty_tier, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, 'en', 'BRONZE', NOW(), NOW())
        RETURNING *
      `, [userId]);
      return {
        id: profRes.rows[0].id,
        userId: u.id,
        name: u.full_name,
        email: u.email,
        phone: u.phone,
        preferredLanguage: 'en',
        loyaltyTier: 'BRONZE',
        avatarUrl: null
      };
    }
    const error = new Error('Customer profile not found');
    error.status = 404;
    throw error;
  }
  return res.rows[0];
};

/**
 * 2. PATCH /api/v1/customers/me & PATCH /api/v1/customers/me/profile
 * Update customer profile
 */
exports.updateProfile = async (userId, body) => {
  if (body.name || body.phone || body.email) {
    await pool.query(`
      UPDATE users 
      SET full_name = COALESCE($1, full_name), 
          phone = COALESCE($2, phone), 
          email = COALESCE($3, email),
          updated_at = NOW()
      WHERE id = $4
    `, [body.name || null, body.phone || null, body.email || null, userId]);
  }

  if (body.preferredLanguage || body.companyName || body.gstIn || body.avatarUrl) {
    await pool.query(`
      UPDATE customer_profiles
      SET preferred_language = COALESCE($1, preferred_language),
          company_name = COALESCE($2, company_name),
          gst_in = COALESCE($3, gst_in),
          profile_picture_url = COALESCE($4, profile_picture_url),
          updated_at = NOW()
      WHERE user_id = $5
    `, [body.preferredLanguage || null, body.companyName || null, body.gstIn || null, body.avatarUrl || null, userId]);
  }

  return exports.getProfile(userId);
};

/**
 * 3. POST /api/v1/customers/me/profile/avatar
 * Upload / set customer avatar metadata
 */
exports.uploadAvatar = async (userId, body) => {
  const avatarUrl = body.avatarUrl || body.imageUrl || body.url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80';
  
  await pool.query(`
    UPDATE customer_profiles
    SET profile_picture_url = $1,
        updated_at = NOW()
    WHERE user_id = $2
  `, [avatarUrl, userId]);

  return { userId, avatarUrl, success: true };
};

/**
 * 4. GET /api/v1/customers/me/preferences
 * Get shopping preferences
 */
exports.getPreferences = async (userId) => {
  const prof = await exports.getProfile(userId);
  return {
    preferredLanguage: prof.preferredLanguage || 'en',
    dietaryPreference: 'Vegetarian',
    notifyPriceDrops: true,
    notifyBackInStock: true,
    currency: 'INR',
    theme: 'system'
  };
};

/**
 * 5. PATCH /api/v1/customers/me/preferences
 * Update shopping preferences
 */
exports.updatePreferences = async (userId, body) => {
  if (body.preferredLanguage) {
    await pool.query(`
      UPDATE customer_profiles 
      SET preferred_language = $1, updated_at = NOW() 
      WHERE user_id = $2
    `, [body.preferredLanguage, userId]);
  }
  return exports.getPreferences(userId);
};

/**
 * 6. GET /api/v1/customers/me/settings
 * Read customer settings
 */
exports.getSettings = async (userId) => {
  const [prefs, notifs] = await Promise.all([
    exports.getPreferences(userId),
    exports.getNotificationPreferences(userId)
  ]);
  return {
    preferences: prefs,
    notifications: notifs,
    security: {
      twoFactorEnabled: false,
      loginAlerts: true
    }
  };
};

/**
 * 7. PATCH /api/v1/customers/me/settings
 * Update customer settings
 */
exports.updateSettings = async (userId, body) => {
  if (body.notifications) {
    await exports.updateNotificationPreferences(userId, body.notifications);
  }
  if (body.preferences) {
    await exports.updatePreferences(userId, body.preferences);
  }
  return exports.getSettings(userId);
};

/**
 * 8. GET /api/v1/customers/me/notification-preferences
 * Notification preferences
 */
exports.getNotificationPreferences = async (userId) => {
  const res = await pool.query(`SELECT * FROM notification_preferences WHERE user_id = $1`, [userId]);
  if (res.rows.length === 0) {
    const insertRes = await pool.query(`
      INSERT INTO notification_preferences (user_id) VALUES ($1) RETURNING *
    `, [userId]);
    return insertRes.rows[0];
  }
  return res.rows[0];
};

/**
 * 9. PATCH /api/v1/customers/me/notification-preferences
 * Update notification preferences
 */
exports.updateNotificationPreferences = async (userId, body) => {
  const res = await pool.query(`
    UPDATE notification_preferences
    SET order_updates_sms = COALESCE($1, order_updates_sms),
        order_updates_email = COALESCE($2, order_updates_email),
        order_updates_whatsapp = COALESCE($3, order_updates_whatsapp),
        promotional_sms = COALESCE($4, promotional_sms),
        promotional_email = COALESCE($5, promotional_email),
        promotional_whatsapp = COALESCE($6, promotional_whatsapp),
        soundbox_alerts = COALESCE($7, soundbox_alerts),
        updated_at = NOW()
    WHERE user_id = $8
    RETURNING *
  `, [
    body.order_updates_sms, body.order_updates_email, body.order_updates_whatsapp,
    body.promotional_sms, body.promotional_email, body.promotional_whatsapp,
    body.soundbox_alerts, userId
  ]);
  return res.rows[0];
};

/**
 * 10. GET /api/v1/customers/me/recently-viewed
 * Get recently viewed products
 */
exports.getRecentlyViewed = async (userId) => {
  const list = recentlyViewedStore.get(userId) || [];
  if (list.length === 0) {
    // Return top approved listings as graceful initial view
    const fallback = await pool.query(`
      SELECT sl.id, sl.title as name, sl.sell_price as price, sl.mrp, sl.stock_qty,
             COALESCE(pi.image_url, '/product_images/' || LOWER(TRIM(sl.title)) || '.jpeg', 'https://via.placeholder.com/150') as image
      FROM seller_listings sl
      LEFT JOIN LATERAL (
        SELECT image_url FROM product_images WHERE product_id = sl.id LIMIT 1
      ) pi ON true
      WHERE sl.is_active = true AND (sl.approval_status = 'APPROVED' OR sl.approval_status IS NULL)
      LIMIT 4
    `);
    return fallback.rows.map(r => ({
      ...r,
      price: parseFloat(r.price),
      mrp: parseFloat(r.mrp || r.price),
      stock_qty: parseInt(r.stock_qty || 0, 10),
      in_stock: parseInt(r.stock_qty || 0, 10) > 0
    }));
  }

  const res = await pool.query(`
    SELECT sl.id, sl.title as name, sl.sell_price as price, sl.mrp, sl.stock_qty,
           COALESCE(pi.image_url, '/product_images/' || LOWER(TRIM(sl.title)) || '.jpeg', 'https://via.placeholder.com/150') as image
    FROM seller_listings sl
    LEFT JOIN LATERAL (
      SELECT image_url FROM product_images WHERE product_id = sl.id LIMIT 1
    ) pi ON true
    WHERE sl.id = ANY($1)
  `, [list]);

  return res.rows.map(r => ({
    ...r,
    price: parseFloat(r.price),
    mrp: parseFloat(r.mrp || r.price),
    stock_qty: parseInt(r.stock_qty || 0, 10),
    in_stock: parseInt(r.stock_qty || 0, 10) > 0
  }));
};

/**
 * 11. POST /api/v1/customers/me/recently-viewed
 * Record a recently viewed product
 */
exports.recordRecentlyViewed = async (userId, body) => {
  const productId = body.productId || body.listingId || body.id;
  if (!productId) return { recorded: false, error: 'Product ID required' };

  let list = recentlyViewedStore.get(userId) || [];
  list = [productId, ...list.filter(id => id !== productId)].slice(0, 15);
  recentlyViewedStore.set(userId, list);

  return { recorded: true, count: list.length };
};

/**
 * 12. DELETE /api/v1/customers/me/recently-viewed/:id
 * Remove a recently viewed item
 */
exports.removeRecentlyViewed = async (userId, id) => {
  let list = recentlyViewedStore.get(userId) || [];
  list = list.filter(item => item !== id);
  recentlyViewedStore.set(userId, list);
  return { removed: true, remaining: list.length };
};

/**
 * 13. GET /api/v1/customers/me/addresses
 * List saved addresses
 */
exports.getAddresses = async (userId) => {
  const res = await pool.query(`
    SELECT * FROM addresses 
    WHERE user_id = $1 
    ORDER BY is_default DESC, created_at DESC
  `, [userId]);

  return res.rows.map(r => ({
    id: r.id,
    type: r.label,
    label: r.label,
    address: r.address_line,
    recipientName: r.recipient_name,
    phone: r.phone,
    city: r.city,
    state: r.state,
    zip: r.pincode,
    pincode: r.pincode,
    landmark: r.landmark,
    latitude: r.latitude ? parseFloat(r.latitude) : 21.1702,
    longitude: r.longitude ? parseFloat(r.longitude) : 72.8311,
    isDefault: r.is_default
  }));
};

/**
 * 14. POST /api/v1/customers/me/addresses
 * Add delivery address
 */
exports.addAddress = async (userId, body) => {
  if (body.isDefault) {
    await pool.query(`UPDATE addresses SET is_default = false WHERE user_id = $1`, [userId]);
  }
  const addressLine = body.address || body.address_line || body.addressLine1 || 'Default Address Line';
  let recipientName = body.recipientName;
  let phone = body.phone;
  if (!recipientName || !phone) {
    const userRes = await pool.query('SELECT full_name, phone FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length > 0) {
      if (!recipientName) recipientName = userRes.rows[0].full_name;
      if (!phone) phone = userRes.rows[0].phone;
    }
  }

  const res = await pool.query(`
    INSERT INTO addresses (
      id, user_id, label, recipient_name, phone, address_line, landmark, city, state, pincode, latitude, longitude, is_default, created_at
    )
    VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
    )
    RETURNING id
  `, [
    userId, 
    body.type || body.label || 'Home', 
    recipientName || 'Verified Customer', 
    phone || '', 
    addressLine, 
    body.landmark || null,
    body.city || 'Surat', 
    body.state || 'Gujarat', 
    body.zip || body.pincode || '395003', 
    body.latitude || 21.1702,
    body.longitude || 72.8311,
    body.isDefault || false
  ]);

  return { id: res.rows[0].id, ...body };
};

/**
 * 15. PATCH /api/v1/customers/me/addresses/:id
 * Update address
 */
exports.updateAddress = async (userId, id, body) => {
  if (body.isDefault) {
    await pool.query(`UPDATE addresses SET is_default = false WHERE user_id = $1`, [userId]);
  }
  const addressLine = body.address || body.address_line || body.addressLine1 || null;
  await pool.query(`
    UPDATE addresses 
    SET label = COALESCE($1, label), 
        recipient_name = COALESCE($2, recipient_name), 
        phone = COALESCE($3, phone), 
        address_line = COALESCE($4, address_line), 
        landmark = COALESCE($5, landmark),
        city = COALESCE($6, city), 
        state = COALESCE($7, state), 
        pincode = COALESCE($8, pincode), 
        is_default = COALESCE($9, is_default)
    WHERE id = $10 AND user_id = $11
  `, [
    body.type || body.label || null, 
    body.recipientName || null, 
    body.phone || null, 
    addressLine, 
    body.landmark || null,
    body.city || null, 
    body.state || null, 
    body.zip || body.pincode || null, 
    body.isDefault !== undefined ? body.isDefault : null, 
    id, 
    userId
  ]);

  return { id, ...body };
};

/**
 * 16. DELETE /api/v1/customers/me/addresses/:id
 * Delete address
 */
exports.deleteAddress = async (userId, id) => {
  await pool.query(`DELETE FROM addresses WHERE id = $1 AND user_id = $2`, [id, userId]);
  return true;
};

/**
 * 17. GET /api/v1/customers/me/addresses/:id/serviceability
 * Check serviceability
 */
exports.checkAddressServiceability = async (userId, id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let addr = null;
  if (uuidRegex.test(id)) {
    const res = await pool.query(`SELECT id, pincode, city, state FROM addresses WHERE id = $1 AND user_id = $2`, [id, userId]);
    if (res.rows.length > 0) {
      addr = res.rows[0];
    }
  }
  
  if (!addr) {
    const fallbackRes = await pool.query(`SELECT id, pincode, city, state FROM addresses WHERE user_id = $1 ORDER BY is_default DESC LIMIT 1`, [userId]);
    if (fallbackRes.rows.length > 0) {
      addr = fallbackRes.rows[0];
    }
  }

  const pincode = addr ? addr.pincode : '395003';
  return {
    serviceable: true,
    addressId: id,
    pincode,
    deliverySpeed: '14-45 mins Express Delivery available',
    slaMinutes: 30,
    codAvailable: true,
    hyperlocalTier: 'TIER-1-EXPRESS'
  };
};

/**
 * 18. GET /api/v1/customers/me/addresses/:id/map-preview
 * Map preview data for address
 */
exports.getAddressMapPreview = async (userId, id) => {
  const res = await pool.query(`
    SELECT id, address_line, city, state, pincode, latitude, longitude
    FROM addresses 
    WHERE id = $1 AND user_id = $2
  `, [id, userId]);

  const addr = res.rows[0] || {};
  const lat = addr.latitude ? parseFloat(addr.latitude) : 21.1702;
  const lng = addr.longitude ? parseFloat(addr.longitude) : 72.8311;

  return {
    addressId: id,
    latitude: lat,
    longitude: lng,
    formattedAddress: `${addr.address_line || ''}, ${addr.city || 'Surat'}, ${addr.state || 'Gujarat'} - ${addr.pincode || '395003'}`,
    zoomLevel: 15,
    previewTileUrl: `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=400x200&sensor=false`
  };
};

/**
 * 19. POST /api/v1/customers/me/addresses/validate
 * Validate & normalize a new address
 */
exports.validateAddress = async (body) => {
  const errors = [];
  if (!body.recipientName && !body.recipient_name) errors.push('Recipient name is required');
  if (!body.address && !body.address_line) errors.push('Address line is required');
  if (!body.pincode && !body.zip) errors.push('Pincode is required');

  const pincode = String(body.pincode || body.zip || '').trim();
  const isValidPincode = /^[1-9][0-9]{5}$/.test(pincode);

  if (!isValidPincode) {
    errors.push('Pincode must be a valid 6-digit Indian Postal Code');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      serviceable: false,
      errors
    };
  }

  return {
    isValid: true,
    serviceable: true,
    normalized: {
      recipientName: body.recipientName || body.recipient_name,
      addressLine: body.address || body.address_line,
      city: body.city || 'Surat',
      state: body.state || 'Gujarat',
      pincode: pincode,
      country: 'India'
    },
    serviceability: {
      deliverySpeed: '14-45 mins',
      slaMinutes: 30,
      codAvailable: true
    }
  };
};

/**
 * Helper to ensure user has a wishlist row in wishlists table
 */
async function getOrCreateWishlistId(userId) {
  let wishlistRes = await pool.query(`SELECT id FROM wishlists WHERE user_id = $1`, [userId]);
  if (wishlistRes.rows.length === 0) {
    const insertRes = await pool.query(`
      INSERT INTO wishlists (id, user_id, created_at) 
      VALUES (gen_random_uuid(), $1, NOW()) 
      RETURNING id
    `, [userId]);
    return insertRes.rows[0].id;
  }
  return wishlistRes.rows[0].id;
}

/**
 * 20. GET /api/v1/customers/me/wishlist
 * Get customer wishlist
 */
exports.getWishlist = async (userId) => {
  const wishlistId = await getOrCreateWishlistId(userId);

  const res = await pool.query(`
    SELECT 
      w.id, 
      w.listing_id as "productId", 
      s.title as name, 
      s.sell_price as price, 
      s.mrp,
      s.stock_qty,
      s.is_active,
      s.approval_status,
      st.store_name as "sellerName",
      COALESCE(pi.image_url, '/product_images/' || LOWER(TRIM(s.title)) || '.jpeg', 'https://via.placeholder.com/150') as image 
    FROM wishlist_items w
    JOIN seller_listings s ON w.listing_id = s.id
    LEFT JOIN stores st ON s.store_id = st.id
    LEFT JOIN LATERAL (
      SELECT image_url FROM product_images 
      WHERE product_id = s.id 
         OR image_url ILIKE '%' || LOWER(TRIM(s.title)) || '%'
      ORDER BY is_primary DESC, display_order ASC
      LIMIT 1
    ) pi ON true
    WHERE w.wishlist_id = $1
    ORDER BY w.added_at DESC
  `, [wishlistId]);
  
  return res.rows.map(r => {
    const price = parseFloat(r.price);
    const mrp = parseFloat(r.mrp || r.price);
    const stockQty = parseInt(r.stock_qty || 0, 10);
    return {
      ...r,
      price,
      mrp,
      stock_qty: stockQty,
      in_stock: stockQty > 0,
      is_available: r.is_active && (r.approval_status === 'APPROVED' || r.approval_status === null),
      discount: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0
    };
  });
};

/**
 * 21. GET /api/v1/customers/me/wishlist/count
 * Wishlist badge count
 */
exports.getWishlistCount = async (userId) => {
  const wishlistId = await getOrCreateWishlistId(userId);
  const res = await pool.query(`SELECT COUNT(*) as count FROM wishlist_items WHERE wishlist_id = $1`, [wishlistId]);
  return parseInt(res.rows[0]?.count || 0, 10);
};

/**
 * 22. GET /api/v1/customers/me/wishlist/items/:id
 * Get single wishlist item detail
 */
exports.getWishlistItemById = async (userId, itemId) => {
  const wishlistId = await getOrCreateWishlistId(userId);
  const res = await pool.query(`
    SELECT 
      w.id, 
      w.listing_id as "productId", 
      s.title as name, 
      s.sell_price as price, 
      s.mrp,
      s.stock_qty,
      s.is_active,
      s.approval_status,
      st.store_name as "sellerName",
      COALESCE(pi.image_url, '/product_images/' || LOWER(TRIM(s.title)) || '.jpeg', 'https://via.placeholder.com/150') as image 
    FROM wishlist_items w
    JOIN seller_listings s ON w.listing_id = s.id
    LEFT JOIN stores st ON s.store_id = st.id
    LEFT JOIN LATERAL (
      SELECT image_url FROM product_images WHERE product_id = s.id LIMIT 1
    ) pi ON true
    WHERE (w.id::text = $1 OR w.listing_id::text = $1) AND w.wishlist_id = $2
  `, [String(itemId), wishlistId]);

  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  const price = parseFloat(r.price);
  const mrp = parseFloat(r.mrp || r.price);
  const stockQty = parseInt(r.stock_qty || 0, 10);
  return {
    ...r,
    price,
    mrp,
    stock_qty: stockQty,
    in_stock: stockQty > 0,
    is_available: r.is_active && (r.approval_status === 'APPROVED' || r.approval_status === null),
    discount: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0
  };
};

/**
 * 23. POST /api/v1/customers/me/wishlist/items
 * Add item to wishlist
 */
exports.addWishlistItem = async (userId, body) => {
  const wishlistId = await getOrCreateWishlistId(userId);
  const productId = body.productId || body.listingId || body.listing_id;

  // Check if item already exists in wishlist to avoid duplicates
  const existing = await pool.query(`
    SELECT id FROM wishlist_items WHERE wishlist_id = $1 AND listing_id = $2
  `, [wishlistId, productId]);

  if (existing.rows.length > 0) {
    return { id: existing.rows[0].id, productId, message: "Item already in wishlist" };
  }
  
  const res = await pool.query(`
    INSERT INTO wishlist_items (id, wishlist_id, listing_id, added_at)
    VALUES (gen_random_uuid(), $1, $2, NOW())
    RETURNING id
  `, [wishlistId, productId]);
  
  return { id: res.rows[0].id, productId };
};

/**
 * 24. POST /api/v1/customers/me/wishlist/items/bulk
 * Bulk add items to wishlist
 */
exports.bulkAddWishlistItems = async (userId, body) => {
  const wishlistId = await getOrCreateWishlistId(userId);
  const productIds = (body.listingIds || body.listing_ids || body.items || body.productIds || []).filter(Boolean);
  const added = [];

  for (const pid of productIds) {
    const existing = await pool.query(`
      SELECT id FROM wishlist_items WHERE wishlist_id = $1 AND listing_id = $2
    `, [wishlistId, pid]);

    if (existing.rows.length === 0) {
      const res = await pool.query(`
        INSERT INTO wishlist_items (id, wishlist_id, listing_id, added_at)
        VALUES (gen_random_uuid(), $1, $2, NOW())
        RETURNING id
      `, [wishlistId, pid]);
      added.push(res.rows[0].id);
    }
  }

  return { addedCount: added.length, wishlistId };
};

/**
 * 25. DELETE /api/v1/customers/me/wishlist/items/:id
 * Remove single item from wishlist
 */
exports.removeWishlistItem = async (id) => {
  await pool.query(`DELETE FROM wishlist_items WHERE id::text = $1 OR listing_id::text = $1`, [String(id)]);
  return true;
};

/**
 * 26. DELETE /api/v1/customers/me/wishlist/items/bulk
 * Bulk remove items from wishlist
 */
exports.bulkRemoveWishlistItems = async (userId, body) => {
  const wishlistId = await getOrCreateWishlistId(userId);
  const ids = (body.itemIds || body.item_ids || body.listingIds || body.productIds || body.items || []).filter(Boolean);

  if (ids.length > 0) {
    await pool.query(`
      DELETE FROM wishlist_items 
      WHERE wishlist_id = $1 AND (id::text = ANY($2::text[]) OR listing_id::text = ANY($2::text[]))
    `, [wishlistId, ids.map(String)]);
  }

  return { removedCount: ids.length };
};

/**
 * 27. POST /api/v1/customers/me/wishlist/items/:id/move-to-cart
 * Move item from wishlist to active cart
 */
const cartService = require('./cartService');
exports.moveWishlistItemToCart = async (userId, id) => {
  // Find listing_id from wishlist_items
  const res = await pool.query(`SELECT listing_id FROM wishlist_items WHERE id::text = $1 OR listing_id::text = $1`, [String(id)]);
  const listingId = res.rows[0]?.listing_id || id;

  const cart = await cartService.getOrCreateCart({ customerId: userId });
  await cartService.addItemToCart(cart.id, listingId, 1);

  // Remove from wishlist
  await pool.query(`DELETE FROM wishlist_items WHERE id::text = $1 OR listing_id::text = $1`, [String(id)]);
  return { success: true, message: 'Item moved to cart' };
};
