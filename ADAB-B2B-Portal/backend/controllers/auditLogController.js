import pool from '../Config/database.js';
import logger from '../utils/logger.js';

export const getMyAuditLogs = async (req, res) => {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const countQuery = `SELECT COUNT(*) FROM manage_b_to_b_audit_logs WHERE user_id = $1`;
        const countResult = await pool.query(countQuery, [userId]);
        const total = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(total / limit);

        const query = `
            SELECT a.*, u.email as user_email, u.company_name as user_company 
            FROM manage_b_to_b_audit_logs a
            LEFT JOIN manage_b_to_b_userdetail u ON a.user_id = u.id
            WHERE a.user_id = $1
            ORDER BY a.created_at DESC 
            LIMIT $2 OFFSET $3
        `;
        
        const result = await pool.query(query, [userId, limit, offset]);

        res.status(200).json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                page,
                limit,
                totalPages
            }
        });
    } catch (error) {
        logger.error(`[AUDIT_LOGS] Error fetching logs for user ${req.user.userId}: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
    }
};
