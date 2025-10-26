# Troubleshooting Guide

Common issues and solutions for Vibematch Arena.

## Table of Contents

- [Server Issues](#server-issues)
- [Client Issues](#client-issues)
- [Mod System Issues](#mod-system-issues)
- [Docker Issues](#docker-issues)
- [Deployment Issues](#deployment-issues)
- [Performance Issues](#performance-issues)
- [Network Issues](#network-issues)

## Server Issues

### Server Won't Start

**Symptom:** Server crashes immediately or won't start

**Possible Causes:**

1. **Port already in use**

```bash
# Check if port 5500 is in use
lsof -i :5500

# Kill the process using the port
kill -9 <PID>
```

2. **Missing dependencies**

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

3. **Node version incompatibility**

```bash
# Check Node version (requires 18+)
node --version

# If wrong version, install correct one
nvm install 18
nvm use 18
```

---

### Server Crashes Repeatedly

**Symptom:** Server starts but crashes during gameplay

**Check:**

1. **View error logs**

```bash
# If using Docker
docker-compose logs game-server

# If using Node.js
# Check terminal output
```

2. **Common errors:**

**Error: Cannot find module**
```bash
# Solution: Install missing dependencies
npm install
```

**Error: Redis connection failed**
```bash
# Solution: Start Redis or disable Redis features
# Check REDIS_URL in .env file
redis-cli ping  # Should return PONG
```

**Error: Out of memory**
```bash
# Solution: Increase Node memory limit
node --max-old-space-size=4096 server.js
```

---

### Players Can't Connect

**Symptom:** Server running but players can't join

**Checks:**

1. **Verify server is listening**

```bash
curl http://localhost:5500
# Should return HTML content
```

2. **Check firewall**

```bash
# Allow port 5500
sudo ufw allow 5500
```

3. **Check WebSocket connection**

Open browser console (F12) and look for:
```
WebSocket connection to 'ws://localhost:5500' failed
```

**Solution:** Ensure Socket.io is properly configured and CORS is enabled.

---

## Client Issues

### Game Won't Load

**Symptom:** Blank page or endless loading

**Checks:**

1. **Browser console errors**

Press F12, check Console tab for errors:

**Common errors:**

```
Failed to load resource: net::ERR_CONNECTION_REFUSED
```
**Solution:** Server is not running. Start the server.

```
Uncaught SyntaxError: Unexpected token
```
**Solution:** JavaScript file corrupted. Clear cache and reload.

2. **Clear browser cache**

- Chrome: Ctrl+Shift+Delete → Clear cache
- Firefox: Ctrl+Shift+Delete → Clear cache
- Or hard refresh: Ctrl+F5

3. **Try different browser**

Test in Chrome, Firefox, or Edge to isolate browser-specific issues.

---

### Low FPS / Stuttering

**Symptom:** Game runs slowly, choppy framerate

**Solutions:**

1. **Disable resource-intensive mods**

Press ` (backtick) and unload performance-heavy mods:
- performance-hud.js
- minimap-v2.js
- Multiple visual effect mods

2. **Check browser performance**

Press F12 → Performance tab → Record → Stop

Look for:
- Long tasks (>50ms)
- Memory leaks (constantly increasing memory)
- Excessive garbage collection

3. **Reduce browser load**

- Close other tabs
- Disable browser extensions
- Update graphics drivers

4. **Check network latency**

Press F12 → Network tab

High latency can cause perceived stuttering.

---

### Input Lag / Controls Not Responding

**Symptom:** Delayed response to keyboard/mouse input

**Checks:**

1. **Network latency**

High ping causes input lag. Check server logs for latency metrics.

2. **Browser performance**

Background processes can steal input events. Close other applications.

3. **Input blocked by mod**

Some mods may interfere with input. Disable all mods and test.

---

### Visual Glitches

**Symptom:** Weird graphics, missing sprites, artifacts

**Solutions:**

1. **Clear canvas state**

Likely caused by mods not restoring context:

Press ` → Unload all mods → Reload page

2. **Check console for errors**

Look for rendering errors in F12 console.

3. **Update browser**

Old browsers may have Canvas API bugs.

---

## Mod System Issues

### Mod Won't Load

**Symptom:** "Error loading mod" message

**Checks:**

1. **Syntax errors**

Open browser console (F12) and check for:
```
SyntaxError: Unexpected token
```

**Solution:** Fix JavaScript syntax. Common issues:
- Missing semicolons
- Unclosed brackets/parentheses
- Typos in function names

2. **API errors**

```
ReferenceError: registerHook is not defined
```

**Solution:** Ensure you're using correct API. See [API_REFERENCE.md](API_REFERENCE.md)

3. **File not found**

```
Failed to load mod file: 404
```

**Solution:**
- Check file exists in `public/mods/`
- Check filename in `mods.json` matches actual file
- Check file permissions (readable)

---

### Mod Causes Game to Freeze

**Symptom:** Game hangs when mod is loaded

**Causes:**

1. **Infinite loop**

```javascript
// BAD: Infinite loop freezes browser
registerHook('onRender', (ctx) => {
  while (true) {  // NEVER DO THIS
    // ...
  }
});
```

**Solution:** Remove infinite loops. Use time-based checks instead.

2. **Heavy computation**

```javascript
// BAD: Too expensive for 60 FPS
registerHook('onRender', (ctx) => {
  for (let i = 0; i < 1000000; i++) {
    expensiveCalculation();
  }
});
```

**Solution:** Throttle expensive operations or move to event hooks.

3. **Memory leak**

```javascript
// BAD: Unbounded growth
let particles = [];
registerHook('onShoot', (data) => {
  particles.push(data); // Grows forever!
});
```

**Solution:** Limit array sizes or clean up old entries.

---

### Mod Errors After Reload

**Symptom:** Mod works first time, fails after reload

**Cause:** State corruption from previous load

**Solution:**

1. **Refresh page** before reloading mod
2. **Add initialization code:**

```javascript
// Reset state on reload
let myState = null;

function initialize() {
  myState = {
    counter: 0,
    data: []
  };
}

initialize();
```

---

### Hooks Not Firing

**Symptom:** registerHook called but callback never runs

**Checks:**

1. **Verify hook name spelling**

```javascript
// WRONG
registerHook('onKills', callback);  // Typo!

// CORRECT
registerHook('onKill', callback);
```

Valid hooks:
- onHit
- onKill
- onShoot
- onPickup
- onPlayerDraw
- onRender
- onUpdate (not currently invoked)

2. **Check event is actually happening**

Add console.log to verify:

```javascript
registerHook('onKill', (killerId, victimId) => {
  console.log('Kill event fired!');
});
```

3. **Verify mod loaded successfully**

Check for success message in console:
```
✅ Mod loaded: <mod-name>
```

---

## Docker Issues

### Container Won't Start

**Symptom:** `docker-compose up` fails

**Checks:**

1. **View error logs**

```bash
docker-compose logs
```

2. **Check Docker daemon**

```bash
docker ps
# If error, restart Docker Desktop
```

3. **Port conflicts**

```bash
# Check if port is in use
lsof -i :5500

# Stop conflicting service
docker-compose down
```

---

### Container Starts but Can't Connect

**Symptom:** Container running but http://localhost:5500 doesn't work

**Checks:**

1. **Verify container is running**

```bash
docker-compose ps
# Should show "Up" status
```

2. **Check port mapping**

```bash
docker-compose ps
# Verify 0.0.0.0:5500->5500/tcp
```

3. **View container logs**

```bash
docker-compose logs -f game-server
# Should show "Server listening on *:5500"
```

4. **Test from inside container**

```bash
docker-compose exec game-server sh
curl localhost:5500
```

---

### Docker Build Fails

**Symptom:** `docker-compose build` errors

**Common errors:**

```
Error: Cannot find module 'express'
```

**Solution:** Dependencies not installed in container

```dockerfile
# Ensure Dockerfile has:
RUN npm install
```

```
COPY failed: no source files
```

**Solution:** .dockerignore is excluding needed files

Check `.dockerignore` doesn't exclude:
- server.js
- public/
- package.json

---

### Docker Out of Space

**Symptom:** "No space left on device"

**Solution:**

```bash
# Remove unused images and containers
docker system prune -af

# Remove unused volumes
docker volume prune

# Check disk usage
docker system df
```

---

## Deployment Issues

### Blue-Green Deployment Fails

**Symptom:** Deploy script fails during container switch

**Checks:**

1. **View deploy logs**

```bash
tail -f /var/log/deploy.log
```

2. **Health check failing**

```bash
# Manually test health endpoint
curl http://localhost:5500/health
```

**Solution:** Fix health check implementation or increase timeout.

3. **Nginx reload fails**

```bash
# Test nginx config
sudo nginx -t

# If errors, check config file
cat /etc/nginx/sites-available/vibematch
```

---

### Redis State Not Persisting

**Symptom:** Players/bots reset after deployment

**Checks:**

1. **Redis connection**

```bash
redis-cli ping
# Should return PONG
```

2. **Check Redis data**

```bash
redis-cli GET vibematch:players
redis-cli GET vibematch:bots
```

3. **Check TTL**

```bash
redis-cli TTL vibematch:players
# Should show seconds remaining (300 = 5 minutes)
```

**Solution:** Ensure state sync is happening:

```bash
# Check server logs for:
docker logs vibematch-blue | grep "State saved"
```

---

### Cloudflare Tunnel Issues

**Symptom:** Can't access game via public URL

**Checks:**

1. **Tunnel status**

```bash
docker logs cloudflared
# Should show "Registered tunnel connection"
```

2. **Tunnel token**

```bash
# Verify TUNNEL_TOKEN in .env
cat .env | grep TUNNEL_TOKEN
```

3. **Cloudflare dashboard**

Check https://one.dash.cloudflare.com/ → Tunnels
- Tunnel should show "Healthy"
- Public hostname configured correctly

---

## Performance Issues

### High Server CPU Usage

**Symptom:** Server using 100% CPU

**Checks:**

1. **Too many players/bots**

```bash
# Check active players
curl http://localhost:5500/api/stats
```

**Solution:** Reduce max players or bot count in server.js

2. **Performance profiling**

```javascript
// Add to server.js
import performanceMonitor from './performance-monitor.js';
performanceMonitor.track('gameLoop', () => {
  // Game loop code
});
```

3. **Check for infinite loops**

Review recent code changes for loops without exit conditions.

---

### High Memory Usage

**Symptom:** Memory constantly increasing

**Checks:**

1. **Memory leak detection**

```bash
# Monitor memory
docker stats vibematch-blue
```

2. **Check for unbounded arrays**

Common leaks:
- `projectiles` array not cleaned up
- `soundEvents` accumulating
- Mod state growing unbounded

**Solution:** Add cleanup logic:

```javascript
// Example cleanup
if (gameState.projectiles.length > 1000) {
  gameState.projectiles = gameState.projectiles.slice(-500);
}
```

---

### Network Bandwidth Too High

**Symptom:** High network usage, slow connections

**Checks:**

1. **State broadcast size**

```javascript
// Check state size
console.log(JSON.stringify(gameState).length);
```

**Solution:** Reduce broadcast frequency or compress data.

2. **Too many projectiles**

Limit projectile lifetime or max count.

---

## Network Issues

### High Latency / Lag

**Symptom:** Delayed actions, rubber-banding

**Checks:**

1. **Network latency**

```bash
# Ping server
ping your-server-ip
```

2. **Server location**

Players far from server will have high latency. Consider multiple server regions.

3. **Server overload**

Check CPU/memory usage. Overloaded server causes lag.

---

### Disconnections

**Symptom:** Players randomly disconnect

**Checks:**

1. **WebSocket timeout**

Increase timeout in server.js:

```javascript
const io = new Server(httpServer, {
  pingTimeout: 60000,  // Increase from default
  pingInterval: 25000
});
```

2. **Network stability**

Check for packet loss:
```bash
ping -c 100 your-server-ip
# Should show 0% packet loss
```

3. **Firewall dropping connections**

Check firewall logs for dropped WebSocket connections.

---

### Can't Connect from External Network

**Symptom:** Works on localhost, not from internet

**Checks:**

1. **Firewall rules**

```bash
# Allow port 5500
sudo ufw allow 5500

# Check status
sudo ufw status
```

2. **Port forwarding**

If behind NAT, configure port forwarding in router.

3. **Cloudflare tunnel**

Use Cloudflare tunnel for easy external access (see DEPLOYMENT.md).

---

## Quick Diagnostics

### Full System Health Check

```bash
#!/bin/bash

echo "=== System Health Check ==="

echo "1. Server running?"
curl -s http://localhost:5500 > /dev/null && echo "✅ Server accessible" || echo "❌ Server not responding"

echo "2. Redis running?"
redis-cli ping > /dev/null 2>&1 && echo "✅ Redis accessible" || echo "❌ Redis not responding"

echo "3. Docker containers?"
docker ps --filter name=vibematch

echo "4. Disk space?"
df -h | grep -E '^/dev/'

echo "5. Memory usage?"
free -h

echo "6. CPU load?"
uptime

echo "=== End Health Check ==="
```

Save as `health-check.sh`, make executable, and run:

```bash
chmod +x health-check.sh
./health-check.sh
```

---

## Getting Help

If none of these solutions work:

1. **Check browser console** (F12) for client errors
2. **Check server logs** for server errors
3. **Review recent changes** - what changed before issue started?
4. **Test with mods disabled** - disable all mods and retry
5. **Try different browser** - isolate browser-specific issues
6. **Check documentation:**
   - [GETTING_STARTED.md](GETTING_STARTED.md)
   - [DEPLOYMENT.md](DEPLOYMENT.md)
   - [API_REFERENCE.md](API_REFERENCE.md)
   - [GAME_MECHANICS.md](GAME_MECHANICS.md)

---

## Common Error Messages

### "WebSocket connection failed"

**Cause:** Server not running or port blocked

**Solution:**
```bash
# Start server
docker-compose up -d

# Or if using Node.js
npm start
```

### "Failed to load resource: 404"

**Cause:** Missing file

**Solution:** Verify file exists and path is correct

### "Mod compilation error"

**Cause:** JavaScript syntax error

**Solution:** Check console for line number, fix syntax

### "Player ID not found"

**Cause:** Player disconnected or died

**Solution:** Add null check:
```javascript
const player = game.getState().players.find(p => p.id === id);
if (!player) return;
```

### "Cannot read property 'x' of undefined"

**Cause:** Accessing property of null/undefined object

**Solution:** Add defensive checks:
```javascript
if (obj && obj.x) {
  // Safe to use obj.x
}
```

---

## Debug Mode

Enable debug logging:

```javascript
// In server.js or client code
const DEBUG = true;

if (DEBUG) {
  console.log('Debug:', data);
}
```

Browser debug tools:
- F12 → Console: View logs
- F12 → Network: Monitor requests
- F12 → Performance: Profile performance
- F12 → Sources: Debug JavaScript

---

## Performance Profiling

### Client-Side

```javascript
// Add to mod
const start = performance.now();
// ... your code
const elapsed = performance.now() - start;
console.log(`Execution time: ${elapsed.toFixed(2)}ms`);
```

### Server-Side

```javascript
// Add to server.js
console.time('gameLoop');
// ... game loop code
console.timeEnd('gameLoop');
```

---

## Recovery Procedures

### Nuclear Option: Full Reset

If all else fails:

```bash
# Stop everything
docker-compose down

# Remove all data
docker system prune -af
docker volume prune -f

# Clear Redis
redis-cli FLUSHALL

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

**Warning:** This deletes ALL data including mod database.

---

## Preventive Measures

1. **Regular backups** of mod database
2. **Monitor logs** for warnings
3. **Test mods** before deploying
4. **Update dependencies** regularly
5. **Set up monitoring** for production
6. **Use health checks** for deployment
7. **Version control** for code changes
8. **Document changes** in commit messages

---

## See Also

- [DEPLOYMENT.md](DEPLOYMENT.md) - Production troubleshooting
- [GETTING_STARTED.md](GETTING_STARTED.md) - Setup issues
- [MOD_DEVELOPMENT.md](MOD_DEVELOPMENT.md) - Mod development issues
- [API_REFERENCE.md](API_REFERENCE.md) - API usage issues
