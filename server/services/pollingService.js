const axios = require('axios');
const cron = require('node-cron');
const logger = require('../utils/logger');
const { sendAdminNotification } = require('./emailService');
require('dotenv').config();

const DATA_API_BASE_URL = process.env.DATA_API_BASE_URL;
const DATA_API_TIMEOUT = parseInt(process.env.DATA_API_TIMEOUT || '30000');
const POLLING_ENABLED = process.env.POLLING_ENABLED === 'true';
const MAX_RETRY_ATTEMPTS = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3');

// In-memory cache for latest data
const dataCache = {
  dailyPredictions: null,
  intradayPredictions: null,
  tradebook: null,
  lastUpdate: {}
};

// Track polling failures
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Fetch data from API endpoint
 */
async function fetchData(endpoint) {
  try {
    const url = `${DATA_API_BASE_URL}/${endpoint}`;
    logger.info(`Fetching data from: ${url}`);

    const response = await axios.get(url, {
      timeout: DATA_API_TIMEOUT,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.status === 200 && response.data) {
      consecutiveFailures = 0; // Reset failure counter on success
      return {
        success: true,
        data: response.data,
        timestamp: new Date()
      };
    }

    throw new Error(`Invalid response: ${response.status}`);
  } catch (error) {
    logger.error(`Failed to fetch data from ${endpoint}`, {
      error: error.message,
      url: error.config?.url
    });

    consecutiveFailures++;

    // DISABLED: Send admin notification if multiple consecutive failures
    // Uncomment this when data API endpoints are configured
    /*
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      await sendAdminNotification(
        'Data API Unavailable',
        `Failed to fetch data from ${endpoint} for ${consecutiveFailures} consecutive attempts.`,
        {
          endpoint,
          error: error.message,
          lastAttempt: new Date().toISOString()
        }
      );
    }
    */

    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * Update daily predictions
 */
async function updateDailyPredictions() {
  logger.info('Updating daily predictions...');
  const result = await fetchData('daily-predictions.json');

  if (result.success) {
    dataCache.dailyPredictions = result.data;
    dataCache.lastUpdate.dailyPredictions = result.timestamp;
    logger.logDataSync('daily_predictions', true);

    // Check for notifications
    checkForNotifications(result.data, 'daily');
  } else {
    logger.logDataSync('daily_predictions', false, { error: result.error });
  }

  return result;
}

/**
 * Update intraday predictions
 */
async function updateIntradayPredictions() {
  logger.info('Updating intraday predictions...');
  const result = await fetchData('intraday-predictions.json');

  if (result.success) {
    dataCache.intradayPredictions = result.data;
    dataCache.lastUpdate.intradayPredictions = result.timestamp;
    logger.logDataSync('intraday_predictions', true);

    // Check for notifications
    checkForNotifications(result.data, 'intraday');
  } else {
    logger.logDataSync('intraday_predictions', false, { error: result.error });
  }

  return result;
}

/**
 * Update tradebook
 */
async function updateTradebook() {
  logger.info('Updating tradebook...');
  const result = await fetchData('tradebook.json');

  if (result.success) {
    dataCache.tradebook = result.data;
    dataCache.lastUpdate.tradebook = result.timestamp;
    logger.logDataSync('tradebook', true);
  } else {
    logger.logDataSync('tradebook', false, { error: result.error });
  }

  return result;
}

/**
 * Check for notification triggers in data
 */
function checkForNotifications(data, type) {
  if (!data || !Array.isArray(data)) return;

  const notifications = [];

  data.forEach(item => {
    // Check each field for boolean true values (notification triggers)
    Object.entries(item).forEach(([key, value]) => {
      // Skip certain fields that are status indicators
      if (key === 'used' || key === 'active' || key === 'status') return;

      if (value === true) {
        notifications.push({
          type,
          symbol: item.symbol || item.Symbol,
          field: key,
          data: item
        });
      }
    });
  });

  if (notifications.length > 0) {
    logger.info('Notifications triggered', { count: notifications.length, type });
    // These notifications will be picked up by clients via the API
    dataCache[`${type}Notifications`] = notifications;
  }
}

/**
 * Poll data with retry logic
 */
async function pollWithRetry(updateFunction, retryCount = 0) {
  const result = await updateFunction();

  // If no data or error, retry up to MAX_RETRY_ATTEMPTS
  if (!result.success && retryCount < MAX_RETRY_ATTEMPTS) {
    const retryDelay = 60000; // 1 minute
    logger.info(`Retry ${retryCount + 1}/${MAX_RETRY_ATTEMPTS} in 1 minute...`);

    setTimeout(async () => {
      await pollWithRetry(updateFunction, retryCount + 1);
    }, retryDelay);
  }
}

/**
 * Initialize polling schedule
 * Polls at :01, :16, :31, :46 of each hour
 */
function initializePolling() {
  if (!POLLING_ENABLED) {
    logger.warn('Polling is disabled');
    return;
  }

  logger.info('Initializing data polling service...');

  // Schedule for :01, :16, :31, :46
  const schedule = '1,16,31,46 * * * *'; // Every hour at these minutes

  cron.schedule(schedule, async () => {
    logger.info('=== Polling cycle started ===');

    // Poll all data sources
    await Promise.all([
      pollWithRetry(updateDailyPredictions),
      pollWithRetry(updateIntradayPredictions),
      pollWithRetry(updateTradebook)
    ]);

    logger.info('=== Polling cycle completed ===');
  });

  logger.info('Polling service started successfully');
  logger.info(`Schedule: ${schedule}`);

  // Initial fetch on startup
  setTimeout(async () => {
    logger.info('=== Initial data fetch ===');
    await Promise.all([
      updateDailyPredictions(),
      updateIntradayPredictions(),
      updateTradebook()
    ]);
  }, 5000); // 5 second delay after startup
}

/**
 * Get cached data
 */
function getCachedData(type) {
  const data = dataCache[type];
  const lastUpdate = dataCache.lastUpdate[type];

  return {
    data: data || [],
    lastUpdate: lastUpdate || null,
    notifications: dataCache[`${type}Notifications`] || []
  };
}

/**
 * Clear notification for a specific type
 */
function clearNotifications(type) {
  dataCache[`${type}Notifications`] = [];
  logger.info(`Cleared notifications for ${type}`);
}

/**
 * Get polling status
 */
function getPollingStatus() {
  return {
    enabled: POLLING_ENABLED,
    lastUpdates: dataCache.lastUpdate,
    consecutiveFailures,
    cacheStatus: {
      dailyPredictions: !!dataCache.dailyPredictions,
      intradayPredictions: !!dataCache.intradayPredictions,
      tradebook: !!dataCache.tradebook
    }
  };
}

module.exports = {
  initializePolling,
  getCachedData,
  clearNotifications,
  getPollingStatus,
  updateDailyPredictions,
  updateIntradayPredictions,
  updateTradebook
};
