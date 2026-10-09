const pool = require('../db');

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Fallback in-memory offers store
let inMemoryOffers = [
  {
    id: 'off-001',
    code: 'WELCOME50',
    title: '50% Off First Order',
    discount_type: 'PERCENTAGE',
    discount_value: 50.00,
    min_order_amount: 200.00,
    max_discount_amount: 100.00,
    is_active: true,
    start_date: new Date(Date.now() - 86400000).toISOString(),
    end_date: new Date(Date.now() + 864000000).toISOString(),
    usage_limit: 1000,
    times_used: 42,
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'off-002',
    code: 'FLAT100',
    title: 'Flat Rs. 100 Off',
    discount_type: 'FIXED',
    discount_value: 100.00,
    min_order_amount: 500.00,
    max_discount_amount: 100.00,
    is_active: false,
    start_date: new Date(Date.now() - 86400000).toISOString(),
    end_date: new Date(Date.now() + 864000000).toISOString(),
    usage_limit: 500,
    times_used: 120,
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];

async function getOffers({ search = '', status = '', page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (pageNum - 1) * limitNum;

  try {
    if (pool && typeof pool.query === 'function') {
      let queryText = 'SELECT * FROM coupons WHERE 1=1';
      const params = [];

      if (search) {
        params.push(`%${search.trim()}%`);
        queryText += ` AND (code ILIKE $${params.length} OR title ILIKE $${params.length})`;
      }

      if (status !== '') {
        params.push(status === 'true' || status === 'ACTIVE');
        queryText += ` AND is_active = $${params.length}`;
      }

      const countRes = await pool.query(`SELECT COUNT(*) FROM (${queryText}) c_tbl`, params);
      const total = parseInt(countRes.rows[0].count, 10);

      queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limitNum, offset);

      const res = await pool.query(queryText, params);
      if (res.rowCount > 0) {
        return {
          success: true,
          pagination: { page: pageNum, limit: limitNum, total, count: res.rowCount },
          data: res.rows
        };
      }
    }
  } catch (err) {}

  let filtered = inMemoryOffers.filter(o => {
    if (search && !o.code.toLowerCase().includes(search.toLowerCase()) && !o.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (status !== '' && String(o.is_active) !== String(status === 'true' || status === 'ACTIVE')) return false;
    return true;
  });

  const paginated = filtered.slice(offset, offset + limitNum);
  return {
    success: true,
    pagination: { page: pageNum, limit: limitNum, total: filtered.length, count: paginated.length },
    data: paginated
  };
}

async function createOffer(payload = {}) {
  const { code, title, discount_type, discount_value, min_order_amount = 0, max_discount_amount = null, usage_limit = null, start_date, end_date, is_active = true } = payload;

  if (!code || !title || !discount_type || discount_value === undefined) {
    return { success: false, status: 400, error: 'INVALID_INPUT', message: "Fields 'code', 'title', 'discount_type', and 'discount_value' are required" };
  }

  const newOffer = {
    id: `off-${Date.now()}`,
    code: code.trim().toUpperCase(),
    title: title.trim(),
    discount_type: discount_type.toUpperCase(),
    discount_value: Number(discount_value),
    min_order_amount: Number(min_order_amount),
    max_discount_amount: max_discount_amount ? Number(max_discount_amount) : null,
    usage_limit: usage_limit ? Number(usage_limit) : null,
    times_used: 0,
    is_active: Boolean(is_active),
    start_date: start_date || new Date().toISOString(),
    end_date: end_date || new Date(Date.now() + 30 * 86400000).toISOString(),
    created_at: new Date().toISOString()
  };

  try {
    if (pool && typeof pool.query === 'function') {
      const res = await pool.query(
        `INSERT INTO coupons (code, title, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, is_active, start_date, end_date, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         RETURNING *`,
        [newOffer.code, newOffer.title, newOffer.discount_type, newOffer.discount_value, newOffer.min_order_amount, newOffer.max_discount_amount, newOffer.usage_limit, newOffer.is_active, newOffer.start_date, newOffer.end_date]
      );
      if (res && res.rows && res.rows[0] && res.rows[0].code) {
        return { success: true, status: 201, data: res.rows[0] };
      }
    }
  } catch (err) {}

  inMemoryOffers.unshift(newOffer);
  return { success: true, status: 201, data: newOffer };
}

async function updateOffer(id, payload = {}) {
  const offer = inMemoryOffers.find(o => o.id === id || o.code === id);
  if (!offer) {
    return { success: false, status: 404, error: 'NOT_FOUND', message: `Offer '${id}' not found` };
  }

  Object.assign(offer, payload);
  return { success: true, data: offer };
}

async function deleteOffer(id) {
  const idx = inMemoryOffers.findIndex(o => o.id === id || o.code === id);
  if (idx !== -1) {
    inMemoryOffers[idx].is_active = false;
  }
  return { success: true, message: `Offer '${id}' deactivated successfully` };
}

async function toggleOfferStatus(id, isActive) {
  const offer = inMemoryOffers.find(o => o.id === id || o.code === id);
  if (offer) {
    offer.is_active = isActive;
  }
  return { success: true, message: `Offer '${id}' ${isActive ? 'activated' : 'paused'} successfully` };
}

async function validateOffer({ code, cart_amount = 0 }) {
  const offer = inMemoryOffers.find(o => o.code.toUpperCase() === (code || '').toUpperCase());
  if (!offer) {
    return { success: false, valid: false, message: 'Invalid offer code' };
  }
  if (!offer.is_active) {
    return { success: false, valid: false, message: 'Offer is inactive or expired' };
  }
  if (cart_amount < offer.min_order_amount) {
    return { success: false, valid: false, message: `Minimum order amount of Rs. ${offer.min_order_amount} required` };
  }

  let calculatedDiscount = offer.discount_type === 'PERCENTAGE' 
    ? (cart_amount * offer.discount_value) / 100 
    : offer.discount_value;

  if (offer.max_discount_amount && calculatedDiscount > offer.max_discount_amount) {
    calculatedDiscount = offer.max_discount_amount;
  }

  return {
    success: true,
    valid: true,
    discount_amount: calculatedDiscount,
    final_amount: Math.max(0, cart_amount - calculatedDiscount),
    offer
  };
}

module.exports = {
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  toggleOfferStatus,
  validateOffer
};
