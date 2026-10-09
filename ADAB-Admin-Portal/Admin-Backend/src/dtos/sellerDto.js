const maskEmail = (email) => {
  if (!email) return '';
  const [user, domain] = email.split('@');
  if (!domain) return email;
  return `${user.charAt(0)}***${user.charAt(user.length - 1)}@${domain}`;
};

const maskPhone = (phone) => {
  if (!phone) return '';
  return phone.slice(0, 3) + '****' + phone.slice(-3);
};

exports.mapToSellerDto = (row) => ({
  id: row.id,
  name: row.full_name || '',
  email: maskEmail(row.email),
  phone: maskPhone(row.phone),
  status: row.status || 'PENDING',
  userType: row.user_type,
  createdAt: row.created_at
});
