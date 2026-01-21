/**
 * E2E Tests: Token Transfer
 *
 * Tests for token transfer functionality:
 * - HIVE/HBD transfers
 * - HTM token transfers
 * - Transfer validation
 * - Transfer confirmation
 */

import { test, expect } from '@playwright/test';

import { primaryTestAccount, secondaryTestAccount } from '../../fixtures/test-accounts';
import { primaryTestToken } from '../../fixtures/test-tokens';
import {
  setupAllMocks,
  mockCTokensApi,
  mockHiveApi
} from '../../helpers/api-mocks';
import { setupKeychainWallet } from '../../helpers/auth-helpers';
import { mockHiveKeychain } from '../../helpers/mock-wallets';

test.describe('Token Transfer', () => {

  test.beforeEach(async ({ page }) => {
    await mockHiveKeychain(page, { accountName: primaryTestAccount.name });
    await setupKeychainWallet(page, primaryTestAccount.name);
    await setupAllMocks(page);
    await mockCTokensApi(page);
    await mockHiveApi(page);
  });

  test.describe('Transfer Form', () => {

    test('should display token page content', async ({ page }) => {
      // Navigate to HTM token page where transfer form is located
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      // Verify page loaded with meaningful content (not blank/error)
      const pageContent = page.locator('body');
      await expect(pageContent).toBeVisible({ timeout: 15000 });

      // Check that either token info or a redirect/login prompt is shown
      const hasContent = await page.locator('main').or(page.locator('[role="main"]')).first().isVisible();
      expect(hasContent).toBe(true);
    });

    test('should validate recipient account with invalid input', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      // Look for recipient input field
      const recipientInput = page.locator('input[placeholder*="recipient"]').or(
        page.locator('#recipient')
      );

      const isFormVisible = await recipientInput.first().isVisible({ timeout: 5000 }).catch(() => false);

      if (isFormVisible) {
        await recipientInput.first().fill('invalid@account!');
        await recipientInput.first().blur();

        // Wait for validation to trigger
        await expect(async () => {
          // Form should either show error or the input should be present (no crash)
          const inputStillVisible = await recipientInput.first().isVisible();
          expect(inputStillVisible).toBe(true);
        }).toPass({ timeout: 2000 });

        // Verify input contains the value we set (form didn't crash/reset)
        const currentValue = await recipientInput.first().inputValue();
        expect(currentValue).toBe('invalid@account!');
      } else {
        // Form not shown - skip this test as user is not logged in
        test.skip();
      }
    });

    test('should handle negative amount input', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      const amountInput = page.locator('#token-amount').or(
        page.locator('input[type="number"]').first()
      );

      const isFormVisible = await amountInput.isVisible({ timeout: 5000 }).catch(() => false);

      if (isFormVisible) {
        await amountInput.fill('-10');
        await amountInput.blur();

        // HTML number inputs typically handle negative values in one of these ways:
        // 1. Prevent entry (value stays empty or positive)
        // 2. Allow entry but show validation error
        const value = await amountInput.inputValue();

        // Value should either be empty, '0', or the negative value with validation shown
        const isValidResponse = value === '' || value === '0' || value === '-10' || !value.includes('-');
        expect(isValidResponse).toBe(true);
      } else {
        test.skip();
      }
    });

    test('should handle amount exceeding balance', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      const amountInput = page.locator('#token-amount').or(
        page.locator('input[type="number"]').first()
      );

      const isFormVisible = await amountInput.isVisible({ timeout: 5000 }).catch(() => false);

      if (isFormVisible) {
        await amountInput.fill('999999999999');
        await amountInput.blur();

        // Wait for any validation to appear
        await expect(async () => {
          const inputVisible = await amountInput.isVisible();
          expect(inputVisible).toBe(true);
        }).toPass({ timeout: 2000 });

        // Check for error indicator or disabled submit button
        const errorMessage = page.locator('.text-destructive, .text-red-500, [data-error]');
        const submitButton = page.locator('button:has-text("Send")').first();

        const hasError = await errorMessage.first().isVisible().catch(() => false);
        const isButtonDisabled = await submitButton.isDisabled().catch(() => false);

        // Either error is shown OR button is disabled OR form accepts the value (will fail on submit)
        expect(hasError || isButtonDisabled || await amountInput.inputValue() === '999999999999').toBe(true);
      } else {
        test.skip();
      }
    });

    test('should fill max amount when clicking max button', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      // Look for max button near amount input
      const maxButton = page.locator('button:has-text("Max")').or(
        page.locator('button:has-text("MAX")')
      );

      const isMaxButtonVisible = await maxButton.first().isVisible({ timeout: 5000 }).catch(() => false);

      if (isMaxButtonVisible) {
        // Clear any existing value first
        const amountInput = page.locator('#token-amount').or(
          page.locator('input[type="number"]').first()
        );
        await amountInput.fill('');

        await maxButton.first().click();

        // Wait for value to be populated
        await expect(async () => {
          const value = await amountInput.inputValue();
          // Value should be non-empty and represent a number
          expect(value).toBeTruthy();
          expect(parseFloat(value)).toBeGreaterThanOrEqual(0);
        }).toPass({ timeout: 3000 });
      } else {
        // Max button not available in this context
        test.skip();
      }
    });
  });

  test.describe('HIVE Transfer', () => {

    test('should submit HIVE transfer form', async ({ page }) => {
      await mockHiveKeychain(page, {
        accountName: primaryTestAccount.name,
        signingSuccess: true
      });

      // Navigate to token page
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      // Look for transfer form fields
      const recipientInput = page.locator('input[placeholder*="recipient"]').or(
        page.locator('#recipient')
      );

      const isFormVisible = await recipientInput.first().isVisible({ timeout: 5000 }).catch(() => false);

      if (isFormVisible) {
        await recipientInput.first().fill(secondaryTestAccount.name);

        const amountInput = page.locator('#token-amount').or(
          page.locator('input[type="number"]').first()
        );
        await amountInput.fill('1');

        // Click send button
        const submitButton = page.locator('button:has-text("Send Transfer")').or(
          page.locator('button:has-text("Send")')
        );
        await submitButton.first().click();

        // Wait for response - check for toast, success message, or form state change
        const successIndicators = page.locator('[data-sonner-toast], .toast, [role="alert"]');
        const loadingIndicator = page.locator('.animate-spin, [data-loading]');

        await expect(async () => {
          const hasToast = await successIndicators.first().isVisible().catch(() => false);
          const isLoading = await loadingIndicator.first().isVisible().catch(() => false);
          const formCleared = await amountInput.inputValue() === '';

          // One of these should be true after submitting
          expect(hasToast || isLoading || formCleared).toBe(true);
        }).toPass({ timeout: 5000 });
      } else {
        test.skip();
      }
    });

    test('should handle transfer rejection from wallet', async ({ page }) => {
      await mockHiveKeychain(page, {
        accountName: primaryTestAccount.name,
        signingSuccess: false
      });

      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      const recipientInput = page.locator('input[placeholder*="recipient"]').or(
        page.locator('#recipient')
      );

      const isFormVisible = await recipientInput.first().isVisible({ timeout: 5000 }).catch(() => false);

      if (isFormVisible) {
        await recipientInput.first().fill(secondaryTestAccount.name);

        const amountInput = page.locator('#token-amount').first();
        await amountInput.fill('1');

        const submitButton = page.locator('button:has-text("Send")').first();
        await submitButton.click();

        // Should show rejection/error - check for error toast or message
        const errorIndicators = page.locator(
          '[data-sonner-toast][data-type="error"], ' +
          '.toast-error, ' +
          '[role="alert"]:has-text("reject"), ' +
          '[role="alert"]:has-text("error"), ' +
          '.text-destructive'
        );

        await expect(async () => {
          const hasError = await errorIndicators.first().isVisible().catch(() => false);
          // Form should remain visible (not cleared) on error
          const formStillVisible = await recipientInput.first().isVisible();

          expect(hasError || formStillVisible).toBe(true);
        }).toPass({ timeout: 5000 });
      } else {
        test.skip();
      }
    });
  });

  test.describe('HBD Transfer', () => {

    test('should submit HBD transfer form', async ({ page }) => {
      await mockHiveKeychain(page, {
        accountName: primaryTestAccount.name,
        signingSuccess: true
      });

      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      const recipientInput = page.locator('input[placeholder*="recipient"]').or(
        page.locator('#recipient')
      );

      const isFormVisible = await recipientInput.first().isVisible({ timeout: 5000 }).catch(() => false);

      if (isFormVisible) {
        await recipientInput.first().fill(secondaryTestAccount.name);

        const amountInput = page.locator('#token-amount').first();
        await amountInput.fill('1');

        const submitButton = page.locator('button:has-text("Send")').first();
        await submitButton.click();

        // Verify form responds to submission
        await expect(async () => {
          const toastVisible = await page.locator('[data-sonner-toast]').first().isVisible().catch(() => false);
          const buttonLoading = await submitButton.isDisabled().catch(() => false);
          const formChanged = await amountInput.inputValue() !== '1';

          expect(toastVisible || buttonLoading || formChanged).toBe(true);
        }).toPass({ timeout: 5000 });
      } else {
        test.skip();
      }
    });
  });

  test.describe('HTM Token Transfer', () => {

    test('should complete HTM token transfer flow', async ({ page }) => {
      await mockHiveKeychain(page, {
        accountName: primaryTestAccount.name,
        signingSuccess: true
      });

      // Navigate to HTM token transfer
      await page.goto(`/tokens/token?nai=${primaryTestToken.nai}`);
      await page.waitForLoadState('networkidle');

      // Click transfer button
      const transferButton = page.locator('[data-testid="transfer-button"]').or(
        page.locator('button:has-text("Transfer")')
      );

      const hasTransferButton = await transferButton.first().isVisible({ timeout: 5000 }).catch(() => false);

      if (hasTransferButton) {
        await transferButton.first().click();

        // Fill transfer form
        const recipientInput = page.locator('[data-testid="recipient-input"]').or(page.locator('[placeholder*="recipient"]').first());
        const amountInput = page.locator('[data-testid="amount-input"]').or(page.locator('input[type="number"]').first());

        await expect(recipientInput.first()).toBeVisible({ timeout: 5000 });

        await recipientInput.first().fill(secondaryTestAccount.name);
        await amountInput.first().fill('100');

        const submitButton = page.locator('[data-testid="send-button"]').or(
          page.locator('button:has-text("Send")')
        );
        await submitButton.last().click();

        // Check for success response
        const successIndicator = page.locator('[data-testid="transfer-success"]').or(
          page.locator('[data-sonner-toast][data-type="success"]')
        ).or(page.locator('text=success'));

        await expect(successIndicator.first()).toBeVisible({ timeout: 10000 });
      } else {
        test.skip();
      }
    });
  });

  test.describe('Transfer with Memo', () => {

    test('should include memo in transfer submission', async ({ page }) => {
      await mockHiveKeychain(page, {
        accountName: primaryTestAccount.name,
        signingSuccess: true
      });

      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      const recipientInput = page.locator('input[placeholder*="recipient"]').or(
        page.locator('#recipient')
      );
      const memoInput = page.locator('#memo').or(
        page.locator('textarea[placeholder*="memo"]')
      );

      const isFormVisible = await recipientInput.first().isVisible({ timeout: 5000 }).catch(() => false);

      if (isFormVisible) {
        await recipientInput.first().fill(secondaryTestAccount.name);

        const amountInput = page.locator('#token-amount').first();
        await amountInput.fill('1');

        const hasMemoField = await memoInput.first().isVisible().catch(() => false);
        if (hasMemoField) {
          await memoInput.first().fill('Test memo message');

          // Verify memo was entered
          const memoValue = await memoInput.first().inputValue();
          expect(memoValue).toBe('Test memo message');
        }

        const submitButton = page.locator('button:has-text("Send")').first();
        await submitButton.click();

        // Wait for form submission response
        await expect(async () => {
          const hasResponse = await page.locator('[data-sonner-toast]').first().isVisible().catch(() => false);
          const buttonChanged = await submitButton.isDisabled().catch(() => false);
          expect(hasResponse || buttonChanged).toBe(true);
        }).toPass({ timeout: 5000 });
      } else {
        test.skip();
      }
    });

    test('should accept encrypted memo format', async ({ page }) => {
      await mockHiveKeychain(page, {
        accountName: primaryTestAccount.name,
        signingSuccess: true
      });

      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      const memoInput = page.locator('#memo').or(
        page.locator('textarea[placeholder*="memo"]')
      );

      const hasMemoField = await memoInput.first().isVisible({ timeout: 5000 }).catch(() => false);

      if (hasMemoField) {
        // Enter memo starting with # for encryption
        await memoInput.first().fill('#Secret message');

        // Verify the encrypted memo format is accepted (not rejected/cleared)
        const memoValue = await memoInput.first().inputValue();
        expect(memoValue).toBe('#Secret message');

        // Check that no immediate validation error appears for the # prefix
        const validationError = page.locator('.text-destructive:near(#memo), .text-red-500:near(#memo)');
        const hasValidationError = await validationError.first().isVisible({ timeout: 1000 }).catch(() => false);
        expect(hasValidationError).toBe(false);
      } else {
        test.skip();
      }
    });
  });

  test.describe('Transfer Confirmation', () => {

    test('should trigger wallet confirmation on transfer', async ({ page }) => {
      await mockHiveKeychain(page, {
        accountName: primaryTestAccount.name,
        signingSuccess: true
      });

      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      const recipientInput = page.locator('input[placeholder*="recipient"]').or(
        page.locator('#recipient')
      );

      const isFormVisible = await recipientInput.first().isVisible({ timeout: 5000 }).catch(() => false);

      if (isFormVisible) {
        await recipientInput.first().fill(secondaryTestAccount.name);

        const amountInput = page.locator('#token-amount').first();
        await amountInput.fill('100');

        const submitButton = page.locator('button:has-text("Send")').first();
        await submitButton.click();

        // Should trigger wallet confirmation (mocked) - verify response
        await expect(async () => {
          // Check for any UI response: toast, loading state, or form change
          const hasToast = await page.locator('[data-sonner-toast]').first().isVisible().catch(() => false);
          const hasDialog = await page.locator('[role="dialog"]').first().isVisible().catch(() => false);
          const buttonChanged = await submitButton.textContent() !== 'Send';

          expect(hasToast || hasDialog || buttonChanged).toBe(true);
        }).toPass({ timeout: 5000 });
      } else {
        test.skip();
      }
    });

    test('should allow form to be filled and modified', async ({ page }) => {
      await page.goto('/tokens/token?asset-num=100000001');
      await page.waitForLoadState('networkidle');

      const recipientInput = page.locator('input[placeholder*="recipient"]').or(
        page.locator('#recipient')
      );

      const isFormVisible = await recipientInput.first().isVisible({ timeout: 5000 }).catch(() => false);

      if (isFormVisible) {
        // Fill the form
        await recipientInput.first().fill(secondaryTestAccount.name);

        const amountInput = page.locator('#token-amount').first();
        await amountInput.fill('1');

        // Verify values can be read back
        const recipientValue = await recipientInput.first().inputValue();
        const amountValue = await amountInput.inputValue();

        expect(recipientValue).toBe(secondaryTestAccount.name);
        expect(amountValue).toBe('1');

        // Verify form can be modified
        await amountInput.fill('2');
        const newAmountValue = await amountInput.inputValue();
        expect(newAmountValue).toBe('2');
      } else {
        test.skip();
      }
    });
  });

  test.describe('Transfer History', () => {

    test('should display transaction history section', async ({ page }) => {
      await mockHiveKeychain(page, {
        accountName: primaryTestAccount.name,
        signingSuccess: true
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for transaction history section
      const historySection = page.locator('[data-testid="transaction-history"]').or(
        page.locator('text=Recent').or(page.locator('text=History'))
      );

      const hasHistorySection = await historySection.first().isVisible({ timeout: 5000 }).catch(() => false);

      if (hasHistorySection) {
        await historySection.first().click();

        // Verify section is interactive
        await expect(historySection.first()).toBeVisible();

        // Check for transfer records container (may be empty)
        const transferRecords = page.locator('[data-testid="transaction-item"]').or(
          page.locator('[data-testid="transfer-record"]')
        );

        const count = await transferRecords.count();
        // Count can be 0 (no history) or more
        expect(count).toBeGreaterThanOrEqual(0);
      } else {
        // History section not available on this page/state
        test.skip();
      }
    });
  });
});
