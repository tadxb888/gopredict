/**
 * Nexday Trading API Service
 * Uses backend proxy to avoid CORS
 */

const API_BASE = 'http://localhost:3001/api/nexday';

class NexdayDataService {
  constructor() {
    this.endpoints = null;
    this.lastRefresh = null;
  }

  async refreshEndpoints() {
    try {
      console.log('→ Refreshing Nexday endpoints via backend proxy...');
      
      const response = await fetch(`${API_BASE}/endpoints`, {
        credentials: 'include' // Send JWT cookie
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        this.endpoints = data.endpoints;
        this.lastRefresh = Date.now();
        console.log('✓ Endpoints refreshed:', Object.keys(data.endpoints).length, 'endpoints');
        return true;
      } else {
        throw new Error(data.message || 'Failed to refresh endpoints');
      }
    } catch (error) {
      console.error('✗ Error refreshing endpoints:', error);
      throw error;
    }
  }

  needsRefresh() {
    if (!this.endpoints || !this.lastRefresh) return true;
    const ageMinutes = (Date.now() - this.lastRefresh) / 1000 / 60;
    return ageMinutes > 4;
  }

  async fetchWithRefresh(endpointKey) {
    if (this.needsRefresh()) {
      await this.refreshEndpoints();
    }
    
    if (!this.endpoints || !this.endpoints[endpointKey]) {
      throw new Error(`Endpoint ${endpointKey} not available`);
    }
    
    console.log(`→ Fetching ${endpointKey} via backend proxy...`);
    
    // Proxy CloudFront request through backend
    const proxyUrl = `${API_BASE}/data?url=${encodeURIComponent(this.endpoints[endpointKey])}`;
    const response = await fetch(proxyUrl, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    const count = result.records?.length || result.data?.length || 0;
    console.log(`✓ Fetched ${endpointKey}:`, count, 'records');
    
    return result;
  }

  async getSymbols() {
    return this.fetchWithRefresh('symbols');
  }

  async getDailyPredictions() {
    return this.fetchWithRefresh('predictions_daily');
  }

  async getIntradayPredictions(timeframe) {
    const key = `predictions_${timeframe}`;
    return this.fetchWithRefresh(key);
  }

  async getOpportunities() {
    return this.fetchWithRefresh('opportunities_daily');
  }

  async getTradebook() {
    return this.fetchWithRefresh('tradebook_daily');
  }

  async getManifest() {
    return this.fetchWithRefresh('manifest');
  }
}

const nexdayApi = new NexdayDataService();

if (typeof window !== 'undefined') {
  window.nexdayApi = nexdayApi;
}

export default nexdayApi;
