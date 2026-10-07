const pool = require('../../db');
const { mapToCustomerDto } = require('../dtos/customerDto');

exports.getCustomers = async () => {
  try {
    const res = await pool.query("SELECT * FROM users WHERE role='customer'");
    return res.rows.map(mapToCustomerDto);
  } catch(e) {
    return [];
  }
};

exports.getCustomerById = async (id) => {
  try {
    const res = await pool.query("SELECT * FROM users WHERE id=$1 AND role='customer'", [id]);
    return res.rows[0] ? mapToCustomerDto(res.rows[0]) : null;
  } catch(e) {
    return null;
  }
};
