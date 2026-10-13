const { mapToApprovalDto } = require('../dtos/approvalDto');
const pool = require('../../db');

exports.getPendingApprovals = async (type, params = {}) => {
  const { page = 1, pageSize = 10, search = '', status = 'PENDING' } = params;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(pageSize, 10) || 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    if (type === 'seller' || type === 'customer') {
      const userType = type === 'seller' ? 'SELLER' : 'CUSTOMER';
      let query;
      const values = [userType];

      if (type === 'seller') {
        query = `
          SELECT count(*) OVER() as full_count, 
                 u.id, u.email, u.phone, u.full_name, u.user_type, u.status, u.created_at, u.updated_at,
                 sp.legal_name, sp.gstin, sp.pan, sp.kyc_status,
                 s.store_name
          FROM users u
          LEFT JOIN seller_profiles sp ON u.id = sp.user_id
          LEFT JOIN stores s ON u.id = s.seller_id
          WHERE u.user_type = $1
        `;
      } else {
        query = `
          SELECT count(*) OVER() as full_count, 
                 u.id, u.email, u.phone, u.full_name, u.user_type, u.status, u.created_at, u.updated_at
          FROM users u
          WHERE u.user_type = $1
        `;
      }

      if (status && status.toUpperCase() !== 'ALL') {
        values.push(status.toUpperCase());
        query += ` AND UPPER(u.status) = $${values.length}`;
      }

      if (search && search.trim()) {
        values.push(`%${search.trim()}%`);
        if (type === 'seller') {
          query += ` AND (u.email ILIKE $${values.length} OR u.full_name ILIKE $${values.length} OR u.phone ILIKE $${values.length} OR sp.legal_name ILIKE $${values.length} OR s.store_name ILIKE $${values.length})`;
        } else {
          query += ` AND (u.email ILIKE $${values.length} OR u.full_name ILIKE $${values.length} OR u.phone ILIKE $${values.length})`;
        }
      }

      values.push(limitNum, offset);
      query += ` ORDER BY u.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

      const res = await pool.query(query, values);
      const data = res.rows.map(r => mapToApprovalDto(r, type));
      const total = res.rows[0] ? parseInt(res.rows[0].full_count, 10) : 0;

      return { data, total, page: pageNum, pageSize: limitNum };
    } else if (type === 'product') {
      const { getApprovalQueue } = require('../../services/approvalQueueService');
      const queueRes = await getApprovalQueue({
        status: status || 'PENDING',
        search,
        page: pageNum,
        limit: limitNum
      });
      return {
        data: queueRes.data || [],
        total: queueRes.pagination?.total || 0,
        page: pageNum,
        pageSize: limitNum
      };
    } else {
      return { data: [], total: 0, page: pageNum, pageSize: limitNum };
    }
  } catch (e) {
    console.error('getPendingApprovals error:', e);
    return { data: [], total: 0, page: pageNum, pageSize: limitNum };
  }
};

exports.updateApprovalStatus = async (type, id, action) => {
  const act = (action || '').toLowerCase();
  let newStatus = 'PENDING';
  if (act === 'approve' || act === 'active' || act === 'approved') newStatus = 'ACTIVE';
  else if (act === 'reject' || act === 'rejected') newStatus = 'REJECTED';
  else if (act === 'request_changes' || act === 'request-changes' || act === 'changes_requested') newStatus = 'CHANGES_REQUESTED';
  else if (act === 'suspend' || act === 'suspended') newStatus = 'SUSPENDED';

  try {
    if (type === 'seller' || type === 'customer') {
      const res = await pool.query(
        "UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
        [newStatus, id]
      );
      return res.rows[0] ? mapToApprovalDto(res.rows[0], type) : null;
    } else {
      const { updateApprovalItemState } = require('../../services/approvalQueueService');
      const transitionResult = {
        previous_status: 'PENDING',
        new_status: newStatus === 'ACTIVE' ? 'APPROVED' : newStatus,
        notes: `Admin ${action} product`
      };
      await updateApprovalItemState({ id, transitionResult });
      return { id, type, status: newStatus };
    }
  } catch (e) {
    console.error('updateApprovalStatus error:', e);
    return null;
  }
};
