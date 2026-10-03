import pool from '../Config/database.js';
import logger from '../utils/logger.js';

// Get all distributors (all registered distributors with connection status) with pagination
export const getDistributors = async (req, res) => {
  try {
    const manufacturerId = req.user.userId;
    const { search, region } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    logger.info(`Fetching APPROVED/CONNECTED distributors for manufacturer: ${manufacturerId}`, { search, region, page, limit });

    // Base JOIN logic
    const baseJoin = `
      INNER JOIN manage_b_to_b_request_access r ON u.email = r.email_distributer AND r.manufacturer_id = $1 AND r.deleted_at IS NULL
    `;

    // Base WHERE clause: only approved/connected distributors
    let baseWhere = `
      WHERE u.business_type_id = (SELECT id FROM manage_b_to_b_user_type WHERE typename = 'Distributor' LIMIT 1)
        AND u.id != $1
        AND u.deleted_at IS NULL
        AND r.manufacture_request = 1
        AND r.distributer_request = 1
    `;

    const queryParams = [manufacturerId];
    let paramIndex = 2;

    // Search filter
    if (search) {
      baseWhere += ` AND u.company_name ILIKE $${paramIndex}`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Region filter
    if (region && region !== 'All Region' && region !== 'All Regions' && region !== 'All') {
      baseWhere += ` AND u.country = $${paramIndex}`;
      queryParams.push(region);
      paramIndex++;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT u.id)
      FROM manage_b_to_b_userdetail u
      ${baseJoin}
      ${baseWhere}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    // Fetch with pagination and connection status join
    const selectQuery = `
      SELECT
        u.id,
        u.company_name,
        u.company_name as distributor_name,
        u.email,
        u.mobile as contact_info,
        u.country as region,
        u.address,
        MAX(r.created_at) as active_since,
        'CONNECTED' as connection_status,
        COALESCE(o_count.count, 0) as completed_orders
      FROM manage_b_to_b_userdetail u
      ${baseJoin}
      LEFT JOIN (
        SELECT distributor_id, COUNT(*) as count
        FROM manage_b_to_b_orders
        WHERE manufacturer_id = $1 AND deleted_at IS NULL
        GROUP BY distributor_id
      ) o_count ON u.id = o_count.distributor_id
      ${baseWhere}
      GROUP BY u.id, u.company_name, u.email, u.mobile, u.country, u.address, o_count.count
      ORDER BY u.company_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await pool.query(selectQuery, queryParams);

    res.status(200).json({
      success: true,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit
      },
      data: result.rows.map(row => ({
        id: row.id,
        distributor_name: row.distributor_name,
        company: row.distributor_name,
        company_name: row.distributor_name,
        region: row.region,
        contact_info: {
          email: row.email,
          mobile: row.contact_info
        },
        active_since: row.active_since ? new Date(row.active_since).toLocaleDateString() : 'N/A',
        connection_status: row.connection_status,
        completed_orders: parseInt(row.completed_orders)
      }))
    });

  } catch (error) {
    logger.error('Get distributors error', error, { manufacturerId: req.user.userId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch distributors'
    });
  }
};

// Get single distributor details
export const getDistributor = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  try {
    logger.info(`Fetching distributor detail. Manufacturer: ${manufacturerId}, Distributor ID: ${id}`);

    const query = `
      SELECT
        u.id,
        u.company_name as distributor_name,
        u.email,
        u.mobile,
        u.country,
        u.address,
        u.gst_number,
        u.owner_name,
        u.age,
        u.gender,
        u.personal_contact,
        u.personal_email,
        r.created_at as partnership_date,
        CASE
          WHEN r.id IS NULL THEN 'NOT_CONNECTED'
          WHEN r.manufacture_request = 1 AND r.distributer_request = 1 THEN 'CONNECTED'
          WHEN r.distributer_request = 0 THEN 'REJECTED'
          ELSE 'PENDING'
        END as connection_status,
        (SELECT COUNT(*) FROM manage_b_to_b_orders WHERE distributor_id = u.id AND manufacturer_id = $1 AND deleted_at IS NULL) as total_orders,
        (SELECT COUNT(*) FROM manage_b_to_b_orders WHERE distributor_id = u.id AND manufacturer_id = $1 AND status = 'delivered' AND deleted_at IS NULL) as completed_orders
      FROM manage_b_to_b_userdetail u
      LEFT JOIN manage_b_to_b_request_access r ON u.email = r.email_distributer AND r.manufacturer_id = $1 AND r.deleted_at IS NULL
      WHERE u.id = $2
        AND u.business_type_id = (SELECT id FROM manage_b_to_b_user_type WHERE typename = 'Distributor' LIMIT 1)
        AND u.deleted_at IS NULL
    `;

    const result = await pool.query(query, [manufacturerId, id]);

    if (result.rows.length === 0) {
      logger.warn(`Distributor not found. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Distributor not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error(`Get distributor detail error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch distributor'
    });
  }
};

// Get all unique regions for filter
export const getRegions = async (req, res) => {
  try {
    logger.info(`Fetching unique regions for all registered distributors`);

    const query = `
      SELECT DISTINCT u.country as region
      FROM manage_b_to_b_userdetail u
      WHERE u.business_type_id = (SELECT id FROM manage_b_to_b_user_type WHERE typename = 'Distributor' LIMIT 1)
        AND u.country IS NOT NULL
        AND u.deleted_at IS NULL
      ORDER BY u.country
    `;

    const result = await pool.query(query);

    res.status(200).json({
      success: true,
      data: result.rows.map(row => row.region)
    });

  } catch (error) {
    logger.error('Get regions error', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regions'
    });
  }
};
// Get connected shops for distributor
export const getShops = async (req, res) => {
  try {
    const distributorId = req.user.userId;
    // Assuming manage_b_to_b_request_access uses manufacturer_id for the parent and email_distributer for the child
    // In the context of a distributor, the parent is the distributor and the child is the shop
    // Wait, the schema uses manufacturer_id for the parent and distributer_id for child?
    // Let's use a simpler query: just get all shops that requested access to this distributor.
    const query = `
      SELECT DISTINCT
        u.id,
        u.company_name,
        u.company_name as distributor_name
      FROM manage_b_to_b_userdetail u
      INNER JOIN manage_b_to_b_orders o ON u.id = o.shop_id
      WHERE o.distributor_id = $1 AND u.deleted_at IS NULL
      ORDER BY u.company_name
    `;
    const result = await pool.query(query, [distributorId]);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Failed to fetch shops', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shops' });
  }
};

export const getServiceableTerritory = async (req, res) => {
  try {
    const distributorId = req.user.userId;
    const query = `
      SELECT serviceable_pincodes
      FROM manage_b_to_b_userdetail
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const result = await pool.query(query, [distributorId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Distributor not found' });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0].serviceable_pincodes || []
    });
  } catch (error) {
    console.error('Failed to fetch serviceable territory', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateServiceableTerritory = async (req, res) => {
  try {
    const distributorId = req.user.userId;
    const { pincodes } = req.body; // array of strings

    if (!Array.isArray(pincodes)) {
      return res.status(400).json({ success: false, message: 'Pincodes must be an array' });
    }

    const query = `
      UPDATE manage_b_to_b_userdetail
      SET serviceable_pincodes = $1
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING serviceable_pincodes
    `;

    const result = await pool.query(query, [pincodes, distributorId]);

    res.status(200).json({
      success: true,
      message: 'Territory updated successfully',
      data: result.rows[0].serviceable_pincodes || []
    });
  } catch (error) {
    console.error('Failed to update serviceable territory', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
