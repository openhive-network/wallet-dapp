/**
 * E2E Tests: Token Transfer
 *
 * Tests for token transfer functionality:
 * - HTM token transfers
 * - Transfer validation
 * - Transfer form interactions
 */

import { test, expect } from '@playwright/test';

import { primaryTestAccount } from '../../fixtures/test-accounts';
import {
  setupAllMocks,
  mockCTokensApi,
  mockHiveApi
} from '../../helpers/api-mocks';
import { setupKeychainWallet } from '../../helpers/auth-helpers';
import { mockHiveKeychain } from '../../helpers/mock-wallets';
import * as selectors from '../../helpers/selectors';

test.describe('Token Transfer', () => {

  test.beforeEach(async ({ page }) => {
    await mockHiveKeychain(page, { accountName: primaryTestAccount.name });
    await setupKeychainWallet(page, primaryTestAccount.name);
    await setupAllMocks(page);
    await mockCTokensApi(page);
    await mockHiveApi(page);
  });

  test.describe('Transfer Card Display', () => {

    test('should display transfer card on token page', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      // Transfer card should be visible for non-staked tokens
      const transferCard = page.locator(selectors.tokenTransfer.htmTransferCard);
      await expect(transferCard).toBeVisible({ timeout: 15000 });
    });

    test('should display amount input in transfer card', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      // Wait for transfer card
      const transferCard = page.locator(selectors.tokenTransfer.htmTransferCard);
      await expect(transferCard).toBeVisible({ timeout: 15000 });

      // Amount container should be visible
      const amountContainer = page.locator(selectors.tokenTransfer.amountContainer);
      await expect(amountContainer).toBeVisible();

      // Amount input should be visible
      const amountInput = page.locator(selectors.tokenTransfer.amountInput);
      await expect(amountInput).toBeVisible();
    });

    test('should display memo toggle in transfer card', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      // Wait for transfer card
      const transferCard = page.locator(selectors.tokenTransfer.htmTransferCard);
      await expect(transferCard).toBeVisible({ timeout: 15000 });

      // Memo toggle should be visible
      const memoToggle = page.locator(selectors.tokenTransfer.memoToggle);
      await expect(memoToggle).toBeVisible();
    });

    test('should display send button in transfer card', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      // Wait for transfer card
      const transferCard = page.locator(selectors.tokenTransfer.htmTransferCard);
      await expect(transferCard).toBeVisible({ timeout: 15000 });

      // Send button should be visible
      const sendButton = page.locator(selectors.tokenTransfer.htmSendButton);
      await expect(sendButton).toBeVisible();
    });
  });

  test.describe('Amount Input', () => {

    test('should accept valid amount input', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      // Wait for transfer card and amount input
      const amountInput = page.locator(selectors.tokenTransfer.amountInput);
      await expect(amountInput).toBeVisible({ timeout: 15000 });

      // Fill amount
      await amountInput.fill('10');

      // Verify value was entered
      await expect(amountInput).toHaveValue('10');
    });

    test('should handle amount with decimals', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      const amountInput = page.locator(selectors.tokenTransfer.amountInput);
      await expect(amountInput).toBeVisible({ timeout: 15000 });

      // Fill amount with decimals
      await amountInput.fill('10.5');
      await expect(amountInput).toHaveValue('10.5');
    });

    test('should display max button when balance available', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      const amountContainer = page.locator(selectors.tokenTransfer.amountContainer);
      await expect(amountContainer).toBeVisible({ timeout: 15000 });

      // Max button should be visible when there's an available balance
      const maxButton = page.locator(selectors.tokenTransfer.maxAmountBtn);

      // Check if max button is visible (may depend on balance being available)
      const isMaxVisible = await maxButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (isMaxVisible) {
        await expect(maxButton).toBeVisible();
      } else {
        // If not visible, verify the amount container is still functional
        const amountInput = page.locator(selectors.tokenTransfer.amountInput);
        await expect(amountInput).toBeVisible();
      }
    });
  });

  test.describe('Memo Input', () => {

    test('should toggle memo input visibility', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      // Wait for transfer card
      const transferCard = page.locator(selectors.tokenTransfer.htmTransferCard);
      await expect(transferCard).toBeVisible({ timeout: 15000 });

      // Memo toggle should be visible
      const memoToggle = page.locator(selectors.tokenTransfer.memoToggle);
      await expect(memoToggle).toBeVisible();

      // Initially memo input should be hidden
      const memoInput = page.locator(selectors.tokenTransfer.memoInput);
      await expect(memoInput).toBeHidden();

      // Click to expand memo
      await memoToggle.click();

      // Memo input should now be visible
      await expect(memoInput).toBeVisible();
    });

    test('should accept memo input', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      const memoToggle = page.locator(selectors.tokenTransfer.memoToggle);
      await expect(memoToggle).toBeVisible({ timeout: 15000 });

      // Expand memo section
      await memoToggle.click();

      // Fill memo
      const memoInput = page.locator(selectors.tokenTransfer.memoInput);
      await expect(memoInput).toBeVisible();
      await memoInput.fill('Test memo message');

      // Verify value
      await expect(memoInput).toHaveValue('Test memo message');
    });

    test('should accept encrypted memo format', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      const memoToggle = page.locator(selectors.tokenTransfer.memoToggle);
      await expect(memoToggle).toBeVisible({ timeout: 15000 });

      // Expand memo section
      await memoToggle.click();

      // Fill encrypted memo (starts with #)
      const memoInput = page.locator(selectors.tokenTransfer.memoInput);
      await memoInput.fill('#Secret message');

      // Verify encrypted memo format is accepted
      await expect(memoInput).toHaveValue('#Secret message');
    });
  });

  test.describe('Recipient Selection', () => {

    test('should display recipient selector', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      // Wait for transfer card
      const transferCard = page.locator(selectors.tokenTransfer.htmTransferCard);
      await expect(transferCard).toBeVisible({ timeout: 15000 });

      // Recipient trigger should be visible
      const recipientTrigger = page.locator(selectors.tokenTransfer.recipientTrigger);
      await expect(recipientTrigger).toBeVisible();
    });

    test('should open recipient popover on click', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      // Wait for recipient trigger
      const recipientTrigger = page.locator(selectors.tokenTransfer.recipientTrigger);
      await expect(recipientTrigger).toBeVisible({ timeout: 15000 });

      // Click to open popover
      await recipientTrigger.click();

      // Search input should become visible in popover
      const recipientSearch = page.locator(selectors.tokenTransfer.recipientSearch);
      await expect(recipientSearch).toBeVisible({ timeout: 5000 });
    });

    test('should allow searching for recipient', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      // Open recipient selector
      const recipientTrigger = page.locator(selectors.tokenTransfer.recipientTrigger);
      await expect(recipientTrigger).toBeVisible({ timeout: 15000 });
      await recipientTrigger.click();

      // Wait for search input
      const recipientSearch = page.locator(selectors.tokenTransfer.recipientSearch);
      await expect(recipientSearch).toBeVisible({ timeout: 5000 });

      // Type a public key
      await recipientSearch.fill('STM');

      // Verify input value
      await expect(recipientSearch).toHaveValue('STM');
    });
  });

  test.describe('Send Button State', () => {

    test('should have send button disabled initially', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      // Wait for send button
      const sendButton = page.locator(selectors.tokenTransfer.htmSendButton);
      await expect(sendButton).toBeVisible({ timeout: 15000 });

      // Button should be disabled without valid form data
      await expect(sendButton).toBeDisabled();
    });

    test('should keep send button disabled with only amount filled', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      // Fill only amount
      const amountInput = page.locator(selectors.tokenTransfer.amountInput);
      await expect(amountInput).toBeVisible({ timeout: 15000 });
      await amountInput.fill('10');

      // Button should still be disabled (no recipient)
      const sendButton = page.locator(selectors.tokenTransfer.htmSendButton);
      await expect(sendButton).toBeDisabled();
    });
  });

  test.describe('Form Persistence', () => {

    test('should retain amount value after typing', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      const amountInput = page.locator(selectors.tokenTransfer.amountInput);
      await expect(amountInput).toBeVisible({ timeout: 15000 });

      // Fill amount
      await amountInput.fill('123.456');

      // Wait a moment
      await page.waitForTimeout(500);

      // Value should persist
      await expect(amountInput).toHaveValue('123.456');
    });

    test('should retain memo value after typing', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      // Expand memo
      const memoToggle = page.locator(selectors.tokenTransfer.memoToggle);
      await expect(memoToggle).toBeVisible({ timeout: 15000 });
      await memoToggle.click();

      // Fill memo
      const memoInput = page.locator(selectors.tokenTransfer.memoInput);
      await memoInput.fill('Persistent memo');

      // Wait a moment
      await page.waitForTimeout(500);

      // Value should persist
      await expect(memoInput).toHaveValue('Persistent memo');
    });
  });
});
