const { mapToApprovalDto } = require('../dtos/approvalDto');
const pool = require('../../db');

exports.getPendingApprovals = async (type, params = {}) => {
  const { page = 1, pageSize = 10 } = params;
  const offset = (page - 1) * pageSize;

  try {
    let query, values;
    if (type === 'seller') {
      query = "SELECT count(*) OVER() as full_count, * FROM users WHERE user_type='SELLER' AND status='PENDING' ORDER BY created_at DESC LIMIT $1 OFFSET $2";
      values = [pageSize, offset];
    } else if (type === 'customer') {
      query = "SELECT count(*) OVER() as full_count, * FROM users WHERE user_type='CUSTOMER' AND status='PENDING' ORDER BY created_at DESC LIMIT $1 OFFSET $2";
      values = [pageSize, offset];
    } else if (type === 'product') {
      // Products might not exist yet, mock for now
      return { data: [], total: 0, page: parseInt(page), pageSize: parseInt(pageSize) };
    } else {
      return { data: [], total: 0, page: parseInt(page), pageSize: parseInt(pageSize) };
    }

    const res = await pool.query(query, values);
    const data = res.rows.map(r => mapToApprovalDto(r, type));
    const total = res.rows[0] ? parseInt(res.rows[0].full_count) : 0;
    
    return { data, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  } catch(e) {
    console.error('getPendingApprovals error:', e);
    return { data: [], total: 0, page: parseInt(page), pageSize: parseInt(pageSize) };
  }
};

// Karan's engine will handle this eventually, mock for now if not available
exports.updateApprovalStatus = async (type, id, action) => {
  // action can be 'approve', 'reject', 'request_changes'
  let newStatus = 'PENDING';
  if (action === 'approve') newStatus = 'ACTIVE';
  if (action === 'reject') newStatus = 'REJECTED';
  if (action === 'request_changes') newStatus = 'CHANGES_REQUESTED';

  try {
    if (type === 'seller' || type === 'customer') {
      const res = await pool.query(
        "UPDATE users SET status=$1 WHERE id=$2 RETURNING *",
        [newStatus, id]
      );
      return res.rows[0] ? mapToApprovalDto(res.rows[0], type) : null;
    } else {
      // product mock
      return { id, type, status: newStatus };
    }
  } catch(e) {
    console.error('updateApprovalStatus error:', e);
    return null;
  }
};
