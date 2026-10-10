const pool = require('../../db');

class AdminDay5Service {
  async getOffers() {
    // Remove try-catch to let the error bubble up to the controller
    const res = await pool.query("SELECT * FROM promotions ORDER BY created_at DESC LIMIT 50");
    // Map to the frontend structure
    return res.rows.map(p => ({
      id: p.id,
      code: p.title || p.promo_type || 'PROMO',
      discount: p.promo_type || 'Discount', // Fallback, no discount columns available
      validUntil: p.end_date || 'N/A',
      status: p.is_active ? 'ACTIVE' : 'INACTIVE'
    }));
  }

  async getReportsSummary() {
    const gmvRes = await pool.query("SELECT COALESCE(SUM(grand_total), 0) as gmv FROM orders WHERE order_status = 'DELIVERED'");
    const orderRes = await pool.query("SELECT COUNT(*) as count FROM orders");
    const sellerRes = await pool.query("SELECT COUNT(*) as count FROM seller_profiles WHERE kyc_status = 'APPROVED'");
    
    return {
      gmv: parseFloat(gmvRes.rows[0].gmv),
      orderCount: parseInt(orderRes.rows[0].count),
      approvalRate: null, // explicit unavailable value
      activeSellers: parseInt(sellerRes.rows[0].count)
    };
  }

  async getAuditLogs() {
    const res = await pool.query(`
      SELECT a.id, a.created_at as time, COALESCE(u.full_name, 'System') as actor, a.action, a.entity_type || ' (' || a.entity_id || ')' as entity, a.changes 
      FROM audit_logs a 
      LEFT JOIN users u ON a.actor_id = u.id 
      ORDER BY a.created_at DESC LIMIT 100
    `);
    return res.rows.map(row => ({
      id: row.id,
      time: row.time,
      actor: row.actor,
      action: row.action,
      entity: row.entity,
      changes: row.changes
    }));
  }

  async getSettings() {
    const res = await pool.query("SELECT key, value FROM platform_settings");
    const settings = {
      autoApproveProducts: false,
      requireDocuments: true,
      notifyOnNewSeller: true
    };
    res.rows.forEach(r => {
      // Postgres jsonb might return string or actual object depending on driver config
      let val = r.value;
      if (typeof val === 'string') {
        try { val = JSON.parse(val); } catch(e) {}
      }
      if (settings[r.key] !== undefined) {
        settings[r.key] = val;
      }
    });
    return settings;
  }

  async updateSettings(settings) {
    const allowedKeys = ['autoApproveProducts', 'requireDocuments', 'notifyOnNewSeller'];
    
    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [key, value] of Object.entries(settings)) {
        if (!allowedKeys.includes(key)) {
          throw new Error(`Invalid setting key: ${key}`);
        }
        if (typeof value !== 'boolean') {
          throw new Error(`Invalid setting value for ${key}: must be boolean`);
        }
        await client.query(
          "INSERT INTO platform_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()",
          [key, JSON.stringify(value)]
        );
      }
      await client.query('COMMIT');
    } catch(e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    
    return this.getSettings(); // return the persisted settings
  }
}

module.exports = new AdminDay5Service();
