import pool from '../Config/database.js';

export const createRoute = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { vehicle_id, route_name, source_location, destination_location, waypoints, estimated_distance_km, estimated_time_hours } = req.body;

    if (!route_name || !route_name.trim()) {
      return res.status(400).json({ success: false, message: 'Route name is required' });
    }

    const query = `
      INSERT INTO manage_b_to_b_vehicle_routes
        (owner_id, vehicle_id, route_name, source_location, destination_location, waypoints, estimated_distance_km, estimated_time_hours)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
      RETURNING *;
    `;
    const result = await pool.query(query, [
      owner_id,
      vehicle_id || null,
      route_name.trim(),
      source_location || null,
      destination_location || null,
      JSON.stringify(waypoints || []),
      estimated_distance_km || null,
      estimated_time_hours || null
    ]);

    res.status(201).json({ success: true, message: 'Vehicle route created successfully', data: result.rows[0] });
  } catch (error) {
    console.error('createRoute error:', error);
    res.status(500).json({ success: false, message: 'Failed to create vehicle route' });
  }
};

export const getRoutes = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { vehicle_id, status } = req.query;

    let query = `
      SELECT r.*, v.vehicle_number, v.vehicle_type, d.driver_name
      FROM manage_b_to_b_vehicle_routes r
      LEFT JOIN manage_b_to_b_vehicles v ON r.vehicle_id = v.id
      LEFT JOIN manage_b_to_b_drivers d ON v.driver_id = d.id
      WHERE (r.owner_id = $1 OR r.owner_id IS NULL) AND r.deleted_at IS NULL
    `;
    const params = [owner_id];

    if (vehicle_id) {
      params.push(vehicle_id);
      query += ` AND r.vehicle_id = ${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND r.status = ${params.length}`;
    }

    query += ` ORDER BY r.created_at DESC;`;

    const result = await pool.query(query, params);
    res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('getRoutes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vehicle routes' });
  }
};

export const getRouteById = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { id } = req.params;
    const query = `
      SELECT r.*, v.vehicle_number, v.vehicle_type, d.driver_name
      FROM manage_b_to_b_vehicle_routes r
      LEFT JOIN manage_b_to_b_vehicles v ON r.vehicle_id = v.id
      LEFT JOIN manage_b_to_b_drivers d ON v.driver_id = d.id
      WHERE r.id = $1 AND (r.owner_id = $2 OR r.owner_id IS NULL) AND r.deleted_at IS NULL;
    `;
    const result = await pool.query(query, [id, owner_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle route not found' });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('getRouteById error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vehicle route' });
  }
};

export const updateRoute = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { id } = req.params;
    const { vehicle_id, route_name, source_location, destination_location, waypoints, estimated_distance_km, estimated_time_hours, status } = req.body;

    const query = `
      UPDATE manage_b_to_b_vehicle_routes
      SET vehicle_id = COALESCE($1, vehicle_id),
          route_name = COALESCE($2, route_name),
          source_location = COALESCE($3, source_location),
          destination_location = COALESCE($4, destination_location),
          waypoints = COALESCE($5::jsonb, waypoints),
          estimated_distance_km = COALESCE($6, estimated_distance_km),
          estimated_time_hours = COALESCE($7, estimated_time_hours),
          status = COALESCE($8, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND owner_id = $10 AND deleted_at IS NULL
      RETURNING *;
    `;
    const result = await pool.query(query, [
      vehicle_id || null,
      route_name || null,
      source_location || null,
      destination_location || null,
      waypoints ? JSON.stringify(waypoints) : null,
      estimated_distance_km || null,
      estimated_time_hours || null,
      status || null,
      id,
      owner_id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle route not found' });
    }

    res.status(200).json({ success: true, message: 'Vehicle route updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('updateRoute error:', error);
    res.status(500).json({ success: false, message: 'Failed to update vehicle route' });
  }
};

export const deleteRoute = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { id } = req.params;

    const query = `
      UPDATE manage_b_to_b_vehicle_routes
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
      RETURNING *;
    `;
    const result = await pool.query(query, [id, owner_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle route not found' });
    }

    res.status(200).json({ success: true, message: 'Vehicle route deleted successfully' });
  } catch (error) {
    console.error('deleteRoute error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete vehicle route' });
  }
};

/**
 * Requirement: router.post('/assign-vehicle', authenticateRole(['MANUFACTURER', 'LOGISTICS']));
 * Assigns a vehicle to a route/order shipment.
 */
export const assignVehicleToRoute = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { vehicle_id, route_id, order_id, driver_id } = req.body;

    if (!vehicle_id) {
      return res.status(400).json({ success: false, message: 'vehicle_id is required' });
    }

    // Verify vehicle exists
    const vehCheck = await pool.query(
      `SELECT * FROM manage_b_to_b_vehicles WHERE id = $1 AND deleted_at IS NULL`,
      [vehicle_id]
    );

    if (vehCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    // If route_id provided, link vehicle to route
    if (route_id) {
      await pool.query(
        `UPDATE manage_b_to_b_vehicle_routes SET vehicle_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [vehicle_id, route_id]
      );
    }

    // If driver_id provided, assign driver to vehicle
    if (driver_id) {
      await pool.query(
        `UPDATE manage_b_to_b_vehicles SET driver_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [driver_id, vehicle_id]
      );
    }

    // If order_id provided, assign vehicle & driver to order
    if (order_id) {
      await pool.query(
        `UPDATE manage_b_to_b_orders SET vehicle_id = $1, driver_id = COALESCE($2, driver_id), updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [vehicle_id, driver_id || null, order_id]
      );
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle assigned successfully',
      data: {
        vehicle_id,
        route_id: route_id || null,
        driver_id: driver_id || null,
        order_id: order_id || null
      }
    });
  } catch (error) {
    console.error('assignVehicleToRoute error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign vehicle to route' });
  }
};
