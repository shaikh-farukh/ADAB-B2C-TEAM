import pool from '../Config/database.js';
import redisService from '../Config/redis.js';
import { getIO } from '../Config/socket.js';

export const createDriver = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { logistics_provider_id, driver_name, mobile, license_number, license_expiry_date, aadhaar_number, emergency_contact } = req.body;

    const dupCheck = await pool.query(`
      SELECT id FROM manage_b_to_b_drivers
      WHERE owner_id = $1
        AND deleted_at IS NULL
        AND TRIM(mobile) = TRIM($2)
    `, [owner_id, mobile]);

    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Driver with this mobile number already exists' });
    }

    const query = `
      INSERT INTO manage_b_to_b_drivers
        (owner_id, logistics_provider_id, driver_name, mobile, license_number, license_expiry_date, aadhaar_number, emergency_contact)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const result = await pool.query(query, [
      owner_id, logistics_provider_id || null, driver_name, mobile, license_number, license_expiry_date || null, aadhaar_number, emergency_contact
    ]);

    res.status(201).json({ success: true, message: 'Driver created successfully', data: result.rows[0] });
  } catch (error) {
    console.error('createDriver error:', error);
    res.status(500).json({ success: false, message: 'Failed to create driver' });
  }
};

export const getDrivers = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { logistics_provider_id } = req.query;

    let query = `
      SELECT d.*, p.provider_name
      FROM manage_b_to_b_drivers d
      LEFT JOIN manage_b_to_b_logistics_providers p ON d.logistics_provider_id = p.id
      WHERE d.owner_id = $1 AND d.deleted_at IS NULL
    `;
    const params = [owner_id];

    if (logistics_provider_id) {
      if (logistics_provider_id === 'null') {
        query += ` AND d.logistics_provider_id IS NULL`;
      } else {
        params.push(logistics_provider_id);
        query += ` AND d.logistics_provider_id = $${params.length}`;
      }
    }

    query += ` ORDER BY d.created_at DESC`;

    const result = await pool.query(query, params);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getDrivers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch drivers' });
  }
};

export const getDriverById = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { id } = req.params;
    const query = `
      SELECT * FROM manage_b_to_b_drivers
      WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL;
    `;
    const result = await pool.query(query, [id, owner_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('getDriverById error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch driver' });
  }
};

export const updateDriver = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { id } = req.params;
    const { logistics_provider_id, driver_name, mobile, license_number, license_expiry_date, aadhaar_number, emergency_contact } = req.body;

    const checkRecord = await pool.query(
      `SELECT owner_id FROM manage_b_to_b_drivers WHERE id = $1 AND deleted_at IS NULL;`,
      [id]
    );

    if (checkRecord.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (String(checkRecord.rows[0].owner_id) !== String(owner_id)) {
      return res.status(403).json({ success: false, message: "This is a distributor's driver, you cannot update it." });
    }

    const dupCheck = await pool.query(`
      SELECT id FROM manage_b_to_b_drivers
      WHERE owner_id = $1
        AND id != $2
        AND deleted_at IS NULL
        AND TRIM(mobile) = TRIM($3)
    `, [owner_id, id, mobile]);

    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Driver with this mobile number already exists' });
    }

    const query = `
      UPDATE manage_b_to_b_drivers
      SET logistics_provider_id = $1,
          driver_name = COALESCE($2, driver_name),
          mobile = COALESCE($3, mobile),
          license_number = COALESCE($4, license_number),
          license_expiry_date = $5,
          aadhaar_number = COALESCE($6, aadhaar_number),
          emergency_contact = COALESCE($7, emergency_contact),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 AND owner_id = $9 AND deleted_at IS NULL
      RETURNING *;
    `;
    const result = await pool.query(query, [
      logistics_provider_id || null, driver_name, mobile, license_number, license_expiry_date || null, aadhaar_number, emergency_contact, id, owner_id
    ]);

    res.status(200).json({ success: true, message: 'Driver updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('updateDriver error:', error);
    res.status(500).json({ success: false, message: 'Failed to update driver' });
  }
};

export const toggleDriverStatus = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { id } = req.params;
    const { status, is_available } = req.body;

    const checkRecord = await pool.query(
      `SELECT owner_id FROM manage_b_to_b_drivers WHERE id = $1 AND deleted_at IS NULL;`,
      [id]
    );

    if (checkRecord.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (String(checkRecord.rows[0].owner_id) !== String(owner_id)) {
      return res.status(403).json({ success: false, message: "This is a distributor's driver, you cannot change its status." });
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
      UPDATE manage_b_to_b_drivers
      SET ${updateFields.join(', ')}
      WHERE id = $${params.length - 1} AND owner_id = $${params.length} AND deleted_at IS NULL
      RETURNING *;
    `;
    const result = await pool.query(query, params);

    res.status(200).json({ success: true, message: 'Driver updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('toggleDriverStatus error:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

export const deleteDriver = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { id } = req.params;

    const checkRecord = await pool.query(
      `SELECT owner_id FROM manage_b_to_b_drivers WHERE id = $1 AND deleted_at IS NULL;`,
      [id]
    );

    if (checkRecord.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (String(checkRecord.rows[0].owner_id) !== String(owner_id)) {
      return res.status(403).json({ success: false, message: "This is a distributor's driver, you cannot delete it." });
    }

    const query = `
      UPDATE manage_b_to_b_drivers
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
      RETURNING *;
    `;
    await pool.query(query, [id, owner_id]);

    res.status(200).json({ success: true, message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('deleteDriver error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete driver' });
  }
};

/**
 * Day 3 — Live Shipment Location Update
 * POST /api/driver/location-update
 */
export const updateLocation = async (req, res) => {
  try {
    const { orderId, latitude, longitude, speed } = req.body;
    const timestamp = new Date().toISOString();

    const payload = {
      orderId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      speed: speed !== undefined && speed !== null ? parseFloat(speed) : 0,
      timestamp,
      driverId: req.user?.userId || null
    };

    // 1. Store in Redis with safety
    try {
      await redisService.set(`shipment:${orderId}:location`, payload, 86400);
    } catch (redisErr) {
      console.warn('⚠️ [Redis] Failed to cache location update:', redisErr.message);
    }

    // 2. Broadcast LOCATION_MOVED event via Socket.io with safety
    try {
      const io = getIO();
      const room = `shipment_${orderId}`;
      io.to(room).emit('LOCATION_MOVED', payload);
      // Also emit to default io if room not joined or global listener
      io.emit('LOCATION_MOVED', payload);
    } catch (socketErr) {
      console.warn('⚠️ [Socket] Failed to broadcast LOCATION_MOVED:', socketErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: payload
    });
  } catch (error) {
    console.error('updateLocation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update driver location'
    });
  }
};
