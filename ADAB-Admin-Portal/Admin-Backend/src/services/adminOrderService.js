const { OrderListDto, OrderDetailsDto } = require('../dtos/orderDto');
const pool = require('../../db');

class AdminOrderService {
  async getOrders(filters) {
    let query = `
      SELECT o.*, u.full_name as customer_name, u.phone as customer_phone, u.email as customer_email, count(*) OVER() AS full_count
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramIdx = 1;

    if (filters.status) {
      query += ` AND o.order_status = $${paramIdx++}`;
      values.push(filters.status);
    }
    
    if (filters.payment_status) {
      query += ` AND o.payment_status = $${paramIdx++}`;
      values.push(filters.payment_status);
    }

    if (filters.search) {
      query += ` AND (
        o.order_number ILIKE $${paramIdx} OR 
        u.full_name ILIKE $${paramIdx} OR 
        u.phone ILIKE $${paramIdx} OR 
        u.email ILIKE $${paramIdx}
      )`;
      values.push(`%${filters.search}%`);
      paramIdx++;
    }

    if (filters.exceptions) {
      query += ` AND (o.order_status = 'CANCELLED' OR o.payment_status = 'FAILED')`;
    }

    query += ` ORDER BY o.created_at DESC`;

    const limit = filters.limit || 10;
    const page = filters.page || 1;
    const offset = (page - 1) * limit;

    query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    values.push(limit, offset);

    const res = await pool.query(query, values);
    
    const totalRecords = res.rows.length > 0 ? parseInt(res.rows[0].full_count) : 0;
    
    return {
      orders: res.rows.map(o => new OrderListDto(o)),
      totalRecords,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalRecords / limit)
    };
  }

  async getOrderDetails(id) {
    const res = await pool.query(`
      SELECT o.*, u.full_name as customer_name, u.phone as customer_phone, u.email as customer_email 
      FROM orders o 
      LEFT JOIN users u ON o.customer_id = u.id 
      WHERE o.id = $1
    `, [id]);
    
    if (res.rows.length === 0) return null;
    const order = res.rows[0];

    // Fetch items
    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    order.items = itemsRes.rows;

    // Fetch shipments
    const shipmentsRes = await pool.query('SELECT * FROM order_shipments WHERE order_id = $1', [id]);
    order.shipments = shipmentsRes.rows;

    // Fetch status history
    const historyRes = await pool.query('SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at DESC', [id]);
    order.status_history = historyRes.rows;

    return new OrderDetailsDto(order);
  }

  async updateOrderStatus(id, status, notes) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const orderRes = await client.query('SELECT order_status FROM orders WHERE id = $1', [id]);
      if (orderRes.rows.length === 0) throw new Error('Order not found');
      
      const previousStatus = orderRes.rows[0].order_status;

      await client.query('UPDATE orders SET order_status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
      
      await client.query(`
        INSERT INTO order_status_history (order_id, previous_status, new_status, notes, changed_by_name)
        VALUES ($1, $2, $3, $4, $5)
      `, [id, previousStatus, status, notes || 'Updated via Admin portal', 'Admin User']);

      await client.query('COMMIT');
      return this.getOrderDetails(id);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

module.exports = new AdminOrderService();
