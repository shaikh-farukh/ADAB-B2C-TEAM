const pool = require('../../db');

class SellerRepository {
  async getProfile(sellerId) {
    const query = `
      SELECT u.id, u.full_name, u.email, u.phone, u.status,
             sp.legal_name, sp.entity_type, sp.gstin, sp.pan, sp.kyc_status
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
             s.ui_mode, s.is_online, s.delivery_radius_km, s.rating, s.phone, s.category
      FROM stores s
      JOIN seller_profiles sp ON s.seller_id = sp.id
      WHERE sp.user_id = $1
    `;
    const res = await pool.query(query, [userId]);
    return res.rows[0];
  }

  async updateProfile(userId, data) {
    const fields = [];
    const values = [];
    let idx = 1;
    const allowedFields = ['legal_name', 'entity_type', 'gstin', 'pan', 'fssai_license', 'udhyam_msme'];
    for (const [k, v] of Object.entries(data)) {
      if (allowedFields.includes(k)) {
        fields.push(`${k} = $${idx++}`);
        values.push(v);
      }
    }
    if (fields.length === 0) return this.getProfile(userId);
    values.push(userId);
    
    // Updates seller_profiles where user_id = userId
    const query = `
      UPDATE seller_profiles
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE user_id = $${idx}
      RETURNING *;
    `;
    await pool.query(query, values);
    return this.getProfile(userId);
  }

  async updateStore(userId, data) {
    // We only want to update stores where the store belongs to the user
    // First find the store id
    const store = await this.getStore(userId);
    if (!store) throw new Error("Store not found");

    const fields = [];
    const values = [];
    let idx = 1;
    const allowedFields = ['store_name', 'city', 'address_line', 'phone', 'category'];
    for (const [k, v] of Object.entries(data)) {
      if (allowedFields.includes(k)) {
        fields.push(`${k} = $${idx++}`);
        values.push(v);
      }
    }
    if (fields.length === 0) return store;
    values.push(store.id);

    const query = `
      UPDATE stores
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    await pool.query(query, values);
    return this.getStore(userId);
  }

  async getSettings(userId) {
    // Settings are currently represented by specific canonical fields on `stores` table
    const query = `
      SELECT s.ui_mode, s.soundbox_enabled, s.is_online, s.open_time, s.close_time, s.delivery_radius_km
      FROM stores s
      JOIN seller_profiles sp ON s.seller_id = sp.id
      WHERE sp.user_id = $1
    `;
    const res = await pool.query(query, [userId]);
    return res.rows[0];
  }

  async updateSettings(userId, data) {
    const store = await this.getStore(userId);
    if (!store) throw new Error("Store not found");

    const fields = [];
    const values = [];
    let idx = 1;
    const allowedFields = ['ui_mode', 'soundbox_enabled', 'is_online', 'open_time', 'close_time', 'delivery_radius_km'];
    for (const [k, v] of Object.entries(data)) {
      if (allowedFields.includes(k)) {
        fields.push(`${k} = $${idx++}`);
        values.push(v);
      }
    }
    if (fields.length === 0) return this.getSettings(userId);
    values.push(store.id);

    const query = `
      UPDATE stores
      SET ${fields.join(', ')}
      WHERE id = $${idx}
    `;
    await pool.query(query, values);
    return this.getSettings(userId);
  }

  async getDashboardMetrics(userId) {
    const store = await this.getStore(userId);
    if (!store) throw new Error("Store not found");

    const query = `
      SELECT *
      FROM store_performance_metrics
      WHERE store_id = $1
      ORDER BY metric_date DESC
      LIMIT 1
    `;
    const res = await pool.query(query, [store.id]);
    return res.rows[0];
  }
}

module.exports = new SellerRepository();
