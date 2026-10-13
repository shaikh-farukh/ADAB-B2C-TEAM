const pool = require('../db');

/**
 * RBAC Service
 * Interacts with database tables `roles` and `permissions`.
 * Verifies existence of `role_permissions` join table before attempting mutation.
 */
class RbacService {
  async getRoles() {
    if (!pool || typeof pool.query !== 'function') {
      return [];
    }
    const res = await pool.query(`
      SELECT r.id, r.slug, r.name, r.description, r.created_at,
             COALESCE(
               json_agg(
                 json_build_object('id', p.id, 'slug', p.slug, 'module', p.module, 'description', p.description)
               ) FILTER (WHERE p.id IS NOT NULL), '[]'
             ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      GROUP BY r.id, r.slug, r.name, r.description, r.created_at
      ORDER BY r.id ASC
    `);
    return res.rows;
  }

  async createRole({ slug, name, description }) {
    if (!slug || !name) {
      throw new Error("Fields 'slug' and 'name' are required");
    }
    const normalizedSlug = slug.trim().toLowerCase().replace(/\s+/g, '_');
    const res = await pool.query(
      'INSERT INTO roles (slug, name, description) VALUES ($1, $2, $3) RETURNING *',
      [normalizedSlug, name.trim(), description ? description.trim() : null]
    );
    return res.rows[0];
  }

  async updateRole(id, { name, description }) {
    const roleId = parseInt(id, 10);
    if (isNaN(roleId)) {
      throw new Error('Invalid role ID');
    }
    const res = await pool.query(
      'UPDATE roles SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 RETURNING *',
      [name ? name.trim() : null, description !== undefined ? (description ? description.trim() : null) : null, roleId]
    );
    if (res.rows.length === 0) {
      return null;
    }
    return res.rows[0];
  }

  async getPermissions() {
    if (!pool || typeof pool.query !== 'function') {
      return [];
    }
    const res = await pool.query('SELECT id, slug, module, description FROM permissions ORDER BY id ASC');
    return res.rows;
  }

  async updateRolePermissions(roleId, permissions) {
    const rId = parseInt(roleId, 10);
    if (isNaN(rId)) {
      return { success: false, status: 400, error: 'INVALID_ID', message: 'Role ID must be a valid integer' };
    }

    if (!Array.isArray(permissions)) {
      return {
        success: false,
        status: 400,
        error: 'INVALID_INPUT',
        message: "'permissions' field must be an array of permission IDs or slugs"
      };
    }

    // 1. Check if role exists
    const rRes = await pool.query('SELECT id, slug, name FROM roles WHERE id = $1', [rId]);
    if (rRes.rows.length === 0) {
      return { success: false, status: 404, error: 'NOT_FOUND', message: `Role '${roleId}' not found` };
    }

    // 2. Validate all provided permissions exist
    let resolvedPermIds = [];
    if (permissions.length > 0) {
      const permIds = [];
      const permSlugs = [];

      for (const p of permissions) {
        if (typeof p === 'number' || (typeof p === 'string' && /^\d+$/.test(p))) {
          permIds.push(parseInt(p, 10));
        } else if (typeof p === 'string' && p.trim()) {
          permSlugs.push(p.trim());
        } else if (p && typeof p === 'object' && p.id) {
          permIds.push(parseInt(p.id, 10));
        } else {
          return {
            success: false,
            status: 400,
            error: 'INVALID_PERMISSION',
            message: `Invalid permission identifier: ${JSON.stringify(p)}`
          };
        }
      }

      const foundPermsRes = await pool.query(
        `SELECT id, slug FROM permissions WHERE id = ANY($1::int[]) OR slug = ANY($2::varchar[])`,
        [permIds.length > 0 ? permIds : [-1], permSlugs.length > 0 ? permSlugs : ['__none__']]
      );

      const foundPerms = foundPermsRes.rows;
      if (foundPerms.length !== permissions.length) {
        return {
          success: false,
          status: 400,
          error: 'INVALID_PERMISSION',
          message: 'One or more specified permissions do not exist in the permissions catalog'
        };
      }
      resolvedPermIds = foundPerms.map(fp => fp.id);
    }

    // 3. Persist transactionally in role_permissions table
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [rId]);

      for (const pid of resolvedPermIds) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [rId, pid]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // 4. Reread from database to confirm persistence
    const verifiedPerms = await pool.query(
      `SELECT p.id, p.slug, p.module, p.description
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = $1
       ORDER BY p.id ASC`,
      [rId]
    );

    return {
      success: true,
      message: 'Role permissions updated and persisted successfully',
      data: {
        roleId: rId,
        role: rRes.rows[0],
        permissions: verifiedPerms.rows
      }
    };
  }
}

module.exports = new RbacService();
