import pool from '../Config/database.js';

// GET all pending KYB requests with pagination
export const getKYBRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) FROM manage_b2b_kyb_requests WHERE status = 'pending'`;
    const countResult = await pool.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].count);

    const query = `
      SELECT k.*, u.email, u.mobile, u.company_name 
      FROM manage_b2b_kyb_requests k
      JOIN manage_b_to_b_userdetail u ON k.user_id = u.id
      WHERE k.status = 'pending'
      ORDER BY k.submitted_at ASC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);

    res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error(`[ADMIN] Error fetching KYB requests: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch KYB requests', error: error.message });
  }
};

// PUT approve KYB
export const approveKYB = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId || null;

    const result = await pool.query(
      `UPDATE manage_b2b_kyb_requests 
       SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $1
       WHERE id = $2 RETURNING user_id`,
      [adminId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const userId = result.rows[0].user_id;

    // Activate the user account and update KYC status
    await pool.query(
      `UPDATE manage_b_to_b_userdetail SET active = true, kyc_status = 'APPROVED' WHERE id = $1`,
      [userId]
    );

    // Audit trail
    await pool.query(
        `INSERT INTO audit_trail (user_id, user_role, action, endpoint, details) VALUES ($1, 'admin', 'APPROVE_KYC', '/api/admin/kyc-requests/approve', $2)`,
        [adminId, JSON.stringify({ kyb_request_id: id, approved_user_id: userId })]
    );

    res.status(200).json({ success: true, message: 'KYB request approved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve KYB request', error: error.message });
  }
};

// PUT reject KYB
export const rejectKYB = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.userId || null;

    const result = await pool.query(
      `UPDATE manage_b2b_kyb_requests 
       SET status = 'rejected', rejection_reason = $1, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2
       WHERE id = $3 RETURNING user_id`,
      [reason, adminId, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Update KYC status
    await pool.query(
        `UPDATE manage_b_to_b_userdetail SET kyc_status = 'REJECTED' WHERE id = $1`,
        [result.rows[0].user_id]
    );

    // Audit trail
    await pool.query(
        `INSERT INTO audit_trail (user_id, user_role, action, endpoint, details) VALUES ($1, 'admin', 'REJECT_KYC', '/api/admin/kyc-requests/reject', $2)`,
        [adminId, JSON.stringify({ kyb_request_id: id, reason })]
    );

    res.status(200).json({ success: true, message: 'KYB request rejected successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reject KYB request', error: error.message });
  }
};

// GET Dashboard Stats
export const getDashboardStats = async (req, res) => {
    try {
        // Total GMV from orders (completed or all active orders)
        const gmvRes = await pool.query(`SELECT SUM(total_amount) as total_gmv FROM manage_b_to_b_orders WHERE active = true`);
        const totalGmv = gmvRes.rows[0].total_gmv || 0;

        // Platform Commission Revenue from settlements
        const commRes = await pool.query(`SELECT SUM(commission) as total_commission FROM manage_b_to_b_settlements WHERE status = 'completed'`);
        const totalCommission = commRes.rows[0].total_commission || 0;

        // Active Credit Float from relationship_credits
        const creditRes = await pool.query(`SELECT SUM(outstanding_amount) as active_float FROM relationship_credits`);
        const activeFloat = creditRes.rows[0].active_float || 0;

        // Pending KYC Queue
        const kycRes = await pool.query(`SELECT COUNT(*) as pending_kyc FROM manage_b2b_kyb_requests WHERE status = 'pending'`);
        const pendingKyc = kycRes.rows[0].pending_kyc || 0;

        res.status(200).json({
            success: true,
            data: {
                total_gmv: totalGmv,
                total_commission_revenue: totalCommission,
                active_credit_float: activeFloat,
                pending_kyc_queue: parseInt(pendingKyc)
            }
        });
    } catch (error) {
        console.error(`[ADMIN] Error fetching dashboard stats: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
    }
};

// GET Platform Settings
export const getPlatformSettings = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM platform_settings LIMIT 1`);
        if (result.rows.length === 0) {
            return res.status(200).json({ success: true, data: { platform_commission_percentage: 1.0, tech_fee: 10.00 } });
        }
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error(`[ADMIN] Error fetching platform settings: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch platform settings' });
    }
};

// PUT Update Platform Settings
export const updatePlatformSettings = async (req, res) => {
    try {
        const { platform_commission_percentage, tech_fee } = req.body;
        const adminId = req.user?.userId || null;

        const check = await pool.query(`SELECT * FROM platform_settings LIMIT 1`);
        if (check.rows.length === 0) {
            await pool.query(`INSERT INTO platform_settings (platform_commission_percentage, tech_fee) VALUES ($1, $2)`, [platform_commission_percentage, tech_fee]);
        } else {
            await pool.query(`UPDATE platform_settings SET platform_commission_percentage = $1, tech_fee = $2, updated_at = CURRENT_TIMESTAMP`, [platform_commission_percentage, tech_fee]);
        }

        // Audit trail
        await pool.query(
            `INSERT INTO audit_trail (user_id, user_role, action, endpoint, details) VALUES ($1, 'admin', 'UPDATE_PLATFORM_SETTINGS', '/api/admin/platform-settings', $2)`,
            [adminId, JSON.stringify({ platform_commission_percentage, tech_fee })]
        );

        res.status(200).json({ success: true, message: 'Platform settings updated successfully' });
    } catch (error) {
        console.error(`[ADMIN] Error updating platform settings: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to update platform settings' });
    }
};

// GET Audit Logs
export const getAuditLogs = async (req, res) => {
    try {
        const { limit = 20, page = 1, role, action } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT a.*, u.email as user_email, u.company_name as user_company 
            FROM audit_trail a
            LEFT JOIN manage_b_to_b_userdetail u ON a.user_id = u.id
            WHERE 1=1
        `;
        let countQuery = `
            SELECT COUNT(*) 
            FROM audit_trail a
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (role) {
            query += ` AND a.user_role = $${paramIndex}`;
            countQuery += ` AND a.user_role = $${paramIndex}`;
            params.push(role);
            paramIndex++;
        }

        if (action) {
            query += ` AND a.action = $${paramIndex}`;
            countQuery += ` AND a.action = $${paramIndex}`;
            params.push(action);
            paramIndex++;
        }

        const countResult = await pool.query(countQuery, params);
        const totalCount = parseInt(countResult.rows[0].count);

        query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        res.status(200).json({
            success: true,
            data: result.rows,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error(`[ADMIN] Error fetching audit logs: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
    }
};
