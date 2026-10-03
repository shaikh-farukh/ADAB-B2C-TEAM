import pool from '../Config/database.js';

export const createVehicle = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { logistics_provider_id, driver_id, vehicle_number, vehicle_type, capacity, insurance_expiry_date, permit_expiry_date } = req.body;

    const dupCheck = await pool.query(`
      SELECT id FROM manage_b_to_b_vehicles
      WHERE owner_id = $1
        AND deleted_at IS NULL
        AND UPPER(TRIM(vehicle_number)) = UPPER(TRIM($2))
    `, [owner_id, vehicle_number]);

    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Vehicle already exists' });
    }

    if (driver_id) {
      const driverCheck = await pool.query(`
        SELECT id FROM manage_b_to_b_vehicles
        WHERE owner_id = $1
          AND deleted_at IS NULL
          AND driver_id = $2
          AND status = 'active'
      `, [owner_id, driver_id]);

      if (driverCheck.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Driver already assigned to another active vehicle' });
      }
    }

    const query = `
      INSERT INTO manage_b_to_b_vehicles
        (owner_id, logistics_provider_id, driver_id, vehicle_number, vehicle_type, capacity, insurance_expiry_date, permit_expiry_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const result = await pool.query(query, [
      owner_id, logistics_provider_id || null, driver_id || null, vehicle_number, vehicle_type, capacity || null, insurance_expiry_date || null, permit_expiry_date || null
    ]);

    res.status(201).json({ success: true, message: 'Vehicle created successfully', data: result.rows[0] });
  } catch (error) {
    console.error('createVehicle error:', error);
    res.status(500).json({ success: false, message: 'Failed to create vehicle' });
  }
};

export const getVehicles = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { logistics_provider_id, driver_id, is_available } = req.query;

    let query = `
      SELECT v.*, p.provider_name, d.driver_name
      FROM manage_b_to_b_vehicles v
      LEFT JOIN manage_b_to_b_logistics_providers p ON v.logistics_provider_id = p.id
      LEFT JOIN manage_b_to_b_drivers d ON v.driver_id = d.id
      WHERE v.owner_id = $1 AND v.deleted_at IS NULL
    `;
    const params = [owner_id];

    if (logistics_provider_id) {
      if (logistics_provider_id === 'null') {
        query += ` AND v.logistics_provider_id IS NULL`;
      } else {
        params.push(logistics_provider_id);
        query += ` AND v.logistics_provider_id = $${params.length}`;
      }
    }

    if (driver_id) {
      if (driver_id === 'null') {
        query += ` AND v.driver_id IS NULL`;
      } else {
        params.push(driver_id);
        query += ` AND v.driver_id = $${params.length}`;
      }
    }

    if (is_available !== undefined && is_available !== '') {
      params.push(is_available === 'true');
      query += ` AND v.is_available = $${params.length}`;
    }

    query += ` ORDER BY v.created_at DESC`;

    const result = await pool.query(query, params);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getVehicles error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vehicles' });
  }
};

export const getVehicleById = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { id } = req.params;
    const query = `
      SELECT * FROM manage_b_to_b_vehicles
      WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL;
    `;
    const result = await pool.query(query, [id, owner_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('getVehicleById error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vehicle' });
  }
};

export const updateVehicle = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { id } = req.params;
    const { logistics_provider_id, driver_id, vehicle_number, vehicle_type, capacity, insurance_expiry_date, permit_expiry_date } = req.body;

    const checkRecord = await pool.query(
      `SELECT owner_id FROM manage_b_to_b_vehicles WHERE id = $1 AND deleted_at IS NULL;`,
      [id]
    );

    if (checkRecord.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (String(checkRecord.rows[0].owner_id) !== String(owner_id)) {
      return res.status(403).json({ success: false, message: "This is a distributor's vehicle, you cannot update it." });
    }

    const dupCheck = await pool.query(`
      SELECT id FROM manage_b_to_b_vehicles
      WHERE owner_id = $1
        AND id != $2
        AND deleted_at IS NULL
        AND UPPER(TRIM(vehicle_number)) = UPPER(TRIM($3))
    `, [owner_id, id, vehicle_number]);

    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Vehicle already exists' });
    }

    if (driver_id) {
      const driverCheck = await pool.query(`
        SELECT id FROM manage_b_to_b_vehicles
        WHERE owner_id = $1
          AND id != $2
          AND deleted_at IS NULL
          AND driver_id = $3
          AND status = 'active'
      `, [owner_id, id, driver_id]);

      if (driverCheck.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Driver already assigned to another active vehicle' });
      }
    }

    const query = `
      UPDATE manage_b_to_b_vehicles
      SET logistics_provider_id = $1,
          driver_id = $2,
          vehicle_number = COALESCE($3, vehicle_number),
          vehicle_type = COALESCE($4, vehicle_type),
          capacity = $5,
          insurance_expiry_date = $6,
          permit_expiry_date = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 AND owner_id = $9 AND deleted_at IS NULL
      RETURNING *;
    `;
    const result = await pool.query(query, [
      logistics_provider_id || null, driver_id || null, vehicle_number, vehicle_type, capacity || null, insurance_expiry_date || null, permit_expiry_date || null, id, owner_id
    ]);

    res.status(200).json({ success: true, message: 'Vehicle updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('updateVehicle error:', error);
    res.status(500).json({ success: false, message: 'Failed to update vehicle' });
  }
};

export const toggleVehicleStatus = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { id } = req.params;
    const { status, is_available } = req.body;

    const checkRecord = await pool.query(
      `SELECT owner_id FROM manage_b_to_b_vehicles WHERE id = $1 AND deleted_at IS NULL;`,
      [id]
    );

    if (checkRecord.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (String(checkRecord.rows[0].owner_id) !== String(owner_id)) {
      return res.status(403).json({ success: false, message: "This is a distributor's vehicle, you cannot change its status." });
    }

    let updateFields = [];
    let params = [];

    if (status) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      params.push(status);
      updateFields.push(`status = $${params.length}`);
    }

    if (typeof is_available === 'boolean' || is_available === 'true' || is_available === 'false') {
      const boolVal = typeof is_available === 'boolean' ? is_available : is_available === 'true';
      params.push(boolVal);
      updateFields.push(`is_available = $${params.length}::boolean`);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(id, owner_id);
    const query = `
      UPDATE manage_b_to_b_vehicles
      SET ${updateFields.join(', ')}
      WHERE id = $${params.length - 1} AND owner_id = $${params.length} AND deleted_at IS NULL
      RETURNING *;
    `;
    const result = await pool.query(query, params);

    res.status(200).json({ success: true, message: 'Vehicle updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('toggleVehicleStatus error:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

export const deleteVehicle = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { id } = req.params;

    const checkRecord = await pool.query(
      `SELECT owner_id FROM manage_b_to_b_vehicles WHERE id = $1 AND deleted_at IS NULL;`,
      [id]
    );

    if (checkRecord.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (String(checkRecord.rows[0].owner_id) !== String(owner_id)) {
      return res.status(403).json({ success: false, message: "This is a distributor's vehicle, you cannot delete it." });
    }

    const query = `
      UPDATE manage_b_to_b_vehicles
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
      RETURNING *;
    `;
    await pool.query(query, [id, owner_id]);

    res.status(200).json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('deleteVehicle error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete vehicle' });
  }
};
