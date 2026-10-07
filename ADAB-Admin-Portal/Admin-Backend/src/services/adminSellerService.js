const pool = require('../../db');
const { mapToSellerDto } = require('../dtos/sellerDto');

exports.getSellers = async (params = {}) => {
  try {
    const { search, status, page = 1, pageSize = 10 } = params;
    const offset = (page - 1) * pageSize;
    
    let query = "SELECT count(*) OVER() as full_count, * FROM users WHERE user_type='SELLER'";
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
    const data = res.rows.map(mapToSellerDto);
    const total = res.rows[0] ? parseInt(res.rows[0].full_count) : 0;

    return { data, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  } catch(e) {
    console.error('getSellers error:', e);
    return { data: [], total: 0, page: 1, pageSize: 10 };
  }
};

exports.getSellerById = async (id) => {
  try {
    const res = await pool.query("SELECT * FROM users WHERE id=$1 AND user_type='SELLER'", [id]);
    return res.rows[0] ? mapToSellerDto(res.rows[0]) : null;
  } catch(e) {
    return null;
  }
};

exports.updateSellerStatus = async (id, status) => {
  try {
    const res = await pool.query("UPDATE users SET status=$1 WHERE id=$2 AND user_type='SELLER' RETURNING *", [status, id]);
    return res.rows[0] ? mapToSellerDto(res.rows[0]) : null;
  } catch(e) {
    return null;
  }
};
