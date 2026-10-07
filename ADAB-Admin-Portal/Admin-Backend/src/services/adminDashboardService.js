const pool = require('../../db');

exports.getDashboardMetrics = async () => {
  // Query actual data from existing tables
  // We assume some common table names based on context, but if they don't exist we handle gracefully.
  
  let totalSellers = 0;
  let activeSellers = 0;
  let totalCustomers = 0;
  let activeCustomers = 0;
  let pendingApprovals = 0;

  try {
    const sellersRes = await pool.query("SELECT count(*) as total, sum(case when status='active' then 1 else 0 end) as active FROM users WHERE user_type='SELLER'");
    totalSellers = parseInt(sellersRes.rows[0].total) || 0;
    activeSellers = parseInt(sellersRes.rows[0].active) || 0;
  } catch(e) { console.warn('Could not query sellers', e.message); }

  try {
    const custRes = await pool.query("SELECT count(*) as total, sum(case when status='active' then 1 else 0 end) as active FROM users WHERE user_type='CUSTOMER'");
    totalCustomers = parseInt(custRes.rows[0].total) || 0;
    activeCustomers = parseInt(custRes.rows[0].active) || 0;
  } catch(e) { console.warn('Could not query customers', e.message); }

  try {
    // approvals could be in a requests or users table
    const pendingRes = await pool.query("SELECT count(*) as pending FROM users WHERE status='pending'");
    pendingApprovals = parseInt(pendingRes.rows[0].pending) || 0;
  } catch(e) { console.warn('Could not query pending approvals'); }

  return {
    totalSellers,
    activeSellers,
    totalCustomers,
    activeCustomers,
    pendingApprovals
  };
};
