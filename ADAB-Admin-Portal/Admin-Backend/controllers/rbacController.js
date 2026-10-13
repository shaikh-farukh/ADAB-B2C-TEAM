const rbacService = require('../services/rbacService');

/**
 * RBAC Controller
 * Handles HTTP requests for Roles & Permissions endpoints.
 */
async function getRoles(req, res) {
  try {
    const roles = await rbacService.getRoles();
    return res.status(200).json({ success: true, data: roles });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
}

async function createRole(req, res) {
  try {
    const { slug, name, description } = req.body;
    if (!slug || !name) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: "Fields 'slug' and 'name' are required"
      });
    }
    const role = await rbacService.createRole({ slug, name, description });
    return res.status(201).json({ success: true, data: role });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
}

async function updateRole(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const role = await rbacService.updateRole(id, { name, description });
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Role with ID '${id}' not found`
      });
    }
    return res.status(200).json({ success: true, data: role });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
}

async function getPermissions(req, res) {
  try {
    const permissions = await rbacService.getPermissions();
    return res.status(200).json({ success: true, data: permissions });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
}

async function updateRolePermissions(req, res) {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    const result = await rbacService.updateRolePermissions(id, permissions);
    if (!result.success) {
      return res.status(result.status || 400).json(result);
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
}

module.exports = {
  getRoles,
  createRole,
  updateRole,
  getPermissions,
  updateRolePermissions
};
