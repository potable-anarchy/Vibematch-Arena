// Performance Monitoring Debug HUD
// Tracks FPS, memory usage, render performance, and detects memory leaks

const PerformanceHUD = {
  enabled: false,

  // Metrics tracking
  metrics: {
    fps: 0,
    frameTime: 0,
    minFps: Infinity,
    maxFps: 0,
    avgFps: 0,

    // Frame timing
    frameTimes: [],
    maxFrameTimeSamples: 60,

    // Render metrics
    objectsRendered: {
      players: 0,
      projectiles: 0,
      pickups: 0,
      particles: 0,
      total: 0
    },

    // Memory tracking for leak detection
    memorySnapshots: [],
    maxMemorySnapshots: 120, // 2 minutes at 60fps
    memoryTrend: 'stable',
    potentialLeak: false,

    // Network
    socketLatency: 0,
    messageRate: 0,
    messagesReceived: 0,
    lastMessageCount: 0,
    lastMessageTime: Date.now(),

    // Performance budget tracking
    slowFrames: 0,
    totalFrames: 0,
    performanceScore: 100
  },

  // Visual settings
  hudWidth: 280,
  hudHeight: 320,
  hudPadding: 10,
  lineHeight: 16,

  // Memory leak detection
  detectMemoryLeak() {
    const snapshots = this.metrics.memorySnapshots;
    if (snapshots.length < 60) return; // Need at least 60 samples

    // Check if memory is consistently increasing
    const recent = snapshots.slice(-60);
    const older = snapshots.slice(-120, -60);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const increase = recentAvg - olderAvg;
    const increasePercent = (increase / olderAvg) * 100;

    // If memory increased by more than 10% and is trending up
    if (increasePercent > 10) {
      const trend = recent.slice(-30);
      const increases = trend.reduce((count, val, i) => {
        if (i > 0 && val > trend[i - 1]) count++;
        return count;
      }, 0);

      // If more than 70% of recent samples are increasing
      if (increases / trend.length > 0.7) {
        this.metrics.potentialLeak = true;
        this.metrics.memoryTrend = 'increasing';
        return;
      }
    }

    this.metrics.potentialLeak = false;
    if (increasePercent > 5) {
      this.metrics.memoryTrend = 'slightly increasing';
    } else if (increasePercent < -5) {
      this.metrics.memoryTrend = 'decreasing';
    } else {
      this.metrics.memoryTrend = 'stable';
    }
  },

  update(dt, gameState) {
    if (!this.enabled) return;

    // FPS calculation
    const currentFps = Math.round(1 / dt);
    this.metrics.fps = currentFps;
    this.metrics.frameTime = dt * 1000; // Convert to ms

    // Track frame times
    this.metrics.frameTimes.push(this.metrics.frameTime);
    if (this.metrics.frameTimes.length > this.metrics.maxFrameTimeSamples) {
      this.metrics.frameTimes.shift();
    }

    // Calculate average FPS
    const avgFrameTime = this.metrics.frameTimes.reduce((a, b) => a + b, 0) / this.metrics.frameTimes.length;
    this.metrics.avgFps = Math.round(1000 / avgFrameTime);

    // Track min/max FPS
    this.metrics.minFps = Math.min(this.metrics.minFps, currentFps);
    this.metrics.maxFps = Math.max(this.metrics.maxFps, currentFps);

    // Performance budget (60 FPS = 16.67ms per frame)
    this.metrics.totalFrames++;
    if (this.metrics.frameTime > 16.67) {
      this.metrics.slowFrames++;
    }
    this.metrics.performanceScore = Math.round((1 - this.metrics.slowFrames / this.metrics.totalFrames) * 100);

    // Count rendered objects from game state
    if (gameState) {
      this.metrics.objectsRendered.players = gameState.players ? gameState.players.length : 0;
      this.metrics.objectsRendered.projectiles = gameState.projectiles ? gameState.projectiles.length : 0;
      this.metrics.objectsRendered.pickups = gameState.pickups ? gameState.pickups.length : 0;
      this.metrics.objectsRendered.particles = window.particles ? window.particles.length : 0;
      this.metrics.objectsRendered.total =
        this.metrics.objectsRendered.players +
        this.metrics.objectsRendered.projectiles +
        this.metrics.objectsRendered.pickups +
        this.metrics.objectsRendered.particles;
    }

    // Memory tracking (estimate based on object counts)
    const estimatedMemory =
      (this.metrics.objectsRendered.players * 5) + // ~5KB per player
      (this.metrics.objectsRendered.projectiles * 1) + // ~1KB per projectile
      (this.metrics.objectsRendered.pickups * 2) + // ~2KB per pickup
      (this.metrics.objectsRendered.particles * 0.5); // ~0.5KB per particle

    this.metrics.memorySnapshots.push(estimatedMemory);
    if (this.metrics.memorySnapshots.length > this.metrics.maxMemorySnapshots) {
      this.metrics.memorySnapshots.shift();
    }

    // Run leak detection every 60 frames
    if (this.metrics.totalFrames % 60 === 0) {
      this.detectMemoryLeak();
    }

    // Message rate calculation
    const now = Date.now();
    if (now - this.metrics.lastMessageTime > 1000) {
      this.metrics.messageRate = this.metrics.messagesReceived - this.metrics.lastMessageCount;
      this.metrics.lastMessageCount = this.metrics.messagesReceived;
      this.metrics.lastMessageTime = now;
    }
  },

  drawGraph(ctx, x, y, width, height, data, color, maxValue) {
    // Draw graph background
    ctx.fillStyle = 'rgba(20, 20, 20, 0.8)';
    ctx.fillRect(x, y, width, height);

    // Draw border
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Draw data
    if (data.length < 2) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const step = width / (data.length - 1);
    data.forEach((value, i) => {
      const px = x + i * step;
      const py = y + height - (value / maxValue) * height;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    });

    ctx.stroke();

    // Draw max line
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.1);
    ctx.lineTo(x + width, y + height * 0.1);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  render(ctx, x, y) {
    if (!this.enabled) return;

    const padding = this.hudPadding;
    const lineHeight = this.lineHeight;

    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(x, y, this.hudWidth, this.hudHeight);

    // Draw border
    ctx.strokeStyle = '#66ccff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, this.hudWidth, this.hudHeight);

    // Title
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#66ccff';
    ctx.textAlign = 'left';
    ctx.fillText('PERFORMANCE MONITOR', x + padding, y + padding + 12);

    // Draw divider
    ctx.strokeStyle = '#66ccff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + padding, y + padding + 18);
    ctx.lineTo(x + this.hudWidth - padding, y + padding + 18);
    ctx.stroke();

    let yOffset = y + padding + 32;

    // FPS metrics
    ctx.font = '12px monospace';

    // Color code FPS
    let fpsColor = '#66ff66'; // Green
    if (this.metrics.fps < 60) fpsColor = '#ffaa00'; // Orange
    if (this.metrics.fps < 30) fpsColor = '#ff3366'; // Red

    ctx.fillStyle = fpsColor;
    ctx.fillText(`FPS: ${this.metrics.fps}`, x + padding, yOffset);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`(avg: ${this.metrics.avgFps})`, x + padding + 80, yOffset);
    yOffset += lineHeight;

    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(`Frame: ${this.metrics.frameTime.toFixed(2)}ms`, x + padding, yOffset);
    yOffset += lineHeight;

    ctx.fillText(`Min/Max: ${this.metrics.minFps}/${this.metrics.maxFps}`, x + padding, yOffset);
    yOffset += lineHeight;

    // Performance score
    let scoreColor = '#66ff66';
    if (this.metrics.performanceScore < 90) scoreColor = '#ffaa00';
    if (this.metrics.performanceScore < 70) scoreColor = '#ff3366';

    ctx.fillStyle = scoreColor;
    ctx.fillText(`Score: ${this.metrics.performanceScore}%`, x + padding, yOffset);
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(`(${this.metrics.slowFrames}/${this.metrics.totalFrames} slow)`, x + padding + 95, yOffset);
    yOffset += lineHeight + 4;

    // Frame time graph
    this.drawGraph(
      ctx,
      x + padding,
      yOffset,
      this.hudWidth - padding * 2,
      40,
      this.metrics.frameTimes,
      '#66ccff',
      33.33 // Max 33.33ms (30 FPS minimum)
    );
    yOffset += 45;

    // Objects rendered
    ctx.fillStyle = '#66ccff';
    ctx.fillText('OBJECTS', x + padding, yOffset);
    yOffset += lineHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Players: ${this.metrics.objectsRendered.players}`, x + padding, yOffset);
    ctx.fillText(`Proj: ${this.metrics.objectsRendered.projectiles}`, x + padding + 130, yOffset);
    yOffset += lineHeight;

    ctx.fillText(`Pickups: ${this.metrics.objectsRendered.pickups}`, x + padding, yOffset);
    ctx.fillText(`Part: ${this.metrics.objectsRendered.particles}`, x + padding + 130, yOffset);
    yOffset += lineHeight;

    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(`Total: ${this.metrics.objectsRendered.total}`, x + padding, yOffset);
    yOffset += lineHeight + 4;

    // Memory leak detection
    ctx.fillStyle = '#66ccff';
    ctx.fillText('MEMORY', x + padding, yOffset);
    yOffset += lineHeight;

    const currentMem = this.metrics.memorySnapshots[this.metrics.memorySnapshots.length - 1] || 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`~${currentMem.toFixed(1)} KB`, x + padding, yOffset);

    // Memory trend
    let trendColor = '#66ff66';
    if (this.metrics.memoryTrend.includes('increasing')) trendColor = '#ffaa00';
    if (this.metrics.potentialLeak) trendColor = '#ff3366';

    ctx.fillStyle = trendColor;
    ctx.fillText(this.metrics.memoryTrend, x + padding + 100, yOffset);
    yOffset += lineHeight;

    if (this.metrics.potentialLeak) {
      ctx.fillStyle = '#ff3366';
      ctx.fillText('⚠ POTENTIAL LEAK!', x + padding, yOffset);
      yOffset += lineHeight;
    }

    yOffset += 4;

    // Network metrics
    ctx.fillStyle = '#66ccff';
    ctx.fillText('NETWORK', x + padding, yOffset);
    yOffset += lineHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Messages/sec: ${this.metrics.messageRate}`, x + padding, yOffset);
    yOffset += lineHeight;

    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(`Total: ${this.metrics.messagesReceived}`, x + padding, yOffset);

    // Footer hint
    yOffset = y + this.hudHeight - padding - 2;
    ctx.font = '10px monospace';
    ctx.fillStyle = '#666666';
    ctx.fillText('Toggle: Game Menu > Debug HUD', x + padding, yOffset);
  },

  reset() {
    this.metrics.minFps = Infinity;
    this.metrics.maxFps = 0;
    this.metrics.slowFrames = 0;
    this.metrics.totalFrames = 0;
    this.metrics.frameTimes = [];
    this.metrics.memorySnapshots = [];
    this.metrics.messagesReceived = 0;
    this.metrics.lastMessageCount = 0;
  }
};

