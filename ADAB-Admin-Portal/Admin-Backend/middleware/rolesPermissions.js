/**
 * Roles and Permissions Definitions and Helpers
 */

const ADMIN_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  CATALOG_MANAGER: 'CATALOG_MANAGER',
  COMPLIANCE_AUDITOR: 'COMPLIANCE_AUDITOR',
  FINANCIAL_OPERATOR: 'FINANCIAL_OPERATOR'
};

const PERMISSIONS = {
  CATALOG_READ: 'catalog:read',
  CATALOG_WRITE: 'catalog:write',
  CATALOG_APPROVE: 'catalog:approve',
  AUDIT_READ: 'audit:read',
  USERS_MANAGE: 'users:manage',
  USER_STATUS_UPDATE: 'users:status:update',
  SETTINGS_WRITE: 'settings:write'
};

const ROLE_PERMISSIONS_MAP = {
  [ADMIN_ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ADMIN_ROLES.ADMIN]: [
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.CATALOG_WRITE,
    PERMISSIONS.CATALOG_APPROVE,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.USER_STATUS_UPDATE
  ],
  [ADMIN_ROLES.CATALOG_MANAGER]: [
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.CATALOG_WRITE,
    PERMISSIONS.CATALOG_APPROVE
  ],
  [ADMIN_ROLES.COMPLIANCE_AUDITOR]: [
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.AUDIT_READ
  ],
  [ADMIN_ROLES.FINANCIAL_OPERATOR]: [
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.AUDIT_READ
  ]
};

/**
 * Checks if a user has an allowed admin role.
 */
function hasRole(user, allowedRoles) {
  if (!user) return false;
  const userRole = (user.role || '').toUpperCase();
  const userType = (user.user_type || '').toUpperCase();

  if (userType !== 'ADMIN' && !Object.values(ADMIN_ROLES).includes(userRole)) {
    return false;
  }

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  return allowedRoles.map(r => r.toUpperCase()).includes(userRole) || userRole === ADMIN_ROLES.SUPER_ADMIN;
}

/**
 * Checks if a user has a required permission.
 */
function hasPermission(user, requiredPermissions) {
  if (!user) return false;
  const userRole = (user.role || '').toUpperCase();

  // SuperAdmin has all permissions
  if (userRole === ADMIN_ROLES.SUPER_ADMIN) return true;

  // Direct user permissions array
  const userPerms = new Set([
    ...(user.permissions || []),
    ...(ROLE_PERMISSIONS_MAP[userRole] || [])
  ]);

  if (!requiredPermissions || requiredPermissions.length === 0) return true;

  return requiredPermissions.every(perm => userPerms.has(perm));
}

module.exports = {
  ADMIN_ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS_MAP,
  hasRole,
  hasPermission
};
