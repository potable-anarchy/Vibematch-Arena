/**
 * Performance Monitoring System
 * Collects and tracks server performance metrics in real-time
 */

import os from "os";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PerformanceMonitor {
  constructor() {
    // Initialize SQLite database
    this.db = new Database(path.join(__dirname, "metrics.db"));
    this.initializeDatabase();

    // Start cleanup job (runs every hour)
    setInterval(() => this.cleanupOldMetrics(), 3600000); // 1 hour

    // SLO Definitions (Service Level Objectives)
    this.SLOs = {
      gameLoop: {
        targetTickTime: 16.67, // Target: 60 FPS = 16.67ms per tick
        p95Threshold: 16.67, // 95% of ticks should be under this
        p99Threshold: 20.0, // 99% of ticks should be under this
      },
      api: {
        targetResponseTime: 100, // Target: < 100ms
        p95Threshold: 100, // 95% of requests under 100ms
        p99Threshold: 200, // 99% of requests under 200ms
        errorRateThreshold: 0.01, // Max 1% error rate
      },
      availability: {
        targetUptime: 0.999, // 99.9% uptime target
      },
    };

    // Current metrics
    this.metrics = {
      // Game Loop Metrics
      gameLoop: {
        tickTime: 0, // Current tick execution time (ms)
        avgTickTime: 0, // Average tick time over last second
        maxTickTime: 0, // Maximum tick time in last second
        ticksPerSecond: 0, // Actual tick rate
        tickTimeHistory: [], // Last 60 tick times
        slowTicks: 0, // Ticks that exceeded 16.67ms
        p50: 0, // 50th percentile (median)
        p95: 0, // 95th percentile
        p99: 0, // 99th percentile
      },

      // Network Metrics
      network: {
        activeConnections: 0, // Current socket connections
        messagesPerSecond: 0, // Messages sent per second
        bytesPerSecond: 0, // Bytes sent per second
        avgLatency: 0, // Average client latency (ms)
        messageCount: 0, // Total messages sent
        bytesSent: 0, // Total bytes sent
      },

      // Game State Metrics
      gameState: {
        playerCount: 0, // Human players
        botCount: 0, // Bot players
        projectileCount: 0, // Active projectiles
        pickupCount: 0, // Active pickups
        activeGames: 0, // Active game sessions
      },

      // Game Statistics (cumulative)
      gameStats: {
        totalDamage: 0, // Total damage dealt since server start
        totalDeaths: 0, // Total deaths since server start
        totalKills: 0, // Total kills since server start
        damagePerSecond: 0, // Damage rate
        deathsPerSecond: 0, // Death rate
      },

      // System Metrics
      system: {
        memoryUsageMB: 0, // Current memory usage
        heapUsedMB: 0, // Heap used
        heapTotalMB: 0, // Total heap
        cpuUsage: 0, // CPU usage percentage
        uptime: 0, // Server uptime (seconds)
        platform: os.platform(), // OS platform
        nodeVersion: process.version, // Node.js version
      },

      // API Metrics
      api: {
        requestsPerSecond: 0, // HTTP requests per second
        avgResponseTime: 0, // Average response time (ms)
        errorRate: 0, // Errors per second
        requestCount: 0, // Total requests
        errorCount: 0, // Total errors
        endpointStats: {}, // Per-endpoint statistics
        responseTimeHistory: [], // Last 100 response times
        p50: 0, // 50th percentile
        p95: 0, // 95th percentile
        p99: 0, // 99th percentile
      },

      // SLI/SLO Status (Service Level Indicators)
      sli: {
        gameLoopCompliance: 0, // % of ticks meeting SLO
        apiLatencyCompliance: 0, // % of API requests meeting SLO
        errorRateCompliance: true, // Is error rate within SLO?
        overallHealth: 100, // Overall health score (0-100)
        breaches: [], // Recent SLO breaches
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
      lastDamage: 0,
      lastDeaths: 0,
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
   * Initialize SQLite database schema
   */
  initializeDatabase() {
    // Create metrics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metrics_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,

        -- Game Loop Metrics
        tick_time REAL,
        avg_tick_time REAL,
        max_tick_time REAL,
        ticks_per_second INTEGER,
        tick_p50 REAL,
        tick_p95 REAL,
        tick_p99 REAL,
        slow_ticks INTEGER,

        -- System Metrics
        memory_usage_mb REAL,
        heap_used_mb REAL,
        heap_total_mb REAL,
        cpu_usage REAL,

        -- Game State
        player_count INTEGER,
        bot_count INTEGER,
        projectile_count INTEGER,
        pickup_count INTEGER,

        -- Network Metrics
        active_connections INTEGER,
        messages_per_second INTEGER,
        bytes_per_second INTEGER,

        -- API Metrics
        api_requests_per_second INTEGER,
        api_avg_response_time REAL,
        api_p50 REAL,
        api_p95 REAL,
        api_p99 REAL,
        api_error_rate REAL,

        -- SLI/SLO Status
        game_loop_compliance REAL,
        api_latency_compliance REAL,
        error_rate_compliance INTEGER,
        overall_health REAL
      );

      -- Index for efficient time-based queries
      CREATE INDEX IF NOT EXISTS idx_timestamp ON metrics_snapshots(timestamp);
    `);

    // Add new columns if they don't exist (for existing databases)
    try {
      this.db.exec(
        `ALTER TABLE metrics_snapshots ADD COLUMN total_damage REAL;`,
      );
      console.log("✅ Added total_damage column");
    } catch (e) {
      // Column already exists, ignore
    }

    try {
      this.db.exec(
        `ALTER TABLE metrics_snapshots ADD COLUMN total_deaths INTEGER;`,
      );
      console.log("✅ Added total_deaths column");
    } catch (e) {
      // Column already exists, ignore
    }

    try {
      this.db.exec(
        `ALTER TABLE metrics_snapshots ADD COLUMN total_kills INTEGER;`,
      );
      console.log("✅ Added total_kills column");
    } catch (e) {
      // Column already exists, ignore
    }

    try {
      this.db.exec(
        `ALTER TABLE metrics_snapshots ADD COLUMN damage_per_second REAL;`,
      );
      console.log("✅ Added damage_per_second column");
    } catch (e) {
      // Column already exists, ignore
    }

    try {
      this.db.exec(
        `ALTER TABLE metrics_snapshots ADD COLUMN deaths_per_second REAL;`,
      );
      console.log("✅ Added deaths_per_second column");
    } catch (e) {
      // Column already exists, ignore
    }

    console.log("✅ Metrics database initialized");
  }

  /**
   * Save current metrics snapshot to database
   */
  saveMetricsSnapshot() {
    const stmt = this.db.prepare(`
      INSERT INTO metrics_snapshots (
        timestamp, tick_time, avg_tick_time, max_tick_time, ticks_per_second,
        tick_p50, tick_p95, tick_p99, slow_ticks,
        memory_usage_mb, heap_used_mb, heap_total_mb, cpu_usage,
        player_count, bot_count, projectile_count, pickup_count,
        active_connections, messages_per_second, bytes_per_second,
        api_requests_per_second, api_avg_response_time, api_p50, api_p95, api_p99, api_error_rate,
        total_damage, total_deaths, total_kills, damage_per_second, deaths_per_second,
        game_loop_compliance, api_latency_compliance, error_rate_compliance, overall_health
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    try {
      stmt.run(
        Date.now(),
        this.metrics.gameLoop.tickTime,
        this.metrics.gameLoop.avgTickTime,
        this.metrics.gameLoop.maxTickTime,
        this.metrics.gameLoop.ticksPerSecond,
        this.metrics.gameLoop.p50,
        this.metrics.gameLoop.p95,
        this.metrics.gameLoop.p99,
        this.metrics.gameLoop.slowTicks,
        this.metrics.system.memoryUsageMB,
        this.metrics.system.heapUsedMB,
        this.metrics.system.heapTotalMB,
        this.metrics.system.cpuUsage,
        this.metrics.gameState.playerCount,
        this.metrics.gameState.botCount,
        this.metrics.gameState.projectileCount,
        this.metrics.gameState.pickupCount,
        this.metrics.network.activeConnections,
        this.metrics.network.messagesPerSecond,
        this.metrics.network.bytesPerSecond,
        this.metrics.api.requestsPerSecond,
        this.metrics.api.avgResponseTime,
        this.metrics.api.p50,
        this.metrics.api.p95,
        this.metrics.api.p99,
        this.metrics.api.errorRate,
        this.metrics.gameStats.totalDamage,
        this.metrics.gameStats.totalDeaths,
        this.metrics.gameStats.totalKills,
        this.metrics.gameStats.damagePerSecond,
        this.metrics.gameStats.deathsPerSecond,
        this.metrics.sli.gameLoopCompliance,
        this.metrics.sli.apiLatencyCompliance,
        this.metrics.sli.errorRateCompliance ? 1 : 0,
        this.metrics.sli.overallHealth,
      );
    } catch (error) {
      console.error("❌ Error saving metrics snapshot:", error);
    }
  }

  /**
   * Clean up metrics older than 48 hours
   */
  cleanupOldMetrics() {
    const cutoffTime = Date.now() - 48 * 60 * 60 * 1000; // 48 hours ago

    try {
      const stmt = this.db.prepare(
        "DELETE FROM metrics_snapshots WHERE timestamp < ?",
      );
      const result = stmt.run(cutoffTime);

      if (result.changes > 0) {
        console.log(`🧹 Cleaned up ${result.changes} old metric records`);
      }
    } catch (error) {
      console.error("❌ Error cleaning up metrics:", error);
    }
  }

  /**
   * Get historical metrics within time range
   * @param {number} startTime - Start timestamp (ms)
   * @param {number} endTime - End timestamp (ms)
   * @returns {Array} Array of metric snapshots
   */
  getHistoricalMetrics(startTime, endTime = Date.now()) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM metrics_snapshots
        WHERE timestamp BETWEEN ? AND ?
        ORDER BY timestamp ASC
      `);
      return stmt.all(startTime, endTime);
    } catch (error) {
      console.error("❌ Error fetching historical metrics:", error);
      return [];
    }
  }

  /**
   * Get metrics aggregated by time bucket (for downsampling)
   * @param {string} interval - '5m', '15m', '1h', '6h'
   * @returns {Array} Aggregated metrics
   */
  getAggregatedMetrics(interval = "1h") {
    const intervalMs =
      {
        "5m": 5 * 60 * 1000,
        "15m": 15 * 60 * 1000,
        "1h": 60 * 60 * 1000,
        "6h": 6 * 60 * 60 * 1000,
      }[interval] || 3600000;

    const cutoffTime = Date.now() - 48 * 60 * 60 * 1000;

    try {
      const stmt = this.db.prepare(`
        SELECT
          (timestamp / ?) * ? as bucket_timestamp,
          AVG(avg_tick_time) as avg_tick_time,
          MAX(max_tick_time) as max_tick_time,
          AVG(tick_p95) as avg_tick_p95,
          AVG(memory_usage_mb) as avg_memory_mb,
          AVG(cpu_usage) as avg_cpu,
          AVG(player_count + bot_count) as avg_total_players,
          AVG(api_avg_response_time) as avg_api_time,
          AVG(overall_health) as avg_health,
          COUNT(*) as sample_count
        FROM metrics_snapshots
        WHERE timestamp > ?
        GROUP BY bucket_timestamp
        ORDER BY bucket_timestamp ASC
      `);

      return stmt.all(intervalMs, intervalMs, cutoffTime);
    } catch (error) {
      console.error("❌ Error fetching aggregated metrics:", error);
      return [];
    }
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

    // Save metrics snapshot to database every minute
    setInterval(() => {
      this.saveMetricsSnapshot();
    }, 60000); // 1 minute
  }

  /**
   * Update system-level metrics (memory, CPU, uptime)
   */
  updateSystemMetrics() {
    const memUsage = process.memoryUsage();
    this.metrics.system.memoryUsageMB = Math.round(memUsage.rss / 1024 / 1024);
    this.metrics.system.heapUsedMB = Math.round(
      memUsage.heapUsed / 1024 / 1024,
    );
    this.metrics.system.heapTotalMB = Math.round(
      memUsage.heapTotal / 1024 / 1024,
    );
    this.metrics.system.uptime = Math.round(process.uptime());

    // CPU usage calculation
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~((100 * idle) / total);
    this.metrics.system.cpuUsage = usage;
  }

  /**
   * Update rate-based metrics (per-second calculations)
   */
  updateRateMetrics() {
    const now = Date.now();
    const deltaSeconds = (now - this.metrics.lastUpdate) / 1000;

    // Network rates
    const messageDelta =
      this.metrics.network.messageCount - this.counters.lastMessageCount;
    const bytesDelta =
      this.metrics.network.bytesSent - this.counters.lastBytesSent;
    this.metrics.network.messagesPerSecond = Math.round(
      messageDelta / deltaSeconds,
    );
    this.metrics.network.bytesPerSecond = Math.round(bytesDelta / deltaSeconds);

    // API rates
    const requestDelta =
      this.metrics.api.requestCount - this.counters.lastRequestCount;
    const errorDelta =
      this.metrics.api.errorCount - this.counters.lastErrorCount;
    this.metrics.api.requestsPerSecond = Math.round(
      requestDelta / deltaSeconds,
    );
    this.metrics.api.errorRate = Math.round(errorDelta / deltaSeconds);

    // Game loop rates
    const tickDelta = this.counters.lastTickCount;
    this.metrics.gameLoop.ticksPerSecond = Math.round(tickDelta / deltaSeconds);

    // Game stats rates
    const damageDelta =
      this.metrics.gameStats.totalDamage - this.counters.lastDamage;
    const deathsDelta =
      this.metrics.gameStats.totalDeaths - this.counters.lastDeaths;
    this.metrics.gameStats.damagePerSecond = +(
      damageDelta / deltaSeconds
    ).toFixed(2);
    this.metrics.gameStats.deathsPerSecond = +(
      deathsDelta / deltaSeconds
    ).toFixed(2);

    // Update counters
    this.counters.lastMessageCount = this.metrics.network.messageCount;
    this.counters.lastBytesSent = this.metrics.network.bytesSent;
    this.counters.lastRequestCount = this.metrics.api.requestCount;
    this.counters.lastErrorCount = this.metrics.api.errorCount;
    this.counters.lastTickCount = 0;
    this.counters.lastDamage = this.metrics.gameStats.totalDamage;
    this.counters.lastDeaths = this.metrics.gameStats.totalDeaths;

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
    this.history.playerCounts.push(
      this.metrics.gameState.playerCount + this.metrics.gameState.botCount,
    );
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
   * Calculate percentile from array of values
   * @param {Array} values - Array of values
   * @param {number} percentile - Percentile to calculate (0-1)
   * @returns {number} Value at percentile
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Update SLI compliance metrics
   */
  updateSLICompliance() {
    // Game loop SLI: % of ticks within target time
    const tickHistory = this.metrics.gameLoop.tickTimeHistory;
    if (tickHistory.length > 0) {
      const compliantTicks = tickHistory.filter(
        (t) => t <= this.SLOs.gameLoop.p95Threshold,
      ).length;
      this.metrics.sli.gameLoopCompliance = +(
        (compliantTicks / tickHistory.length) *
        100
      ).toFixed(2);

      // Check for breach
      if (this.metrics.sli.gameLoopCompliance < 95) {
        this.recordSLOBreach(
          "gameLoop",
          this.metrics.sli.gameLoopCompliance,
          95,
        );
      }
    }

    // API latency SLI: % of requests within target time
    const apiHistory = this.metrics.api.responseTimeHistory;
    if (apiHistory.length > 0) {
      const compliantRequests = apiHistory.filter(
        (t) => t <= this.SLOs.api.p95Threshold,
      ).length;
      this.metrics.sli.apiLatencyCompliance = +(
        (compliantRequests / apiHistory.length) *
        100
      ).toFixed(2);

      // Check for breach
      if (this.metrics.sli.apiLatencyCompliance < 95) {
        this.recordSLOBreach(
          "apiLatency",
          this.metrics.sli.apiLatencyCompliance,
          95,
        );
      }
    }

    // Error rate SLI: Is error rate below threshold?
    const errorRate =
      this.metrics.api.requestCount > 0
        ? this.metrics.api.errorCount / this.metrics.api.requestCount
        : 0;
    this.metrics.sli.errorRateCompliance =
      errorRate <= this.SLOs.api.errorRateThreshold;

    if (!this.metrics.sli.errorRateCompliance) {
      this.recordSLOBreach(
        "errorRate",
        errorRate * 100,
        this.SLOs.api.errorRateThreshold * 100,
      );
    }

    // Calculate overall health score (weighted average)
    const weights = {
      gameLoop: 0.4, // 40% weight on game performance
      apiLatency: 0.3, // 30% weight on API performance
      errorRate: 0.3, // 30% weight on reliability
    };

    this.metrics.sli.overallHealth = +(
      this.metrics.sli.gameLoopCompliance * weights.gameLoop +
      this.metrics.sli.apiLatencyCompliance * weights.apiLatency +
      (this.metrics.sli.errorRateCompliance ? 100 : 0) * weights.errorRate
    ).toFixed(2);
  }

  /**
   * Record an SLO breach
   */
  recordSLOBreach(type, actual, target) {
    const breach = {
      type,
      actual,
      target,
      timestamp: Date.now(),
    };

    this.metrics.sli.breaches.push(breach);

    // Keep only last 10 breaches
    if (this.metrics.sli.breaches.length > 10) {
      this.metrics.sli.breaches.shift();
    }

    console.warn(
      `⚠️  SLO BREACH: ${type} - Actual: ${actual.toFixed(2)}%, Target: ${target}%`,
    );
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
    const sum = this.metrics.gameLoop.tickTimeHistory.reduce(
      (a, b) => a + b,
      0,
    );
    this.metrics.gameLoop.avgTickTime = +(
      sum / this.metrics.gameLoop.tickTimeHistory.length
    ).toFixed(2);

    // Track max tick time
    this.metrics.gameLoop.maxTickTime = Math.max(
      ...this.metrics.gameLoop.tickTimeHistory,
    );

    // Calculate percentiles
    this.metrics.gameLoop.p50 = +this.calculatePercentile(
      this.metrics.gameLoop.tickTimeHistory,
      0.5,
    ).toFixed(2);
    this.metrics.gameLoop.p95 = +this.calculatePercentile(
      this.metrics.gameLoop.tickTimeHistory,
      0.95,
    ).toFixed(2);
    this.metrics.gameLoop.p99 = +this.calculatePercentile(
      this.metrics.gameLoop.tickTimeHistory,
      0.99,
    ).toFixed(2);

    // Count slow ticks (>16.67ms = below 60fps)
    if (tickTime > 16.67) {
      this.metrics.gameLoop.slowTicks++;
    }

    // Update SLI compliance
    this.updateSLICompliance();
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
   * Record damage dealt
   * @param {number} amount - Amount of damage dealt
   */
  recordDamage(amount) {
    this.metrics.gameStats.totalDamage += amount;
  }

  /**
   * Record a death
   */
  recordDeath() {
    this.metrics.gameStats.totalDeaths++;
  }

  /**
   * Record a kill
   */
  recordKill() {
    this.metrics.gameStats.totalKills++;
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

    // Track response time history
    this.metrics.api.responseTimeHistory.push(duration);

    // Keep only last 100 response times
    if (this.metrics.api.responseTimeHistory.length > 100) {
      this.metrics.api.responseTimeHistory.shift();
    }

    // Calculate API percentiles
    this.metrics.api.p50 = +this.calculatePercentile(
      this.metrics.api.responseTimeHistory,
      0.5,
    ).toFixed(2);
    this.metrics.api.p95 = +this.calculatePercentile(
      this.metrics.api.responseTimeHistory,
      0.95,
    ).toFixed(2);
    this.metrics.api.p99 = +this.calculatePercentile(
      this.metrics.api.responseTimeHistory,
      0.99,
    ).toFixed(2);

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
      .map((s) => s.avgTime)
      .filter((t) => t > 0);

    if (allTimes.length > 0) {
      this.metrics.api.avgResponseTime = +(
        allTimes.reduce((a, b) => a + b, 0) / allTimes.length
      ).toFixed(2);
    }

    // Update SLI compliance after each API request
    this.updateSLICompliance();

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
        slowTickPercentage: +(
          (this.metrics.gameLoop.slowTicks /
            this.metrics.gameLoop.tickTimeHistory.length) *
          100
        ).toFixed(1),
      },
      system: {
        memoryUsageMB: this.metrics.system.memoryUsageMB,
        cpuUsage: this.metrics.system.cpuUsage,
        uptime: this.metrics.system.uptime,
      },
      game: {
        totalPlayers:
          this.metrics.gameState.playerCount + this.metrics.gameState.botCount,
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
