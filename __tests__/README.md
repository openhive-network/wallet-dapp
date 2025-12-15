# Playwright Test Infrastructure

## Overview

This directory contains comprehensive end-to-end (E2E) and integration tests for the wallet-dapp application using Microsoft Playwright.

## Directory Structure

```text
__tests__/
├── fixtures/                    # Test data and mock responses
│   ├── index.ts                # Re-exports
│   ├── mock-responses.ts       # Mock API responses (Hive, Google, HTM)
│   ├── test-accounts.ts        # Test account data
│   └── test-tokens.ts          # Test token data
├── helpers/                     # Test utilities and helpers
│   ├── index.ts                # Re-exports
│   ├── api-mocks.ts            # API mocking utilities
│   ├── auth-helpers.ts         # Authentication state management
│   ├── mock-wallets.ts         # Browser wallet extension mocking
│   └── page-objects.ts         # Page Object Models
├── e2e/                        # End-to-End tests
│   ├── auth/                   # Authentication flows
│   │   ├── wallet-connection.spec.ts
│   │   └── google-oauth.spec.ts
│   ├── tokens/                 # Token functionality
│   │   ├── token-list.spec.ts
│   │   ├── token-transfer.spec.ts
│   │   └── token-creation.spec.ts
│   ├── account/                # Account management
│   │   └── account-management.spec.ts
│   └── signing/                # Transaction signing
│       └── signing.spec.ts
├── integration/                # Integration tests
│   ├── api/                    # API integration tests
│   │   └── api-responses.spec.ts
│   └── stores/                 # Pinia store tests
│       ├── settings-store.spec.ts
│       ├── wallet-store.spec.ts
│       └── tokens-store.spec.ts
└── global.setup.ts             # Global test setup
```

## Installation

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
npx playwright install
```

## Configuration

### Environment Variables

Copy `.env.test` and configure:

```bash
cp .env.test .env.test.local
```

Key variables:

- `NUXT_PUBLIC_APP_URL`: Application URL (default: `http://localhost:3000`)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID for testing
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `TEST_HIVE_NODE`: Hive testnet API URL (`https://api.fake.openhive.network`)

### Playwright Config

Configuration is in `playwright.config.ts`:

- **Browsers**: Chromium, Firefox, WebKit
- **Base URL**: `http://localhost:3000`
- **Web Server**: Automatically starts `pnpm run dev`
- **Parallelization**: Tests run in parallel by default

## Running Tests

### All E2E Tests

```bash
pnpm test:e2e
```

### Interactive UI Mode

```bash
pnpm test:e2e:ui
```

### Debug Mode

```bash
pnpm test:e2e:debug
```

### Headed Mode (see browser)

```bash
pnpm test:e2e:headed
```

### Integration Tests Only

```bash
pnpm test:integration
```

### Specific Test File

```bash
npx playwright test __tests__/e2e/auth/wallet-connection.spec.ts
```

### Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Categories

### E2E Tests

End-to-end tests simulate real user workflows:

- **Authentication**: Wallet connection (Keychain, PeakVault, MetaMask), Google OAuth
- **Tokens**: Listing, searching, transfers, creation
- **Account**: Account details, creation, updates
- **Signing**: Transaction signing, memo encryption/decryption

### Integration Tests

Integration tests verify component and store interactions:

- **Stores**: Pinia store state management, persistence
- **API**: API response handling, error scenarios, timeouts

## Mocking Strategy

### Wallet Extensions

Browser wallet extensions are mocked via `page.addInitScript()`:

```typescript
import { mockHiveKeychain, mockPeakVault, mockMetamaskProvider } from '../helpers/mock-wallets';

await mockHiveKeychain(page, { accountName: 'testuser' });
await mockPeakVault(page, { accountName: 'testuser' });
await mockMetamaskProvider(page);
```

### API Responses

API responses are mocked via `page.route()`:

```typescript
import { setupAllMocks, mockHiveApi, mockCTokensApi } from '../helpers/api-mocks';

await setupAllMocks(page);
// or individually:
await mockHiveApi(page);
await mockCTokensApi(page);
```

### Authentication State

Pre-set authentication state:

```typescript
import { setupKeychainWallet, setupGoogleAuthCookies } from '../helpers/auth-helpers';

await setupKeychainWallet(page, 'testuser');
await setupGoogleAuthCookies(context, true);
```

## Page Objects

Page Object Models provide consistent page interaction:

```typescript
import { HomePage, TokensPage, SettingsPage, WalletModal } from '../helpers/page-objects';

const homePage = new HomePage(page);
await homePage.goto();
await homePage.connectWallet();

const walletModal = new WalletModal(page);
await walletModal.selectKeychain();
```

## Test Fixtures

### Test Accounts

```typescript
import { primaryTestAccount, secondaryTestAccount } from '../fixtures/test-accounts';

console.log(primaryTestAccount.name); // 'hive.test.account'
```

### Test Tokens

```typescript
import { testTokens, htmTokens } from '../fixtures/test-tokens';
```

### Mock Responses

```typescript
import { 
  mockHiveAccount,
  mockDynamicGlobalProperties,
  mockCTokensTokenList
} from '../fixtures/mock-responses';
```

## Writing New Tests

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../helpers/api-mocks';
import { mockHiveKeychain } from '../../helpers/mock-wallets';
import { setupKeychainWallet } from '../../helpers/auth-helpers';
import { primaryTestAccount } from '../../fixtures/test-accounts';

test.describe('Feature Name', () => {

  test.beforeEach(async ({ page }) => {
    await mockHiveKeychain(page, { accountName: primaryTestAccount.name });
    await setupKeychainWallet(page, primaryTestAccount.name);
    await setupAllMocks(page);
  });

  test('should do something', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test actions...
    await expect(page.locator('[data-testid="element"]')).toBeVisible();
  });
});
```

### Integration Test Template

```typescript
import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../helpers/api-mocks';

test.describe('Store/API Integration', () => {

  test('should handle state correctly', async ({ page }) => {
    await setupAllMocks(page);
    await page.goto('/');
    
    const state = await page.evaluate(() => {
      return localStorage.getItem('key');
    });
    
    expect(state).toBeDefined();
  });
});
```

## Best Practices

1. **Use data-testid attributes**: Add `data-testid` to components for reliable selectors
2. **Wait for network idle**: Use `page.waitForLoadState('networkidle')` after navigation
3. **Fallback selectors**: Use `.or()` for multiple selector strategies
4. **Timeouts**: Use explicit timeouts for assertions: `expect(el).toBeVisible({ timeout: 10000 })`
5. **Isolate tests**: Each test should set up its own state
6. **Clean up**: Tests clean up automatically via browser context isolation

## Troubleshooting

### Tests Timing Out

- Increase timeout in `playwright.config.ts`
- Add `await page.waitForTimeout(ms)` for debugging
- Check if web server is starting correctly

### Selectors Not Found

- Add fallback selectors with `.or()`
- Check if element exists in dev tools
- Add `data-testid` attributes to components

### API Mocking Not Working

- Ensure mock routes are set up before navigation
- Check route patterns match actual URLs
- Verify mock responses match expected format

### Browser Extensions

Extensions are mocked, not real. For real extension testing:

- Use Chromium with `--disable-extensions-except` flag
- Install extension before test
- Configure extension settings

## CI/CD Integration

For CI environments:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run Tests
  run: pnpm test:e2e
  env:
    CI: true
    TEST_HIVE_NODE: https://api.fake.openhive.network
```

## Reports

Generate HTML report:

```bash
npx playwright show-report
```

Reports are saved in `playwright-report/` after test runs.
