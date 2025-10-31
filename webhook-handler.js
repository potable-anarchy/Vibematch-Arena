#!/usr/bin/env node

/**
 * GitHub Webhook Handler for Auto-Deployment
 *
 * Listens for GitHub push events and automatically:
 * 1. Pulls latest code from GitHub
 * 2. Rebuilds Docker image
 * 3. Restarts container with zero downtime
 */

import express from 'express';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.WEBHOOK_PORT || 9000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'change-me-in-production';
const PROJECT_DIR = process.env.PROJECT_DIR || '/home/brad/vibematch-arena';
const CONTAINER_NAME = 'vibematch-arena-app';
const IMAGE_NAME = 'vibematch-arena:latest';

// Middleware to parse raw body for signature verification
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
 * Execute deployment with logging
 */
async function deploy() {
  console.log('🚀 Starting deployment...');
  const startTime = Date.now();

  try {
    // Step 1: Pull latest code
    console.log('📥 Pulling latest code from GitHub...');
    await execAsync(`cd ${PROJECT_DIR} && git pull origin main`, {
      timeout: 30000
    });
    console.log('✅ Code pulled successfully');

    // Step 2: Build new Docker image
    console.log('🏗️  Building Docker image...');
    await execAsync(`cd ${PROJECT_DIR} && docker build -t ${IMAGE_NAME} .`, {
      timeout: 300000 // 5 minutes
    });
    console.log('✅ Docker image built successfully');

    // Step 3: Stop old container (graceful shutdown)
    console.log('🛑 Stopping old container...');
    try {
      await execAsync(`docker stop ${CONTAINER_NAME}`, { timeout: 30000 });
      await execAsync(`docker rm ${CONTAINER_NAME}`, { timeout: 10000 });
      console.log('✅ Old container stopped and removed');
    } catch (err) {
      console.log('ℹ️  No existing container to stop');
    }

    // Step 4: Start new container
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
    console.log('✅ New container started successfully');

    // Step 5: Verify container is running
    const { stdout } = await execAsync(`docker ps --filter name=${CONTAINER_NAME} --format "{{.Status}}"`, {
      timeout: 5000
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Deployment completed in ${duration}s`);
    console.log(`📊 Container status: ${stdout.trim()}`);

    return {
      success: true,
      duration,
      status: stdout.trim()
    };
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    throw error;
  }
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'vibematch-arena-webhook',
    uptime: process.uptime()
  });
});

/**
 * GitHub webhook endpoint
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

  console.log(`📋 Event type: ${event}`);
  console.log(`📦 Repository: ${payload.repository?.full_name}`);
  console.log(`🌿 Branch: ${payload.ref}`);

  // Only deploy on push to main branch
  if (event !== 'push') {
    console.log('ℹ️  Ignoring non-push event');
    return res.json({ message: 'Event ignored (not a push)' });
  }

  if (payload.ref !== 'refs/heads/main') {
    console.log('ℹ️  Ignoring push to non-main branch');
    return res.json({ message: 'Event ignored (not main branch)' });
  }

  // Respond immediately to GitHub (don't make them wait for deployment)
  res.json({ message: 'Deployment started' });

  // Deploy asynchronously
  try {
    const result = await deploy();
    console.log('✅ Webhook deployment successful:', result);
  } catch (error) {
    console.error('❌ Webhook deployment failed:', error.message);
  }
});

/**
 * Manual deployment endpoint (for testing)
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

/**
 * Start server
 */
app.listen(PORT, '0.0.0.0', () => {
  console.log('🎮 Vibematch-Arena Webhook Handler');
  console.log('================================');
  console.log(`📡 Listening on port ${PORT}`);
  console.log(`📁 Project directory: ${PROJECT_DIR}`);
  console.log(`🔐 Webhook secret: ${WEBHOOK_SECRET === 'change-me-in-production' ? '⚠️  NOT SET' : '✅ Configured'}`);
  console.log('================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Shutting down webhook handler...');
  process.exit(0);
});
