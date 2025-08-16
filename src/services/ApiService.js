/**
 * API Service for Seno Player Hub
 * Handles communication between frontend and backend API
 * Includes fallback to localStorage for offline functionality
 */

class ApiService {
  constructor() {
    // Railway backend URL - update this after deployment
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    this.isOnline = navigator.onLine;
    this.domain = window.location.hostname;
    this.ipAddress = 'unknown'; // Will be detected
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncOfflineData();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
    
    this.detectIP();
  }

  // Detect user's IP address
  async detectIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      this.ipAddress = data.ip;
    } catch (error) {
      console.log('Could not detect IP address:', error);
      this.ipAddress = 'localhost';
    }
  }

  // Generic API request handler with localStorage fallback
  async apiRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      if (!this.isOnline) {
        throw new Error('Offline - using localStorage fallback');
      }

      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.warn(`API request failed for ${endpoint}:`, error.message);
      
      // Fallback to localStorage for critical operations
      return this.handleOfflineFallback(endpoint, options);
    }
  }

  // Handle offline fallback using localStorage
  handleOfflineFallback(endpoint, options) {
    console.log(`🔄 Using localStorage fallback for: ${endpoint}`);
    
    // Map API endpoints to localStorage operations
    if (endpoint.includes('/players/register') && options.method === 'POST') {
      return this.registerPlayerOffline(JSON.parse(options.body));
    }
    
    if (endpoint.includes('/players/login') && options.method === 'POST') {
      return this.loginPlayerOffline(JSON.parse(options.body));
    }
    
    if (endpoint.includes('/players') && options.method === 'GET') {
      return this.getPlayersOffline();
    }
    
    if (endpoint.includes('/chats') && options.method === 'GET') {
      return this.getChatsOffline();
    }
    
    if (endpoint.includes('/betting') && options.method === 'GET') {
      return this.getBettingOffline();
    }
    
    if (endpoint.includes('/timers') && options.method === 'GET') {
      return this.getTimersOffline();
    }
    
    // Default fallback
    return {
      success: false,
      error: 'Offline mode - limited functionality',
      offline: true
    };
  }

  // === PLAYER MANAGEMENT ===

  async registerPlayer(userData) {
    const payload = {
      ...userData,
      domain: this.domain,
      ipAddress: this.ipAddress
    };

    const result = await this.apiRequest('/players/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    // Store in localStorage for offline access
    if (result.success) {
      this.storePlayerData(result.data);
    }

    return result;
  }

  async loginPlayer(userId) {
    const payload = {
      userId,
      domain: this.domain,
      ipAddress: this.ipAddress
    };

    return await this.apiRequest('/players/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getAllPlayers() {
    return await this.apiRequest('/players');
  }

  async updatePlayerBalance(userId, amount, operation = 'set') {
    return await this.apiRequest(`/players/${userId}/balance`, {
      method: 'POST',
      body: JSON.stringify({ amount, operation })
    });
  }

  async blockPlayer(userId, isBlocked) {
    return await this.apiRequest(`/players/${userId}/block`, {
      method: 'POST',
      body: JSON.stringify({ isBlocked })
    });
  }

  // === CHAT MANAGEMENT ===

  async getAllChats() {
    return await this.apiRequest('/chats');
  }

  async sendMessage(userId, message, sender = 'user') {
    const payload = {
      userId,
      message,
      sender,
      domain: this.domain
    };

    return await this.apiRequest('/chats/message', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async markMessagesAsRead(userId) {
    return await this.apiRequest(`/chats/${userId}/read`, {
      method: 'POST'
    });
  }

  // === BETTING MANAGEMENT ===

  async getAllBetting() {
    return await this.apiRequest('/betting');
  }

  async placeBet(betData) {
    const payload = {
      ...betData,
      domain: this.domain
    };

    return await this.apiRequest('/betting/place', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateBetResult(betId, result, isWin) {
    return await this.apiRequest(`/betting/${betId}/result`, {
      method: 'POST',
      body: JSON.stringify({ result, isWin })
    });
  }

  // === TIMER MANAGEMENT ===

  async getTimers() {
    return await this.apiRequest('/timers');
  }

  async updateTimers(timers) {
    return await this.apiRequest('/timers', {
      method: 'POST',
      body: JSON.stringify(timers)
    });
  }

  async setAdminOverride(server, nextResult) {
    return await this.apiRequest(`/timers/${server}/override`, {
      method: 'POST',
      body: JSON.stringify({ nextResult })
    });
  }

  // === ADMIN SETTINGS ===

  async getSettings() {
    return await this.apiRequest('/settings');
  }

  async updateSettings(settings) {
    return await this.apiRequest('/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }

  // === STATISTICS ===

  async getStats() {
    return await this.apiRequest('/stats');
  }

  // === OFFLINE FALLBACK METHODS ===

  registerPlayerOffline(userData) {
    try {
      const players = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      const existingPlayer = players.find(p => p.userId === userData.userId);
      
      if (existingPlayer) {
        return { success: false, error: 'Player already exists', offline: true };
      }
      
      const newPlayer = {
        ...userData,
        balance: 1000,
        registeredAt: new Date().toISOString(),
        isBlocked: false,
        offline: true
      };
      
      players.push(newPlayer);
      localStorage.setItem('registeredUsers', JSON.stringify(players));
      
      return { success: true, data: newPlayer, offline: true };
    } catch (error) {
      return { success: false, error: error.message, offline: true };
    }
  }

  loginPlayerOffline(userData) {
    try {
      const players = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      const player = players.find(p => p.userId === userData.userId);
      
      if (!player) {
        return { success: false, error: 'Player not found', offline: true };
      }
      
      return { success: true, data: player, offline: true };
    } catch (error) {
      return { success: false, error: error.message, offline: true };
    }
  }

  getPlayersOffline() {
    try {
      const players = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      return { success: true, data: players, offline: true };
    } catch (error) {
      return { success: false, error: error.message, offline: true };
    }
  }

  getChatsOffline() {
    try {
      const chats = JSON.parse(localStorage.getItem('playerChats') || '{}');
      return { success: true, data: chats, offline: true };
    } catch (error) {
      return { success: false, error: error.message, offline: true };
    }
  }

  getBettingOffline() {
    try {
      const betting = JSON.parse(localStorage.getItem('liveBettingActivities') || '[]');
      return { success: true, data: betting, offline: true };
    } catch (error) {
      return { success: false, error: error.message, offline: true };
    }
  }

  getTimersOffline() {
    try {
      const timers = JSON.parse(localStorage.getItem('currentServerTimer') || '{}');
      return { success: true, data: timers, offline: true };
    } catch (error) {
      return { success: false, error: error.message, offline: true };
    }
  }

  // Store player data in localStorage
  storePlayerData(playerData) {
    try {
      const players = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      const existingIndex = players.findIndex(p => p.userId === playerData.userId);
      
      if (existingIndex >= 0) {
        players[existingIndex] = playerData;
      } else {
        players.push(playerData);
      }
      
      localStorage.setItem('registeredUsers', JSON.stringify(players));
    } catch (error) {
      console.error('Error storing player data:', error);
    }
  }

  // Sync offline data when back online
  async syncOfflineData() {
    console.log('🔄 Syncing offline data...');
    
    try {
      // Sync players
      const offlinePlayers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      const offlinePlayersToSync = offlinePlayers.filter(p => p.offline);
      
      for (const player of offlinePlayersToSync) {
        try {
          await this.registerPlayer(player);
          console.log(`✅ Synced player: ${player.userId}`);
        } catch (error) {
          console.error(`❌ Failed to sync player ${player.userId}:`, error);
        }
      }
      
      console.log('✅ Offline data sync completed');
    } catch (error) {
      console.error('❌ Error syncing offline data:', error);
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;
