import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for wallet-dapp E2E testing
 *
 * Features:
 * - Chromium with extension support (headed mode for real extensions)
 * - Firefox and WebKit for cross-browser testing
 * - Testnet environment support (https://api.fake.openhive.network)
 * - Mock helpers for Google OAuth, Hive API, HTM API
 */

// Load .env.test for test environment variables
import 'dotenv/config';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './__tests__',

  /* Global setup - runs once before all tests */
  globalSetup: './__tests__/global.setup.ts',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: isCI,

  /* Retry on CI only */
  retries: isCI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: isCI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ...(isCI ? [['github'] as const, ['junit', { outputFile: 'test-results/junit.xml' }] as const] : [])
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video recording */
    video: 'on-first-retry'
  },

  /* Configure projects for major browsers */
  projects: [
    // Chromium headless (default) - for fast CI/mocked tests
    {
      name: 'chromium-headless',
      use: {
        ...devices['Desktop Chrome']
      }
    }

    // Additional browsers for cross-browser testing (disabled by default for speed)
    // Uncomment or use --project flag to run specific browsers:
    //   pnpm test:e2e --project=chromium
    //   pnpm test:e2e --project=firefox
    //   pnpm test:e2e --project=webkit
    //
    // {
    //   name: 'chromium',
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     // Enable extension support in headed mode
    //     launchOptions: {
    //       args: [
    //         '--disable-extensions-except=' + path.join(currentDirname, '__tests__/extensions'),
    //         '--load-extension=' + path.join(currentDirname, '__tests__/extensions')
    //       ]
    //     }
    //   }
    // },
    //
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] }
    // },
    //
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] }
    // },
    //
    // /* Test against mobile viewports */
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] }
    // },
    //
    // {
    //   name: 'mobile-safari',
    //   use: { ...devices['iPhone 12'] }
    // }
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120 * 1000, // 2 minutes for Nuxt to start
    env: {
      // Use test environment
      NODE_ENV: 'test',
      NUXT_PUBLIC_HIVE_NODE_ENDPOINT: process.env.TEST_HIVE_NODE_ENDPOINT || 'https://api.fake.openhive.network',
      NUXT_PUBLIC_CTOKENS_API_URL: process.env.TEST_CTOKENS_API_URL || 'https://htm.fqdn.pl:10081'
    }
  },

  /* Global timeout settings */
  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000
  },

  /* Output folder for test artifacts */
  outputDir: 'test-results/'
});
