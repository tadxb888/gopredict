/**
 * Data Transformers
 * Transform Nexday API responses to grid-ready format
 */

/**
 * Transform daily predictions with opportunities
 * Merges predictions_daily and opportunities_daily by symbol
 */
export function transformDailyPredictions(predictionsResponse, opportunitiesResponse) {
  const predictions = predictionsResponse.records || [];
  const opportunities = opportunitiesResponse.records || [];
  
  // Create a map of opportunities by symbol for quick lookup
  const opportunitiesMap = opportunities.reduce((map, opp) => {
    map[opp.symbol] = opp;
    return map;
  }, {});
  
  // Merge predictions with opportunities
  return predictions.map(pred => {
    const opp = opportunitiesMap[pred.symbol] || {};
    
    return {
      // Core fields
      predicted_date: pred.target_date,
      symbol: pred.symbol,
      Description: pred.description,
      
      // Prediction fields
      predicted_high: pred.predicted_high,
      predicted_trend: pred.predicted_trend,
      predicted_low: pred.predicted_low,
      predicted_strength: pred.predicted_strength,
      predicted_range: pred.predicted_range,
      predicted_trading_range: pred.predicted_trading_range,
      momentum: pred.momentum,
      days_since_reversal: pred.days_since_reversal,
      
      // Opportunity fields
      opportunity: opp.opportunity || null,
      conviction: opp.conviction || null,
      trend_direction: opp.opportunity_direction || null,
      
      // Additional useful fields
      predicted_midpoint: pred.predicted_midpoint,
      predicted_onefourth: pred.predicted_onefourth,
      predicted_threefourth: pred.predicted_threefourth,
      confidence_score: pred.confidence_score
    };
  });
}

/**
 * Transform intraday predictions from nested structure to flat grid rows
 */
export function transformIntradayPredictions(apiResponse) {
  if (!apiResponse || !apiResponse.data) {
    return [];
  }
  
  const rows = [];
  
  apiResponse.data.forEach(symbolData => {
    const row = {
      // Metadata
      prediction_time: apiResponse.prediction_time,
      target_time: apiResponse.target_time,
      timeframe: apiResponse.timeframe,
      
      // Symbol info
      symbol: symbolData.symbol,
      Description: symbolData.description
    };
    
    // Extract predictions from the array
    symbolData.predictions.forEach(pred => {
      const type = pred.prediction_type;
      
      if (type.includes('high')) {
        row.predicted_high = pred.predicted_value;
      } else if (type.includes('low')) {
        row.predicted_low = pred.predicted_value;
      } else if (type.includes('close')) {
        row.predicted_close = pred.predicted_value;
      } else if (type.includes('trend')) {
        row.predicted_trend = pred.predicted_value;
      } else if (type.includes('strength')) {
        // Strength prediction has additional fields
        row.predicted_strength = pred.predicted_value;
        row.predicted_range = pred.predicted_range;
        row.predicted_midpoint = pred.predicted_midpoint;
        row.predicted_onefourth = pred.predicted_onefourth;
        row.predicted_threefourth = pred.predicted_threefourth;
        row.predicted_trading_range = pred.predicted_trading_range;
        row.momentum = pred.momentum;
        row.predicted_high_touched = pred.predicted_high_touched;
        row.predicted_low_touched = pred.predicted_low_touched;
      }
    });
    
    rows.push(row);
  });
  
  return rows;
}

/**
 * Transform tradebook data (direct mapping)
 */
export function transformTradebook(apiResponse) {
  if (!apiResponse || !apiResponse.records) {
    return [];
  }
  
  return apiResponse.records.map(trade => ({
    target_date: trade.target_date,
    symbol: trade.symbol,
    Description: trade.description,
    action: trade.action,
    entry_min: trade.entry_min,
    entry_max: trade.entry_max,
    tp_min: trade.tp_min,
    tp_max: trade.tp_max,
    sl_min: trade.sl_min,
    sl_max: trade.sl_max,
    predicted_midpoint: trade.predicted_midpoint,
    predicted_onefourth: trade.predicted_onefourth,
    predicted_threefourth: trade.predicted_threefourth,
    predicted_range: trade.predicted_range,
    predicted_trading_range: trade.predicted_trading_range,
    predicted_high: trade.predicted_high,
    predicted_low: trade.predicted_low,
    predicted_strength: trade.predicted_strength,
    days_since_reversal: trade.days_since_reversal
  }));
}
