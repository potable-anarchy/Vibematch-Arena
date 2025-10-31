#!/bin/bash

# Create a clean version without Redis

# 1. Remove import line 8
sed -i.bak '8d' server.js

# 2. Remove Redis setup (lines 25-51 in original, now 24-50)
sed -i.bak '24,50d' server.js

# 3. Find and remove "Final sync to Redis" section in shutdown
sed -i.bak '/Final sync to Redis/,+3d' server.js

# 4. Find and remove "Disconnect from Redis" section
sed -i.bak '/Disconnect from Redis/,+2d' server.js

# 5. Find and remove Redis state management section
sed -i.bak '/====== REDIS STATE MANAGEMENT ======/,/====== GRACEFUL SHUTDOWN HANDLER ======/d' server.js

# 6. Find and remove Redis sync in game loop
sed -i.bak '/Sync state to Redis every second/,/Redis sync failed/d' server.js
sed -i.bak '/syncStateToRedis()/d' server.js

# 7. Find and remove Redis restore on startup
sed -i.bak '/Restore state from Redis/,+2d' server.js
sed -i.bak '/restoreStateFromRedis()/d' server.js

# 8. Remove restored players log
sed -i.bak '/players restored from Redis/,+1d' server.js

# Clean up backup files
rm -f server.js.bak*

echo "✓ Redis removal script complete"
