exports.mapToSellerDto = (row) => ({
  id: row.id,
  name: row.full_name || '',
  email: row.email || '',
  phone: row.phone || '',
  status: row.status || 'PENDING',
  userType: row.user_type,
  avatar_url: row.avatar_url || row.logo_url || row.shop_image || null,
  avatar_public_id: row.avatar_public_id || row.file_public_id || null,
  logo_url: row.logo_url || row.avatar_url || row.shop_image || null,
  store_name: row.store_name || row.legal_name || null,
  createdAt: row.created_at
});
