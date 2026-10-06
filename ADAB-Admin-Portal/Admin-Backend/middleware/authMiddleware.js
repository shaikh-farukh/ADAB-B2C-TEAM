const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'adab-secret-key-change-in-prod';

/**
 * Authentication Middleware
 * Identifies and verifies the authenticated user via Bearer token or cookie.
 * Attaches decoded payload to req.user.
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Authentication token required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Invalid authentication token'
    });
  }
};

module.exports = {
  authMiddleware,
  JWT_SECRET
};
