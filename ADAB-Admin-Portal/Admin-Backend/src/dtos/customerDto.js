exports.mapToCustomerDto = (row) => ({
  id: row.id,
  name: row.full_name || '',
  email: row.email || '',
  phone: row.phone || '',
  status: row.status || 'ACTIVE',
  userType: row.user_type,
  avatar_url: row.avatar_url || row.profile_picture_url || null,
  avatar_public_id: row.avatar_public_id || row.profile_picture_public_id || null,
  profile_picture_url: row.profile_picture_url || row.avatar_url || null,
  profile_picture_public_id: row.profile_picture_public_id || row.avatar_public_id || null,
  createdAt: row.created_at
});
