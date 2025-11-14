const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// All user routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private (Admin only)
 */
router.get(
  '/',
  asyncHandler(userController.getAllUsers)
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin only)
 */
router.get(
  '/:id',
  asyncHandler(userController.getUserById)
);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private (Admin only)
 */
router.post(
  '/',
  userController.createUserValidation,
  asyncHandler(userController.createUser)
);

/**
 * @route   POST /api/users/bulk
 * @desc    Bulk create users from CSV/Excel
 * @access  Private (Admin only)
 */
router.post(
  '/bulk',
  asyncHandler(userController.bulkCreateUsers)
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin only)
 */
router.put(
  '/:id',
  asyncHandler(userController.updateUser)
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  asyncHandler(userController.deleteUser)
);

module.exports = router;
