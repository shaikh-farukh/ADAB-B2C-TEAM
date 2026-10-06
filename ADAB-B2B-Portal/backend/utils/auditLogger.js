import pool from '../Config/database.js';
import logger from './logger.js';

/**
 * Logs an action to the unified audit trail.
 *
 * @param {Object} params - The audit log parameters.
 * @param {number|null} params.userId - ID of the user performing the action (null if system).
 * @param {string} params.userRole - Role of the user (e.g., 'admin', 'manufacturer', 'distributor', 'system').
 * @param {string} params.action - A clear string representing the action (e.g., 'ORDER_SHIPPED').
 * @param {string} params.resource - The table or entity being acted upon (e.g., 'manage_b_to_b_orders').
 * @param {string|number} params.resourceId - The ID of the resource.
 * @param {Object} [params.details] - Any extra JSON payload detailing the change.
 * @param {Object} [params.req] - Express request object to extract IP address.
 */
export const logAudit = async ({
    userId,
    userRole = 'system',
    action,
    resource,
    resourceId,
    details = {},
    req = null
}) => {
    try {
        let ipAddress = 'unknown';
        if (req) {
            ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
        }

        const query = `
            INSERT INTO manage_b_to_b_audit_logs
            (user_id, user_role, action, resource, resource_id, details, ip_address)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        await pool.query(query, [
            userId || null,
            userRole,
            action,
            resource,
            String(resourceId), // Ensure it's a string as per schema
            JSON.stringify(details),
            ipAddress
        ]);

        logger.info(`[AUDIT] [${action}] Resource: ${resource} (${resourceId}) By User: ${userId || 'SYSTEM'}`);
    } catch (error) {
        // We log the error but don't throw it, so we don't crash the main business logic if auditing fails temporarily.
        logger.error(`[AUDIT_ERROR] Failed to save audit log for action: ${action}`, error);
    }
};

export default { logAudit };
