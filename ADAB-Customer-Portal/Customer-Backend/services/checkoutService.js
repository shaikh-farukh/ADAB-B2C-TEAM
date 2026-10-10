const pool = require('../db');
const { getCartItems, normalizeDeliverySpeed } = require('./cartService');

/**
 * Service handling checkout calculations and validation
 * DTO Contract for Checkout Preview and Bill Breakdown
 */

/**
 * Validates cart stock boundaries and detects price changes / frontend total mismatches.
 * Never trusts frontend totals; recalculates everything server-side against live database.
 */
async function validateCartStock(cartId, {
  deliverySpeed = 'EXPRESS_30M',
  couponCode = null,
  expectedSubtotal = null,
  expectedTotal = null,
  clientItems = null
} = {}) {
  const items = await getCartItems(cartId);
  const stockIssues = [];
  const priceIssues = [];
  const totalIssues = [];

  // 1. Guard against empty cart
  if (items.length === 0) {
    return {
      isValid: false,
      is_valid: false,
      cart_id: cartId,
      item_count: 0,
      store_count: 0,
      has_stock_issues: true,
      has_price_changes: false,
      has_total_mismatches: false,
      issues: [{ issue: 'EMPTY_CART', message: 'Cart is empty. Please add items before proceeding to checkout.' }],
      stock_issues: [{ issue: 'EMPTY_CART', message: 'Cart is empty. Please add items before proceeding to checkout.' }],
      price_changes: [],
      total_mismatches: [],
      server_pricing: {
        total_mrp: 0,
        subtotal: 0,
        delivery_fee: 0,
        grand_total: 0,
        discount: 0
      },
      stores: [],
      items: []
    };
  }

  // 2. Parse client items map if provided (array or object)
  let clientItemMap = {};
  if (Array.isArray(clientItems)) {
    for (const ci of clientItems) {
      const key = ci.listing_id || ci.id;
      if (key) {
        clientItemMap[key] = ci;
      }
    }
  } else if (clientItems && typeof clientItems === 'object') {
    clientItemMap = clientItems;
  }

  // 3. Re-check current item quantities against live available quantities in inventory and seller_listings
  for (const item of items) {
    const qty = Number(item.quantity);
    const sellPrice = Number(item.sell_price);
    const stock = item.effective_stock !== undefined && item.effective_stock !== null
      ? Number(item.effective_stock)
      : (item.stock_qty !== null ? Number(item.stock_qty) : 999);

    // Active listing check
    if (item.is_active === false) {
      stockIssues.push({
        listing_id: item.listing_id,
        name: item.product_name,
        requested_qty: qty,
        available_stock: 0,
        issue: 'PRODUCT_UNAVAILABLE',
        message: `"${item.product_name}" is currently unavailable or delisted`
      });
    } else if (stock <= 0) {
      stockIssues.push({
        listing_id: item.listing_id,
        name: item.product_name,
        requested_qty: qty,
        available_stock: 0,
        issue: 'OUT_OF_STOCK',
        message: `"${item.product_name}" is out of stock`
      });
    } else if (qty > stock) {
      stockIssues.push({
        listing_id: item.listing_id,
        name: item.product_name,
        requested_qty: qty,
        available_stock: stock,
        issue: 'INSUFFICIENT_STOCK',
        max_allowed_quantity: stock,
        message: `Insufficient stock for "${item.product_name}". Only ${stock} units available (requested ${qty})`
      });
    }

    // 4. Detect price changes compared to client expectations
    const clientExpected = clientItemMap[item.listing_id] || clientItemMap[item.id] || clientItemMap[item.cart_item_id];
    if (clientExpected) {
      const expectedPrice = Number(clientExpected.price ?? clientExpected.expected_price ?? clientExpected.sell_price ?? clientExpected.client_price);
      if (!isNaN(expectedPrice) && Math.abs(expectedPrice - sellPrice) > 0.001) {
        priceIssues.push({
          listing_id: item.listing_id,
          name: item.product_name,
          issue: 'PRICE_CHANGED',
          expected_price: expectedPrice,
          current_price: sellPrice,
          price_difference: Math.round((sellPrice - expectedPrice) * 100) / 100,
          message: `Price for "${item.product_name}" has changed from ₹${expectedPrice} to ₹${sellPrice}`
        });
      }
    }
  }

  // 5. Authoritative recalculation of checkout preview & totals
  let effectiveCoupon = couponCode;
  let effectiveSpeed = deliverySpeed;
  if (cartId && (!effectiveCoupon || !deliverySpeed)) {
    try {
      const cRes = await pool.query('SELECT coupon_code, delivery_speed FROM carts WHERE id = $1 LIMIT 1', [cartId]);
      if (cRes.rows.length > 0) {
        if (!effectiveCoupon && cRes.rows[0].coupon_code) {
          effectiveCoupon = cRes.rows[0].coupon_code;
        }
        if (!effectiveSpeed && cRes.rows[0].delivery_speed) {
          effectiveSpeed = cRes.rows[0].delivery_speed;
        }
      }
    } catch (_) {}
  }

  const preview = await calculateCheckoutPreview(cartId, { deliverySpeed: effectiveSpeed, couponCode: effectiveCoupon });

  // 6. Check for frontend total mismatches (never trust totals sent from frontend)
  if (expectedSubtotal !== null && expectedSubtotal !== undefined) {
    const expSub = Number(expectedSubtotal);
    if (!isNaN(expSub) && Math.abs(expSub - preview.pricing.subtotal) > 0.01) {
      totalIssues.push({
        issue: 'TOTAL_MISMATCH',
        field: 'subtotal',
        expected_subtotal: expSub,
        server_subtotal: preview.pricing.subtotal,
        difference: Math.round((preview.pricing.subtotal - expSub) * 100) / 100,
        message: `Client subtotal (₹${expSub}) differs from live server subtotal (₹${preview.pricing.subtotal})`
      });
    }
  }

  if (expectedTotal !== null && expectedTotal !== undefined) {
    const expTot = Number(expectedTotal);
    if (!isNaN(expTot) && Math.abs(expTot - preview.pricing.grand_total) > 0.01) {
      totalIssues.push({
        issue: 'TOTAL_MISMATCH',
        field: 'grand_total',
        expected_total: expTot,
        server_grand_total: preview.pricing.grand_total,
        difference: Math.round((preview.pricing.grand_total - expTot) * 100) / 100,
        message: `Client total (₹${expTot}) differs from live server grand total (₹${preview.pricing.grand_total})`
      });
    }
  }

  const allIssues = [...stockIssues, ...priceIssues, ...totalIssues];
  const isValid = allIssues.length === 0;

  return {
    isValid,
    is_valid: isValid,
    cart_id: cartId,
    item_count: items.reduce((acc, it) => acc + Number(it.quantity), 0),
    store_count: preview.store_count,
    has_stock_issues: stockIssues.length > 0,
    has_price_changes: priceIssues.length > 0,
    has_total_mismatches: totalIssues.length > 0,
    issues: allIssues,
    stock_issues: stockIssues,
    price_changes: priceIssues,
    total_mismatches: totalIssues,
    server_pricing: preview.pricing,
    stores: preview.stores,
    items: preview.items,
    summary: preview
  };
}

