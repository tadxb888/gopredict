const axios = require('axios');
const cron = require('node-cron');
const logger = require('../utils/logger');
const { sendAdminNotification } = require('./emailService');
require('dotenv').config();

// Nexday API Configuration
const NEXDAY_API_SERVER = 'http://175.110.113.174:8080';
const NEXDAY_LICENSE_ID = '3561334610044732';
const NEXDAY_ENDPOINT = `${NEXDAY_API_SERVER}/api/v1/client/${NEXDAY_LICENSE_ID}/endpoints`;

const DATA_API_TIMEOUT = parseInt(process.env.DATA_API_TIMEOUT || '30000');
const POLLING_ENABLED = process.env.POLLING_ENABLED === 'true';
const MAX_RETRY_ATTEMPTS = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3');

// In-memory cache
const dataCache = {
  dailyPredictions: null,
  dailyOpportunities: null,
  intradayPredictions: null,
  tradebook: null,
  symbols: null,
  lastUpdate: {},
  signedUrls: null,
  urlsExpireAt: null
};

// Track failures
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Get signed CloudFront URLs from Nexday API
 */
async function refreshSignedUrls() {
  try {
    logger.info('Refreshing signed URLs from Nexday API...');
    
    const response = await axios.get(NEXDAY_ENDPOINT, {
      timeout: DATA_API_TIMEOUT,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.status === 200 && response.data && response.data.status === 'success') {
      dataCache.signedUrls = response.data.endpoints;
      dataCache.urlsExpireAt = Date.now() + (55 * 60 * 1000);
      
      logger.info('Signed URLs refreshed successfully', {
        expiresIn: response.data.url_expires_in_minutes,
        license: response.data.client.license_id
      });
      
      consecutiveFailures = 0;
      return true;
    }

    throw new Error(`Invalid response: ${response.status}`);
  } catch (error) {
    logger.error('Failed to refresh signed URLs', {
      error: error.message,
      endpoint: NEXDAY_ENDPOINT
    });
    
    consecutiveFailures++;
    return false;
  }
}

/**
 * Ensure we have valid signed URLs
 */
async function ensureValidUrls() {
  const now = Date.now();
  
  if (!dataCache.signedUrls || !dataCache.urlsExpireAt || now >= dataCache.urlsExpireAt) {
    await refreshSignedUrls();
  }
  
  return dataCache.signedUrls !== null;
}

/**
 * Fetch data from signed CloudFront URL
 */
async function fetchDataFromSignedUrl(urlKey, dataType) {
  try {
    const hasValidUrls = await ensureValidUrls();
    if (!hasValidUrls) {
      throw new Error('No valid signed URLs available');
    }

    const signedUrl = dataCache.signedUrls[urlKey];
    if (!signedUrl) {
      logger.error(`No signed URL found for ${urlKey}`);
      throw new Error(`No signed URL found for ${urlKey}`);
    }

    logger.info(`Fetching ${dataType} from signed URL...`);

    const response = await axios.get(signedUrl, {
      timeout: DATA_API_TIMEOUT,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.status === 200 && response.data) {
      consecutiveFailures = 0;
      return {
        success: true,
        data: response.data,
        timestamp: new Date()
      };
    }

    throw new Error(`Invalid response: ${response.status}`);
  } catch (error) {
    logger.error(`Failed to fetch ${dataType}`, {
      error: error.message,
      urlKey
    });

    consecutiveFailures++;
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * Update daily predictions and opportunities (merge them)
 */
async function updateDailyPredictions() {
  logger.info('Updating daily predictions...');
  
  // Fetch both predictions and opportunities
  const [predictionsResult, opportunitiesResult] = await Promise.all([
    fetchDataFromSignedUrl('predictions_daily', 'daily_predictions'),
    fetchDataFromSignedUrl('opportunities_daily', 'daily_opportunities')
  ]);

  if (predictionsResult.success) {
    const predictions = predictionsResult.data.records || [];
    logger.info(`Fetched ${predictions.length} daily predictions`);
    
    if (predictions.length > 0) {
      logger.info('Prediction fields:', Object.keys(predictions[0]));
    }
    
    // Store raw predictions
    dataCache.dailyPredictions = predictions;
  }

  if (opportunitiesResult.success) {
    const opportunities = opportunitiesResult.data.records || [];
    logger.info(`Fetched ${opportunities.length} daily opportunities`);
    
    if (opportunities.length > 0) {
      logger.info('Opportunity fields:', Object.keys(opportunities[0]));
    }
    
    // Store raw opportunities
    dataCache.dailyOpportunities = opportunities;
  }

  // Merge predictions with opportunities by symbol and target_date
  if (predictionsResult.success && opportunitiesResult.success) {
    const predictions = predictionsResult.data.records || [];
    const opportunities = opportunitiesResult.data.records || [];
    
    const merged = predictions.map(pred => {
      // Find matching opportunity
      const opp = opportunities.find(o => 
        o.symbol === pred.symbol && o.target_date === pred.target_date
      );
      
      // Merge the records
      return {
        ...pred,
        ...(opp || {})
      };
    });
    
    dataCache.dailyPredictions = merged;
    dataCache.lastUpdate.dailyPredictions = new Date();
    logger.logDataSync('daily_predictions', true);
    logger.info(`Daily predictions merged: ${merged.length} records`);
    
    if (merged.length > 0) {
      logger.info('Merged record fields:', Object.keys(merged[0]));
      logger.info('Sample merged record:', merged[0]);
    }
    
    return { success: true, data: merged };
  }

  if (!predictionsResult.success) {
    logger.logDataSync('daily_predictions', false, { error: predictionsResult.error });
    return predictionsResult;
  }

  return { success: false, error: 'Failed to fetch opportunities' };
}

/**
 * Update intraday predictions
 */
async function updateIntradayPredictions() {
  logger.info('Updating intraday predictions...');
  const result = await fetchDataFromSignedUrl('predictions_15min', 'intraday_predictions');

  if (result.success) {
    const records = result.data.records || [];
    
    dataCache.intradayPredictions = records;
    dataCache.lastUpdate.intradayPredictions = result.timestamp;
    logger.logDataSync('intraday_predictions', true);
    
    logger.info(`Intraday predictions updated: ${records.length} records`);
    
    if (records.length > 0) {
      logger.info(`Sample intraday fields:`, Object.keys(records[0]));
    }
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
  const result = await fetchDataFromSignedUrl('tradebook_daily', 'tradebook');

  if (result.success) {
    const records = result.data.records || [];
    
    dataCache.tradebook = records;
    dataCache.lastUpdate.tradebook = result.timestamp;
    logger.logDataSync('tradebook', true);
    
    logger.info(`Tradebook updated: ${records.length} records`);
    
    if (records.length > 0) {
      logger.info(`Sample tradebook fields:`, Object.keys(records[0]));
    }
  } else {
    logger.logDataSync('tradebook', false, { error: result.error });
  }

  return result;
}

/**
 * Poll data with retry logic
 */
async function pollWithRetry(updateFunction, retryCount = 0) {
  const result = await updateFunction();

  if (!result.success && retryCount < MAX_RETRY_ATTEMPTS) {
    const retryDelay = 60000;
    logger.info(`Retry ${retryCount + 1}/${MAX_RETRY_ATTEMPTS} in 1 minute...`);

    setTimeout(async () => {
      await pollWithRetry(updateFunction, retryCount + 1);
    }, retryDelay);
  }
}

/**
 * Initialize polling schedule
 */
function initializePolling() {
  if (!POLLING_ENABLED) {
    logger.warn('Polling is disabled');
    return;
  }

  logger.info('Initializing data polling service...');
  logger.info('Nexday API:', NEXDAY_API_SERVER);
  logger.info('License ID:', NEXDAY_LICENSE_ID);

  const dataSchedule = '1,16,31,46 * * * *';

  cron.schedule(dataSchedule, async () => {
    logger.info('=== Data polling cycle started ===');

    await Promise.all([
      pollWithRetry(updateDailyPredictions),
      // pollWithRetry(updateIntradayPredictions),
      // pollWithRetry(updateTradebook)
    ]);

    logger.info('=== Data polling cycle completed ===');
  });

  const urlRefreshSchedule = '*/55 * * * *';
  
  cron.schedule(urlRefreshSchedule, async () => {
    logger.info('=== Scheduled URL refresh ===');
    await refreshSignedUrls();
  });

  logger.info('Polling service started successfully');
  logger.info(`Data schedule: ${dataSchedule}`);
  logger.info(`URL refresh schedule: ${urlRefreshSchedule}`);

  // Initial fetch on startup
  setTimeout(async () => {
    logger.info('=== Initial data fetch ===');
    
    const urlsRefreshed = await refreshSignedUrls();
    
    if (urlsRefreshed) {
      await updateDailyPredictions();
    } else {
      logger.error('Failed to get signed URLs on startup');
    }
  }, 5000);
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
    signedUrlsValid: dataCache.urlsExpireAt ? dataCache.urlsExpireAt > Date.now() : false,
    signedUrlsExpireAt: dataCache.urlsExpireAt,
    cacheStatus: {
      dailyPredictions: !!dataCache.dailyPredictions,
      dailyOpportunities: !!dataCache.dailyOpportunities,
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
  updateTradebook,
  refreshSignedUrls
};
