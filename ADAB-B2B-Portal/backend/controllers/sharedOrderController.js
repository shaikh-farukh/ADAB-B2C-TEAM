import pool from '../Config/database.js';
import { getIO } from '../Config/socket.js';

export const assignDelivery = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { driver_id, vehicle_id } = req.body;
    const assigned_by = req.user.userId;

    await client.query('BEGIN');

    // 1. Fetch order
    const orderRes = await client.query(`
      SELECT status, delivery_mode FROM manage_b_to_b_orders
      WHERE id = $1 AND deleted_at IS NULL
    `, [id]);

    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderRes.rows[0];

    // Only allow assignment in specific states, e.g., 'READY_FOR_DISPATCH'
    if (order.status?.toUpperCase() !== 'READY_FOR_DISPATCH') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Order must be READY_FOR_DISPATCH to assign delivery' });
    }

    // 2. Validate Driver
    if (driver_id) {
      const drv = await client.query(`SELECT status, is_available FROM manage_b_to_b_drivers WHERE id = $1 AND deleted_at IS NULL`, [driver_id]);
      if (drv.rows.length === 0 || drv.rows[0].status !== 'active' || !drv.rows[0].is_available) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Driver is not active or not available' });
      }
    }

    // 3. Validate Vehicle
    if (vehicle_id) {
      const veh = await client.query(`SELECT status, is_available FROM manage_b_to_b_vehicles WHERE id = $1 AND deleted_at IS NULL`, [vehicle_id]);
      if (veh.rows.length === 0 || veh.rows[0].status !== 'active' || !veh.rows[0].is_available) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Vehicle is not active or not available' });
      }
    }

    // 4. Update Order
    await client.query(`
      UPDATE manage_b_to_b_orders
      SET driver_id = $1, vehicle_id = $2, assigned_at = CURRENT_TIMESTAMP, assigned_by = $3
      WHERE id = $4
    `, [driver_id || null, vehicle_id || null, assigned_by, id]);

    // 5. Update Availability
    if (driver_id) {
      await client.query(`UPDATE manage_b_to_b_drivers SET is_available = false WHERE id = $1`, [driver_id]);
    }
    if (vehicle_id) {
      await client.query(`UPDATE manage_b_to_b_vehicles SET is_available = false WHERE id = $1`, [vehicle_id]);
    }

    await client.query('COMMIT');
    res.status(200).json({ success: true, message: 'Delivery assigned successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('assignDelivery error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign delivery' });
  } finally {
    client.release();
  }
};

export const getTimeline = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT DISTINCT ON (status)
        status, changed_at as timestamp
      FROM manage_b_to_b_order_status_history
      WHERE order_id = $1
      ORDER BY status, changed_at ASC
    `;
    const result = await pool.query(query, [id]);

    // Re-sort chronologically
    const history = result.rows.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const labels = {
      pending: 'Order Created',
      PO_SUBMITTED: 'PO Submitted',
      PO_APPROVED: 'PO Approved',
      accepted: 'Order Accepted',
      processing: 'Processing Started',
      ready_for_dispatch: 'Ready For Dispatch',
      dispatched: 'Order Dispatched',
      out_for_delivery: 'Out For Delivery',
      delivered: 'Order Delivered',
      rejected: 'Order Rejected',
      cancelled: 'Order Cancelled'
    };

    const timeline = history.map(h => ({
      status: h.status,
      label: labels[h.status] || h.status,
      changed_at: h.timestamp
    }));

    res.status(200).json({ success: true, data: timeline });
  } catch (error) {
    console.error('getTimeline error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch timeline' });
  }
};

export const outForDelivery = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await client.query('BEGIN');
    const orderCheck = await client.query('SELECT status, delivery_mode, order_number, shop_id, distributor_id FROM manage_b_to_b_orders WHERE id = $1 FOR UPDATE', [id]);

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (orderCheck.rows[0].status?.toUpperCase() !== 'DISPATCHED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Order must be dispatched before out for delivery' });
    }

    await client.query(`UPDATE manage_b_to_b_orders SET status = 'out_for_delivery', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
    await client.query(`INSERT INTO manage_b_to_b_order_status_history (order_id, status, notes, changed_by, changed_at) VALUES ($1, 'out_for_delivery', 'Order is out for delivery', $2, CURRENT_TIMESTAMP)`, [id, userId]);

    await client.query('COMMIT');

    try {
      const io = getIO();
      io.to(`shop_${orderCheck.rows[0].shop_id}`).emit('ORDER_UPDATE', {
        order_id: id,
        status: 'out_for_delivery',
        updated_by: userId
      });
      io.to(`user_${orderCheck.rows[0].distributor_id}`).emit('ORDER_UPDATE', {
        order_id: id,
        status: 'out_for_delivery',
        updated_by: userId
      });
    } catch (e) {
      console.warn(`Socket emit failed:`, e);
    }

    res.status(200).json({ success: true, message: 'Order is out for delivery' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Failed to update status' });
  } finally {
    client.release();
  }
};

export const submitProofOfDelivery = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { pod_photo, pod_signature, pod_notes } = req.body;
    const userId = req.user.userId;

    await client.query('BEGIN');
    const orderCheck = await client.query('SELECT status, order_number, shop_id, distributor_id, driver_id, vehicle_id FROM manage_b_to_b_orders WHERE id = $1 FOR UPDATE', [id]);

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (orderCheck.rows[0].status?.toUpperCase() !== 'OUT_FOR_DELIVERY') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Order must be out for delivery before POD submission' });
    }

    await client.query(`
      UPDATE manage_b_to_b_orders
      SET status = 'delivered', pod_photo = $1, pod_signature = $2, pod_notes = $3,  delivered_by = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [pod_photo, pod_signature, pod_notes, userId, id]);

    await client.query(`INSERT INTO manage_b_to_b_order_status_history (order_id, status, notes, changed_by, changed_at) VALUES ($1, 'delivered', 'POD submitted and order delivered', $2, CURRENT_TIMESTAMP)`, [id, userId]);

    const { driver_id, vehicle_id } = orderCheck.rows[0];
    if (driver_id) {
      await client.query('UPDATE manage_b_to_b_drivers SET is_available = true WHERE id = $1', [driver_id]);
    }
    if (vehicle_id) {
      await client.query('UPDATE manage_b_to_b_vehicles SET is_available = true WHERE id = $1', [vehicle_id]);
    }

    await client.query('COMMIT');

    try {
      const io = getIO();
      io.to(`shop_${orderCheck.rows[0].shop_id}`).emit('ORDER_UPDATE', {
        order_id: id,
        status: 'delivered',
        updated_by: userId
      });
      io.to(`user_${orderCheck.rows[0].distributor_id}`).emit('ORDER_UPDATE', {
        order_id: id,
        status: 'delivered',
        updated_by: userId
      });
    } catch (e) {
      console.warn(`Socket emit failed:`, e);
    }

    res.status(200).json({ success: true, message: 'Proof of Delivery submitted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('POD Submit Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to submit POD' });
  } finally {
    client.release();
  }
};