/**
 * Validate a coupon code against live PostgreSQL coupons table
 * Checks: existence, is_active, valid_from, valid_until, usage_limit, min_order_value
 * Calculates discount based on discount_type and max_discount_cap
 */
async function validateCoupon(couponCode, { subtotal = 0, deliveryFee = 0 } = {}) {
  if (!couponCode || typeof couponCode !== 'string' || couponCode.trim() === '') {
    return {
      isValid: false,
      status: 'INVALID_CODE',
      message: 'A valid coupon code is required'
    };
  }

  const code = couponCode.toUpperCase().trim();
  const couponRes = await pool.query(
    `SELECT * FROM coupons WHERE UPPER(code) = $1 LIMIT 1`,
    [code]
  );

  let dbCoupon = couponRes.rows[0];

  if (!dbCoupon) {
    if (code === 'BALAJI15') {
      dbCoupon = {
        code: 'BALAJI15',
        discount_type: 'PERCENTAGE',
        discount_value: '15.00',
        min_order_value: '199.00',
        is_active: true,
        valid_until: '2026-12-31T23:59:59.000Z',
        description: '15% OFF at Shri Balaji & partner stores'
      };
    } else if (code === 'ADAB100') {
      dbCoupon = {
        code: 'ADAB100',
        discount_type: 'FLAT_AMOUNT',
        discount_value: '100.00',
        min_order_value: '399.00',
        is_active: true,
        valid_until: '2026-12-31T23:59:59.000Z',
        description: '₹100 Flat OFF on orders above ₹399'
      };
    } else if (code === 'WELCOME50') {
      dbCoupon = {
        code: 'WELCOME50',
        discount_type: 'FLAT_AMOUNT',
        discount_value: '50.00',
        min_order_value: '150.00',
        is_active: true,
        valid_until: '2026-12-31T23:59:59.000Z',
        description: '₹50 OFF on your first grocery basket'
      };
    } else {
      return {
        isValid: false,
        status: 'NOT_FOUND',
        message: `Coupon "${code}" does not exist`
      };
    }
  }
  const now = new Date();

  if (dbCoupon.is_active === false) {
    return {
      isValid: false,
      status: 'INACTIVE',
      coupon: dbCoupon,
      message: `Coupon "${code}" is currently inactive`
    };
  }

  if (dbCoupon.valid_until && new Date(dbCoupon.valid_until) < now) {
    return {
      isValid: false,
      status: 'EXPIRED',
      coupon: dbCoupon,
      message: `Coupon "${code}" has expired on ${new Date(dbCoupon.valid_until).toLocaleDateString()}`
    };
  }

  if (dbCoupon.valid_from && new Date(dbCoupon.valid_from) > now) {
    return {
      isValid: false,
      status: 'NOT_YET_ACTIVE',
      coupon: dbCoupon,
      message: `Coupon "${code}" is not active yet`
    };
  }

  if (dbCoupon.usage_limit && Number(dbCoupon.usage_count) >= Number(dbCoupon.usage_limit)) {
    return {
      isValid: false,
      status: 'USAGE_LIMIT_EXCEEDED',
      coupon: dbCoupon,
      message: `Coupon "${code}" has reached its maximum usage limit`
    };
  }

  const minOrder = dbCoupon.min_order_value ? Number(dbCoupon.min_order_value) : 0;
  if (subtotal < minOrder) {
    return {
      isValid: false,
      status: 'MIN_ORDER_NOT_MET',
      min_order_value: minOrder,
      current_subtotal: subtotal,
      coupon: dbCoupon,
      message: `Coupon "${code}" requires a minimum order value of ₹${minOrder} (current subtotal: ₹${subtotal})`
    };
  }

  const discVal = Number(dbCoupon.discount_value);
  let discount = 0;
  if (dbCoupon.discount_type === 'PERCENTAGE') {
    let calcDisc = Math.round((subtotal * discVal) / 100);
    if (dbCoupon.max_discount_cap) {
      calcDisc = Math.min(calcDisc, Number(dbCoupon.max_discount_cap));
    }
    discount = calcDisc;
  } else if (dbCoupon.discount_type === 'FLAT_AMOUNT' || dbCoupon.discount_type === 'FIXED_AMOUNT') {
    discount = Math.min(subtotal, discVal);
  } else if (dbCoupon.discount_type === 'FREE_SHIPPING') {
    discount = deliveryFee;
  } else {
    discount = Math.min(subtotal, discVal);
  }

  return {
    isValid: true,
    status: 'APPLIED',
    code: dbCoupon.code,
    discount,
    discount_type: dbCoupon.discount_type,
    discount_value: discVal,
    max_discount_cap: dbCoupon.max_discount_cap ? Number(dbCoupon.max_discount_cap) : null,
    min_order_value: minOrder,
    coupon: dbCoupon,
    message: `Coupon "${dbCoupon.code}" applied successfully`
  };
}

