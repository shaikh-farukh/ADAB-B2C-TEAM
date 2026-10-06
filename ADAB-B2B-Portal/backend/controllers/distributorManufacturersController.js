import pool from '../Config/database.js';

// Get all available manufacturers (for "Available Manufacturers" page)
export const getManufacturers = async (req, res) => {
  try {
    const distributorId = req.user.userId;
    const { search, category } = req.query;

    // Get distributor email to join request access status
    const distributorQuery = await pool.query(
      'SELECT email FROM manage_b_to_b_userdetail WHERE id = $1 AND deleted_at IS NULL',
      [distributorId]
    );

    if (distributorQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Distributor not found'
      });
    }

    const distributorEmail = distributorQuery.rows[0].email;

    let query = `
      SELECT
        u.id,
        u.company_name as manufacturer_name,
        u.country,
        STRING_AGG(DISTINCT p.category, ', ') as categories,
        r.manufacture_request,
        r.distributer_request
      FROM manage_b_to_b_userdetail u
      JOIN manage_b_to_b_user_type t ON u.business_type_id = t.id
      LEFT JOIN manage_manufacturer_products p ON u.id = p.manufacturer_id AND p.deleted_at IS NULL
      LEFT JOIN manage_b_to_b_request_access r ON u.id = r.manufacturer_id AND r.email_distributer = $1 AND r.deleted_at IS NULL
      WHERE (t.typename = 'Manufacturer' OR u.business_type_id = 1)
        AND u.active = true
        AND u.deleted_at IS NULL
    `;

    const queryParams = [distributorEmail];
    let paramIndex = 2;

    // Search filter
    if (search) {
      query += ` AND u.company_name ILIKE $${paramIndex}`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Category filter
    if (category && category !== 'All Categories') {
      query += ` AND EXISTS (
        SELECT 1 FROM manage_manufacturer_products
        WHERE manufacturer_id = u.id
        AND category = $${paramIndex}
        AND deleted_at IS NULL
      )`;
      queryParams.push(category);
      paramIndex++;
    }

    query += ` GROUP BY u.id, u.company_name, u.country, r.manufacture_request, r.distributer_request
               ORDER BY u.company_name`;

    const result = await pool.query(query, queryParams);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(row => {
        let status = 'NOT_CONNECTED';
        if (row.manufacture_request === 1 && row.distributer_request === 1) {
          status = 'APPROVED';
        } else if (row.manufacture_request === 1 && row.distributer_request === null) {
          status = 'PENDING';
        } else if (row.manufacture_request === 0 || row.distributer_request === 0) {
          status = 'REJECTED';
        }

        return {
          id: row.id,
          manufacturer_name: row.manufacturer_name,
          country: row.country,
          specialties: row.categories ? row.categories.split(', ') : [],
          market_reach: 'DOMESTIC',
          international_business: 'No',
          connection_status: status
        };
      })
    });

  } catch (error) {
    console.error('Get manufacturers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch manufacturers'
    });
  }
};

// Get all unique categories for filter
export const getCategories = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT category
      FROM manage_manufacturer_products
      WHERE category IS NOT NULL
        AND category != ''
        AND deleted_at IS NULL
      ORDER BY category
    `;

    const result = await pool.query(query);

    res.status(200).json({
      success: true,
      data: result.rows.map(row => row.category)
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};

// Get specific manufacturer details (for distributor view)
export const getManufacturer = async (req, res) => {
  try {
    const distributorId = req.user.userId;
    const { id: manufacturerId } = req.params;

    // Check if manufacturer exists and is active
    const manufacturerQuery = `
      SELECT
        u.id,
        u.company_name as manufacturer_name,
        u.email,
        u.mobile,
        u.country,
        u.address,
        u.gst_number,
        u.owner_name,
        STRING_AGG(DISTINCT p.category, ', ') as categories
      FROM manage_b_to_b_userdetail u
      JOIN manage_b_to_b_user_type t ON u.business_type_id = t.id
      LEFT JOIN manage_manufacturer_products p ON u.id = p.manufacturer_id AND p.deleted_at IS NULL
      WHERE u.id = $1 
        AND (t.typename = 'Manufacturer' OR u.business_type_id = 1)
        AND u.active = true 
        AND u.deleted_at IS NULL
      GROUP BY u.id, u.company_name, u.email, u.mobile, u.country, u.address, u.gst_number, u.owner_name
    `;

    const manufacturerResult = await pool.query(manufacturerQuery, [manufacturerId]);

    if (manufacturerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Manufacturer not found or inactive'
      });
    }

    const manufacturer = manufacturerResult.rows[0];

    // Get distributor email to fetch partnership request access status
    const distributorQuery = await pool.query(
      'SELECT email FROM manage_b_to_b_userdetail WHERE id = $1 AND deleted_at IS NULL',
      [distributorId]
    );

    if (distributorQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Distributor not found'
      });
    }

    const distributorEmail = distributorQuery.rows[0].email;

    // Get connection/partnership status
    const requestQuery = `
      SELECT id, manufacture_request, distributer_request, created_at, unique_request_id
      FROM manage_b_to_b_request_access
      WHERE manufacturer_id = $1
        AND email_distributer = $2
        AND deleted_at IS NULL
    `;
    const requestResult = await pool.query(requestQuery, [manufacturerId, distributorEmail]);

    let partnership = {
      status: 'NOT_CONNECTED',
      request_id: null,
      unique_request_id: null,
      request_date: null
    };

    if (requestResult.rows.length > 0) {
      const request = requestResult.rows[0];
      let status = 'PENDING';

      if (request.manufacture_request === 1 && request.distributer_request === 1) {
        status = 'APPROVED';
      } else if (request.manufacture_request === 0 || request.distributer_request === 0) {
        status = 'REJECTED';
      }

      partnership = {
        status: status,
        request_id: request.id,
        unique_request_id: request.unique_request_id,
        request_date: request.created_at
      };
    }

    res.status(200).json({
      success: true,
      data: {
        id: manufacturer.id,
        manufacturer_name: manufacturer.manufacturer_name,
        email: manufacturer.email,
        mobile: manufacturer.mobile,
        country: manufacturer.country,
        address: manufacturer.address,
        gst_number: manufacturer.gst_number,
        owner_name: manufacturer.owner_name,
        market_reach: 'DOMESTIC',
        international_business: 'No',
        specialties: manufacturer.categories ? manufacturer.categories.split(', ') : [],
        partnership: partnership
      }
    });

  } catch (error) {
    console.error('Get manufacturer details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch manufacturer details'
    });
  }
};