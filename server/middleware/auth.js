const { verifySession } = require('../services/authService');
const logger = require('../utils/logger');

/**
 * Authenticate user from session token
 */
async function authenticate(req, res, next) {
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies?.session || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify session
    const result = await verifySession(token);

    if (!result.valid) {
      return res.status(401).json({
        success: false,
        message: result.error || 'Invalid session'
      });
    }

    // Attach user to request
    req.user = result.user;
    next();
  } catch (error) {
    logger.error('Authentication error', { error: error.message });
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
}

/**
 * Check if user has admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    logger.warn('Unauthorized admin access attempt', {
      userId: req.user?.id,
      email: req.user?.email
    });

    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
}

/**
 * Optional authentication - doesn't fail if no token
 */
async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.session || req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const result = await verifySession(token);
      if (result.valid) {
        req.user = result.user;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}

module.exports = {
  authenticate,
  requireAdmin,
  optionalAuth
};
