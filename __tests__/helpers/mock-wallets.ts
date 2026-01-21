/**
 * Mock Wallets Helper
 *
 * Provides utilities for mocking browser wallet extensions in Playwright tests:
 * - Hive Keychain extension
 * - PeakVault extension
 * - MetaMask (Hive Snap)
 * - HTM local wallet
 */

import type { Page, BrowserContext } from '@playwright/test';

import { primaryTestAccount } from '../fixtures/test-accounts';

// ===========================================
// Types
// ===========================================

export interface MockWalletOptions {
  /** Account name to return from wallet */
  accountName?: string;
  /** Whether the wallet extension is "installed" */
  isInstalled?: boolean;
  /** Whether signing operations should succeed */
  signingSuccess?: boolean;
  /** Delay before responding (ms) */
  delay?: number;
}

// ===========================================
// Hive Keychain Mock
// ===========================================

/**
 * Inject mock Hive Keychain extension into page
 */
export async function mockHiveKeychain (page: Page, options: MockWalletOptions = {}) {
  const {
    accountName = primaryTestAccount.name,
    isInstalled = true,
    signingSuccess = true,
    delay = 0
  } = options;

  await page.addInitScript(({ accountName, isInstalled, signingSuccess, delay }) => {
    if (!isInstalled) return;

    const createDelayedResponse = (callback: Function, response: any) => {
      setTimeout(() => callback(response), delay);
    };

    // Mock Hive Keychain API
    (window as any).hive_keychain = {
      requestHandshake: (callback: Function) => {
        createDelayedResponse(callback, { success: true });
      },

      requestSignBuffer: (
        _account: string | null,
        _message: string,
        _keyType: string,
        callback: Function,
        _rpc?: unknown,
        _title?: string
      ) => {
        if (signingSuccess) {
          createDelayedResponse(callback, {
            success: true,
            data: {
              username: accountName,
              signature: 'mock-signature-' + Date.now(),
              publicKey: 'STM8GC13uCZbP44HzMLV6zPZGwVQ8Nt4Kji8PapsPiNq1BK153XTX'
            },
            result: 'mock-signature-' + Date.now(),
            publicKey: 'STM8GC13uCZbP44HzMLV6zPZGwVQ8Nt4Kji8PapsPiNq1BK153XTX'
          });
        } else {
          createDelayedResponse(callback, {
            success: false,
            error: 'User rejected the request'
          });
        }
      },

      requestBroadcast: (
        _account: string,
        _operations: any[],
        _keyType: string,
        callback: Function
      ) => {
        if (signingSuccess) {
          createDelayedResponse(callback, {
            success: true,
            result: {
              id: 'mock-tx-id-' + Date.now(),
              block_num: 80000001
            }
          });
        } else {
          createDelayedResponse(callback, {
            success: false,
            error: 'User rejected the request'
          });
        }
      },

      requestSignTx: (
        _account: string,
        tx: any,
        _keyType: string,
        callback: Function
      ) => {
        if (signingSuccess) {
          createDelayedResponse(callback, {
            success: true,
            result: { ...tx, signatures: ['mock-signature-' + Date.now()] }
          });
        } else {
          createDelayedResponse(callback, {
            success: false,
            error: 'User rejected the request'
          });
        }
      },

      requestEncodeMessage: (
        _account: string,
        _recipient: string,
        _message: string,
        _keyType: string,
        callback: Function
      ) => {
        if (signingSuccess) {
          createDelayedResponse(callback, {
            success: true,
            result: '#encoded-message-' + Date.now()
          });
        } else {
          createDelayedResponse(callback, {
            success: false,
            error: 'User rejected the request'
          });
        }
      },

      requestVerifyKey: (
        _account: string,
        _message: string,
        _keyType: string,
        callback: Function
      ) => {
        createDelayedResponse(callback, {
          success: true,
          result: true,
          publicKey: 'STM8GC13uCZbP44HzMLV6zPZGwVQ8Nt4Kji8PapsPiNq1BK153XTX'
        });
      },

      // Helper to get accounts (custom extension)
      requestAccounts: (callback: Function) => {
        createDelayedResponse(callback, {
          success: true,
          result: [accountName]
        });
      }
    };

    // Dispatch event to signal Keychain is ready
    window.dispatchEvent(new CustomEvent('hive_keychain_ready'));
  }, { accountName, isInstalled, signingSuccess, delay });
}

