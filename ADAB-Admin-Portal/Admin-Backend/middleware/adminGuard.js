const { hasRole, hasPermission, ADMIN_ROLES } = require('./rolesPermissions');

/**
 * Reusable Admin Guard Middleware Factory
 * Enforces server-side authentication and role/permission authorization for Admin endpoints.
 *
 * @param {Object} options
 * @param {Array<string>} [options.roles] - Array of required admin role slugs
 * @param {Array<string>} [options.permissions] - Array of required permission strings
 */
function adminGuard(options = {}) {
  return (req, res, next) => {
    // 1. Authentication check
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Admin authentication required'
      });
    }

    const userType = (req.user.user_type || '').toUpperCase();
    const userRole = (req.user.role || '').toUpperCase();

    // 2. Base Admin role check
    const isBaseAdmin = userType === 'ADMIN' || Object.values(ADMIN_ROLES).includes(userRole);
    if (!isBaseAdmin) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Access denied: Admin role required'
      });
    }

    // 3. Specific Role restriction check
    if (options.roles && options.roles.length > 0) {
      if (!hasRole(req.user, options.roles)) {
        return res.status(403).json({
          success: false,
          error: 'INSUFFICIENT_ROLE',
          message: `Access denied: Requires one of roles: ${options.roles.join(', ')}`
        });
      }
    }

    // 4. Specific Permission check
    if (options.permissions && options.permissions.length > 0) {
      if (!hasPermission(req.user, options.permissions)) {
        return res.status(403).json({
          success: false,
          error: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied: Requires permissions: ${options.permissions.join(', ')}`
        });
      }
    }

    next();
  };
}

module.exports = adminGuard;
