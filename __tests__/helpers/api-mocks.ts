/**
 * API Mocks Helper
 *
 * Provides utilities for mocking API responses in Playwright tests:
 * - Hive blockchain API mocking
 * - Google OAuth & Drive API mocking
 * - HTM/CTokens API mocking
 */

import type { Page, Route } from '@playwright/test';

import {
  mockHiveAccount,
  mockHiveAccountExtended,
  mockDynamicGlobalProperties,
  mockGoogleAuthStatus,
  mockGoogleAuthStatusUnauthenticated,
  mockGoogleDriveToken,
  mockGoogleDriveWalletFile,
  mockGoogleDriveWalletFileNotExists,
  mockCTokensTokenList,
  mockCTokensBalanceList,
  mockCTokensUser,
  mockBroadcastSuccess
} from '../fixtures/mock-responses';

// ===========================================
// Types
// ===========================================

export interface MockApiOptions {
  /** Use testnet API for real requests (not mocked) */
  useTestnet?: boolean;
  /** Delay before responding (ms) */
  delay?: number;
  /** Whether user is authenticated with Google */
  googleAuthenticated?: boolean;
  /** Whether Google Drive wallet exists */
  googleDriveWalletExists?: boolean;
  /** Custom account data to return */
  accountData?: typeof mockHiveAccount;
}

// ===========================================
// Hive API Mocking
// ===========================================

/**
 * Setup Hive blockchain API mocks
 */
export async function mockHiveApi (page: Page, options: MockApiOptions = {}) {
  const { delay = 0 } = options;

  // Mock Hive API JSON-RPC endpoint
  await page.route('**/api.hive.blog', async (route) => {
    await handleWithDelay(route, delay, async () => {
      const request = route.request();
      const postData = request.postDataJSON();

      if (!postData?.method)
        return route.fulfill({ status: 400, body: JSON.stringify({ error: 'Invalid request' }) });


      const response = getHiveApiResponse(postData.method, postData.params);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  });

  // Also mock testnet API if not using real testnet
  if (!options.useTestnet) {
    await page.route('**/api.fake.openhive.network', async (route) => {
      await handleWithDelay(route, delay, async () => {
        const request = route.request();
        const postData = request.postDataJSON();

        if (!postData?.method)
          return route.fulfill({ status: 400, body: JSON.stringify({ error: 'Invalid request' }) });


        const response = getHiveApiResponse(postData.method, postData.params);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response)
        });
      });
    });
  }
}

/**
 * Get mock response for Hive API method
 */
function getHiveApiResponse (method: string, params: unknown[]) {
  switch (method) {
  case 'condenser_api.get_accounts':
  case 'database_api.find_accounts':
    return {
      jsonrpc: '2.0',
      id: 1,
      result: [mockHiveAccountExtended]
    };

  case 'condenser_api.get_dynamic_global_properties':
  case 'database_api.get_dynamic_global_properties':
    return {
      jsonrpc: '2.0',
      id: 1,
      result: mockDynamicGlobalProperties
    };

  case 'condenser_api.broadcast_transaction':
  case 'network_broadcast_api.broadcast_transaction':
    return {
      jsonrpc: '2.0',
      id: 1,
      result: mockBroadcastSuccess
    };

  case 'condenser_api.get_account_history':
    return {
      jsonrpc: '2.0',
      id: 1,
      result: []
    };

  case 'condenser_api.get_reward_fund':
    return {
      jsonrpc: '2.0',
      id: 1,
      result: {
        id: 0,
        name: 'post',
        reward_balance: { amount: '1000000000', precision: 3, nai: '@@000000021' },
        recent_claims: '1000000000000000000',
        last_update: '2024-01-01T00:00:00',
        content_constant: '2000000000000',
        percent_curation_rewards: 5000,
        percent_content_rewards: 10000,
        author_reward_curve: 'linear',
        curation_reward_curve: 'linear'
      }
    };

  case 'condenser_api.get_current_median_history_price':
    return {
      jsonrpc: '2.0',
      id: 1,
      result: {
        base: { amount: '300', precision: 3, nai: '@@000000013' },
        quote: { amount: '1000', precision: 3, nai: '@@000000021' }
      }
    };

  default:
    return {
      jsonrpc: '2.0',
      id: 1,
      result: null
    };
  }
}

// ===========================================
// Google API Mocking
// ===========================================

/**
 * Setup Google OAuth API mocks
 */
