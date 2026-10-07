exports.mapToSellerDto = (row) => ({
  id: row.id,
  name: row.company_name || row.name,
  email: row.email,
  status: row.status || 'active',
  role: row.role,
  createdAt: row.created_at
});
