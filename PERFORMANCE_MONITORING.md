# Performance Monitoring System

## Overview

The server now includes a comprehensive real-time performance monitoring system that tracks game loop performance, system resources, network metrics, and API endpoint performance.

## Features

### 1. Performance Metrics Collector (`performance-monitor.js`)
- **Game Loop Metrics**: Tick time, tick rate, slow tick detection
- **System Metrics**: Memory usage, CPU usage, uptime
- **Network Metrics**: Messages/sec, bytes/sec, active connections
- **Game State**: Player counts, bot counts, projectile counts
- **API Metrics**: Request counts, response times, error rates per endpoint

### 2. API Endpoints

#### GET /api/metrics
Returns complete metrics data including historical data for the last 60 seconds.

**Example Response:**
```json
{
  "gameLoop": {
    "tickTime": 0.43,
    "avgTickTime": 0.43,
    "maxTickTime": 1.2,
    "ticksPerSecond": 60,
    "slowTicks": 0
  },
  "system": {
    "memoryUsageMB": 86,
    "cpuUsage": 15,
    "uptime": 120
  },
  "gameState": {
    "playerCount": 2,
    "botCount": 8,
    "projectileCount": 5,
    "pickupCount": 15
  },
  "network": {
    "activeConnections": 2,
    "messagesPerSecond": 30,
    "bytesPerSecond": 70000
  }
}
```

#### GET /api/metrics/summary
Returns a summarized view of key metrics.

**Example Response:**
```json
{
  "gameLoop": {
    "avgTickTime": 0.43,
    "ticksPerSecond": 60,
    "slowTickPercentage": 0
  },
  "system": {
    "memoryUsageMB": 86,
    "cpuUsage": 15,
    "uptime": 120
  },
  "game": {
    "totalPlayers": 10,
    "humanPlayers": 2,
    "projectiles": 5
  },
  "network": {
    "connections": 2,
    "messagesPerSecond": 30,
    "bytesPerSecond": 70000
  }
}
```

### 3. Live Performance Dashboard

Access the performance dashboard at: **http://localhost:5500/performance.html**

The dashboard provides:
- **Real-time metrics** updated every second via WebSocket
- **Historical charts** showing:
  - Tick time over the last 60 seconds
  - Memory usage over time
  - Player count over time
- **API endpoint performance table** showing request counts, average response times, and error counts
- **Color-coded warnings** when metrics exceed thresholds:
  - 🟢 Green: Normal operation
  - 🟡 Yellow: Warning threshold
  - 🔴 Red: Danger threshold

### 4. WebSocket Real-Time Streaming

Connect to the `/performance` namespace for real-time metrics:

```javascript
const socket = io('/performance');

socket.on('metrics', (metrics) => {
  console.log('Current metrics:', metrics);
});
```

Metrics are broadcast every second to all connected performance monitors.

## Performance Thresholds

### Game Loop
- **Normal**: < 16.67ms per tick (60 FPS)
- **Warning**: 16.67ms - 20ms per tick
- **Danger**: > 20ms per tick

### System Resources
- **Memory Warning**: > 500 MB
- **Memory Danger**: > 1000 MB
- **CPU Warning**: > 70%
- **CPU Danger**: > 90%

## Integration

The monitoring system is integrated throughout the server:

1. **Game Loop**: Records tick time and game state every frame
2. **API Endpoints**: Tracks request/response times for all HTTP endpoints
3. **Network**: Monitors Socket.IO connections and message throughput
4. **System**: Collects OS-level metrics (memory, CPU)

## Usage

### Viewing Metrics in Development
1. Start the server: `npm start`
2. Open the dashboard: http://localhost:5500/performance.html
3. Monitor real-time performance as players connect and play

### API Integration
Use the `/api/metrics` endpoint to integrate with external monitoring tools:

```bash
# Check current performance
curl http://localhost:5500/api/metrics/summary

# Get full metrics with history
curl http://localhost:5500/api/metrics
```

### Identifying Performance Issues

1. **Slow Ticks**: If `avgTickTime` exceeds 16.67ms, the game loop is struggling
   - Check `projectileCount` - too many projectiles cause collision detection overhead
   - Check `playerCount` + `botCount` - too many entities slow down the game

2. **High Memory Usage**: If memory usage grows continuously, there may be a memory leak
   - Monitor `memoryUsageMB` over time
   - Check if memory returns to baseline after player disconnect

3. **Network Bottlenecks**: If `bytesPerSecond` is very high, state updates may be too large
   - Consider reducing update frequency
   - Optimize state serialization

4. **API Performance**: Check the endpoint table for slow or failing endpoints
   - High `avgTime` indicates slow endpoint
   - Non-zero `errors` indicates failing requests

## Files

- `performance-monitor.js` - Core metrics collection module
- `public/performance.html` - Live dashboard UI
- `server.js` - Integration points throughout the server code

## Future Enhancements

Potential improvements:
- Export metrics to time-series database (InfluxDB, Prometheus)
- Alert system for threshold breaches
- Historical data persistence
- Distributed tracing for multi-server setups
- Custom metric definitions
