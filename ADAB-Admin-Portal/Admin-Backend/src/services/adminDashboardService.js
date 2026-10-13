const pool = require('../../db');

exports.getDashboardMetrics = async () => {
  let totalSellers = 0;
  let activeSellers = 0;
  let totalCustomers = 0;
  let activeCustomers = 0;
  let pendingApprovals = 0;
  let totalProducts = 0;

  try {
    const sellersRes = await pool.query("SELECT count(*) as total, sum(case when upper(status)='ACTIVE' then 1 else 0 end) as active FROM users WHERE user_type='SELLER'");
    totalSellers = parseInt(sellersRes.rows[0].total) || 0;
    activeSellers = parseInt(sellersRes.rows[0].active) || 0;
  } catch(e) { console.warn('Could not query sellers', e.message); }

  try {
    const custRes = await pool.query("SELECT count(*) as total, sum(case when upper(status)='ACTIVE' then 1 else 0 end) as active FROM users WHERE user_type='CUSTOMER'");
    totalCustomers = parseInt(custRes.rows[0].total) || 0;
    activeCustomers = parseInt(custRes.rows[0].active) || 0;
  } catch(e) { console.warn('Could not query customers', e.message); }

  try {
    const pendingRes = await pool.query("SELECT count(*) as pending FROM seller_listings WHERE UPPER(approval_status) IN ('SUBMITTED', 'PENDING', 'UNDER_REVIEW')");
    pendingApprovals = parseInt(pendingRes.rows[0].pending) || 0;
  } catch(e) { console.warn('Could not query pending approvals', e.message); }

  try {
    const prodRes = await pool.query("SELECT count(*) as total FROM seller_listings WHERE UPPER(approval_status) IN ('APPROVED', 'PUBLISHED', 'LIVE')");
    totalProducts = parseInt(prodRes.rows[0].total) || 0;
  } catch(e) { console.warn('Could not query products', e.message); }

  return {
    totalSellers,
    activeSellers,
    totalCustomers,
    activeCustomers,
    pendingApprovals,
    totalProducts
  };
};

exports.getDashboardActions = async () => {
  try {
    const pendingProductsRes = await pool.query("SELECT COUNT(*) as count FROM seller_listings WHERE UPPER(approval_status) IN ('SUBMITTED', 'PENDING', 'UNDER_REVIEW')");
    const pendingSellersRes = await pool.query("SELECT COUNT(*) as count FROM seller_profiles WHERE UPPER(kyc_status) IN ('SUBMITTED', 'PENDING')");
    const pendingReturnsRes = await pool.query("SELECT COUNT(*) as count FROM returns WHERE UPPER(status) = 'REQUESTED'");

    return [
      {
        id: 'act-1',
        title: 'Pending Product Listings',
        count: parseInt(pendingProductsRes.rows[0]?.count || 0),
        action_url: '/approvals?tab=products',
        priority: 'HIGH',
        type: 'MODERATION'
      },
      {
        id: 'act-2',
        title: 'Seller KYC Submissions',
        count: parseInt(pendingSellersRes.rows[0]?.count || 0),
        action_url: '/approvals?tab=sellers',
        priority: 'HIGH',
        type: 'MODERATION'
      },
      {
        id: 'act-3',
        title: 'Customer Return Requests',
        count: parseInt(pendingReturnsRes.rows[0]?.count || 0),
        action_url: '/returns?status=REQUESTED',
        priority: 'MEDIUM',
        type: 'MODERATION'
      }
    ];
  } catch(e) {
    console.warn('Could not query dashboard actions', e.message);
    return [];
  }
};

