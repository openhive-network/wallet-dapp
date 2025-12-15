/**
 * Auth Helpers
 *
 * Utilities for authentication state management in tests:
 * - Setting up authenticated/unauthenticated states
 * - Managing localStorage for settings
 * - Cookie management for Google OAuth
 */

import type { Page, BrowserContext } from '@playwright/test';

import { primaryTestAccount, googleTestUser } from '../fixtures/test-accounts';

// ===========================================
// Local enum to avoid importing from main app (which imports SVGs)
// ===========================================

export enum UsedWallet {
  METAMASK = 'metamask',
  KEYCHAIN = 'keychain',
  PEAKVAULT = 'peakvault',
  CTOKENS_IMPLEMENTATION = 'ctokens_implementation',
  GOOGLE_DRIVE = 'google_drive'
}

// ===========================================
// Types
// ===========================================

export interface AuthState {
  wallet?: UsedWallet;
  account?: string;
  googleDriveSync?: boolean;
  googleAuthenticated?: boolean;
}

export interface SettingsState {
  wallet?: UsedWallet;
  account?: string;
  googleDriveSync?: boolean;
  lastGoogleSyncTime?: number;
}

// ===========================================
// Settings Management
// ===========================================

/**
 * Set up localStorage with wallet settings before page load
 */
export async function setupWalletSettings (page: Page, settings: SettingsState) {
  await page.addInitScript((settingsData) => {
    localStorage.setItem('hivebridge_settings', JSON.stringify(settingsData));
  }, settings);
}

/**
 * Set up localStorage for Keychain wallet
 */
export async function setupKeychainWallet (page: Page, accountName: string = primaryTestAccount.name) {
  await setupWalletSettings(page, {
    wallet: UsedWallet.KEYCHAIN,
    account: accountName,
    googleDriveSync: false
  });
}

/**
 * Set up localStorage for PeakVault wallet
 */
export async function setupPeakVaultWallet (page: Page, accountName: string = primaryTestAccount.name) {
  await setupWalletSettings(page, {
    wallet: UsedWallet.PEAKVAULT,
    account: accountName,
    googleDriveSync: false
  });
}

/**
 * Set up localStorage for MetaMask wallet
 */
export async function setupMetaMaskWallet (page: Page, accountName: string = primaryTestAccount.name) {
  await setupWalletSettings(page, {
    wallet: UsedWallet.METAMASK,
    account: accountName,
    googleDriveSync: false
  });
}

/**
 * Set up localStorage for Google Drive wallet
 */
export async function setupGoogleDriveWallet (page: Page, accountName: string = primaryTestAccount.name) {
  await setupWalletSettings(page, {
    wallet: UsedWallet.GOOGLE_DRIVE,
    account: accountName,
    googleDriveSync: true,
    lastGoogleSyncTime: Date.now()
  });
}

/**
 * Set up localStorage for HTM/CTokens wallet
 */
export async function setupHTMWallet (page: Page, accountName: string = primaryTestAccount.name) {
  await setupWalletSettings(page, {
    wallet: UsedWallet.CTOKENS_IMPLEMENTATION,
    account: accountName,
    googleDriveSync: false
  });
}

/**
 * Clear all wallet settings from localStorage
 */
export async function clearWalletSettings (page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem('hivebridge_settings');
    localStorage.removeItem('htm_wallet');
    localStorage.removeItem('google_drive_wallet');
  });
}

// ===========================================
// Cookie Management
// ===========================================

/**
 * Set up Google OAuth cookies (simulating authenticated state)
 */
export async function setupGoogleAuthCookies (context: BrowserContext, authenticated: boolean = true) {
  if (authenticated) {
    await context.addCookies([
      {
        name: 'google_access_token',
        value: 'mock-access-token-' + Date.now(),
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      },
      {
        name: 'google_refresh_token',
        value: 'mock-refresh-token-' + Date.now(),
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      },
      {
        name: 'google_user',
        value: encodeURIComponent(JSON.stringify(googleTestUser)),
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax'
      }
    ]);
  }
}

/**
 * Clear all Google OAuth cookies
 */
export async function clearGoogleAuthCookies (context: BrowserContext) {
  await context.clearCookies();
}

