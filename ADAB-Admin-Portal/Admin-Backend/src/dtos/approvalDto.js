exports.mapToApprovalDto = (row, type) => ({
  id: row.id || row.user_id || row.product_id,
  type: type, // 'seller', 'customer', 'product'
  entityName: (type === 'seller' && (row.store_name || row.legal_name)) ? (row.store_name || row.legal_name) : (row.full_name || row.product_name || 'Unknown'),
  ownerName: row.full_name || null,
  store_name: row.store_name || row.legal_name || null,
  entityEmail: row.email || row.phone || '',
  phone: row.phone || null,
  status: row.status || row.approval_status || 'PENDING',
  submittedAt: row.created_at || new Date().toISOString(),
  details: row.details || {
    gstin: row.gstin || null,
    kyc_status: row.kyc_status || null
  }
});
