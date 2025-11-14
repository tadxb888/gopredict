const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/auth/magic-link
 * @desc    Request magic link for login
 * @access  Public
 */
router.post(
  '/magic-link',
  authController.magicLinkValidation,
  asyncHandler(authController.requestMagicLink)
);

/**
 * @route   POST /api/auth/verify
 * @desc    Verify magic link token and create session
 * @access  Public
 */
router.post(
  '/verify',
  asyncHandler(authController.verifyMagicLink)
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(authController.getCurrentUser)
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(authController.logout)
);

module.exports = router;
