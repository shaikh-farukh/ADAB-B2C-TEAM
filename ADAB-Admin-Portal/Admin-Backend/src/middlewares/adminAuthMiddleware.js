const adminAuth = (req, res, next) => {
  const role = (req.user?.role || '').toLowerCase();
  const userType = (req.user?.user_type || '').toLowerCase();
  if (!req.user || (role !== 'admin' && role !== 'super_admin' && userType !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

module.exports = adminAuth;
