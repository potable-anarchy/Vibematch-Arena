/**
 * Performance Monitoring System
 * Collects and tracks server performance metrics in real-time
 */

import os from 'os';

class PerformanceMonitor {
  constructor() {
    // Current metrics
    this.metrics = {
      // Game Loop Metrics
      gameLoop: {
        tickTime: 0,                    // Current tick execution time (ms)
        avgTickTime: 0,                 // Average tick time over last second
        maxTickTime: 0,                 // Maximum tick time in last second
        ticksPerSecond: 0,              // Actual tick rate
        tickTimeHistory: [],            // Last 60 tick times
        slowTicks: 0,                   // Ticks that exceeded 16.67ms
      },

      // Network Metrics
      network: {
        activeConnections: 0,           // Current socket connections
        messagesPerSecond: 0,           // Messages sent per second
        bytesPerSecond: 0,              // Bytes sent per second
        avgLatency: 0,                  // Average client latency (ms)
        messageCount: 0,                // Total messages sent
        bytesSent: 0,                   // Total bytes sent
      },

      // Game State Metrics
      gameState: {
        playerCount: 0,                 // Human players
        botCount: 0,                    // Bot players
        projectileCount: 0,             // Active projectiles
        pickupCount: 0,                 // Active pickups
        activeGames: 0,                 // Active game sessions
      },

      // System Metrics
      system: {
        memoryUsageMB: 0,               // Current memory usage
        heapUsedMB: 0,                  // Heap used
        heapTotalMB: 0,                 // Total heap
        cpuUsage: 0,                    // CPU usage percentage
        uptime: 0,                      // Server uptime (seconds)
        platform: os.platform(),        // OS platform
        nodeVersion: process.version,   // Node.js version
      },

      // API Metrics
      api: {
        requestsPerSecond: 0,           // HTTP requests per second
        avgResponseTime: 0,             // Average response time (ms)
        errorRate: 0,                   // Errors per second
        requestCount: 0,                // Total requests
        errorCount: 0,                  // Total errors
        endpointStats: {},              // Per-endpoint statistics
      },

      // Timestamps
      lastUpdate: Date.now(),
      startTime: Date.now(),
    };

    // Rate tracking
    this.counters = {
      lastMessageCount: 0,
      lastBytesSent: 0,
      lastRequestCount: 0,
      lastErrorCount: 0,
      lastTickCount: 0,
    };

    // Request timing storage
    this.activeRequests = new Map();

    // Historical data (last 60 seconds)
    this.history = {
      tickTimes: [],
      memoryUsage: [],
      playerCounts: [],
      cpuUsage: [],
      networkThroughput: [],
      timestamps: [],
    };

    // Start system metrics collection
    this.startSystemMetrics();
  }

  /**
   * Start collecting system-level metrics
   */
  startSystemMetrics() {
    // Update system metrics every second
    setInterval(() => {
      this.updateSystemMetrics();
      this.updateRateMetrics();
      this.updateHistory();
    }, 1000);
  }

  /**
   * Update system-level metrics (memory, CPU, uptime)
   */
  updateSystemMetrics() {
    const memUsage = process.memoryUsage();
    this.metrics.system.memoryUsageMB = Math.round(memUsage.rss / 1024 / 1024);
    this.metrics.system.heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    this.metrics.system.heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    this.metrics.system.uptime = Math.round(process.uptime());

    // CPU usage calculation
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    this.metrics.system.cpuUsage = usage;
  }

  /**
   * Update rate-based metrics (per-second calculations)
   */
  updateRateMetrics() {
    const now = Date.now();
    const deltaSeconds = (now - this.metrics.lastUpdate) / 1000;

    // Network rates
    const messageDelta = this.metrics.network.messageCount - this.counters.lastMessageCount;
    const bytesDelta = this.metrics.network.bytesSent - this.counters.lastBytesSent;
    this.metrics.network.messagesPerSecond = Math.round(messageDelta / deltaSeconds);
    this.metrics.network.bytesPerSecond = Math.round(bytesDelta / deltaSeconds);

    // API rates
    const requestDelta = this.metrics.api.requestCount - this.counters.lastRequestCount;
    const errorDelta = this.metrics.api.errorCount - this.counters.lastErrorCount;
    this.metrics.api.requestsPerSecond = Math.round(requestDelta / deltaSeconds);
    this.metrics.api.errorRate = Math.round(errorDelta / deltaSeconds);

    // Game loop rates
    const tickDelta = this.counters.lastTickCount;
    this.metrics.gameLoop.ticksPerSecond = Math.round(tickDelta / deltaSeconds);

    // Update counters
    this.counters.lastMessageCount = this.metrics.network.messageCount;
    this.counters.lastBytesSent = this.metrics.network.bytesSent;
    this.counters.lastRequestCount = this.metrics.api.requestCount;
    this.counters.lastErrorCount = this.metrics.api.errorCount;
    this.counters.lastTickCount = 0;

    this.metrics.lastUpdate = now;
  }

  /**
   * Update historical data for graphs
   */
  updateHistory() {
    const maxHistory = 60; // Keep 60 seconds of history

    this.history.timestamps.push(Date.now());
    this.history.tickTimes.push(this.metrics.gameLoop.avgTickTime);
    this.history.memoryUsage.push(this.metrics.system.memoryUsageMB);
    this.history.playerCounts.push(this.metrics.gameState.playerCount + this.metrics.gameState.botCount);
    this.history.cpuUsage.push(this.metrics.system.cpuUsage);
    this.history.networkThroughput.push(this.metrics.network.bytesPerSecond);

    // Trim to max history length
    if (this.history.timestamps.length > maxHistory) {
      this.history.timestamps.shift();
      this.history.tickTimes.shift();
      this.history.memoryUsage.shift();
      this.history.playerCounts.shift();
      this.history.cpuUsage.shift();
      this.history.networkThroughput.shift();
    }
  }

