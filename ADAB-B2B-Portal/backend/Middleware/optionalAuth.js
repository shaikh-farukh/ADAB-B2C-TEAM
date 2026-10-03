import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Optional Authentication middleware — verifies JWT Bearer token if present.
 * Attaches decoded payload (userId, email, role, companyName) to req.user if valid.
 * Does not block the request if the token is missing or invalid.
 */
const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    }
  } catch (error) {
    // Ignore error, just proceed without req.user
  }
  next();
};

export default optionalAuth;
