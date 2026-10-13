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

  async getAuditLogs(params = {}) {
    const { page = 1, limit = 10, pageSize, entity_type, entityType, entity_id, entityId, search, action } = params;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(pageSize || limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    try {
      let query = `
        SELECT count(*) OVER() as full_count,
               a.id, a.created_at as time, COALESCE(u.full_name, 'System') as actor, a.action, a.entity_type, a.entity_id,
               a.entity_type || ' (' || a.entity_id || ')' as entity, a.changes 
        FROM audit_logs a 
        LEFT JOIN users u ON a.actor_id = u.id 
        WHERE 1=1
      `;
      const values = [];

      const targetType = entity_type || entityType;
      if (targetType && targetType.trim() && targetType.toUpperCase() !== 'ALL') {
        values.push(targetType.trim());
        query += ` AND LOWER(a.entity_type) = LOWER($${values.length})`;
      }

      const targetId = entity_id || entityId;
      if (targetId && targetId.trim()) {
        values.push(`%${targetId.trim()}%`);
        query += ` AND a.entity_id::text ILIKE $${values.length}`;
      }

      if (action && action.trim()) {
        values.push(`%${action.trim()}%`);
        query += ` AND a.action ILIKE $${values.length}`;
      }

      if (search && search.trim()) {
        values.push(`%${search.trim()}%`);
        query += ` AND (a.action ILIKE $${values.length} OR a.entity_type ILIKE $${values.length} OR a.entity_id::text ILIKE $${values.length} OR COALESCE(u.full_name, 'System') ILIKE $${values.length} OR a.changes::text ILIKE $${values.length})`;
      }

      values.push(limitNum, offset);
      query += ` ORDER BY a.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

      const res = await pool.query(query, values);
      let total = res.rows[0] ? parseInt(res.rows[0].full_count, 10) : 0;
      if (res.rows.length === 0 && offset > 0) {
        const countQuery = `
          SELECT COUNT(*) as cnt 
          FROM audit_logs a 
          LEFT JOIN users u ON a.actor_id = u.id 
          WHERE 1=1
        ` + query.slice(query.indexOf('WHERE 1=1') + 9, query.indexOf('ORDER BY'));
        const countRes = await pool.query(countQuery, values.slice(0, values.length - 2));
        total = parseInt(countRes.rows[0]?.cnt || 0, 10);
      }

      const logs = res.rows.map(row => ({
        id: row.id,
        time: row.time,
        actor: row.actor,
        action: row.action,
        entity: row.entity,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        changes: row.changes
      }));

      return {
        logs,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.max(1, Math.ceil(total / limitNum))
      };
    } catch (e) {
      console.error('getAuditLogs error:', e.message);
      return { logs: [], total: 0, page: pageNum, limit: limitNum, totalPages: 1 };
    }
  }

  async getAuditLogByEntity(entityType, entityId) {
    try {
      const res = await pool.query(`
        SELECT a.id, a.created_at as time, COALESCE(u.full_name, 'System') as actor, a.action, a.entity_type, a.entity_id,
               a.entity_type || ' (' || a.entity_id || ')' as entity, a.changes
        FROM audit_logs a
        LEFT JOIN users u ON a.actor_id = u.id
        WHERE LOWER(a.entity_type) = LOWER($1) AND (a.entity_id::text = $2 OR a.entity_id::text ILIKE $3)
        ORDER BY a.created_at DESC LIMIT 50
      `, [entityType, entityId, `%${entityId}%`]);
      return res.rows.map(row => ({
        id: row.id,
        time: row.time,
        actor: row.actor,
        action: row.action,
        entity: row.entity || `${row.entity_type} (${row.entity_id})`,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        changes: row.changes
      }));
    } catch (e) {
      console.error('getAuditLogByEntity error:', e.message);
      return [];
    }
  }

  async getSalesReport() {
    try {
      const res = await pool.query(`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as total_orders,
          COALESCE(SUM(grand_total), 0) as total_sales,
          COALESCE(SUM(total_discount), 0) as total_discounts
        FROM orders
        WHERE order_status != 'CANCELLED'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
        LIMIT 30
      `);
      return res.rows;
    } catch (e) {
      console.error('getSalesReport error:', e.message);
      return [];
    }
  }

  async getOrdersReport() {
    try {
      const res = await pool.query(`
        SELECT order_status, COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total_value
        FROM orders
        GROUP BY order_status
      `);
      return res.rows;
    } catch (e) {
      console.error('getOrdersReport error:', e.message);
      return [];
    }
  }

  async getReturnsReport() {
    try {
      const res = await pool.query(`
        SELECT status, COUNT(*) as count, COALESCE(SUM(refund_amount), 0) as total_refund_amount
        FROM returns
        GROUP BY status
      `);
      return res.rows;
    } catch (e) {
      console.error('getReturnsReport error:', e.message);
      return [];
    }
  }

  async getReviewsReport() {
    try {
      const res = await pool.query(`
        SELECT rating, COUNT(*) as count
        FROM reviews
        GROUP BY rating
        ORDER BY rating DESC
      `);
      return res.rows;
    } catch (e) {
      console.error('getReviewsReport error:', e.message);
      return [];
    }
  }

  async getSellersReport() {
    try {
      const res = await pool.query(`
        SELECT 
          s.id, s.store_name, s.rating, s.rating_count,
          COUNT(so.id) as total_orders,
          COALESCE(SUM(so.subtotal), 0) as gmv
        FROM stores s
        LEFT JOIN seller_orders so ON s.id = so.store_id
        GROUP BY s.id, s.store_name, s.rating, s.rating_count
        ORDER BY gmv DESC
        LIMIT 20
      `);
      return res.rows;
    } catch (e) {
      console.error('getSellersReport error:', e.message);
      return [];
    }
  }

  async getCustomersReport() {
    try {
      const res = await pool.query(`
        SELECT 
          u.id, u.full_name, u.email,
          COUNT(o.id) as orders_count,
          COALESCE(SUM(o.grand_total), 0) as total_spend
        FROM users u
        LEFT JOIN orders o ON u.id = o.customer_id
        WHERE u.user_type = 'CUSTOMER'
        GROUP BY u.id, u.full_name, u.email
        ORDER BY total_spend DESC
        LIMIT 20
      `);
      return res.rows;
    } catch (e) {
      console.error('getCustomersReport error:', e.message);
      return [];
    }
  }

  async exportReport(reportType) {
    let reportData = [];
    if (reportType === 'orders') reportData = await this.getOrdersReport();
    else if (reportType === 'returns') reportData = await this.getReturnsReport();
    else if (reportType === 'sellers') reportData = await this.getSellersReport();
    else reportData = await this.getSalesReport();

    return {
      reportType,
      exported_at: new Date().toISOString(),
      rowCount: reportData.length,
      records: reportData
    };
  }

  async getSettings() {
    const res = await pool.query("SELECT key, value FROM platform_settings");
    const settings = {
      autoApproveProducts: false,
      requireDocuments: true,
      notifyOnNewSeller: true,
      autoApprovalEnabled: false,
      requireRejectionReason: true,
      emailNotifications: true,
      maxListingPerSeller: 100
    };
    res.rows.forEach(r => {
      // Postgres jsonb might return string or actual object depending on driver config
      let val = r.value;
      if (typeof val === 'string') {
        try { val = JSON.parse(val); } catch(e) {}
      }
      settings[r.key] = val;
    });
    return settings;
  }

  async updateSettings(settings) {
    const allowedKeys = [
      'autoApproveProducts',
      'requireDocuments',
      'notifyOnNewSeller',
      'autoApprovalEnabled',
      'requireRejectionReason',
      'emailNotifications',
      'maxListingPerSeller'
    ];
    
    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [key, value] of Object.entries(settings)) {
        if (!allowedKeys.includes(key)) {
          throw new Error(`Invalid setting key: ${key}`);
        }
        if (key === 'maxListingPerSeller') {
          if (typeof value !== 'number' || value <= 0) {
            throw new Error(`Invalid setting value for ${key}: must be positive number`);
          }
        } else {
          if (typeof value !== 'boolean') {
            throw new Error(`Invalid setting value for ${key}: must be boolean`);
          }
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