// ===========================================
// PeakVault Mock
// ===========================================

/**
 * Inject mock PeakVault extension into page
 */
export async function mockPeakVault (page: Page, options: MockWalletOptions = {}) {
  const {
    accountName = primaryTestAccount.name,
    isInstalled = true,
    signingSuccess = true,
    delay = 0
  } = options;

  await page.addInitScript(({ accountName, isInstalled, signingSuccess, delay }) => {
    if (!isInstalled) return;

    const createDelayedResponse = async (response: any) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return response;
    };

    // Mock PeakVault API
    (window as any).peakvault = {
      isEnabled: async () => createDelayedResponse(true),

      requestAccounts: async () => {
        return createDelayedResponse([{ name: accountName }]);
      },

      requestContact: async () => {
        if (signingSuccess) {
          return createDelayedResponse({
            success: true,
            result: accountName
          });
        } else
          throw new Error('User rejected the request');

      },

      requestSignBuffer: async (
        _account: string,
        _message: string,
        _keyType: string
      ) => {
        if (signingSuccess) {
          return createDelayedResponse({
            success: true,
            result: 'mock-pv-signature-' + Date.now(),
            publicKey: 'STM8GC13uCZbP44HzMLV6zPZGwVQ8Nt4Kji8PapsPiNq1BK153XTX'
          });
        } else
          throw new Error('User rejected the request');

      },

      requestBroadcast: async (
        _account: string,
        _operations: any[],
        _keyType: string
      ) => {
        if (signingSuccess) {
          return createDelayedResponse({
            success: true,
            result: {
              id: 'mock-pv-tx-id-' + Date.now(),
              block_num: 80000001
            }
          });
        } else
          throw new Error('User rejected the request');

      },

      requestSignTx: async (
        _account: string,
        tx: any,
        _keyType: string
      ) => {
        if (signingSuccess) {
          return createDelayedResponse({
            success: true,
            result: { ...tx, signatures: ['mock-pv-signature-' + Date.now()] }
          });
        } else
          throw new Error('User rejected the request');

      },

      requestEncodeMessage: async (
        _account: string,
        _recipient: string,
        _message: string,
        _keyType: string
      ) => {
        if (signingSuccess) {
          return createDelayedResponse({
            success: true,
            result: '#pv-encoded-message-' + Date.now()
          });
        } else
          throw new Error('User rejected the request');

      }
    };

    // Dispatch event to signal PeakVault is ready
    window.dispatchEvent(new CustomEvent('peakvault_ready'));
  }, { accountName, isInstalled, signingSuccess, delay });
}

// ===========================================
// MetaMask (Hive Snap) Mock
// ===========================================

/**
 * Inject mock MetaMask with Hive Snap into page
 */
export async function mockMetaMaskSnap (page: Page, options: MockWalletOptions = {}) {
  const {
    accountName = primaryTestAccount.name,
    isInstalled = true,
    signingSuccess = true,
    delay = 0
  } = options;

  await page.addInitScript(({ accountName, isInstalled, signingSuccess, delay }) => {
    if (!isInstalled) return;

    const createDelayedResponse = async (response: any) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return response;
    };

    // Mock ethereum provider (MetaMask)
    (window as any).ethereum = {
      isMetaMask: true,

      request: async ({ method, params }: { method: string; params?: any[] }) => {
        await new Promise(resolve => setTimeout(resolve, delay));

        switch (method) {
        case 'wallet_requestSnaps':
          return {
            'npm:@aspect-crypto/hive-keychain-snap': {
              version: '1.0.0',
              id: 'npm:@aspect-crypto/hive-keychain-snap',
              enabled: true,
              blocked: false
            }
          };

        case 'wallet_invokeSnap':
          const snapMethod = params?.[0]?.request?.method;

          if (snapMethod === 'signBuffer' || snapMethod === 'signTransaction') {
            if (signingSuccess) {
              return {
                success: true,
                signature: 'mock-mm-signature-' + Date.now(),
                publicKey: 'STM8GC13uCZbP44HzMLV6zPZGwVQ8Nt4Kji8PapsPiNq1BK153XTX'
              };
            } else
              throw new Error('User rejected the request');

          }

          if (snapMethod === 'getAccounts')
            return [{ name: accountName }];


          return null;

        case 'eth_requestAccounts':
          return ['0x1234567890abcdef1234567890abcdef12345678'];

        case 'wallet_getSnaps':
          return {
            'npm:@aspect-crypto/hive-keychain-snap': {
              version: '1.0.0'
            }
          };

        default:
          return null;
        }
      },

      on: (_event: string, _callback: Function) => {
        // Mock event listener
      },

      removeListener: (_event: string, _callback: Function) => {
        // Mock event listener removal
      }
    };

    // Dispatch event to signal MetaMask is ready
    window.dispatchEvent(new CustomEvent('ethereum#initialized'));
  }, { accountName, isInstalled, signingSuccess, delay });
}

