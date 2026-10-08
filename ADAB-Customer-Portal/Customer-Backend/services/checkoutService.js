const pool = require('../db');
const { getCartItems, normalizeDeliverySpeed } = require('./cartService');

/**
 * Service handling checkout calculations and validation
 * DTO Contract for Checkout Preview and Bill Breakdown
 */

async function validateCartStock(cartId) {
  const items = await getCartItems(cartId);
  const issues = [];

  for (const item of items) {
    const qty = Number(item.quantity);
    const stock = item.stock_qty !== null ? Number(item.stock_qty) : 999;

    if (stock <= 0) {
      issues.push({
        listing_id: item.listing_id,
        name: item.product_name,
        requested_qty: qty,
        available_stock: 0,
        issue: 'OUT_OF_STOCK'
      });
    } else if (qty > stock) {
      issues.push({
        listing_id: item.listing_id,
        name: item.product_name,
        requested_qty: qty,
        available_stock: stock,
        issue: 'INSUFFICIENT_STOCK'
      });
    }
  }

  return {
    isValid: issues.length === 0,
    item_count: items.length,
    issues
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
    const availableStock = item.stock_qty !== null ? Number(item.stock_qty) : 999;

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

    if (!storeMap[item.store_id]) {
      storeMap[item.store_id] = {
        store_id: item.store_id,
        store_name: item.store_name || 'ADAB Local Kirana',
        category: item.store_category || 'Grocery',
        items: [],
        store_subtotal: 0
      };
    }
    storeMap[item.store_id].items.push(item);
    storeMap[item.store_id].store_subtotal += sellPrice * qty;
  }

  // Delivery fee calculation
  let deliveryFee = 29;
  if (speed === 'SAME_DAY') deliveryFee = 19;
  else if (speed === 'STORE_PICKUP') deliveryFee = 0;

  // Free delivery for orders over ₹499
  if (subtotal >= 499 && speed !== 'STORE_PICKUP') {
    deliveryFee = 0;
  }
  if (items.length === 0) {
    deliveryFee = 0;
  }

  // Coupon discount calculations
  let discount = 0;
  let couponStatus = 'NONE';

  if (couponCode) {
    const code = couponCode.toUpperCase().trim();
    if (code === 'BALAJI15') {
      discount = Math.min(150, Math.round(subtotal * 0.15));
      couponStatus = 'APPLIED';
    } else if (code === 'ADAB100') {
      if (subtotal >= 399) {
        discount = 100;
        couponStatus = 'APPLIED';
      } else {
        couponStatus = 'MIN_ORDER_NOT_MET_399';
      }
    } else if (code === 'FREEDEL') {
      discount = deliveryFee;
      couponStatus = 'APPLIED';
    } else {
      couponStatus = 'INVALID_CODE';
    }
  }

  const grandTotal = Math.max(0, subtotal + deliveryFee - discount);
  const totalSavings = Math.max(0, (totalMrp - subtotal) + discount);

  return {
    cart_id: cartId,
    item_count: items.reduce((acc, it) => acc + Number(it.quantity), 0),
    delivery_speed: speed,
    stores: Object.values(storeMap),
    items,
    pricing: {
      total_mrp: totalMrp,
      subtotal: subtotal,
      delivery_fee: deliveryFee,
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
    discount: discount,
    grand_total: grandTotal,
    reward_points_earned: Math.floor(grandTotal / 100)
  };
}

module.exports = {
  validateCartStock,
  calculateCheckoutPreview
};
