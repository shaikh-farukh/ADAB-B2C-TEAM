import pool from '../Config/database.js';
import logger from '../utils/logger.js';

/**
 * Global Audit Middleware
 * Captures all POST, PUT, PATCH, DELETE requests for Manufacturers and Distributors
 * and logs them to the manage_b_to_b_audit_logs table.
 */
export const globalAuditMiddleware = async (req, res, next) => {
  // Capture the original response functions to hook into the finish event
  const originalSend = res.send;

  // Only track mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    let responseBody = null;
    const originalJson = res.json;
    res.json = function (body) {
      responseBody = body;
      return originalJson.call(this, body);
    };

    // Intercept the response to ensure we only log successful actions
    res.on('finish', async () => {
      // Only log if the request was successful (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {

        // Ensure user exists (they must be authenticated)
        if (req.user && req.user.userId && (req.user.role === 'manufacturer' || req.user.role === 'distributor')) {

          try {
            const userId = req.user.userId;
            const userRole = req.user.role;
            const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

            // Extract the resource and action from the URL
            // e.g. /api/manufacturer/products -> resource: products, action: POST
            const urlParts = req.baseUrl ? req.baseUrl.split('/') : req.url.split('/');
            const resource = urlParts[urlParts.length - 1] || 'general';

            // Create a meaningful action string
            let action = `${req.method}_${resource.toUpperCase()}`;
            if (req.method === 'POST') action = `CREATED_${resource.toUpperCase()}`;
            if (req.method === 'PUT' || req.method === 'PATCH') action = `UPDATED_${resource.toUpperCase()}`;
            if (req.method === 'DELETE') action = `DELETED_${resource.toUpperCase()}`;

            // Sanitize body to remove PII and Passwords
            let sanitizedBody = { ...req.body };
            const sensitiveKeys = ['password', 'confirm_password', 'old_password', 'credit_card', 'bank_account', 'upi_id', 'aadhar', 'pan_number'];
            for (let key in sanitizedBody) {
              if (sensitiveKeys.includes(key.toLowerCase())) {
                sanitizedBody[key] = '***REDACTED***';
              }
            }
            
            // Try to extract the resource ID from the response if not in params or body
            let resourceId = req.params?.id || sanitizedBody.id || null;
            if (!resourceId && responseBody) {
              if (responseBody.data && responseBody.data.id) {
                resourceId = responseBody.data.id;
              } else if (responseBody.id) {
                resourceId = responseBody.id;
              }
            }

            // Include response message if available
            if (responseBody && responseBody.message) {
              sanitizedBody.response_message = responseBody.message;
            }

            const query = `
              INSERT INTO manage_b_to_b_audit_logs
              (user_id, user_role, action, resource, resource_id, details, ip_address)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;

            await pool.query(query, [
              userId,
              userRole,
              action,
              resource,
              resourceId ? String(resourceId) : null,
              JSON.stringify(sanitizedBody),
              ipAddress
            ]);

          } catch (error) {
            logger.error(`Failed to globally audit log: ${error.message}`);
          }
        }
      }
    });
  }

  next();
};