// ===========================================
// HTM Local Wallet Mock
// ===========================================

/**
 * Setup localStorage with HTM wallet data
 */
export async function mockHTMWallet (page: Page, options: MockWalletOptions = {}) {
  const {
    accountName = primaryTestAccount.name,
    isInstalled = true
  } = options;

  if (!isInstalled) return;

  await page.addInitScript(({ accountName }) => {
    // Mock encrypted wallet data in localStorage
    const mockWalletData = {
      version: 1,
      account: accountName,
      encryptedKey: 'mock-encrypted-key-data',
      publicKey: 'STM8GC13uCZbP44HzMLV6zPZGwVQ8Nt4Kji8PapsPiNq1BK153XTX',
      createdAt: new Date().toISOString()
    };

    localStorage.setItem('htm_wallet', JSON.stringify(mockWalletData));
  }, { accountName });
}

// ===========================================
// Combined Setup
// ===========================================

/**
 * Setup all wallet mocks at once
 */
export async function setupAllWalletMocks (page: Page, options: MockWalletOptions = {}) {
  await mockHiveKeychain(page, options);
  await mockPeakVault(page, options);
  await mockMetaMaskSnap(page, options);
  await mockHTMWallet(page, options);
}

/**
 * Setup wallet mocks with signing disabled (for rejection testing)
 */
export async function setupWalletMocksWithRejection (page: Page) {
  const options: MockWalletOptions = { signingSuccess: false };
  await mockHiveKeychain(page, options);
  await mockPeakVault(page, options);
  await mockMetaMaskSnap(page, options);
}

/**
 * Setup wallet mocks as not installed (for detection testing)
 */
export async function setupNoWalletsMock (page: Page) {
  const options: MockWalletOptions = { isInstalled: false };
  await mockHiveKeychain(page, options);
  await mockPeakVault(page, options);
  await mockMetaMaskSnap(page, options);
}

// ===========================================
// Helpers for Extension Testing
// ===========================================

/**
 * Load a real Chrome extension for testing
 * This requires running Playwright in headed mode with the extension flag
 */
export async function loadRealExtension (
  context: BrowserContext,
  extensionPath: string
) {
  // This is handled by playwright.config.ts launchOptions
  // The extension should already be loaded when using the 'chromium' project
  console.log(`Extension should be loaded from: ${extensionPath}`);
}

/**
 * Wait for wallet to be detected
 */
export async function waitForWalletDetection (page: Page, walletType: 'keychain' | 'peakvault' | 'metamask', timeout: number = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const isDetected = await page.evaluate((type) => {
      switch (type) {
      case 'keychain':
        return 'hive_keychain' in window;
      case 'peakvault':
        return 'peakvault' in window;
      case 'metamask':
        return 'ethereum' in window && (window as any).ethereum?.isMetaMask;
      default:
        return false;
      }
    }, walletType);

    if (isDetected) return true;
    await page.waitForTimeout(100);
  }

  return false;
}

// Alias for backward compatibility
export { mockMetaMaskSnap as mockMetamaskProvider };
