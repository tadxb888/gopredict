const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const logger = require('../utils/logger');
const { validationErrorHandler } = require('../middleware/errorHandler');

/**
 * Validation rules for magic link request
 */
const magicLinkValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
];

/**
 * Request magic link
 * POST /api/auth/magic-link
 */
async function requestMagicLink(req, res) {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(validationErrorHandler(errors));
    }

    const { email } = req.body;

    await authService.requestMagicLink(email);

    res.json({
      success: true,
      message: 'If an account exists with this email, a magic link has been sent.'
    });
  } catch (error) {
    logger.error('Magic link request failed', { error: error.message });

    // Generic message to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists with this email, a magic link has been sent.'
    });
  }
}

/**
 * Verify magic link
 * POST /api/auth/verify
 */
async function verifyMagicLink(req, res) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const result = await authService.verifyMagicLink(token, ipAddress, userAgent);

    // Set httpOnly cookie with session token
    res.cookie('session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    logger.error('Magic link verification failed', { error: error.message });

    res.status(401).json({
      success: false,
      message: error.message || 'Invalid or expired magic link'
    });
  }
}

/**
 * Get current user
 * GET /api/auth/me
 */
async function getCurrentUser(req, res) {
  res.json({
    success: true,
    user: req.user
  });
}

/**
 * Logout
 * POST /api/auth/logout
 */
async function logout(req, res) {
  try {
    const token = req.cookies?.session || req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      await authService.logout(token);
    }

    // Clear cookie
    res.clearCookie('session');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout failed', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
}

module.exports = {
  requestMagicLink,
  verifyMagicLink,
  getCurrentUser,
  logout,
  magicLinkValidation
};
