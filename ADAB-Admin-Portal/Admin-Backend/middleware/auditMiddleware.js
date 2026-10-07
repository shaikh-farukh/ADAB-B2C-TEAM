const { recordAuditLog } = require('../services/auditService');

/**
 * Reusable Audit Middleware for sensitive Admin mutations.
 * Captures:
 * - actor/admin
 * - action
 * - entity/type
 * - entity ID
 * - previous/new state
 * - timestamp
 * - correlation/request ID
 *
 * @param {Object} options
 * @param {string} [options.action] - Override action name
 * @param {string} [options.entityType] - Override entity type
 */
function auditMiddleware(options = {}) {
  return (req, res, next) => {
    // Generate or extract Correlation/Request ID
    const correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);

    // Only audit mutating methods (POST, PUT, PATCH, DELETE) unless explicitly requested
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
    if (!isMutating && !options.force) {
      return next();
    }

    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody = null;

    res.json = function (body) {
      responseBody = body;
      return originalJson.apply(this, arguments);
    };

    res.send = function (body) {
      if (!responseBody && body) {
        try {
          responseBody = typeof body === 'string' ? JSON.parse(body) : body;
        } catch (_) {}
      }
      return originalSend.apply(this, arguments);
    };

    res.on('finish', async () => {
      // Only record audit log if response was successful (2xx) or as specified
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const actorId = req.user ? req.user.id : null;
        const actionName = options.action || `${req.method} ${req.baseUrl}${req.path}`;
        const entityType = options.entityType || req.params.entityType || req.body?.entityType || 'ADMIN_ACTION';
        const entityId = req.params.id || req.body?.id || req.body?.listing_id || 'GLOBAL';

        const changes = {
          requestBody: req.body,
          response: responseBody,
          previousState: req.auditPreviousState || req.body?.previous_status || null,
          newState: req.auditNewState || responseBody?.new_status || req.body?.new_status || null,
          correlationId,
          timestamp: new Date().toISOString()
        };

        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

        await recordAuditLog({
          actor_id: actorId,
          action: actionName,
          entity_type: entityType,
          entity_id: entityId,
          changes,
          ip_address: ipAddress
        });
      }
    });

    next();
  };
}

module.exports = auditMiddleware;
