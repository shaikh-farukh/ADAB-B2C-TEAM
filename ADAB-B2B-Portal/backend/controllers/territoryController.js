import pool from '../Config/database.js';

// Assign territory to distributor
export const assignTerritory = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { distributor_id, state_id, city_id, pincode } = req.body;
  const normalizedPincode = pincode ? String(pincode).trim() : null;
  const normalizedStateId = state_id ? Number(state_id) : null;
  const normalizedCityId = city_id ? Number(city_id) : null;

  if (!distributor_id) {
    return res.status(400).json({ success: false, message: 'Distributor ID is required' });
  }
  if (!normalizedStateId && !normalizedCityId && !normalizedPincode) {
    return res.status(400).json({
      success: false,
      message: 'At least one territory value is required'
    });
  }
  if ((state_id && !Number.isInteger(normalizedStateId)) || (city_id && !Number.isInteger(normalizedCityId))) {
    return res.status(400).json({
      success: false,
      message: 'state_id and city_id must be valid numeric IDs'
    });
  }

  try {
    // Check if partnership exists and is active
    const partnerCheck = await pool.query(
      `SELECT id FROM manage_b_to_b_request_access
       WHERE manufacturer_id = $1
         AND email_distributer = (SELECT email FROM manage_b_to_b_userdetail WHERE id = $2)
         AND manufacture_request = 1
         AND distributer_request = 1
         AND deleted_at IS NULL`,
      [manufacturerId, distributor_id]
    );

    if (partnerCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Active partnership with this distributor is required to assign territories'
      });
    }

    const duplicateCheck = await pool.query(
      `SELECT id FROM territory_assignments
       WHERE manufacturer_id = $1
         AND distributor_id = $2
         AND active = true
         AND COALESCE(state_id, 0) = COALESCE($3, 0)
         AND COALESCE(city_id, 0) = COALESCE($4, 0)
         AND COALESCE(pincode, '') = COALESCE($5, '')
       LIMIT 1`,
      [manufacturerId, distributor_id, normalizedStateId, normalizedCityId, normalizedPincode]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This territory is already assigned to the distributor'
      });
    }

    const overlapCheck = await pool.query(
      `SELECT id FROM territory_assignments
       WHERE manufacturer_id = $1
         AND distributor_id = $2
         AND active = true
         AND (
           ($3::varchar IS NOT NULL AND pincode = $3)
           OR ($4::integer IS NOT NULL AND city_id = $4 AND pincode IS NULL)
           OR ($5::integer IS NOT NULL AND state_id = $5 AND city_id IS NULL AND pincode IS NULL)
           OR (pincode IS NOT NULL AND $3::varchar IS NULL AND $4::integer IS NOT NULL AND city_id = $4)
           OR (pincode IS NOT NULL AND $3::varchar IS NULL AND $5::integer IS NOT NULL AND state_id = $5 AND $4::integer IS NULL)
           OR (city_id IS NOT NULL AND pincode IS NULL AND $4::integer IS NULL AND $5::integer IS NOT NULL AND state_id = $5)
         )
       LIMIT 1`,
      [manufacturerId, distributor_id, normalizedPincode, normalizedCityId, normalizedStateId]
    );

    if (overlapCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Territory overlaps with an existing assignment for this distributor'
      });
    }

    // Insert territory assignment
    const insertQuery = `
      INSERT INTO territory_assignments (manufacturer_id, distributor_id, state_id, city_id, pincode)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(insertQuery, [
      manufacturerId,
      distributor_id,
      normalizedStateId,
      normalizedCityId,
      normalizedPincode
    ]);

    res.status(201).json({
      success: true,
      message: 'Territory assigned successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Assign territory error:', error);
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'This territory is already assigned to the distributor'
      });
    }
    res.status(500).json({ success: false, message: 'Failed to assign territory' });
  }
};

// Get territory assignments for manufacturer or distributor
export const getTerritories = async (req, res) => {
  const userId = req.user.userId;
  const isDist = req.user.role === 'distributor';

  try {
    let query = `
      SELECT t.*,
             d.company_name as distributor_name,
             m.company_name as manufacturer_name,
             s.state_name,
             c.city_name
      FROM territory_assignments t
      LEFT JOIN manage_b_to_b_userdetail d ON t.distributor_id = d.id
      LEFT JOIN manage_b_to_b_userdetail m ON t.manufacturer_id = m.id
      LEFT JOIN state s ON t.state_id = s.id
      LEFT JOIN city c ON t.city_id = c.id
      WHERE ${isDist ? 't.distributor_id = $1' : 't.manufacturer_id = $1'}
        AND t.active = true
      ORDER BY t.created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get territories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch territories' });
  }
};

// Remove territory assignment
export const deleteTerritory = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;

  try {
    const query = `
      UPDATE territory_assignments
      SET active = false
      WHERE id = $1 AND manufacturer_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [id, manufacturerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Territory assignment not found' });
    }

    res.status(200).json({ success: true, message: 'Territory assignment removed successfully' });
  } catch (error) {
    console.error('Delete territory assignment error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete territory assignment' });
  }
};