// ===========================================
// Combined Auth State Setup
// ===========================================

/**
 * Set up fully authenticated state with wallet
 */
export async function setupAuthenticatedState (
  page: Page,
  context: BrowserContext,
  walletType: UsedWallet = UsedWallet.KEYCHAIN,
  accountName: string = primaryTestAccount.name
) {
  // Set up cookies first
  await setupGoogleAuthCookies(context, walletType === UsedWallet.GOOGLE_DRIVE);

  // Then set up localStorage
  await setupWalletSettings(page, {
    wallet: walletType,
    account: accountName,
    googleDriveSync: walletType === UsedWallet.GOOGLE_DRIVE
  });
}

/**
 * Set up unauthenticated state (no wallet, no Google auth)
 */
export async function setupUnauthenticatedState (page: Page, context: BrowserContext) {
  await clearGoogleAuthCookies(context);
  await clearWalletSettings(page);
}

// ===========================================
// State Verification Helpers
// ===========================================

/**
 * Get current settings from localStorage
 */
export async function getCurrentSettings (page: Page): Promise<SettingsState | null> {
  return page.evaluate(() => {
    const settings = localStorage.getItem('hivebridge_settings');
    return settings ? JSON.parse(settings) : null;
  });
}

/**
 * Check if user is logged in (has wallet settings)
 */
export async function isLoggedIn (page: Page): Promise<boolean> {
  const settings = await getCurrentSettings(page);
  return settings?.wallet !== undefined && settings?.account !== undefined;
}

/**
 * Get current account name from settings
 */
export async function getCurrentAccount (page: Page): Promise<string | undefined> {
  const settings = await getCurrentSettings(page);
  return settings?.account;
}

/**
 * Check if specific wallet type is configured
 */
export async function hasWalletType (page: Page, walletType: UsedWallet): Promise<boolean> {
  const settings = await getCurrentSettings(page);
  return settings?.wallet === walletType;
}

// ===========================================
// Login Flow Helpers
// ===========================================

/**
 * Perform login flow via UI (for E2E testing)
 */
export async function performLogin (
  page: Page,
  walletType: 'keychain' | 'peakvault' | 'metamask' | 'google-drive' | 'htm',
  accountName: string = primaryTestAccount.name
) {
  // Click connect wallet button
  await page.click('[data-testid="connect-wallet-button"]');

  // Wait for wallet selection modal
  await page.waitForSelector('[data-testid="wallet-select-modal"]');

  // Select wallet type
  await page.click(`[data-testid="wallet-option-${walletType}"]`);

  // Handle wallet-specific flows
  switch (walletType) {
  case 'keychain':
  case 'peakvault':
    // Wait for account selection and select
    await page.waitForSelector('[data-testid="account-select"]');
    await page.fill('[data-testid="account-input"]', accountName);
    await page.click('[data-testid="confirm-account-button"]');
    break;

  case 'metamask':
    // MetaMask flow - wait for snap connection
    await page.waitForSelector('[data-testid="metamask-connect-status"]');
    break;

  case 'google-drive':
    // Google OAuth flow is mocked, should auto-complete
    await page.waitForSelector('[data-testid="recovery-password-dialog"]');
    await page.fill('[data-testid="recovery-password-input"]', 'test-password');
    await page.click('[data-testid="recovery-password-submit"]');
    break;

  case 'htm':
    // HTM local wallet flow
    await page.fill('[data-testid="htm-password-input"]', 'test-password');
    await page.click('[data-testid="htm-login-button"]');
    break;
  }

  // Wait for modal to close
  await page.waitForSelector('[data-testid="wallet-select-modal"]', { state: 'hidden' });
}

/**
 * Perform logout flow via UI
 */
export async function performLogout (page: Page) {
  // Click account switcher
  await page.click('[data-testid="account-switcher"]');

  // Click logout button
  await page.click('[data-testid="logout-button"]');

  // Confirm logout if needed
  const confirmButton = page.locator('[data-testid="confirm-logout-button"]');
  if (await confirmButton.isVisible())
    await confirmButton.click();


  // Wait for redirect to home
  await page.waitForURL('/');
}
