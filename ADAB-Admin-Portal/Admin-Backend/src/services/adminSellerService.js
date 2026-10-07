const pool = require('../../db');
const { mapToSellerDto } = require('../dtos/sellerDto');

exports.getSellers = async () => {
  try {
    const res = await pool.query("SELECT * FROM users WHERE role='distributor' OR role='shop'");
    return res.rows.map(mapToSellerDto);
  } catch(e) {
    return [];
  }
};

exports.getSellerById = async (id) => {
  try {
    const res = await pool.query("SELECT * FROM users WHERE id=$1 AND (role='distributor' OR role='shop')", [id]);
    return res.rows[0] ? mapToSellerDto(res.rows[0]) : null;
  } catch(e) {
    return null;
  }
};
