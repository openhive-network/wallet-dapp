/**
 * E2E Tests: Google Drive wallet recovery password re-prompt
 *
 * When the encryption key cached on this device (or a typed password) no longer decrypts
 * the wallet stored on Google Drive, the user must be told why and asked for the password again.
 */

import { test, expect, type Page } from '@playwright/test';

import { primaryTestAccount } from '../../fixtures/test-accounts';
import { setupAllMocks } from '../../helpers/api-mocks';
import {
  setupUnauthenticatedState,
  setupGoogleAuthCookies,
  setupWalletSettings,
  UsedWallet
} from '../../helpers/auth-helpers';
import * as selectors from '../../helpers/selectors';

const ENCRYPTION_KEY_STORAGE = 'hivebridge_encryption_key_wif';
const WALLET_FILE_ID = 'mock-wallet-file-id';

/**
 * Serve a wallet file from the Google Drive API that no key can decrypt
 * (as if it had been recreated elsewhere with a different password)
 */
async function mockUndecryptableGoogleDriveFile (page: Page) {
  await page.route(/googleapis\.com\/drive\/v3\/files\?/, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ files: [{ id: WALLET_FILE_ID, name: 'hivebridge_wallet.json' }] })
    });
  });

  await page.route(new RegExp(`googleapis\\.com/drive/v3/files/${WALLET_FILE_ID}\\?alt=media`), async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: 'not-a-wallet-encrypted-with-the-cached-key'
    });
  });
}

/**
 * Cache a valid (but mismatching) encryption key, as left behind by a previous wallet on this device
 */
async function setupStaleEncryptionKey (page: Page) {
  await page.addInitScript(({ storageKey, keyWif }) => {
    localStorage.setItem(storageKey, keyWif);
  }, { storageKey: ENCRYPTION_KEY_STORAGE, keyWif: primaryTestAccount.postingKey! });
}

test.describe('Google Drive recovery password re-prompt', () => {

  test.beforeEach(async ({ page, context }) => {
    await setupUnauthenticatedState(page, context);
    await setupGoogleAuthCookies(context, true);
    await setupWalletSettings(page, {
      wallet: UsedWallet.GOOGLE_DRIVE,
      account: primaryTestAccount.name,
      googleDriveSync: false
    });
    await setupStaleEncryptionKey(page);
    await setupAllMocks(page, { googleAuthenticated: true, googleDriveWalletExists: true });
    await mockUndecryptableGoogleDriveFile(page);
  });

  test('should drop the stale cached key and explain why the password is asked again', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const dialog = page.locator(selectors.common.recoveryPasswordDialog);
    await expect(dialog).toBeVisible({ timeout: 30000 });

    const notice = page.locator(selectors.common.recoveryPasswordNotice);
    await expect(notice).toContainText('saved password no longer matches');

    const cachedKey = await page.evaluate((storageKey) => localStorage.getItem(storageKey), ENCRYPTION_KEY_STORAGE);
    expect(cachedKey).toBeNull();
  });

  test('should ask again after a wrong password and close after cancel', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const dialog = page.locator(selectors.common.recoveryPasswordDialog);
    await expect(dialog).toBeVisible({ timeout: 30000 });

    await page.fill(selectors.common.recoveryPasswordInput, 'definitely-wrong-password');
    await page.click(selectors.common.recoverySubmitBtn);

    // The prompt reopens, this time explaining that the typed password was wrong
    const notice = page.locator(selectors.common.recoveryPasswordNotice);
    await expect(notice).toContainText('Invalid recovery password', { timeout: 30000 });
    await expect(page.locator(selectors.common.recoveryPasswordInput)).toHaveValue('');

    await page.click(selectors.common.recoveryCancelBtn);
    await expect(dialog).toBeHidden();
  });

  test('should allow deleting the wallet from Settings without knowing the password', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // The cached key does not match, so the password is asked for - give up on it
    const dialog = page.locator(selectors.common.recoveryPasswordDialog);
    await expect(dialog).toBeVisible({ timeout: 30000 });
    await page.click(selectors.common.recoveryCancelBtn);
    await expect(dialog).toBeHidden();

    // Keys stay locked, but the wallet file can still be removed
    await expect(page.locator(selectors.settings.loadKeysAlert)).toBeVisible();
    await page.click(selectors.settings.deleteWalletButton);
    await expect(page.locator(selectors.settings.deleteWalletDialog)).toBeVisible();

    const deleteRequest = page.waitForRequest(request =>
      request.url().includes('/api/google-drive/delete-wallet') && request.method() === 'DELETE'
    );
    await page.click(selectors.settings.deleteWalletConfirmButton);
    await deleteRequest;

    await expect(page.locator(selectors.settings.walletFileMissing)).toBeVisible();
    await expect(page.locator(selectors.settings.createWalletButton)).toBeVisible();

    const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('hivebridge_settings') ?? '{}'));
    expect(settings.account).toBeUndefined();
    expect(settings.googleDriveAccounts).toEqual([]);
  });
});
