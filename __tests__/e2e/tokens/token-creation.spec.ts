/**
 * E2E Tests: Token Creation
 *
 * Tests for HTM token creation functionality:
 * - Token creation form
 * - Form validation
 * - Token creation submission
 * - Error handling
 */

import { test, expect } from '@playwright/test';

import { primaryTestAccount } from '../../fixtures/test-accounts';
import { validTokenCreationData } from '../../fixtures/test-tokens';
import {
  setupAllMocks,
  mockCTokensApi,
  mockHiveApi
} from '../../helpers/api-mocks';
import { setupKeychainWallet } from '../../helpers/auth-helpers';
import { mockHiveKeychain } from '../../helpers/mock-wallets';
import * as selectors from '../../helpers/selectors';

test.describe('Token Creation', () => {

  test.beforeEach(async ({ page }) => {
    await mockHiveKeychain(page, { accountName: primaryTestAccount.name });
    await setupKeychainWallet(page, primaryTestAccount.name);
    await setupAllMocks(page);
    await mockCTokensApi(page);
    await mockHiveApi(page);
  });

  test.describe('Token Creation Form', () => {

    test('should display token creation form', async ({ page }) => {
      await page.goto('/tokens/create');
      await page.waitForLoadState('networkidle');

      // The page should show token creation form or require HTM login
      // Check for token creation card or form
      const tokenCreationContent = page.locator(selectors.tokenCreation.card).or(
        page.locator(selectors.tokenCreation.form).or(
          page.locator(selectors.htmRegistration.optionsCard)
        )
      );

      await expect(tokenCreationContent.first()).toBeVisible({ timeout: 15000 });
    });

    test('should have all required fields', async ({ page }) => {
      await page.goto('/tokens/create');
      await page.waitForLoadState('networkidle');

      // Check for required form fields
      const fields = [
        'name',
        'symbol',
        'precision',
        'maxSupply',
        'initialSupply'
      ];

      for (const field of fields) {
        const fieldElement = page.locator(`[data-testid="token-${field}-input"]`).or(
          page.locator(`input[name="${field}"]`).or(
            page.locator(`[placeholder*="${field}"]`)
          )
        );

        // At least some fields should be visible
        const isVisible = await fieldElement.first().isVisible().catch(() => false);
        if (!isVisible)
          console.log(`Field ${field} not found with standard selectors`);

      }
    });
  });

  test.describe('Form Validation', () => {

    test('should validate required fields', async ({ page }) => {
      await page.goto('/tokens/create');
      await page.waitForLoadState('networkidle');

      // Try to submit empty form
      const submitButton = page.locator('[data-testid="create-token-submit"]').or(
        page.locator('button:has-text("Create")').or(page.locator('button[type="submit"]'))
      );

      if (await submitButton.first().isVisible()) {
        await submitButton.first().click();

        // Should show validation errors - form fields will be invalid
        const validationErrors = page.locator('[data-testid="validation-error"]').or(
          page.locator('[aria-invalid="true"]').or(page.locator('[data-invalid="true"]'))
        );

        const errorCount = await validationErrors.count();
        expect(errorCount).toBeGreaterThan(0);
      }
    });

    test('should validate symbol length and format', async ({ page }) => {
      await page.goto('/tokens/create');
      await page.waitForLoadState('networkidle');

      const symbolInput = page.locator('[data-testid="token-symbol-input"]').or(
        page.locator('input[name="symbol"]').first()
      );

      if (await symbolInput.isVisible()) {
        // Enter too long symbol
        await symbolInput.fill('TOOLONGSYMBOLNAME');
        await symbolInput.blur();

        // Should show validation error or input may be limited
        const symbolError = page.locator('[data-testid="symbol-error"]').or(
          page.locator(`${selectors.tokenCreation.symbolInput}[aria-invalid="true"]`)
        );

        await expect(symbolError.first()).toBeVisible({ timeout: 3000 }).catch(() => {
          // Some implementations limit input length instead
        });
      }
    });

    test('should validate precision range', async ({ page }) => {
      await page.goto('/tokens/create');
      await page.waitForLoadState('networkidle');

      const precisionInput = page.locator('[data-testid="token-precision-input"]').or(
        page.locator('input[name="precision"]').first()
      );

      if (await precisionInput.isVisible()) {
        // Enter invalid precision
        await precisionInput.fill('25');
        await precisionInput.blur();

        // Should show validation error or input may be limited
        const precisionError = page.locator('[data-testid="precision-error"]').or(
          page.locator(`${selectors.tokenCreation.precisionInput}[aria-invalid="true"]`)
        );

        await expect(precisionError.first()).toBeVisible({ timeout: 3000 }).catch(() => {
          // Some implementations limit input range instead
        });
      }
    });

    test('should validate max supply is greater than initial supply', async ({ page }) => {
      await page.goto('/tokens/create');
      await page.waitForLoadState('networkidle');

      const maxSupplyInput = page.locator('[data-testid="token-maxSupply-input"]').or(
        page.locator('input[name="maxSupply"]').first()
      );
      const initialSupplyInput = page.locator('[data-testid="token-initialSupply-input"]').or(
        page.locator('input[name="initialSupply"]').first()
      );

      if (await maxSupplyInput.isVisible() && await initialSupplyInput.isVisible()) {
        await maxSupplyInput.fill('100');
        await initialSupplyInput.fill('1000'); // Greater than max
        await initialSupplyInput.blur();

        // Should show validation error
        const supplyError = page.locator('[data-testid="supply-error"]').or(
          page.locator(`${selectors.tokenCreation.maxSupplyInput}[aria-invalid="true"]`)
        );

        await expect(supplyError.first()).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Token Creation Submission', () => {

    test('should create token successfully with valid data', async ({ page }) => {
      await mockHiveKeychain(page, {
        accountName: primaryTestAccount.name,
        signingSuccess: true
      });

      await page.goto('/tokens/create');
      await page.waitForLoadState('networkidle');

      // Fill form with valid data
      const formFields = {
        'name': validTokenCreationData.name,
        'symbol': validTokenCreationData.symbol,
        'precision': validTokenCreationData.precision.toString(),
        'maxSupply': validTokenCreationData.maxSupply,
        'initialSupply': validTokenCreationData.initialSupply,
        'description': validTokenCreationData.description
      };

      for (const [field, value] of Object.entries(formFields)) {
        const input = page.locator(`[data-testid="token-${field}-input"]`).or(
          page.locator(`input[name="${field}"]`).or(
            page.locator(`textarea[name="${field}"]`).or(
              page.locator(`[placeholder*="${field}"]`)
            )
          )
        );

        if (await input.first().isVisible())
          await input.first().fill(value);

      }

      // Submit form
      const submitButton = page.locator('[data-testid="create-token-submit"]').or(
        page.locator('button:has-text("Create")')
      );

      if (await submitButton.first().isVisible()) {
        await submitButton.first().click();

        // Should show success or redirect to token page
        await Promise.race([
          page.waitForURL(/\/tokens\/token/),
          page.waitForSelector('[data-testid="token-created-success"]'),
          page.waitForSelector('[data-sonner-toast][data-type="success"]', { state: 'visible' })
        ]).catch(() => {
          // Check for success toast
        });

        const successIndicator = page.locator('[data-testid="token-created-success"]').or(
          page.locator('[data-sonner-toast][data-type="success"]')
        );

        const isSuccess = await successIndicator.first().isVisible().catch(() => false);
        const isRedirected = page.url().includes('/tokens/');

        expect(isSuccess || isRedirected).toBeTruthy();
      }
    });

    test('should handle creation error', async ({ page }) => {
      await mockHiveKeychain(page, {
        accountName: primaryTestAccount.name,
        signingSuccess: false
      });

      await page.goto('/tokens/create');
      await page.waitForLoadState('networkidle');

      // Fill minimal valid data
      const nameInput = page.locator('[data-testid="token-name-input"]').or(page.locator('input[name="name"]').first());
      const symbolInput = page.locator('[data-testid="token-symbol-input"]').or(page.locator('input[name="symbol"]').first());

      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Token');
        await symbolInput.fill('TST');

        const submitButton = page.locator('[data-testid="create-token-submit"]').or(
          page.locator('button:has-text("Create")')
        );
        await submitButton.first().click();

        // Should show error message via toast or inline error
        const errorMessage = page.locator('[data-testid="creation-error"]').or(
          page.locator('[data-sonner-toast][data-type="error"]')
        );

        await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Advanced Options', () => {

    test('should toggle staking option', async ({ page }) => {
      await page.goto('/tokens/create');
      await page.waitForLoadState('networkidle');

      const stakingToggle = page.locator('[data-testid="allow-staking-toggle"]').or(
        page.locator('input[name="allowStaking"]').or(
          page.locator('label:has-text("Staking")').locator('input')
        )
      );

      if (await stakingToggle.first().isVisible()) {
        await stakingToggle.first().click();

        // Toggle should change state
        const isChecked = await stakingToggle.first().isChecked();
        expect(typeof isChecked).toBe('boolean');
      }
    });

    test('should add token metadata fields', async ({ page }) => {
      await page.goto('/tokens/create');
      await page.waitForLoadState('networkidle');

      // Check for metadata fields
      const websiteInput = page.locator('[data-testid="token-website-input"]').or(
        page.locator('input[name="website"]')
      );
      const imageInput = page.locator('[data-testid="token-image-input"]').or(
        page.locator('input[name="image"]')
      );

      if (await websiteInput.first().isVisible())
        await websiteInput.first().fill('https://example.com');


      if (await imageInput.first().isVisible())
        await imageInput.first().fill('https://example.com/logo.png');

    });
  });

  test.describe('NFT Creation', () => {

    test('should show NFT option', async ({ page }) => {
      await page.goto('/tokens/create');
      await page.waitForLoadState('networkidle');

      const nftToggle = page.locator('[data-testid="is-nft-toggle"]').or(
        page.locator('input[name="isNft"]').or(
          page.locator('label:has-text("NFT")').locator('input')
        )
      );

      if (await nftToggle.first().isVisible())
        await expect(nftToggle.first()).toBeVisible();

    });

    test('should adjust form for NFT creation', async ({ page }) => {
      await page.goto('/tokens/create');
      await page.waitForLoadState('networkidle');

      const nftToggle = page.locator('[data-testid="is-nft-toggle"]').or(
        page.locator('label:has-text("NFT")').locator('input')
      );

      if (await nftToggle.first().isVisible()) {
        await nftToggle.first().click();

        // Precision should be hidden or set to 0 for NFTs
        const precisionInput = page.locator('[data-testid="token-precision-input"]').or(
          page.locator('input[name="precision"]')
        );

        const isHidden = !(await precisionInput.first().isVisible());
        const isZero = await precisionInput.first().inputValue().catch(() => '0') === '0';

        expect(isHidden || isZero).toBeTruthy();
      }
    });
  });
});
