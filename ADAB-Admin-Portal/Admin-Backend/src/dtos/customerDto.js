exports.mapToCustomerDto = (row) => ({
  id: row.id,
  name: row.full_name || '',
  email: row.email || '',
  phone: row.phone || '',
  status: row.status || 'ACTIVE',
  userType: row.user_type,
  createdAt: row.created_at
});
