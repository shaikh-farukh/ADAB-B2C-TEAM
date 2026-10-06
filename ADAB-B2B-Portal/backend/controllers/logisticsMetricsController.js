import pool from '../Config/database.js';

export const getLogisticsMetrics = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const role = req.user.role; // 'manufacturer' or 'distributor'
    const idField = role === 'manufacturer' ? 'manufacturer_id' : 'distributor_id';

    // 1. Order Metrics
    const ordersQuery = `
      SELECT status, COUNT(*) as count
      FROM manage_b_to_b_orders
      WHERE ${idField} = $1 AND deleted_at IS NULL
      GROUP BY status
    `;
    const ordersRes = await pool.query(ordersQuery, [ownerId]);
    const ordersMetrics = { pending_dispatch: 0, dispatched: 0, out_for_delivery: 0, delivered_today: 0 };
    ordersRes.rows.forEach(r => {
      if (r.status === 'ready_for_dispatch') ordersMetrics.pending_dispatch = parseInt(r.count);
      if (r.status === 'dispatched') ordersMetrics.dispatched = parseInt(r.count);
      if (r.status === 'out_for_delivery') ordersMetrics.out_for_delivery = parseInt(r.count);
    });

    const deliveredTodayQuery = `
      SELECT COUNT(*) as count
      FROM manage_b_to_b_orders
      WHERE ${idField} = $1 AND status = 'delivered' AND delivered_at >= CURRENT_DATE AND deleted_at IS NULL
    `;
    const deliveredRes = await pool.query(deliveredTodayQuery, [ownerId]);
    ordersMetrics.delivered_today = parseInt(deliveredRes.rows[0].count);

    // 2. Driver Metrics
    const driversQuery = `
      SELECT is_available, COUNT(*) as count
      FROM manage_b_to_b_drivers
      WHERE owner_id = $1 AND deleted_at IS NULL
      GROUP BY is_available
    `;
    const driversRes = await pool.query(driversQuery, [ownerId]);
    const driversMetrics = { available: 0, busy: 0, total: 0 };
    driversRes.rows.forEach(r => {
      if (r.is_available) driversMetrics.available = parseInt(r.count);
      else driversMetrics.busy = parseInt(r.count);
    });
    driversMetrics.total = driversMetrics.available + driversMetrics.busy;

    // 3. Vehicle Metrics
    const vehiclesQuery = `
      SELECT is_available, COUNT(*) as count
      FROM manage_b_to_b_vehicles
      WHERE owner_id = $1 AND deleted_at IS NULL
      GROUP BY is_available
    `;
    const vehiclesRes = await pool.query(vehiclesQuery, [ownerId]);
    const vehiclesMetrics = { available: 0, busy: 0, total: 0 };
    vehiclesRes.rows.forEach(r => {
      if (r.is_available) vehiclesMetrics.available = parseInt(r.count);
      else vehiclesMetrics.busy = parseInt(r.count);
    });
    vehiclesMetrics.total = vehiclesMetrics.available + vehiclesMetrics.busy;

    res.status(200).json({
      success: true,
      data: {
        orders: ordersMetrics,
        drivers: driversMetrics,
        vehicles: vehiclesMetrics
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch logistics metrics' });
  }
};
