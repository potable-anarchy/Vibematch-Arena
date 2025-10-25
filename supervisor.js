#!/usr/bin/env node
// Server Supervisor - Auto-restarts server on crash
// Keeps the game server alive at all costs!

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVER_PATH = join(__dirname, 'server.js');
const MAX_RESTART_DELAY = 10000; // 10 seconds max
const MIN_RESTART_DELAY = 1000; // 1 second min

let restartCount = 0;
let lastCrash = Date.now();
let serverProcess = null;

function startServer() {
  console.log(`🚀 Starting server (restart #${restartCount})...`);

  serverProcess = spawn('node', [SERVER_PATH], {
    stdio: 'inherit',
    env: process.env
  });

  serverProcess.on('exit', (code, signal) => {
    const now = Date.now();
    const timeSinceLastCrash = now - lastCrash;
    lastCrash = now;

    console.error(`❌ Server exited with code ${code} (signal: ${signal})`);

    // Reset restart count if server ran for more than 60 seconds
    if (timeSinceLastCrash > 60000) {
      restartCount = 0;
    } else {
      restartCount++;
    }

    // Calculate exponential backoff delay
    const delay = Math.min(
      MAX_RESTART_DELAY,
      MIN_RESTART_DELAY * Math.pow(1.5, Math.min(restartCount, 10))
    );

    console.log(`⏱️  Restarting in ${(delay / 1000).toFixed(1)}s...`);

    setTimeout(() => {
      startServer();
    }, delay);
  });

  serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
    setTimeout(() => {
      startServer();
    }, MIN_RESTART_DELAY);
  });
}

// Handle supervisor signals
process.on('SIGINT', () => {
  console.log('\n⚠️  Supervisor received SIGINT - shutting down...');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Supervisor received SIGTERM - shutting down...');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  process.exit(0);
});

console.log('👁️  Server Supervisor Started');
console.log('📋 Server will auto-restart on crashes');
console.log('🛑 Press Ctrl+C to stop supervisor and server\n');

startServer();
