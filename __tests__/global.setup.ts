/**
 * Global Setup for Playwright Tests
 *
 * This file runs once before all tests to set up the test environment:
 * - Validates test configuration
 * - Sets up shared state
 * - Prepares mock extensions folder if needed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import type { FullConfig } from '@playwright/test';

// ESM compatibility
const currentFilename = fileURLToPath(import.meta.url);
const currentDirname = path.dirname(currentFilename);

async function globalSetup (_config: FullConfig) {
  console.log('🚀 Starting Playwright global setup...');

  // Create extensions directory if it doesn't exist (for mock extensions)
  const extensionsDir = path.join(currentDirname, 'extensions');
  if (!fs.existsSync(extensionsDir)) {
    fs.mkdirSync(extensionsDir, { recursive: true });
    console.log('📁 Created extensions directory');
  }

  // Create test-results directory
  const testResultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
    console.log('📁 Created test-results directory');
  }

  // Validate environment
  const requiredEnvVars = [
    'TEST_BASE_URL'
  ];

  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  if (missingVars.length > 0)
    console.warn(`⚠️  Missing environment variables (using defaults): ${missingVars.join(', ')}`);


  console.log('✅ Global setup complete');
  console.log(`   Base URL: ${process.env.TEST_BASE_URL || 'http://localhost:3000'}`);
  console.log(`   Hive Node: ${process.env.TEST_HIVE_NODE_ENDPOINT || 'https://api.fake.openhive.network'}`);
}

export default globalSetup;
