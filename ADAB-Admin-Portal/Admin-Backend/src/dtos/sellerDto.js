exports.mapToSellerDto = (row) => ({
  id: row.id,
  name: row.full_name || '',
  email: row.email || '',
  phone: row.phone || '',
  status: row.status || 'PENDING',
  userType: row.user_type,
  createdAt: row.created_at
});
