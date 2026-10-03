import pool from '../Config/database.js';

export const isManufacturer = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const query = `
      SELECT business_type_id, bt.typename
      FROM manage_b_to_b_userdetail u
      LEFT JOIN manage_b_to_b_user_type bt ON u.business_type_id = bt.id
      WHERE u.id = $1 AND u.deleted_at IS NULL
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const businessType = result.rows[0].typename.toLowerCase();

    if (businessType !== 'manufacturer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Manufacturers only.'
      });
    }

    next();
  } catch (error) {
    console.error('Role check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify role'
    });
  }
};

export const isDistributor = async (req, res, next) => {
  try {
    const role = (req.user?.role || '').toLowerCase();
    if (role === 'distributor') {
      return next();
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const query = `
      SELECT business_type_id, bt.typename
      FROM manage_b_to_b_userdetail u
      LEFT JOIN manage_b_to_b_user_type bt ON u.business_type_id = bt.id
      WHERE u.id = $1 AND u.deleted_at IS NULL
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const businessType = (result.rows[0].typename || '').toLowerCase();

    if (businessType !== 'distributor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Distributors only.'
      });
    }

    next();
  } catch (error) {
    console.error('Role check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify role'
    });
  }
};

export const isShop = async (req, res, next) => {
  try {
    if (req.user?.role !== 'shop') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Shops only.'
      });
    }

    next();
  } catch (error) {
    console.error('Role check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify role'
    });
  }
};

export const authenticateRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const userRole = (req.user?.role || '').toUpperCase();
      const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

      if (normalizedAllowed.includes(userRole)) {
        return next();
      }

      const userId = req.user?.userId;
      if (userId) {
        const query = `
          SELECT bt.typename
          FROM manage_b_to_b_userdetail u
          LEFT JOIN manage_b_to_b_user_type bt ON u.business_type_id = bt.id
          WHERE u.id = $1 AND u.deleted_at IS NULL
        `;
        const result = await pool.query(query, [userId]);
        if (result.rows.length > 0) {
          const typeName = (result.rows[0].typename || '').toUpperCase();
          if (normalizedAllowed.includes(typeName)) {
            return next();
          }
        }
      }

      return res.status(403).json({
        success: false,
        message: `Access denied. Allowed roles: ${allowedRoles.join(', ')}`
      });
    } catch (error) {
      console.error('authenticateRole error:', error);
      res.status(500).json({ success: false, message: 'Failed to verify role authorization' });
    }
  };
};

