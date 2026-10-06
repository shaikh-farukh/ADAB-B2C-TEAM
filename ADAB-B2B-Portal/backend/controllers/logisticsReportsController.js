import pool from '../Config/database.js';

export const exportLogisticsReport = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const role = req.user.role;
    const idField = role === 'manufacturer' ? 'manufacturer_id' : 'distributor_id';

    const { startDate, endDate, driverId, vehicleId, transporter } = req.query;

    let query = `
      SELECT o.order_number, o.status, o.total_amount, o.delivery_mode, o.transporter_name, o.tracking_number,
             o.dispatch_date, o.delivered_at, o.pod_notes, o.pod_signature,
             d.driver_name, v.vehicle_number as registered_vehicle
      FROM manage_b_to_b_orders o
      LEFT JOIN manage_b_to_b_drivers d ON o.driver_id = d.id
      LEFT JOIN manage_b_to_b_vehicles v ON o.vehicle_id = v.id
      WHERE o.${idField} = $1 AND o.deleted_at IS NULL
    `;
    const params = [ownerId];

    if (startDate) { params.push(startDate); query += ` AND o.order_date >= ${params.length}`; }
    if (endDate) { params.push(endDate); query += ` AND o.order_date <= ${params.length}`; }
    if (driverId) { params.push(driverId); query += ` AND o.driver_id = ${params.length}`; }
    if (vehicleId) { params.push(vehicleId); query += ` AND o.vehicle_id = ${params.length}`; }
    if (transporter) { params.push(`%${transporter}%`); query += ` AND o.transporter_name ILIKE ${params.length}`; }

    query += ' ORDER BY o.order_date DESC';

    const result = await pool.query(query, params);

    // Simple JSON-to-CSV
    if (result.rows.length === 0) {
      return res.status(200).send("No Data Available");
    }

    const headers = Object.keys(result.rows[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of result.rows) {
      const values = headers.map(header => {
        const escaped = ('' + (row[header] || '')).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="logistics_report.csv"');
    res.status(200).send(csvRows.join('\n'));

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
};
