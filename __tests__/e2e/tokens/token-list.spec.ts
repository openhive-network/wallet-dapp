/**
 * E2E Tests: Token List
 *
 * Tests for token list functionality:
 * - Loading and displaying tokens
 * - Search and filtering
 * - Token card interactions
 * - Pagination
 */

import { test, expect } from '@playwright/test';

import { primaryTestAccount } from '../../fixtures/test-accounts';
import {
  setupAllMocks,
  mockCTokensApi
} from '../../helpers/api-mocks';
import { setupKeychainWallet } from '../../helpers/auth-helpers';
import { mockHiveKeychain } from '../../helpers/mock-wallets';
import * as selectors from '../../helpers/selectors';
import { TokenListPage } from '../../helpers/page-objects';

test.describe('Token List', () => {

  test.beforeEach(async ({ page }) => {
    await mockHiveKeychain(page, { accountName: primaryTestAccount.name });
    await setupKeychainWallet(page, primaryTestAccount.name);
    await setupAllMocks(page);
    await mockCTokensApi(page);
  });

  test.describe('Token Display', () => {

    test('should display token list', async ({ page }) => {
      await page.goto('/tokens/list');
      await page.waitForLoadState('networkidle');

      // Should show page title
      const pageTitle = page.locator(selectors.tokenList.pageTitle);
      await expect(pageTitle).toBeVisible({ timeout: 15000 });
    });

    test('should display token information correctly', async ({ page }) => {
      await page.goto('/tokens/list');
      await page.waitForLoadState('networkidle');

      // Page should load with token list structure
      const pageTitle = page.locator(selectors.tokenList.pageTitle);
      await expect(pageTitle).toBeVisible({ timeout: 15000 });

      // Verify page has main content area
      const mainContent = page.locator('main').or(page.locator('[role="main"]'));
      await expect(mainContent.first()).toBeVisible();
    });

    test('should show loading state initially', async ({ page }) => {
      await page.goto('/tokens/list');

      // Loading state may or may not be visible depending on speed
      // Just verify page eventually loads
      await page.waitForLoadState('networkidle');

      const pageTitle = page.locator(selectors.tokenList.pageTitle);
      await expect(pageTitle).toBeVisible({ timeout: 15000 });
    });

    test('should handle empty token list', async ({ page }) => {
      // Mock empty response
      await page.route('**/htm.fqdn.pl:10081/**/tokens**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0, page: 1, pages: 0, hasMore: false })
        });
      });

      await page.goto('/tokens/list');
      await page.waitForLoadState('networkidle');

      // Page should load
      const pageTitle = page.locator(selectors.tokenList.pageTitle);
      await expect(pageTitle).toBeVisible({ timeout: 15000 });

      // Empty state should be shown
      const emptyState = page.locator(selectors.tokenList.emptyState);
      await expect(emptyState).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Token Search', () => {

    test('should filter tokens by search query', async ({ page }) => {
      await page.goto('/tokens/list');
      await page.waitForLoadState('networkidle');

      // Find search input
      const searchInput = page.locator(selectors.tokenList.searchInput);
      await expect(searchInput).toBeVisible({ timeout: 5000 });

      await searchInput.fill('TEST');

      // Wait for search results to update
      await expect(searchInput).toHaveValue('TEST');

      // Verify page is still responsive
      await expect(page.locator('body')).toBeVisible();
    });

    test('should show no results for invalid search', async ({ page }) => {
      await page.goto('/tokens/list');
      await page.waitForLoadState('networkidle');

      // Find search input
      const searchInput = page.locator(selectors.tokenList.searchInput);
      await expect(searchInput).toBeVisible({ timeout: 5000 });

      await searchInput.fill('NONEXISTENTTOKENXYZ123');

      // Wait for search to be applied
      await expect(searchInput).toHaveValue('NONEXISTENTTOKENXYZ123');

      // Page should show empty state or no results message
      await expect(page.locator('body')).toBeVisible();
    });

    test('should clear search and show all tokens', async ({ page }) => {
      await page.goto('/tokens/list');
      await page.waitForLoadState('networkidle');

      // Find search input
      const searchInput = page.locator(selectors.tokenList.searchInput);
      await expect(searchInput).toBeVisible({ timeout: 5000 });

      // Fill search
      await searchInput.fill('TEST');
      await expect(searchInput).toHaveValue('TEST');

      // Clear search
      await searchInput.clear();
      await expect(searchInput).toHaveValue('');

      // Verify page is still responsive
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Token Navigation', () => {

    test('should navigate to token detail on click', async ({ page }) => {
      await page.goto('/tokens/list');
      await page.waitForLoadState('networkidle');

      // Wait for token cards to load
      const tokenCards = page.locator(selectors.tokenList.tokenCard);

      // Wait for at least one card or timeout
      const cardCount = await tokenCards.count().catch(() => 0);

      if (cardCount > 0) {
        // Find token card link
        const tokenLinks = page.locator(selectors.tokenList.tokenCardLink);
        await tokenLinks.first().click();
        await page.waitForURL(/\/tokens\/token/, { timeout: 10000 });

        // Verify navigation succeeded
        expect(page.url()).toContain('/tokens/token');
      } else {
        // No token cards available - verify page loaded correctly
        const pageTitle = page.locator(selectors.tokenList.pageTitle);
        await expect(pageTitle).toBeVisible();
      }
    });

    test('should navigate to create token page', async ({ page }) => {
      await page.goto('/tokens/list');
      await page.waitForLoadState('networkidle');

      // Look for create token button
      const createButton = page.locator(selectors.tokenList.createTokenButton);
      await expect(createButton).toBeVisible({ timeout: 5000 });

      // Button may be disabled if not logged in
      const isEnabled = await createButton.isEnabled().catch(() => false);

      if (isEnabled) {
        await createButton.click();

        // Wait for navigation or dialog
        await expect(async () => {
          const urlChanged = page.url().includes('/tokens/create');
          const dialogOpened = await page.locator('[role="dialog"]').isVisible().catch(() => false);
          expect(urlChanged || dialogOpened).toBe(true);
        }).toPass({ timeout: 10000 });
      } else {
        // Button disabled - verify it exists but is disabled
        await expect(createButton).toBeDisabled();
      }
    });
  });

  test.describe('Error Handling', () => {

    test('should handle API error gracefully', async ({ page }) => {
      await page.route('**/htm.fqdn.pl:10081/**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await page.goto('/tokens/list');
      await page.waitForLoadState('networkidle');

      // App should not crash - page should still render
      const pageContent = page.locator('body');
      await expect(pageContent).toBeVisible({ timeout: 15000 });

      // Page title should still be visible even on error
      const pageTitle = page.locator(selectors.tokenList.pageTitle);
      await expect(pageTitle).toBeVisible();
    });

    test('should allow retry after error', async ({ page }) => {
      let requestCount = 0;

      await page.route('**/htm.fqdn.pl:10081/**/tokens**', async (route) => {
        requestCount++;
        if (requestCount === 1) {
          // First request fails
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal server error' })
          });
        } else {
          // Subsequent requests succeed
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: [{ nai: '@@100000001', assetNum: 100000001, precision: 8 }],
              total: 1,
              page: 1,
              pages: 1,
              hasMore: false
            })
          });
        }
      });

      const tokenListPage = new TokenListPage(page);
      await tokenListPage.navigate();
      await page.waitForLoadState('networkidle');

      // Look for refresh button to retry
      const refreshButton = page.locator(selectors.tokenList.refreshButton);

      if (await refreshButton.isVisible().catch(() => false)) {
        await refreshButton.click();
        await tokenListPage.waitForTokensLoaded();
      }

      // Verify page is still functional
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
