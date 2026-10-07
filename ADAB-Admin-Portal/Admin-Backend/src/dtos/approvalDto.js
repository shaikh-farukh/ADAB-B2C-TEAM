exports.mapToApprovalDto = (row, type) => ({
  id: row.id || row.user_id || row.product_id,
  type: type, // 'seller', 'customer', 'product'
  entityName: row.full_name || row.product_name || 'Unknown',
  entityEmail: row.email || '',
  status: row.status || row.approval_status || 'PENDING',
  submittedAt: row.created_at || new Date().toISOString(),
  details: row.details || {}
});