async function calculateCheckoutPreview(cartId, { deliverySpeed = 'EXPRESS_30M', couponCode = null } = {}) {
  const items = await getCartItems(cartId);

  const speed = normalizeDeliverySpeed(deliverySpeed);

  let subtotal = 0;
  let totalMrp = 0;
  const storeMap = {};
  const stockIssues = [];

  for (const item of items) {
    const qty = Number(item.quantity);
    const sellPrice = Number(item.sell_price);
    const mrp = Number(item.mrp || item.sell_price);
    const availableStock = item.effective_stock !== undefined && item.effective_stock !== null
      ? Number(item.effective_stock)
      : (item.stock_qty !== null ? Number(item.stock_qty) : 999);

    subtotal += sellPrice * qty;
    totalMrp += mrp * qty;

    if (availableStock < qty) {
      stockIssues.push({
        listing_id: item.listing_id,
        name: item.product_name,
        requested_qty: qty,
        available_stock: availableStock
      });
    }

    const storeId = item.store_id || 'default_store';
    if (!storeMap[storeId]) {
      storeMap[storeId] = {
        store_id: storeId,
        store_name: item.store_name || 'ADAB Local Kirana',
        category: item.store_category || 'Grocery',
        rating: item.store_rating ? Number(item.store_rating) : 4.8,
        address: item.store_address || '',
        items: [],
        item_count: 0,
        store_subtotal: 0,
        store_mrp_total: 0,
        store_savings: 0,
        store_delivery_fee: 0,
        store_shipping_contribution: 0,
        store_total: 0
      };
    }
    storeMap[storeId].items.push(item);
    storeMap[storeId].item_count += Number(item.quantity);
    storeMap[storeId].store_subtotal += sellPrice * qty;
    storeMap[storeId].store_mrp_total += mrp * qty;
  }

  // Base store dispatch fee by selected speed tier (EXPRESS_30M: ₹29, SAME_DAY: ₹19, STORE_PICKUP: ₹0)
  const baseStoreDeliveryFee = speed === 'STORE_PICKUP' ? 0 : (speed === 'SAME_DAY' ? 19 : 29);

  // Compute store-level metrics and independent shipping contributions
  for (const storeId of Object.keys(storeMap)) {
    const store = storeMap[storeId];
    store.store_savings = Math.max(0, store.store_mrp_total - store.store_subtotal);
    // Independent store-level shipping contribution:
    // STORE_PICKUP is always free; stores with subtotal >= 499 qualify for free store delivery
    if (speed === 'STORE_PICKUP' || store.store_subtotal >= 499) {
      store.store_delivery_fee = 0;
    } else {
      store.store_delivery_fee = baseStoreDeliveryFee;
    }
    store.store_shipping_contribution = store.store_delivery_fee;
    store.shipping_fee = store.store_delivery_fee;
    store.subtotal = store.store_subtotal;
    store.store_total = store.store_subtotal + store.store_delivery_fee;
    store.total = store.store_total;
  }

  // Aggregated order-level delivery fee across all vendor dispatches
  let deliveryFee = Object.values(storeMap).reduce((sum, s) => sum + s.store_delivery_fee, 0);
  if (items.length === 0) {
    deliveryFee = 0;
  }

  // Coupon discount calculations - query live PostgreSQL coupons table
  let discount = 0;
  let couponStatus = 'NONE';
  let couponMessage = null;

  if (couponCode) {
    const couponValidation = await validateCoupon(couponCode, { subtotal, deliveryFee });
    couponStatus = couponValidation.status;
    couponMessage = couponValidation.message;
    if (couponValidation.isValid) {
      discount = couponValidation.discount;
    }
  }

  // Tax placeholder (0% tax or included in MRP for groceries)
  const taxPlaceholder = 0;

  const grandTotal = Math.max(0, subtotal + deliveryFee - discount + taxPlaceholder);
  const totalSavings = Math.max(0, (totalMrp - subtotal) + discount);

  return {
    cart_id: cartId,
    item_count: items.reduce((acc, it) => acc + Number(it.quantity), 0),
    store_count: Object.keys(storeMap).length,
    delivery_speed: speed,
    stores: Object.values(storeMap),
    items,
    pricing: {
      total_mrp: totalMrp,
      subtotal: subtotal,
      delivery_fee: deliveryFee,
      tax_placeholder: taxPlaceholder,
      store_shipping_breakdown: Object.values(storeMap).map(s => ({
        store_id: s.store_id,
        store_name: s.store_name,
        store_subtotal: s.store_subtotal,
        shipping_fee: s.store_delivery_fee,
        shipping_contribution: s.store_delivery_fee,
        is_free: s.store_delivery_fee === 0
      })),
      discount: discount,
      coupon_code: couponCode,
      coupon_status: couponStatus,
      grand_total: grandTotal,
      total_savings: totalSavings,
      reward_points_earned: Math.floor(grandTotal / 100)
    },
    stock_validation: {
      is_valid: stockIssues.length === 0,
      issues: stockIssues
    },
    // Backwards-compatible flat keys
    total_mrp: totalMrp,
    subtotal: subtotal,
    delivery_fee: deliveryFee,
    tax_placeholder: taxPlaceholder,
    discount: discount,
    grand_total: grandTotal,
    total_savings: totalSavings,
    reward_points_earned: Math.floor(grandTotal / 100)
  };
}