// Initialize mod
setTimeout(() => {
  if (!window.modSystem) {
    console.error('❌ Mod system not found!');
    return;
  }

  if (!window.HUDLayoutManager) {
    console.error('❌ HUD Layout Manager not found!');
    return;
  }

  // Register render hook
  window.modSystem.registerHook('onRender', (ctx, camera, dt) => {
    if (!PerformanceHUD.enabled) return;

    // Get game state from window
    const gameState = window.gameState || window.renderState;
    PerformanceHUD.update(dt, gameState);

    // Register with HUD layout manager
    window.HUDLayoutManager.register('performance-hud', {
      position: 'NW',
      priority: 100,
      width: PerformanceHUD.hudWidth,
      height: PerformanceHUD.hudHeight,
      render: (ctx, x, y) => PerformanceHUD.render(ctx, x, y)
    });
  });

  // Track network messages
  if (window.socket) {
    const originalOn = window.socket.on.bind(window.socket);
    window.socket.on = function(event, handler) {
      return originalOn(event, function(...args) {
        PerformanceHUD.metrics.messagesReceived++;
        return handler(...args);
      });
    };
  }

  // Expose toggle function globally
  window.togglePerformanceHUD = function() {
    PerformanceHUD.enabled = !PerformanceHUD.enabled;

    if (PerformanceHUD.enabled) {
      PerformanceHUD.reset();
      console.log('✅ Performance HUD enabled');
    } else {
      // Unregister from HUD layout manager
      if (window.HUDLayoutManager) {
        window.HUDLayoutManager.unregister('performance-hud');
      }
      console.log('❌ Performance HUD disabled');
    }

    return PerformanceHUD.enabled;
  };

  // Keyboard shortcut F3
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F3') {
      e.preventDefault();
      window.togglePerformanceHUD();
    }
  });

  console.log('✅ Performance HUD mod loaded');
  console.log('   Press F3 or use togglePerformanceHUD() to toggle');
  console.log('   Or use the Debug HUD button in the game menu');

}, 500);
