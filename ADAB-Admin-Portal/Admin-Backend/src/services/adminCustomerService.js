const pool = require('../../db');
const { mapToCustomerDto } = require('../dtos/customerDto');

exports.getCustomers = async (params = {}) => {
  try {
    const { search, status, page = 1, pageSize = 10 } = params;
    const offset = (page - 1) * pageSize;
    
    let query = "SELECT count(*) OVER() as full_count, * FROM users WHERE user_type='CUSTOMER'";
    const values = [];
    let paramIdx = 1;

    if (status) {
      query += ` AND status=$${paramIdx++}`;
      values.push(status);
    }

    if (search) {
      query += ` AND (email ILIKE $${paramIdx} OR full_name ILIKE $${paramIdx})`;
      values.push(`%${search}%`);
      paramIdx++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    values.push(pageSize, offset);

    const res = await pool.query(query, values);
    const data = res.rows.map(mapToCustomerDto);
    const total = res.rows[0] ? parseInt(res.rows[0].full_count) : 0;

    return { data, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  } catch(e) {
    console.error('getCustomers error:', e);
    return { data: [], total: 0, page: 1, pageSize: 10 };
  }
};

exports.getCustomerById = async (id) => {
  try {
    const res = await pool.query("SELECT * FROM users WHERE id=$1 AND user_type='CUSTOMER'", [id]);
    return res.rows[0] ? mapToCustomerDto(res.rows[0]) : null;
  } catch(e) {
    return null;
  }
};

exports.updateCustomerStatus = async (id, status) => {
  try {
    const res = await pool.query("UPDATE users SET status=$1 WHERE id=$2 AND user_type='CUSTOMER' RETURNING *", [status, id]);
    return res.rows[0] ? mapToCustomerDto(res.rows[0]) : null;
  } catch(e) {
    return null;
  }
};
