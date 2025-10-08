#!/usr/bin/env node

/**
 * Keep-alive script for Render free tier
 * This script can be used as a backup to Uptime Robot
 * Run with: node scripts/keepalive.js
 */

const https = require('https');
const http = require('http');

const SERVER_URL = process.env.SERVER_URL || 'https://your-app-name.onrender.com';
const PING_INTERVAL = parseInt(process.env.PING_INTERVAL) || 14 * 60 * 1000; // 14 minutes
const HEALTH_ENDPOINT = '/health';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, data: data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function pingServer() {
  try {
    const response = await makeRequest(SERVER_URL + HEALTH_ENDPOINT);
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ✅ Server is alive - Status: ${response.statusCode}`);
    
    // Parse health data if available
    try {
      const healthData = JSON.parse(response.data);
      if (healthData.uptime) {
        console.log(`    📊 Uptime: ${Math.floor(healthData.uptime / 60)} minutes`);
      }
    } catch (e) {
      // Ignore JSON parsing errors
    }
    
    return true;
  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ Failed to ping server:`, error.message);
    return false;
  }
}

async function startKeepAlive() {
  console.log('🚀 Starting keep-alive service');
  console.log(`📡 Target URL: ${SERVER_URL}`);
  console.log(`⏰ Ping interval: ${PING_INTERVAL / 1000 / 60} minutes`);
  console.log('🔄 Starting periodic pings...\n');
  
  // Initial ping
  await pingServer();
  
  // Set up periodic pings
  setInterval(pingServer, PING_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Keep-alive service stopped');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Keep-alive service terminated');
  process.exit(0);
});

// Start the service
startKeepAlive().catch(console.error);