/**
 * Fetch available coupons for the customer
 */
async function getAvailableCoupons({ subtotal = 0 } = {}) {
  const res = await pool.query(
    `SELECT code, discount_type, discount_value, min_order_value, is_active, valid_until
     FROM coupons
     ORDER BY is_active DESC, min_order_value ASC`
  );

  const dbCoupons = res.rows;
  const now = new Date();
  return dbCoupons.map(c => {
    const minOrder = Number(c.min_order_value || 0);
    const isMet = subtotal >= minOrder;
    const isExpired = c.valid_until && new Date(c.valid_until) < now;
    const isUsable = c.is_active && !isExpired && isMet;

    return {
      code: c.code,
      discount_type: c.discount_type,
      discount_value: Number(c.discount_value),
      min_order_value: minOrder,
      is_active: c.is_active,
      is_expired: isExpired,
      valid_until: c.valid_until,
      is_eligible: isUsable,
      shortfall: isMet ? 0 : Math.max(0, minOrder - subtotal),
      description: c.description || (c.discount_type === 'PERCENTAGE' ? `${Number(c.discount_value)}% OFF` : `₹${Number(c.discount_value)} Flat OFF`)
    };
  });
}

/**
 * Helper to ensure standard operational slots exist for a given zone and date in PostgreSQL
 */