export async function mockGoogleAuthApi (page: Page, options: MockApiOptions = {}) {
  const { delay = 0, googleAuthenticated = true } = options;

  // Mock auth status endpoint
  await page.route('**/api/auth/google/status', async (route) => {
    await handleWithDelay(route, delay, async () => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          googleAuthenticated ? mockGoogleAuthStatus : mockGoogleAuthStatusUnauthenticated
        )
      });
    });
  });

  // Mock login redirect - just return success for testing
  await page.route('**/api/auth/google/login**', async (route) => {
    // In real tests, this would redirect. For mocked tests, we simulate the callback
    const url = new URL(route.request().url());
    const returnUrl = url.searchParams.get('returnUrl') || '/';

    // Simulate successful OAuth by redirecting back with success param
    return route.fulfill({
      status: 302,
      headers: {
        'Location': `${returnUrl}?auth=success`
      }
    });
  });

  // Mock callback endpoint
  await page.route('**/api/auth/google/callback**', async (route) => {
    return route.fulfill({
      status: 302,
      headers: {
        'Location': '/?auth=success'
      }
    });
  });

  // Mock logout endpoint
  await page.route('**/api/auth/google/logout', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    });
  });
}

/**
 * Setup Google Drive API mocks
 */
export async function mockGoogleDriveApi (page: Page, options: MockApiOptions = {}) {
  const { delay = 0, googleDriveWalletExists = true } = options;

  // Mock token endpoint
  await page.route('**/api/google-drive/token', async (route) => {
    await handleWithDelay(route, delay, async () => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGoogleDriveToken)
      });
    });
  });

  // Mock wallet file check
  await page.route('**/api/google-drive/check-wallet-file', async (route) => {
    await handleWithDelay(route, delay, async () => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          googleDriveWalletExists ? mockGoogleDriveWalletFile : mockGoogleDriveWalletFileNotExists
        )
      });
    });
  });

  // Mock verify auth
  await page.route('**/api/google-drive/verify-auth', async (route) => {
    await handleWithDelay(route, delay, async () => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: true })
      });
    });
  });

  // Mock delete wallet
  await page.route('**/api/google-drive/delete-wallet', async (route) => {
    await handleWithDelay(route, delay, async () => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
  });

  // Mock Google Wallet pass creation
  await page.route('**/api/google-wallet', async (route) => {
    await handleWithDelay(route, delay, async () => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://pay.google.com/gp/v/save/test-wallet-pass'
        })
      });
    });
  });
}

// ===========================================
// HTM/CTokens API Mocking
// ===========================================

/**
 * Setup HTM/CTokens API mocks
 */
export async function mockCTokensApi (page: Page, options: MockApiOptions = {}) {
  const { delay = 0 } = options;

  // Mock all CTokens API endpoints
  await page.route('**/htm.fqdn.pl:10081/**', async (route) => {
    await handleWithDelay(route, delay, async () => {
      const url = new URL(route.request().url());
      const path = url.pathname;

      // Token list
      if (path.includes('/tokens')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockCTokensTokenList)
        });
      }

      // Balances
      if (path.includes('/balances')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockCTokensBalanceList)
        });
      }

      // Users
      if (path.includes('/users')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [mockCTokensUser], total: 1 })
        });
      }

      // Status
      if (path.includes('/status')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            healthy: true,
            version: '1.0.0',
            blockHeight: 80000000
          })
        });
      }

      // Broadcast proxy
      if (path.includes('/broadcast')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockBroadcastSuccess)
        });
      }

      // Default response
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0 })
      });
    });
  });
}

// ===========================================
// Combined Setup
// ===========================================

/**
 * Setup all API mocks at once
 */
export async function setupAllMocks (page: Page, options: MockApiOptions = {}) {
  await mockHiveApi(page, options);
  await mockGoogleAuthApi(page, options);
  await mockGoogleDriveApi(page, options);
  await mockCTokensApi(page, options);
}

/**
 * Setup mocks for unauthenticated user
 */
export async function setupUnauthenticatedMocks (page: Page) {
  await setupAllMocks(page, {
    googleAuthenticated: false,
    googleDriveWalletExists: false
  });
}

/**
 * Setup mocks for authenticated user with wallet
 */
export async function setupAuthenticatedMocks (page: Page) {
  await setupAllMocks(page, {
    googleAuthenticated: true,
    googleDriveWalletExists: true
  });
}

// ===========================================
// Helpers
// ===========================================

/**
 * Handle route with optional delay
 */
async function handleWithDelay (route: Route, delay: number, handler: () => Promise<void>) {
  if (delay > 0)
    await new Promise(resolve => setTimeout(resolve, delay));

  return handler();
}

/**
 * Create a mock error response
 */
export function createErrorResponse (message: string, code: number = -32000) {
  return {
    error: {
      code,
      message,
      data: null
    }
  };
}

/**
 * Intercept and fail specific API calls (for error testing)
 */
export async function mockApiError (page: Page, urlPattern: string, errorMessage: string) {
  await page.route(urlPattern, async (route) => {
    return route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify(createErrorResponse(errorMessage))
    });
  });
}

/**
 * Intercept and timeout specific API calls (for timeout testing)
 */
export async function mockApiTimeout (page: Page, urlPattern: string, timeoutMs: number = 30000) {
  await page.route(urlPattern, async (route) => {
    await new Promise(resolve => setTimeout(resolve, timeoutMs));
    return route.abort('timedout');
  });
}
