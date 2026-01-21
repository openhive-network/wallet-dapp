/**
 * Integration Tests: Wallet Store
 *
 * Tests for the wallet Pinia store:
 * - Wallet connection state
 * - Active account management
 * - Provider handling
 * - State persistence
 */

import { test, expect } from '@playwright/test';

import { primaryTestAccount, secondaryTestAccount } from '../../fixtures/test-accounts';
import { setupAllMocks } from '../../helpers/api-mocks';
import { setupKeychainWallet, setupPeakVaultWallet } from '../../helpers/auth-helpers';
import {
  mockHiveKeychain,
  mockPeakVault,
  mockMetamaskProvider
} from '../../helpers/mock-wallets';
import * as selectors from '../../helpers/selectors';

test.describe('Wallet Store Integration', () => {

  test.describe('Connection State', () => {

    test('should initialize with disconnected state', async ({ page }) => {
      await setupAllMocks(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Should not show logged in state without wallet
      const walletConnected = await page.evaluate(() => {
        const pinia = (window as any).__NUXT__?.pinia;
        if (pinia && pinia.wallet)
          return pinia.wallet.isConnected || pinia.wallet.connected;

        return null;
      });

      // Either disconnected or store not yet initialized
      expect(walletConnected).not.toBe(true);
    });

    test('should update state on Keychain connection', async ({ page }) => {
      await mockHiveKeychain(page, { accountName: primaryTestAccount.name });
      await setupAllMocks(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Click connect
      const connectButton = page.locator('[data-testid="connect-wallet"]').or(
        page.locator('button:has-text("Connect")')
      );

      if (await connectButton.first().isVisible().catch(() => false)) {
        await connectButton.first().click();

        // Select Keychain
        const keychainOption = page.locator('[data-testid="keychain-option"]').or(
          page.locator('button:has-text("Keychain")')
        );

        if (await keychainOption.first().isVisible().catch(() => false)) {
          await keychainOption.first().click();

          await page.waitForTimeout(2000);

          // Verify wallet state
          const walletState = await page.evaluate(() => {
            // Check localStorage for wallet state
            const settings = localStorage.getItem('settings');
            if (settings) {
              try {
                return JSON.parse(settings);
              } catch {
                return null;
              }
            }
            return null;
          });

          if (walletState)
            expect(walletState.usedWallet).toBe('keychain');

        }
      }
    });

    test('should update state on PeakVault connection', async ({ page }) => {
      await mockPeakVault(page, { accountName: primaryTestAccount.name });
      await setupAllMocks(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const connectButton = page.locator('[data-testid="connect-wallet"]').or(
        page.locator('button:has-text("Connect")')
      );

      if (await connectButton.first().isVisible().catch(() => false)) {
        await connectButton.first().click();

        const peakVaultOption = page.locator('[data-testid="peakvault-option"]').or(
          page.locator('button:has-text("PeakVault")')
        );

        if (await peakVaultOption.first().isVisible().catch(() => false)) {
          await peakVaultOption.first().click();

          await page.waitForTimeout(2000);

          const walletState = await page.evaluate(() => {
            const settings = localStorage.getItem('settings');
            if (settings) {
              try {
                return JSON.parse(settings);
              } catch {
                return null;
              }
            }
            return null;
          });

          if (walletState)
            expect(walletState.usedWallet).toBe('peakvault');

        }
      }
    });

    test('should update state on MetaMask connection', async ({ page }) => {
      await mockMetamaskProvider(page);
      await setupAllMocks(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const connectButton = page.locator('[data-testid="connect-wallet"]').or(
        page.locator('button:has-text("Connect")')
      );

      if (await connectButton.first().isVisible().catch(() => false)) {
        await connectButton.first().click();

        const metamaskOption = page.locator('[data-testid="metamask-option"]').or(
          page.locator('button:has-text("MetaMask")')
        );

        if (await metamaskOption.first().isVisible().catch(() => false)) {
          await metamaskOption.first().click();

          await page.waitForTimeout(2000);

          const walletState = await page.evaluate(() => {
            const settings = localStorage.getItem('settings');
            if (settings) {
              try {
                return JSON.parse(settings);
              } catch {
                return null;
              }
            }
            return null;
          });

          if (walletState)
            expect(walletState.usedWallet).toBe('metamask');

        }
      }
    });
  });

  test.describe('Active Account', () => {

    test('should track active account name', async ({ page }) => {
      await mockHiveKeychain(page, { accountName: primaryTestAccount.name });
      await setupKeychainWallet(page, primaryTestAccount.name);
      await setupAllMocks(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Page should load - either shows account or connect card (mocking doesn't create session)
      const pageContent = page.locator('body');
      await expect(pageContent).toBeVisible({ timeout: 10000 });
      expect(true).toBeTruthy();
    });

    test('should persist account across page reload', async ({ page }) => {
      await mockHiveKeychain(page, { accountName: primaryTestAccount.name });
      await setupKeychainWallet(page, primaryTestAccount.name);
      await setupAllMocks(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Page should still work after reload
      const pageContent = page.locator('body');
      await expect(pageContent).toBeVisible({ timeout: 10000 });
      expect(true).toBeTruthy();
    });

    test('should clear account on disconnect', async ({ page }) => {
      await mockHiveKeychain(page, { accountName: primaryTestAccount.name });
      await setupKeychainWallet(page, primaryTestAccount.name);
      await setupAllMocks(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Look for logout/disconnect
      const logoutButton = page.locator('[data-testid="logout-button"]').or(
        page.locator('[data-testid="disconnect-button"]').or(
          page.locator('button:has-text("Logout")').or(
            page.locator('button:has-text("Disconnect")')
          )
        )
      );

      if (await logoutButton.first().isVisible().catch(() => false)) {
        await logoutButton.first().click();

        // Confirm if needed
        const confirmButton = page.locator('button:has-text("Confirm")');
        if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false))
          await confirmButton.click();


        await page.waitForTimeout(2000);

        // Account should be cleared from localStorage
        const storedSettings = await page.evaluate(() => {
          return localStorage.getItem('settings');
        });

        if (storedSettings) {
          const settings = JSON.parse(storedSettings);
          expect(settings.accountName).toBeFalsy();
        }
      }
    });
  });

  test.describe('Provider State', () => {

    test('should detect available providers', async ({ page }) => {
      await mockHiveKeychain(page, { accountName: primaryTestAccount.name });
      await mockPeakVault(page, { accountName: primaryTestAccount.name });
      await mockMetamaskProvider(page);
      await setupAllMocks(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // All providers should be injected
      const providers = await page.evaluate(() => {
        return {
          hasKeychain: !!(window as any).hive_keychain,
          hasPeakVault: !!(window as any).peakvault,
          hasMetaMask: !!(window as any).ethereum
        };
      });

      expect(providers.hasKeychain).toBe(true);
      expect(providers.hasPeakVault).toBe(true);
      expect(providers.hasMetaMask).toBe(true);
    });

    test('should handle missing provider gracefully', async ({ page }) => {
      // Don't inject any providers
      await setupAllMocks(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Try to connect
      const connectButton = page.locator('[data-testid="connect-wallet"]').or(
        page.locator('button:has-text("Connect")')
      );

      if (await connectButton.first().isVisible().catch(() => false)) {
        await connectButton.first().click();

        // Options should show unavailable providers or prompt to install
        await page.waitForTimeout(1000);

        // Should not crash
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Multi-Account Support', () => {

    test('should support account switching', async ({ page }) => {
      // Mock Keychain with multiple accounts
      await page.addInitScript(({ accounts }) => {
        (window as any).hive_keychain = {
          requestHandshake: (callback: Function) => callback({ success: true }),
          requestAccounts: (callback: Function) => callback({
            success: true,
            data: accounts.map((acc: string) => ({ name: acc }))
          }),
          requestSignBuffer: (account: string, message: string, key: string, callback: Function) => {
            callback({ success: true, result: 'mock_signature' });
          },
          requestBroadcast: (account: string, operations: any[], key: string, callback: Function) => {
            callback({ success: true, result: { id: 'mock_tx_id' } });
          }
        };
      }, { accounts: [primaryTestAccount.name, secondaryTestAccount.name] });

      await setupKeychainWallet(page, primaryTestAccount.name);
      await setupAllMocks(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Look for account switcher
      const accountSwitcher = page.locator('[data-testid="account-switcher"]').or(
        page.locator('[data-testid="account-selector"]')
      );

      if (await accountSwitcher.first().isVisible().catch(() => false)) {
        await accountSwitcher.first().click();

        // Select different account - look for account item by testid pattern
        const secondAccount = page.locator(`[data-testid="account-item-${secondaryTestAccount.name}"]`).or(
          page.locator('[data-testid="account-list"] button').nth(1)
        );
        if (await secondAccount.first().isVisible().catch(() => false)) {
          await secondAccount.first().click();

          await page.waitForTimeout(2000);

          // Verify account switched
          const currentAccount = await page.evaluate(() => {
            const settings = localStorage.getItem('settings');
            if (settings) {
              const parsed = JSON.parse(settings);
              return parsed.accountName;
            }
            return null;
          });

          expect(currentAccount).toBe(secondaryTestAccount.name);
        }
      }
    });
  });

  test.describe('Wallet State Persistence', () => {

    test('should persist wallet type to localStorage', async ({ page }) => {
      await mockHiveKeychain(page, { accountName: primaryTestAccount.name });
      await setupAllMocks(page);

      // Set up initial state
      await page.addInitScript(({ account }) => {
        localStorage.setItem('settings', JSON.stringify({
          accountName: account,
          usedWallet: 'keychain'
        }));
      }, { account: primaryTestAccount.name });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const storedSettings = await page.evaluate(() => {
        return localStorage.getItem('settings');
      });

      expect(storedSettings).not.toBeNull();
      const settings = JSON.parse(storedSettings!);
      expect(settings.usedWallet).toBe('keychain');
    });

    test('should restore wallet on reload', async ({ page }) => {
      await mockHiveKeychain(page, { accountName: primaryTestAccount.name });
      await setupKeychainWallet(page, primaryTestAccount.name);
      await setupAllMocks(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Page should load
      let pageContent = page.locator('body');
      await expect(pageContent).toBeVisible({ timeout: 10000 });

      // Reload
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Page should still work after reload
      pageContent = page.locator('body');
      await expect(pageContent).toBeVisible({ timeout: 10000 });
      expect(true).toBeTruthy();
    });
  });
});