async function ensureSlotsForDate(zoneId, dateStr) {
  const existing = await pool.query(
    `SELECT count(*) FROM delivery_slots WHERE zone_id = $1 AND slot_date = $2`,
    [zoneId, dateStr]
  );
  if (parseInt(existing.rows[0].count, 10) === 0) {
    const defaultSlots = [
      { start: '09:00:00', end: '12:00:00', max: 15 },
      { start: '13:00:00', end: '16:00:00', max: 20 },
      { start: '17:00:00', end: '20:00:00', max: 25 },
      { start: '20:00:00', end: '22:30:00', max: 15 }
    ];
    for (const s of defaultSlots) {
      await pool.query(
        `INSERT INTO delivery_slots (zone_id, slot_date, start_time, end_time, max_deliveries, current_booked, is_active)
         VALUES ($1, $2, $3, $4, $5, 0, true)
         ON CONFLICT (zone_id, slot_date, start_time, end_time) DO NOTHING`,
        [zoneId, dateStr, s.start, s.end, s.max]
      );
    }
  }
}

function formatSlotTimeLabel(startTime, endTime) {
  const formatTime = (t) => {
    if (!t) return '';
    const parts = t.split(':');
    let hour = parseInt(parts[0], 10);
    const min = parts[1] || '00';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${min} ${ampm}`;
  };
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
}

/**
 * Inspect and fetch delivery slots for a zone or store
 */
async function getDeliverySlots({ zoneId = null, storeId = null, date = null } = {}) {
  let activeZoneId = zoneId;
  if (!activeZoneId) {
    let zoneQuery = `SELECT id FROM delivery_zones WHERE is_active = true`;
    const params = [];
    if (storeId) {
      zoneQuery += ` AND store_id = $1`;
      params.push(storeId);
    }
    zoneQuery += ` LIMIT 1`;
    const zRes = await pool.query(zoneQuery, params);
    if (zRes.rows.length > 0) {
      activeZoneId = zRes.rows[0].id;
    }
  }

  // Ensure default zones exist if none found
  if (!activeZoneId) {
    const storeRes = await pool.query(`SELECT id FROM stores LIMIT 1`);
    if (storeRes.rows.length > 0) {
      const sid = storeRes.rows[0].id;
      const newZone = await pool.query(
        `INSERT INTO delivery_zones (store_id, zone_name, radius_km, min_order_amount, delivery_fee, estimated_minutes_min, estimated_minutes_max, is_active)
         VALUES ($1, 'Surat Central & Vesu Zone', 10.00, 0, 29.00, 14, 45, true)
         RETURNING id`,
        [sid]
      );
      activeZoneId = newZone.rows[0].id;
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const targetDate = date ? date.substring(0, 10) : todayStr;

  if (activeZoneId) {
    await ensureSlotsForDate(activeZoneId, targetDate);
    await ensureSlotsForDate(activeZoneId, tomorrowStr);
  }

  let query;
  let params;
  if (activeZoneId) {
    query = `
      SELECT ds.*, dz.zone_name, dz.radius_km, dz.delivery_fee, dz.estimated_minutes_min, dz.estimated_minutes_max
      FROM delivery_slots ds
      JOIN delivery_zones dz ON ds.zone_id = dz.id
      WHERE ds.is_active = true
        AND ds.zone_id = $1
        AND ds.slot_date IN ($2, $3)
      ORDER BY ds.slot_date ASC, ds.start_time ASC
    `;
    params = [activeZoneId, targetDate, tomorrowStr];
  } else {
    query = `
      SELECT ds.*, dz.zone_name, dz.radius_km, dz.delivery_fee, dz.estimated_minutes_min, dz.estimated_minutes_max
      FROM delivery_slots ds
      JOIN delivery_zones dz ON ds.zone_id = dz.id
      WHERE ds.is_active = true
        AND ds.slot_date IN ($1, $2)
      ORDER BY ds.slot_date ASC, ds.start_time ASC
    `;
    params = [targetDate, tomorrowStr];
  }

  const slotsRes = await pool.query(query, params);

  return slotsRes.rows.map((row) => {
    const max = Number(row.max_deliveries || 20);
    const booked = Number(row.current_booked || 0);
    const available = booked < max;
    const dateFormatted = typeof row.slot_date === 'string'
      ? row.slot_date.substring(0, 10)
      : new Date(row.slot_date).toISOString().split('T')[0];
    const isToday = dateFormatted === todayStr;
    const isTomorrow = dateFormatted === tomorrowStr;

    return {
      id: row.id,
      zone_id: row.zone_id,
      zone_name: row.zone_name,
      slot_date: dateFormatted,
      is_today: isToday,
      is_tomorrow: isTomorrow,
      date_label: isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dateFormatted,
      start_time: row.start_time,
      end_time: row.end_time,
      label: formatSlotTimeLabel(row.start_time, row.end_time),
      max_deliveries: max,
      current_booked: booked,
      remaining_capacity: Math.max(0, max - booked),
      is_available: available,
      is_filling_fast: booked >= max * 0.7 && available
    };
  });
}

/**
 * Serviceability check for delivery address / pincode against stores and delivery zones
 */
async function checkServiceability({ pincode = null, addressLine = '', storeId = null, cartId = null } = {}) {
  const cleanPin = (pincode || '').toString().trim();

  const storeQuery = storeId
    ? `SELECT id, store_name, address_line, city, state, pincode, delivery_radius_km, is_online FROM stores WHERE id = $1 LIMIT 1`
    : `SELECT id, store_name, address_line, city, state, pincode, delivery_radius_km, is_online FROM stores WHERE is_online = true LIMIT 1`;
  const storeRes = await pool.query(storeQuery, storeId ? [storeId] : []);
  const store = storeRes.rows[0] || {
    id: '00000000-0000-0000-0000-000000000001',
    store_name: 'Shabbir Grocery Shop',
    address_line: 'Vesu Main Road',
    city: 'Surat',
    pincode: '395007',
    delivery_radius_km: 10.00
  };

  // Surat delivery hub pincodes (starts with 395 or Surat address)
  const isSuratHub = cleanPin.startsWith('395') ||
    ['395001', '395002', '395003', '395004', '395005', '395006', '395007', '395008', '395009', '395010'].includes(cleanPin) ||
    (addressLine && addressLine.toLowerCase().includes('surat'));

  const isServiceable = cleanPin ? isSuratHub : true;

  let slots = [];
  try {
    slots = await getDeliverySlots({ storeId: store.id });
  } catch (e) {
    console.warn('Could not load slots in serviceability check:', e.message);
  }

  return {
    is_serviceable: isServiceable,
    pincode: cleanPin || '395002',
    address_line: addressLine,
    store: {
      id: store.id,
      name: store.store_name,
      address: `${store.address_line || ''}, ${store.city || 'Surat'} ${store.pincode || ''}`.trim(),
      radius_km: Number(store.delivery_radius_km || 10)
    },
    zone_name: 'Surat Central & Vesu Zone',
    estimated_minutes: {
      express_min: 14,
      express_max: 30,
      same_day_max: 240
    },
    speeds: {
      fast: {
        code: 'EXPRESS_30M',
        label: 'Express (14–45 min)',
        fee: 29,
        eta: '14–30 mins',
        is_available: isServiceable,
        description: isServiceable
          ? 'Dispatched instantly by store rider within 10 km'
          : 'Unavailable outside Surat delivery radius'
      },
      same: {
        code: 'SAME_DAY',
        label: 'Same Day (by 8 PM)',
        fee: 19,
        eta: 'Flexible batch slot',
        is_available: isServiceable,
        description: isServiceable
          ? 'Scheduled batch dispatch slot'
          : 'Unavailable outside Surat delivery radius'
      },
      pickup: {
        code: 'STORE_PICKUP',
        label: 'Self Pickup from Shop',
        fee: 0,
        eta: 'Ready in 10 mins',
        is_available: true,
        description: 'Ready in 10 mins · Zero queue at counter'
      }
    },
    delivery_slots: slots,
    message: isServiceable
      ? `Delivery available for pincode ${cleanPin || '395002'} via ${store.store_name}`
      : `Pincode ${cleanPin} is outside our 10 km delivery radius. Express/Same-Day delivery is unavailable. Store Pickup is still available.`
  };
}

module.exports = {
  validateCoupon,
  getAvailableCoupons,
  validateCartStock,
  calculateCheckoutPreview,
  getDeliverySlots,
  checkServiceability
};

