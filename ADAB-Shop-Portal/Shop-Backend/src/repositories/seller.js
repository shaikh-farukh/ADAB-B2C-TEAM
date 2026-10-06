const pool = require('../../db');

class SellerRepository {
  async getProfile(sellerId) {
    const query = `
      SELECT u.id, u.full_name, u.email, u.phone, u.status,
             sp.legal_name, sp.entity_type, sp.gstin, sp.kyc_status
      FROM users u
      LEFT JOIN seller_profiles sp ON u.id = sp.user_id
      WHERE u.id = $1
    `;
    const res = await pool.query(query, [sellerId]);
    return res.rows[0];
  }

  async getStore(userId) {
    const query = `
      SELECT s.id, s.seller_id as owner_id, s.store_name, s.city, s.address_line, 
             s.ui_mode, s.is_online, s.delivery_radius_km, s.rating
      FROM stores s
      JOIN seller_profiles sp ON s.seller_id = sp.id
      WHERE sp.user_id = $1
    `;
    const res = await pool.query(query, [userId]);
    return res.rows[0];
  }
}

module.exports = new SellerRepository();
