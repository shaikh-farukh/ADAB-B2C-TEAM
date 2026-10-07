exports.mapToCustomerDto = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  status: row.status || 'active',
  createdAt: row.created_at
});
