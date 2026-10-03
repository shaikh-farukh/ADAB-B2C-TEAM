import jwt from 'jsonwebtoken';

// ─── FAIL FAST ──────────────────────────────────────────────────
// The server MUST NOT start with a weak/missing JWT secret.
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set.');
  console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Authentication middleware — verifies JWT Bearer token.
 * Attaches decoded payload (userId, email, role, companyName) to req.user.
 */
const auth = (req, res, next) => {
  try {
    // Get token from HttpOnly cookies (priority) or Authorization header (fallback)
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user info to request object
    req.user = decoded;

    // Continue to next middleware/controller
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

export default auth;
