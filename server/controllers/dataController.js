const pollingService = require('../services/pollingService');
const logger = require('../utils/logger');

/**
 * Get daily predictions
 * GET /api/data/daily-predictions
 */
async function getDailyPredictions(req, res) {
  try {
    const result = pollingService.getCachedData('dailyPredictions');

    res.json({
      success: true,
      data: result.data,
      lastUpdate: result.lastUpdate,
      notifications: result.notifications
    });
  } catch (error) {
    logger.error('Failed to get daily predictions', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve daily predictions'
    });
  }
}

/**
 * Get intraday predictions
 * GET /api/data/intraday-predictions
 */
async function getIntradayPredictions(req, res) {
  try {
    const result = pollingService.getCachedData('intradayPredictions');

    res.json({
      success: true,
      data: result.data,
      lastUpdate: result.lastUpdate,
      notifications: result.notifications
    });
  } catch (error) {
    logger.error('Failed to get intraday predictions', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve intraday predictions'
    });
  }
}

/**
 * Get tradebook
 * GET /api/data/tradebook
 */
async function getTradebook(req, res) {
  try {
    const result = pollingService.getCachedData('tradebook');

    res.json({
      success: true,
      data: result.data,
      lastUpdate: result.lastUpdate
    });
  } catch (error) {
    logger.error('Failed to get tradebook', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tradebook'
    });
  }
}

/**
 * Clear notifications for a data type
 * POST /api/data/clear-notifications
 */
async function clearNotifications(req, res) {
  try {
    const { type } = req.body;

    if (!['daily', 'intraday'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification type'
      });
    }

    pollingService.clearNotifications(type);

    res.json({
      success: true,
      message: `Notifications cleared for ${type}`
    });
  } catch (error) {
    logger.error('Failed to clear notifications', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Failed to clear notifications'
    });
  }
}

/**
 * Get polling status (admin only)
 * GET /api/data/status
 */
async function getPollingStatus(req, res) {
  try {
    const status = pollingService.getPollingStatus();

    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Failed to get polling status', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve polling status'
    });
  }
}

/**
 * Force data refresh (admin only)
 * POST /api/data/refresh
 */
async function refreshData(req, res) {
  try {
    const { type } = req.body;

    let result;
    switch (type) {
      case 'daily':
        result = await pollingService.updateDailyPredictions();
        break;
      case 'intraday':
        result = await pollingService.updateIntradayPredictions();
        break;
      case 'tradebook':
        result = await pollingService.updateTradebook();
        break;
      case 'all':
        await Promise.all([
          pollingService.updateDailyPredictions(),
          pollingService.updateIntradayPredictions(),
          pollingService.updateTradebook()
        ]);
        result = { success: true };
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid type. Use: daily, intraday, tradebook, or all'
        });
    }

    res.json({
      success: true,
      message: 'Data refresh initiated',
      result
    });
  } catch (error) {
    logger.error('Failed to refresh data', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Failed to refresh data'
    });
  }
}

module.exports = {
  getDailyPredictions,
  getIntradayPredictions,
  getTradebook,
  clearNotifications,
  getPollingStatus,
  refreshData
};
