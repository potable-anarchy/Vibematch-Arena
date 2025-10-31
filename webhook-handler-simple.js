#!/usr/bin/env node

/**
 * GitHub Webhook Handler for Auto-Deployment (Simplified)
 *
 * This version doesn't pull from git - instead it rebuilds from the
 * existing local files that are synced via rsync or deployment script.
 * Trigger deployment by pushing to GitHub, which will trigger webhook,
 * then sync files separately if needed.
 */

import express from 'express';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.WEBHOOK_PORT || 9000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'vibematch-webhook-secret-2025';
const PROJECT_DIR = process.env.PROJECT_DIR || '/home/brad/vibematch-arena';
const CONTAINER_NAME = 'vibematch-arena-app';
const IMAGE_NAME = 'vibematch-arena:latest';

// Middleware
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

/**
 * Verify GitHub webhook signature
 */
function verifySignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

/**
 * Execute deployment
 */
async function deploy() {
  console.log('🚀 Starting deployment...');
  const startTime = Date.now();

  try {
    // Step 1: Build new Docker image
    console.log('🏗️  Building Docker image...');
    const { stdout: buildOutput } = await execAsync(`cd ${PROJECT_DIR} && docker build -t ${IMAGE_NAME} .`, {
      timeout: 300000 // 5 minutes
    });
    console.log('✅ Docker image built successfully');

    // Step 2: Stop old container
    console.log('🛑 Stopping old container...');
    try {
      await execAsync(`docker stop ${CONTAINER_NAME}`, { timeout: 30000 });
      await execAsync(`docker rm ${CONTAINER_NAME}`, { timeout: 10000 });
      console.log('✅ Old container removed');
    } catch (err) {
      console.log('ℹ️  No existing container to stop');
    }

    // Step 3: Start new container
    console.log('▶️  Starting new container...');
    await execAsync(`docker run -d \
      --name ${CONTAINER_NAME} \
      --restart unless-stopped \
      -p 5500:5500 \
      -e NODE_ENV=production \
      -e PORT=5500 \
      ${IMAGE_NAME}`, {
      timeout: 30000
    });
    console.log('✅ New container started');

    // Step 4: Verify
    const { stdout: status } = await execAsync(`docker ps --filter name=${CONTAINER_NAME} --format "{{.Status}}"`, {
      timeout: 5000
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Deployment completed in ${duration}s`);
    console.log(`📊 Container status: ${status.trim()}`);

    return {
      success: true,
      duration,
      status: status.trim()
    };
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    throw error;
  }
}

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'vibematch-arena-webhook',
    uptime: process.uptime()
  });
});

/**
 * GitHub webhook
 */
app.post('/webhook', async (req, res) => {
  console.log('\n📨 Received webhook request');

  // Verify signature
  if (!verifySignature(req)) {
    console.error('❌ Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.headers['x-github-event'];
  const payload = req.body;

  console.log(`📋 Event: ${event}`);
  console.log(`📦 Repo: ${payload.repository?.full_name}`);
  console.log(`🌿 Branch: ${payload.ref}`);

  // Only deploy on push to main
  if (event !== 'push' || payload.ref !== 'refs/heads/main') {
    console.log('ℹ️  Ignoring event');
    return res.json({ message: 'Event ignored' });
  }

  // Respond immediately
  res.json({ message: 'Deployment started' });

  // Deploy asynchronously
  try {
    const result = await deploy();
    console.log('✅ Deployment successful:', result);
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
  }
});

/**
 * Manual deploy endpoint
 */
app.post('/deploy', async (req, res) => {
  const secret = req.query.secret;

  if (secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid secret' });
  }

  console.log('\n🔧 Manual deployment triggered');

  try {
    const result = await deploy();
    res.json({
      success: true,
      message: 'Deployment completed',
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🎮 Vibematch-Arena Webhook Handler');
  console.log('================================');
  console.log(`📡 Listening on port ${PORT}`);
  console.log(`📁 Project directory: ${PROJECT_DIR}`);
  console.log(`🔐 Webhook secret configured: ${WEBHOOK_SECRET !== 'change-me-in-production' ? '✅' : '⚠️'}`);
  console.log('================================\n');
  console.log('⚠️  NOTE: Files must be synced separately before webhook deployment');
  console.log('   Use: rsync or deployment script to sync files from GitHub\n');
});

process.on('SIGTERM', () => {
  console.log('👋 Shutting down...');
  process.exit(0);
});
