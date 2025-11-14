const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/data/daily-predictions
 * @desc    Get daily predictions
 * @access  Private
 */
router.get(
  '/daily-predictions',
  authenticate,
  asyncHandler(dataController.getDailyPredictions)
);

/**
 * @route   GET /api/data/intraday-predictions
 * @desc    Get intraday predictions
 * @access  Private
 */
router.get(
  '/intraday-predictions',
  authenticate,
  asyncHandler(dataController.getIntradayPredictions)
);

/**
 * @route   GET /api/data/tradebook
 * @desc    Get tradebook
 * @access  Private
 */
router.get(
  '/tradebook',
  authenticate,
  asyncHandler(dataController.getTradebook)
);

/**
 * @route   POST /api/data/clear-notifications
 * @desc    Clear notifications for a data type
 * @access  Private
 */
router.post(
  '/clear-notifications',
  authenticate,
  asyncHandler(dataController.clearNotifications)
);

/**
 * @route   GET /api/data/status
 * @desc    Get polling status
 * @access  Private (Admin only)
 */
router.get(
  '/status',
  authenticate,
  requireAdmin,
  asyncHandler(dataController.getPollingStatus)
);

/**
 * @route   POST /api/data/refresh
 * @desc    Force data refresh
 * @access  Private (Admin only)
 */
router.post(
  '/refresh',
  authenticate,
  requireAdmin,
  asyncHandler(dataController.refreshData)
);

module.exports = router;