  /**
   * Record a game loop tick
   * @param {number} tickTime - Time taken for this tick (ms)
   */
  recordTick(tickTime) {
    this.metrics.gameLoop.tickTime = tickTime;
    this.metrics.gameLoop.tickTimeHistory.push(tickTime);
    this.counters.lastTickCount++;

    // Keep only last 60 ticks for averaging
    if (this.metrics.gameLoop.tickTimeHistory.length > 60) {
      this.metrics.gameLoop.tickTimeHistory.shift();
    }

    // Calculate average
    const sum = this.metrics.gameLoop.tickTimeHistory.reduce((a, b) => a + b, 0);
    this.metrics.gameLoop.avgTickTime = +(sum / this.metrics.gameLoop.tickTimeHistory.length).toFixed(2);

    // Track max tick time
    this.metrics.gameLoop.maxTickTime = Math.max(...this.metrics.gameLoop.tickTimeHistory);

    // Count slow ticks (>16.67ms = below 60fps)
    if (tickTime > 16.67) {
      this.metrics.gameLoop.slowTicks++;
    }
  }

  /**
   * Record network message sent
   * @param {number} bytes - Size of message in bytes
   */
  recordMessage(bytes) {
    this.metrics.network.messageCount++;
    this.metrics.network.bytesSent += bytes;
  }

  /**
   * Update connection count
   * @param {number} count - Current number of active connections
   */
  updateConnectionCount(count) {
    this.metrics.network.activeConnections = count;
  }

  /**
   * Update game state metrics
   * @param {Object} gameState - Current game state
   */
  updateGameState(gameState) {
    this.metrics.gameState.playerCount = gameState.players || 0;
    this.metrics.gameState.botCount = gameState.bots || 0;
    this.metrics.gameState.projectileCount = gameState.projectiles || 0;
    this.metrics.gameState.pickupCount = gameState.pickups || 0;
  }

  /**
   * Record API request start
   * @param {string} requestId - Unique request identifier
   * @param {string} endpoint - API endpoint
   */
  startRequest(requestId, endpoint) {
    this.activeRequests.set(requestId, {
      startTime: Date.now(),
      endpoint: endpoint,
    });

    this.metrics.api.requestCount++;

    // Initialize endpoint stats if needed
    if (!this.metrics.api.endpointStats[endpoint]) {
      this.metrics.api.endpointStats[endpoint] = {
        count: 0,
        avgTime: 0,
        errors: 0,
        totalTime: 0,
      };
    }
    this.metrics.api.endpointStats[endpoint].count++;
  }

  /**
   * Record API request completion
   * @param {string} requestId - Unique request identifier
   * @param {boolean} isError - Whether request resulted in error
   */
  endRequest(requestId, isError = false) {
    const request = this.activeRequests.get(requestId);
    if (!request) return;

    const duration = Date.now() - request.startTime;

    // Update endpoint stats
    const stats = this.metrics.api.endpointStats[request.endpoint];
    if (stats) {
      stats.totalTime += duration;
      stats.avgTime = +(stats.totalTime / stats.count).toFixed(2);
      if (isError) {
        stats.errors++;
        this.metrics.api.errorCount++;
      }
    }

    // Update global average
    const allTimes = Object.values(this.metrics.api.endpointStats)
      .map(s => s.avgTime)
      .filter(t => t > 0);

    if (allTimes.length > 0) {
      this.metrics.api.avgResponseTime = +(allTimes.reduce((a, b) => a + b, 0) / allTimes.length).toFixed(2);
    }

    this.activeRequests.delete(requestId);
  }

  /**
   * Get current metrics snapshot
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      history: this.history,
    };
  }

  /**
   * Get summary statistics
   * @returns {Object} Summary of key metrics
   */
  getSummary() {
    return {
      gameLoop: {
        avgTickTime: this.metrics.gameLoop.avgTickTime,
        ticksPerSecond: this.metrics.gameLoop.ticksPerSecond,
        slowTickPercentage: +(this.metrics.gameLoop.slowTicks / this.metrics.gameLoop.tickTimeHistory.length * 100).toFixed(1),
      },
      system: {
        memoryUsageMB: this.metrics.system.memoryUsageMB,
        cpuUsage: this.metrics.system.cpuUsage,
        uptime: this.metrics.system.uptime,
      },
      game: {
        totalPlayers: this.metrics.gameState.playerCount + this.metrics.gameState.botCount,
        humanPlayers: this.metrics.gameState.playerCount,
        projectiles: this.metrics.gameState.projectileCount,
      },
      network: {
        connections: this.metrics.network.activeConnections,
        messagesPerSecond: this.metrics.network.messagesPerSecond,
        bytesPerSecond: this.metrics.network.bytesPerSecond,
      },
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset() {
    this.metrics.gameLoop.slowTicks = 0;
    this.metrics.api.requestCount = 0;
    this.metrics.api.errorCount = 0;
    this.metrics.network.messageCount = 0;
    this.metrics.network.bytesSent = 0;
  }
}

// Singleton instance
const monitor = new PerformanceMonitor();

export default monitor;
